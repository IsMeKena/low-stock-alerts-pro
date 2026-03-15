import crypto from "crypto";
import type { Request } from "express";
import { shopify } from "./shopify";

/**
 * Verify Shopify webhook signature
 */
export function verifyWebhookSignature(
  req: Request,
  secret: string
): boolean {
  try {
    const hmacHeader = req.headers["x-shopify-hmac-sha256"] as string;
    if (!hmacHeader) {
      console.log("[webhook] Missing HMAC header");
      return false;
    }

    const body = (req as any).rawBody as Buffer;
    if (!body) {
      console.log("[webhook] Missing raw body");
      return false;
    }

    const computed = crypto
      .createHmac("sha256", secret)
      .update(body.toString("utf8"))
      .digest("base64");

    const verified = computed === hmacHeader;

    if (!verified) {
      console.log("[webhook] Invalid signature");
      console.log(`[webhook] Expected: ${computed}`);
      console.log(`[webhook] Got: ${hmacHeader}`);
    }

    return verified;
  } catch (error) {
    console.error("[webhook] Signature verification error:", error);
    return false;
  }
}

/**
 * Get shop from webhook
 */
export function getShopFromWebhook(req: Request): string | null {
  try {
    const shop = req.headers["x-shopify-shop-api-call-limit"] as string;
    if (shop) {
      return shop.split("/")[1];
    }

    const topicHeader = req.headers["x-shopify-topic"] as string;
    if (!topicHeader) return null;

    // Topic format: "products/create", extract from shop param
    const shopHeader = req.headers["x-shopify-shop-id"] as string;
    return shopHeader || null;
  } catch (error) {
    console.error("[webhook] Error getting shop:", error);
    return null;
  }
}

/**
 * Register webhooks for a shop
 */
export async function registerWebhooks(
  shop: string,
  accessToken: string
): Promise<boolean> {
  try {
    const baseUrl = process.env.APP_URL || "https://localhost";

    const webhooksToRegister = [
      {
        topic: "products/create",
        address: `${baseUrl}/api/webhooks/products/create`,
      },
      {
        topic: "products/update",
        address: `${baseUrl}/api/webhooks/products/update`,
      },
      {
        topic: "inventory_levels/update",
        address: `${baseUrl}/api/webhooks/inventory_levels/update`,
      },
    ];

    for (const webhook of webhooksToRegister) {
      try {
        console.log(`[webhook] Registering ${webhook.topic} for ${shop}`);

        // Use Shopify REST API to register webhook
        const client = new shopify.clients.Rest({
          session: {
            shop,
            accessToken,
            scope: "",
            state: "",
            isOnline: false,
            id: `offline_${shop}`,
            expires: undefined,
          } as any,
        });

        await client.post({
          path: "/webhooks.json",
          data: {
            webhook: {
              topic: webhook.topic,
              address: webhook.address,
              format: "json",
            },
          },
        });

        console.log(`[webhook] Successfully registered ${webhook.topic}`);
      } catch (error) {
        console.error(`[webhook] Failed to register ${webhook.topic}:`, error);
        // Don't fail on individual webhook registration
      }
    }

    return true;
  } catch (error) {
    console.error("[webhook] Error registering webhooks:", error);
    return false;
  }
}

/**
 * Log webhook event
 */
export function logWebhookEvent(
  topic: string,
  shop: string,
  payload: any
): void {
  const timestamp = new Date().toISOString();
  console.log(`[webhook] ${timestamp} - ${topic} from ${shop}`);

  if (process.env.NODE_ENV !== "production") {
    console.log(`[webhook] Payload:`, JSON.stringify(payload, null, 2));
  }
}
