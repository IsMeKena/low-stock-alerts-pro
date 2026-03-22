import type { Express, Request, Response } from "express";
import { type Server } from "http";
import { shopify } from "./shopify";
import { verifySessionToken, checkRateLimitThreshold, logApiCall } from "./middleware";
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
import { enqueueWebhook } from "./webhook-queue";
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

      const appUrl = process.env.APP_URL ||
        (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "");
      const scopes = process.env.SCOPES ||
        "write_products,read_products,write_inventory,read_inventory,write_webhooks,read_webhooks";
      const nonce = Math.random().toString(36).substring(2);
      const callbackUrl = `${appUrl}/api/auth/callback`;
      const authUrl = `https://${sanitizedShop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=${scopes}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${nonce}`;

      const isEmbedded = req.query.embedded === "1" || req.headers["sec-fetch-dest"] === "iframe";

      if (isEmbedded) {
        console.log(`[auth] Embedded context detected, using top-level redirect`);
        res.setHeader("Content-Type", "text/html");
        res.send(`<!DOCTYPE html><html><head><script>window.top.location.href = "${authUrl}";</script></head><body>Redirecting to Shopify...</body></html>`);
      } else {
        res.redirect(authUrl);
      }
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

      // CRITICAL: Validate session before saving
      if (!session) {
        console.error('[auth] ❌ Shopify returned null/undefined session');
        throw new Error('No session returned from Shopify callback');
      }

      if (!session.shop) {
        console.error('[auth] ❌ Session missing shop:', session);
        throw new Error('Session missing shop domain');
      }

      if (!session.accessToken) {
        console.error('[auth] ❌ Session missing accessToken:', {
          shop: session.shop,
          scope: session.scope,
        });
        throw new Error('Session missing access token');
      }

      // Log valid session before saving
      console.log('[auth] ✅ Valid session received:', {
        shop: session.shop,
        accessToken: '***' + session.accessToken.slice(-4),
        scope: session.scope,
      });

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
      const code = req.query.code as string;

      const isCookieError =
        error.constructor?.name === "CookieNotFound" ||
        error.message?.includes("Could not find an OAuth cookie");

      if (isCookieError && shop && code) {
        const sanitizedShop = shopify.utils.sanitizeShop(shop);
        if (sanitizedShop) {
          console.log(
            `[auth] Cookie not found for ${sanitizedShop}, attempting manual token exchange`
          );

          try {
            const tokenResponse = await fetch(
              `https://${sanitizedShop}/admin/oauth/access_token`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  client_id: process.env.SHOPIFY_API_KEY,
                  client_secret: process.env.SHOPIFY_API_SECRET,
                  code,
                }),
              }
            );

            if (!tokenResponse.ok) {
              const errText = await tokenResponse.text();
              console.error(`[auth] Token exchange failed (${tokenResponse.status}):`, errText);
              throw new Error(`Token exchange failed: ${tokenResponse.status}`);
            }

            const tokenData = await tokenResponse.json() as {
              access_token: string;
              scope: string;
            };
            console.log(`[auth] ✅ Manual token exchange successful for ${sanitizedShop}`);

            const { Session } = await import("@shopify/shopify-api");
            const manualSession = new Session({
              id: `offline_${sanitizedShop}`,
              shop: sanitizedShop,
              state: "",
              isOnline: false,
            });
            manualSession.accessToken = tokenData.access_token;
            manualSession.scope = tokenData.scope;

            const result = await handleOAuthSession(manualSession);

            if (result.success) {
              console.log(`[auth] Registering webhooks for ${result.shop}`);
              const webhooksRegistered = await registerWebhooks(
                result.shop,
                result.accessToken || ""
              );
              console.log(
                `[auth] Webhooks ${webhooksRegistered ? "registered" : "failed"} for ${result.shop}`
              );

              syncProducts(result.shop, result.accessToken || "")
                .then(({ created, updated }) => {
                  console.log(
                    `[auth] Product sync complete: ${created} created, ${updated} updated`
                  );
                })
                .catch((syncError) => {
                  console.error(`[auth] Product sync failed:`, syncError);
                });
            }

            const redirectUrl = host
              ? `/?shop=${sanitizedShop}&host=${host}`
              : `/?shop=${sanitizedShop}`;
            console.log(`[auth] Redirecting to ${redirectUrl}`);
            res.redirect(redirectUrl);
            return;
          } catch (manualError) {
            console.error("[auth] Manual token exchange failed:", manualError);
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
  app.get(
    "/api/products",
    verifySessionToken,
    checkRateLimitThreshold,
    logApiCall,
    async (req: Request, res: Response) => {
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
    }
  );

  // Get active alerts
  app.get(
    "/api/alerts",
    async (req: Request, res: Response) => {
    try {
      const shop = req.query.shop as string;
      if (!shop) {
        return res.status(400).json({ error: "Missing shop parameter" });
      }

      const activeAlerts = await getActiveAlerts(shop);

      res.json({
        shop,
        alerts: activeAlerts,
        count: activeAlerts.length,
      });
    } catch (error) {
      console.error("[api] Get alerts error:", error);
      res.status(500).json({ error: "Failed to get alerts" });
    }
    }
  );

  // Resolve an alert
  app.post(
    "/api/alerts/:alertId/resolve",
    verifySessionToken,
    checkRateLimitThreshold,
    logApiCall,
    async (req: Request, res: Response) => {
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
    }
  );

  // ============================================
  // Test notification endpoints
  // ============================================

  app.post("/api/test/whatsapp", async (req: Request, res: Response) => {
    try {
      const { shop, phoneNumber } = req.body;

      if (!phoneNumber) {
        res.status(400).json({ error: "Missing phoneNumber" });
        return;
      }

      console.log(`[test] Sending test WhatsApp to ${phoneNumber}`);

      const { sendWhatsAppMessage, formatAlertMessage } = await import("./twilio-service");

      const message = formatAlertMessage(
        "Test Product — Low Stock Alert",
        3,
        5,
        "Main Warehouse"
      );

      const result = await sendWhatsAppMessage(phoneNumber, message);

      if (result.success) {
        console.log(`[test] WhatsApp test sent successfully: ${result.messageId}`);
        res.json({
          success: true,
          messageId: result.messageId,
          simulated: result.messageId?.startsWith("simulated_") || false,
        });
      } else {
        console.error(`[test] WhatsApp test failed: ${result.error}`);
        res.status(500).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error: any) {
      console.error("[test] Error sending test WhatsApp:", error);
      res.status(500).json({
        error: error.message || "Failed to send test message",
      });
    }
  });

  // ============================================
  // Webhook routes
  // ============================================

  // Helper to extract shop from webhook headers or payload
  const getShopFromWebhookRequest = (req: Request): string | null => {
    const fromHeader = req.headers["x-shopify-shop-domain"] as string;
    if (fromHeader) return fromHeader;
    if (req.body?.shop_domain) return req.body.shop_domain;
    if (req.body?.domain) return req.body.domain;
    return null;
  };

  // Shared webhook handler with comprehensive logging
  const handleWebhook = (
    topic: string,
    processor: (shop: string, payload: any) => Promise<void>,
    options?: { useQueue?: boolean }
  ) => {
    return async (req: Request, res: Response) => {
      const startTime = Date.now();
      const webhookId = req.headers["x-shopify-webhook-id"] as string || "unknown";
      const apiVersion = req.headers["x-shopify-api-version"] as string || "unknown";

      console.log(`[webhook] ========================================`);
      console.log(`[webhook] RECEIVED: ${topic}`);
      console.log(`[webhook] Webhook ID: ${webhookId}`);
      console.log(`[webhook] API Version: ${apiVersion}`);
      console.log(`[webhook] Timestamp: ${new Date().toISOString()}`);

      try {
        const secret = process.env.SHOPIFY_API_SECRET || "";
        if (!secret) {
          console.error(`[webhook] ❌ SHOPIFY_API_SECRET env var is not set — cannot verify webhook`);
        }

        const hasRawBody = !!(req as any).rawBody;
        console.log(`[webhook] Raw body available: ${hasRawBody}`);
        console.log(`[webhook] HMAC header present: ${!!req.headers["x-shopify-hmac-sha256"]}`);

        if (!verifyWebhookSignature(req, secret)) {
          console.error(`[webhook] ❌ SIGNATURE VERIFICATION FAILED for ${topic}`);
          console.error(`[webhook] Secret length: ${secret.length} chars`);
          res.status(401).json({ error: "Unauthorized" });
          return;
        }

        console.log(`[webhook] ✅ Signature verified for ${topic}`);

        const shop = getShopFromWebhookRequest(req);
        if (!shop) {
          console.error(`[webhook] ❌ COULD NOT DETERMINE SHOP for ${topic}`);
          console.error(`[webhook] Headers: x-shopify-shop-domain=${req.headers["x-shopify-shop-domain"]}`);
          console.error(`[webhook] Body keys: ${Object.keys(req.body || {}).join(", ")}`);
          res.status(400).json({ error: "Missing shop" });
          return;
        }

        console.log(`[webhook] Shop: ${shop}`);
        logWebhookEvent(topic, shop, req.body);

        if (options?.useQueue) {
          const enqueued = await enqueueWebhook(topic, shop, req.body);
          if (enqueued) {
            console.log(`[webhook] ✅ Enqueued ${topic} for async processing`);
          } else {
            console.warn(`[webhook] ⚠️ Queue unavailable, processing ${topic} inline`);
            await processor(shop, req.body);
            console.log(`[webhook] ✅ Processed ${topic} inline`);
          }
        } else {
          await processor(shop, req.body);
          console.log(`[webhook] ✅ Processed ${topic} successfully`);
        }

        const duration = Date.now() - startTime;
        console.log(`[webhook] ✅ COMPLETED: ${topic} for ${shop} in ${duration}ms`);
        console.log(`[webhook] ========================================`);
        res.status(200).json({ success: true });
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[webhook] ❌ ERROR handling ${topic} after ${duration}ms:`, error);
        console.log(`[webhook] ========================================`);
        res.status(200).json({ success: true });
      }
    };
  };

  // Product webhooks (enqueued for async processing)
  app.post(
    "/api/webhooks/products/create",
    handleWebhook("products/create", async (shop, payload) => {
      const { processProductCreate } = await import("./webhook-processors");
      await processProductCreate(shop, payload);
    }, { useQueue: true })
  );

  app.post(
    "/api/webhooks/products/update",
    handleWebhook("products/update", async (shop, payload) => {
      const { processProductUpdate } = await import("./webhook-processors");
      await processProductUpdate(shop, payload);
    }, { useQueue: true })
  );

  app.post(
    "/api/webhooks/inventory_levels/update",
    handleWebhook("inventory_levels/update", async (shop, payload) => {
      const { processInventoryUpdate } = await import("./webhook-processors");
      await processInventoryUpdate(shop, payload);
    }, { useQueue: true })
  );

  // App uninstalled — delete all shop data
  app.post(
    "/api/webhooks/app/uninstalled",
    handleWebhook("app/uninstalled", async (shop, payload) => {
      const { processAppUninstalled } = await import("./webhook-processors");
      await processAppUninstalled(shop, payload);
    })
  );

  // GDPR mandatory webhooks
  app.post(
    "/api/webhooks/customers/data_request",
    handleWebhook("customers/data_request", async (shop, payload) => {
      const { processCustomersDataRequest } = await import("./webhook-processors");
      await processCustomersDataRequest(shop, payload);
    })
  );

  app.post(
    "/api/webhooks/customers/redact",
    handleWebhook("customers/redact", async (shop, payload) => {
      const { processCustomersRedact } = await import("./webhook-processors");
      await processCustomersRedact(shop, payload);
    })
  );

  app.post(
    "/api/webhooks/shop/redact",
    handleWebhook("shop/redact", async (shop, payload) => {
      const { processShopRedact } = await import("./webhook-processors");
      await processShopRedact(shop, payload);
    })
  );

  // Admin endpoint: manually clean up data for a shop (e.g., after failed uninstall webhook)
  app.delete("/api/admin/shop-data", async (req: Request, res: Response) => {
    try {
      const adminSecret = process.env.ADMIN_SECRET;
      const authHeader = req.headers.authorization;

      if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const shop = req.query.shop as string;
      if (!shop) {
        res.status(400).json({ error: "Missing shop parameter" });
        return;
      }

      const { processAppUninstalled } = await import("./webhook-processors");
      await processAppUninstalled(shop, {});

      console.log(`[admin] Manually cleaned up data for ${shop}`);
      res.json({ success: true, message: `All data deleted for ${shop}` });
    } catch (error) {
      console.error("[admin] Error cleaning up shop data:", error);
      res.status(500).json({ error: "Failed to clean up shop data" });
    }
  });

  console.log("[routes] Auth, shop, and webhook routes registered");

  // Register billing and onboarding routes
  try {
    const { setupBillingRoutes } = await import("./routes/billing");
    const { setupOnboardingRoutes } = await import("./routes/onboarding");
    
    setupBillingRoutes(app);
    setupOnboardingRoutes(app);
    
    console.log("[routes] Billing and onboarding routes registered");
  } catch (error) {
    console.error("[routes] Failed to register billing/onboarding routes:", error);
  }

  return httpServer;
}
