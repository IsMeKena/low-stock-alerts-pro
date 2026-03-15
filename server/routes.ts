import type { Express, Request, Response } from "express";
import { type Server } from "http";
import { shopify } from "./shopify";
import { verifySessionToken } from "./middleware";
import {
  handleOAuthSession,
  isShopInstalled,
  verifySessionToken as verifyToken,
} from "./auth-utils";
import {
  verifyWebhookSignature,
  logWebhookEvent,
  registerWebhooks,
} from "./webhook-handler";
import {
  processProductCreate,
  processProductUpdate,
  processInventoryUpdate,
} from "./webhook-processors";
import { syncProducts } from "./shopify-api";
import { getActiveAlerts, resolveAlert } from "./alerts";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Health check endpoint
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok", message: "low-stock-alerts is running" });
  });

  // OAuth begin endpoint
  app.get("/api/auth", async (req: Request, res: Response) => {
    try {
      const shop = req.query.shop as string;
      if (!shop) {
        res.status(400).json({ error: "Missing shop parameter" });
        return;
      }

      const sanitizedShop = shopify.utils.sanitizeShop(shop);
      if (!sanitizedShop) {
        res.status(400).json({ error: "Invalid shop domain" });
        return;
      }

      console.log(`[auth] Beginning OAuth flow for ${sanitizedShop}`);

      await shopify.auth.begin({
        shop: sanitizedShop,
        callbackPath: "/api/auth/callback",
        isOnline: false,
        rawRequest: req,
        rawResponse: res,
      });
    } catch (error) {
      console.error("Auth begin error:", error);
      res.status(500).json({ error: "Failed to begin authentication" });
    }
  });

  // OAuth callback endpoint
  app.get("/api/auth/callback", async (req: Request, res: Response) => {
    try {
      const callback = await shopify.auth.callback({
        rawRequest: req,
        rawResponse: res,
      });

      const session = callback.session;

      // Use the auth utility to handle the session
      const result = await handleOAuthSession(session);

      if (!result.success) {
        throw new Error("Failed to handle OAuth session");
      }

      // Register webhooks after successful OAuth
      console.log(`[auth] Registering webhooks for ${result.shop}`);
      const webhooksRegistered = await registerWebhooks(
        result.shop,
        result.accessToken || ""
      );
      if (webhooksRegistered) {
        console.log(`[auth] Webhooks registered for ${result.shop}`);
      } else {
        console.warn(`[auth] Failed to register some webhooks for ${result.shop}`);
      }

      // Sync products in background (don't wait for it)
      console.log(`[auth] Starting product sync for ${result.shop}`);
      syncProducts(result.shop, result.accessToken || "")
        .then(({ created, updated }) => {
          console.log(
            `[auth] Product sync complete: ${created} created, ${updated} updated`
          );
        })
        .catch((error) => {
          console.error(`[auth] Product sync failed:`, error);
        });

      const host = req.query.host as string;
      const sanitizedShop = shopify.utils.sanitizeShop(result.shop);
      const redirectUrl = `/?shop=${sanitizedShop}&host=${host}`;

      console.log(`[auth] Redirecting to ${redirectUrl}`);
      res.redirect(redirectUrl);
    } catch (error: any) {
      const shop = req.query.shop as string;
      const host = req.query.host as string;

      if (
        error.constructor?.name === "CookieNotFound" ||
        error.message?.includes("Could not find an OAuth cookie")
      ) {
        if (shop) {
          const sanitizedShop = shopify.utils.sanitizeShop(shop);
          if (sanitizedShop) {
            console.log(
              `[auth] Cookie not found for ${sanitizedShop}, redirecting to app`
            );
            const redirectUrl = host
              ? `/?shop=${sanitizedShop}&host=${host}`
              : `/?shop=${sanitizedShop}`;
            res.redirect(redirectUrl);
            return;
          }
        }
      }

      console.error("[auth] Auth callback error:", error);
      res.status(500).json({ error: "Failed to complete authentication" });
    }
  });

  // Session status endpoint (for client-side token exchange)
  app.post("/api/auth/session-status", async (req: Request, res: Response) => {
    try {
      const { shop, token } = req.body;

      if (!shop || !token) {
        res.status(400).json({ error: "Missing shop or token", installed: false });
        return;
      }

      const sanitizedShop = shopify.utils.sanitizeShop(shop);
      if (!sanitizedShop) {
        res
          .status(400)
          .json({ error: "Invalid shop domain", installed: false });
        return;
      }

      // Verify the session token
      const verified = await verifyToken(token);

      if (verified && verified.valid) {
        console.log(`[auth] Session verified for ${sanitizedShop}`);
        res.json({
          installed: true,
          shop: sanitizedShop,
          scope: verified.scope,
        });
      } else {
        // Check if we have a stored session anyway
        const installed = await isShopInstalled(sanitizedShop);
        console.log(
          `[auth] Token verification failed for ${sanitizedShop}, installed=${installed}`
        );
        res.json({ installed, shop: sanitizedShop });
      }
    } catch (error) {
      console.error("[auth] Session status error:", error);
      res.json({ installed: false, shop: null, error: "Internal error" });
    }
  });

  // Check if shop is installed (no auth required)
  app.get("/api/auth/installed", async (req: Request, res: Response) => {
    try {
      const shop = req.query.shop as string;

      if (!shop) {
        res.status(400).json({ error: "Missing shop parameter" });
        return;
      }

      const sanitizedShop = shopify.utils.sanitizeShop(shop);
      if (!sanitizedShop) {
        res.status(400).json({ error: "Invalid shop domain" });
        return;
      }

      const installed = await isShopInstalled(sanitizedShop);
      console.log(`[auth] Checked installed status for ${sanitizedShop}: ${installed}`);

      res.json({ installed, shop: sanitizedShop });
    } catch (error) {
      console.error("[auth] Check installed error:", error);
      res.status(500).json({ error: "Failed to check installation status" });
    }
  });

  // Get shop info (requires valid session token)
  app.get("/api/shopify/shop", verifySessionToken, (req: Request, res: Response) => {
    try {
      const session = (req as any).shopifySession;
      res.json({
        shop: session.shop,
        scope: session.scope,
      });
    } catch (error) {
      console.error("[auth] Get shop error:", error);
      res.status(500).json({ error: "Failed to get shop info" });
    }
  });

  // ============================================
  // Product endpoints (dashboard)
  // ============================================

  // Get products with inventory
  app.get("/api/products", verifySessionToken, async (req: Request, res: Response) => {
    try {
      const session = (req as any).shopifySession;
      const { db: database } = await import("./db");
      const { products: productsTable, inventory: inventoryTable } = await import(
        "@shared/schema.ts"
      );
      const { eq } = await import("drizzle-orm");

      const shopProducts = await database
        .select()
        .from(productsTable)
        .where(eq(productsTable.shopDomain, session.shop));

      // Enrich with inventory info
      const productsWithInventory = await Promise.all(
        shopProducts.map(async (product) => {
          const inventoryRecords = await database
            .select()
            .from(inventoryTable)
            .where(eq(inventoryTable.productId, product.shopifyProductId));

          return {
            ...product,
            inventory: inventoryRecords,
          };
        })
      );

      res.json({
        shop: session.shop,
        products: productsWithInventory,
        count: productsWithInventory.length,
      });
    } catch (error) {
      console.error("[api] Get products error:", error);
      res.status(500).json({ error: "Failed to get products" });
    }
  });

  // Get active alerts
  app.get("/api/alerts", verifySessionToken, async (req: Request, res: Response) => {
    try {
      const session = (req as any).shopifySession;
      const activeAlerts = await getActiveAlerts(session.shop);

      res.json({
        shop: session.shop,
        alerts: activeAlerts,
        count: activeAlerts.length,
      });
    } catch (error) {
      console.error("[api] Get alerts error:", error);
      res.status(500).json({ error: "Failed to get alerts" });
    }
  });

  // Resolve an alert
  app.post("/api/alerts/:alertId/resolve", verifySessionToken, async (req: Request, res: Response) => {
    try {
      const alertId = Array.isArray(req.params.alertId) ? req.params.alertId[0] : req.params.alertId;
      const session = (req as any).shopifySession;

      // Verify alert belongs to this shop
      const { db: database } = await import("./db");
      const { alerts: alertsTable } = await import("@shared/schema.ts");
      const { eq } = await import("drizzle-orm");

      const alertResult = await database
        .select()
        .from(alertsTable)
        .where(eq(alertsTable.id, alertId))
        .limit(1);

      if (alertResult.length === 0) {
        res.status(404).json({ error: "Alert not found" });
        return;
      }

      if (alertResult[0].shopDomain !== session.shop) {
        res.status(403).json({ error: "Unauthorized" });
        return;
      }

      await resolveAlert(alertId);

      res.json({ success: true, alertId });
    } catch (error) {
      console.error("[api] Resolve alert error:", error);
      res.status(500).json({ error: "Failed to resolve alert" });
    }
  });

  // ============================================
  // Webhook routes
  // ============================================

  // Helper to extract shop from webhook payload
  const getShopFromPayload = (body: any): string | null => {
    return body?.shop?.id ? `${body.shop.id}.myshopify.com` : null;
  };

  // Product create webhook
  app.post("/api/webhooks/products/create", async (req: Request, res: Response) => {
    try {
      const secret = process.env.SHOPIFY_API_SECRET || "";

      if (!verifyWebhookSignature(req, secret)) {
        console.log("[webhook] Invalid signature for products/create");
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const shop = getShopFromPayload(req.body);
      if (!shop) {
        console.log("[webhook] Could not determine shop from products/create payload");
        res.status(400).json({ error: "Missing shop in payload" });
        return;
      }

      logWebhookEvent("products/create", shop, req.body);
      await processProductCreate(shop, req.body);

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("[webhook] Error handling products/create:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Product update webhook
  app.post("/api/webhooks/products/update", async (req: Request, res: Response) => {
    try {
      const secret = process.env.SHOPIFY_API_SECRET || "";

      if (!verifyWebhookSignature(req, secret)) {
        console.log("[webhook] Invalid signature for products/update");
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const shop = getShopFromPayload(req.body);
      if (!shop) {
        console.log("[webhook] Could not determine shop from products/update payload");
        res.status(400).json({ error: "Missing shop in payload" });
        return;
      }

      logWebhookEvent("products/update", shop, req.body);
      await processProductUpdate(shop, req.body);

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("[webhook] Error handling products/update:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Inventory update webhook
  app.post(
    "/api/webhooks/inventory_levels/update",
    async (req: Request, res: Response) => {
      try {
        const secret = process.env.SHOPIFY_API_SECRET || "";

        if (!verifyWebhookSignature(req, secret)) {
          console.log("[webhook] Invalid signature for inventory_levels/update");
          res.status(401).json({ error: "Unauthorized" });
          return;
        }

        const shop = getShopFromPayload(req.body);
        if (!shop) {
          console.log("[webhook] Could not determine shop from inventory payload");
          res.status(400).json({ error: "Missing shop in payload" });
          return;
        }

        logWebhookEvent("inventory_levels/update", shop, req.body);
        await processInventoryUpdate(shop, req.body);

        res.status(200).json({ success: true });
      } catch (error) {
        console.error("[webhook] Error handling inventory_levels/update:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  console.log("[routes] Auth, shop, and webhook routes registered");

  return httpServer;
}
