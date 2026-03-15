import "@shopify/shopify-api/adapters/node";
import { shopifyApi, LogSeverity } from "@shopify/shopify-api";
import { sessionStorage } from "./shopify-session-storage";

const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecretKey = process.env.SHOPIFY_API_SECRET;
const scopes = (
  process.env.SCOPES ||
  "write_products,read_products,write_inventory,read_inventory,write_webhooks,read_webhooks"
).split(",");
const apiVersion = process.env.SHOPIFY_API_VERSION || "2024-10";

const appUrl = process.env.APP_URL ||
  (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null);

if (!appUrl) {
  throw new Error(
    "APP_URL must be set, or REPLIT_DEV_DOMAIN must be available"
  );
}

const hostName = appUrl.replace(/https?:\/\//, "");

if (!apiKey || !apiSecretKey) {
  throw new Error("SHOPIFY_API_KEY and SHOPIFY_API_SECRET must be set");
}

console.log(`[shopify] APP_URL resolved to: ${appUrl}`);
console.log(`[shopify] hostName: ${hostName}`);
console.log(`[shopify] Callback URL: ${appUrl}/api/auth/callback`);

export const shopify = shopifyApi({
  apiKey,
  apiSecretKey,
  scopes,
  hostName,
  apiVersion: apiVersion as any,
  isEmbeddedApp: true,
  logger: {
    level: LogSeverity.Info,
  },
});

export { sessionStorage };
