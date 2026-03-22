import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { createServer } from "http";
import { join } from "path";
import { closeWebhookQueue } from "./webhook-queue";
import { runMigrations } from "./db";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Middleware
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
    if (capturedJsonResponse) {
      logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
    }
    log(logLine);
  });

  next();
});

async function startServer() {
  // Database initialization
  console.log("[startup] === SERVER STARTUP ===");
  
  try {
    // Run idempotent migrations (safe on restarts, preserves data)
    console.log("[startup] Running idempotent migrations...");
    await runMigrations();
    console.log("[startup] ✅ Migrations completed safely (data preserved)");
  } catch (error) {
    console.error("[startup] ❌ Migration failed:", error);
    process.exit(1);
  }
  
  console.log("[startup] Starting Express...");

  // Initialize Twilio (Phase 3)
  try {
    const { initTwilio } = await import("./twilio-service");
    const twilioConfig = {
      accountSid: process.env.TWILIO_ACCOUNT_SID || "",
      authToken: process.env.TWILIO_AUTH_TOKEN || "",
      whatsappFrom: process.env.TWILIO_WHATSAPP_FROM || "",
    };
    
    if (twilioConfig.accountSid && twilioConfig.authToken) {
      initTwilio(twilioConfig);
      log("Twilio initialized for WhatsApp alerts");
    } else {
      log("Twilio credentials not configured, WhatsApp alerts will be simulated");
    }
  } catch (error) {
    console.error("Failed to initialize Twilio:", error);
  }

  // Initialize batching processor (Phase 5)
  try {
    const { startBatchingProcessor } = await import("./batching-service");
    const batchingTimer = startBatchingProcessor(5 * 60 * 1000); // Process every 5 minutes
    
    // Store timer for cleanup on shutdown
    (global as any).batchingTimer = batchingTimer;
    log("Batching processor started");
  } catch (error) {
    console.error("Failed to initialize batching processor:", error);
  }

  // Register all routes
  await registerRoutes(httpServer, app);

  // Re-register webhooks for all existing shops on startup (run in background)
  // This ensures shops installed before new webhooks were added get them registered
  setTimeout(async () => {
    try {
      const { db } = await import("./db");
      const { shopifySessions } = await import("@shared/schema.ts");
      const { registerWebhooks } = await import("./webhook-handler");
      const { isNotNull } = await import("drizzle-orm");

      const sessions = await db
        .select()
        .from(shopifySessions)
        .where(isNotNull(shopifySessions.accessToken));

      log(`[startup] Found ${sessions.length} session(s) for webhook re-registration`);

      if (sessions.length > 0) {
        for (const session of sessions) {
          try {
            log(`[startup] Re-registering webhooks for ${session.shop}...`);
            await registerWebhooks(session.shop, session.accessToken!);
            log(`[startup] Webhooks re-registered for ${session.shop}`);
          } catch (err) {
            console.error(`[startup] Failed to re-register webhooks for ${session.shop}:`, err);
          }
        }
      } else {
        log("[startup] No existing sessions found — skipping webhook re-registration");
      }
    } catch (error) {
      console.error("[startup] Webhook re-registration failed:", error);
    }
  }, 5000);

  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // Serve static assets in production
  if (process.env.NODE_ENV === "production") {
    const staticPath = join(process.cwd(), "dist/public");
    app.use(express.static(staticPath));

    // SPA fallback - must be last
    app.use((req, res, next) => {
      if (!req.path.startsWith("/api") && !res.headersSent) {
        const indexPath = join(staticPath, "index.html");
        res.sendFile(indexPath, (err) => {
          if (err) next(err);
        });
      } else {
        next();
      }
    });
  }

  // Start server
  const port = parseInt(process.env.PORT || "8080", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`low-stock-alerts server running on port ${port}`);
      log(`Environment: ${process.env.NODE_ENV || "development"}`);
    }
  );

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    log("SIGTERM received, shutting down gracefully...");
    
    // Clear batching timer
    if ((global as any).batchingTimer) {
      clearInterval((global as any).batchingTimer);
      log("Batching processor stopped");
    }
    
    await closeWebhookQueue();
    httpServer.close(() => {
      log("Server closed");
      process.exit(0);
    });
  });

  process.on("SIGINT", async () => {
    log("SIGINT received, shutting down gracefully...");
    
    // Clear batching timer
    if ((global as any).batchingTimer) {
      clearInterval((global as any).batchingTimer);
      log("Batching processor stopped");
    }
    
    await closeWebhookQueue();
    httpServer.close(() => {
      log("Server closed");
      process.exit(0);
    });
  });
}

// Start the server
startServer().catch((error) => {
  console.error("[startup] Fatal error:", error);
  process.exit(1);
});
