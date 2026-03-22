import crypto from "crypto";
import type { Request } from "express";
import { shopify } from "./shopify";

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

    const verified = crypto.timingSafeEqual(
      Buffer.from(computed),
      Buffer.from(hmacHeader)
    );

    if (!verified) {
      console.log("[webhook] Invalid signature");
    }

    return verified;
  } catch (error) {
    console.error("[webhook] Signature verification error:", error);
    return false;
  }
}

export function getShopFromWebhook(req: Request): string | null {
  const shopDomain = req.headers["x-shopify-shop-domain"] as string;
  if (shopDomain) return shopDomain;

  const shopHeader = req.headers["x-shopify-shop-id"] as string;
  return shopHeader || null;
}

export async function registerWebhooks(
  shop: string,
  accessToken: string
): Promise<boolean> {
  try {
    const baseUrl = process.env.APP_URL || process.env.HOST || "";

    if (!baseUrl) {
      console.error("[webhook] APP_URL or HOST env var is not set — cannot register webhooks");
      return false;
    }

    if (!accessToken) {
      console.error(`[webhook] No access token for ${shop} — cannot register webhooks`);
      return false;
    }

    console.log(`[webhook] Registering webhooks for ${shop} with base URL: ${baseUrl}`);

    const webhooksToRegister = [
      { topic: "app/uninstalled", address: `${baseUrl}/api/webhooks/app/uninstalled` },
      { topic: "products/create", address: `${baseUrl}/api/webhooks/products/create` },
      { topic: "products/update", address: `${baseUrl}/api/webhooks/products/update` },
      { topic: "inventory_levels/update", address: `${baseUrl}/api/webhooks/inventory_levels/update` },
    ];

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

    let successCount = 0;

    for (const webhook of webhooksToRegister) {
      try {
        console.log(`[webhook] Registering ${webhook.topic} → ${webhook.address}`);

        await client.post({
          path: "webhooks",
          data: {
            webhook: {
              topic: webhook.topic,
              address: webhook.address,
              format: "json",
            },
          },
        });

        successCount++;
        console.log(`[webhook] ✅ Registered ${webhook.topic}`);
      } catch (error: any) {
        const statusCode = error?.response?.code || error?.code || "unknown";
        const body = error?.response?.body || error?.message || "unknown error";
        const bodyStr = typeof body === "string" ? body : JSON.stringify(body);

        if (statusCode === 409 || statusCode === 422 || bodyStr.includes("already been taken")) {
          console.log(`[webhook] ✅ ${webhook.topic} already registered`);
          successCount++;
        } else {
          console.error(
            `[webhook] ❌ Failed to register ${webhook.topic} (status=${statusCode}):`,
            bodyStr
          );
        }
      }
    }

    console.log(
      `[webhook] Registration complete: ${successCount}/${webhooksToRegister.length} webhooks registered for ${shop}`
    );

    return successCount > 0;
  } catch (error) {
    console.error("[webhook] Error registering webhooks:", error);
    return false;
  }
}

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
