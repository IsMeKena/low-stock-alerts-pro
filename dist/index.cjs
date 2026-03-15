"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  alerts: () => alerts,
  insertShopifySessionSchema: () => insertShopifySessionSchema,
  inventory: () => inventory,
  products: () => products,
  shopifySessions: () => shopifySessions
});
var import_drizzle_orm, import_pg_core, import_drizzle_zod, shopifySessions, insertShopifySessionSchema, products, inventory, alerts;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    import_drizzle_orm = require("drizzle-orm");
    import_pg_core = require("drizzle-orm/pg-core");
    import_drizzle_zod = require("drizzle-zod");
    shopifySessions = (0, import_pg_core.pgTable)("shopify_sessions", {
      id: (0, import_pg_core.varchar)("id", { length: 255 }).primaryKey(),
      shop: (0, import_pg_core.varchar)("shop", { length: 255 }).notNull(),
      state: (0, import_pg_core.varchar)("state", { length: 255 }),
      isOnline: (0, import_pg_core.boolean)("is_online").default(false),
      scope: (0, import_pg_core.text)("scope"),
      expires: (0, import_pg_core.timestamp)("expires"),
      accessToken: (0, import_pg_core.text)("access_token"),
      onlineAccessInfo: (0, import_pg_core.text)("online_access_info")
    });
    insertShopifySessionSchema = (0, import_drizzle_zod.createInsertSchema)(shopifySessions).omit({});
    products = (0, import_pg_core.pgTable)("products", {
      id: (0, import_pg_core.varchar)("id", { length: 255 }).primaryKey(),
      shopDomain: (0, import_pg_core.varchar)("shop_domain", { length: 255 }).notNull(),
      shopifyProductId: (0, import_pg_core.varchar)("shopify_product_id", { length: 255 }).notNull(),
      title: (0, import_pg_core.text)("title").notNull(),
      handle: (0, import_pg_core.text)("handle"),
      imageUrl: (0, import_pg_core.text)("image_url"),
      createdAt: (0, import_pg_core.timestamp)("created_at").notNull().defaultNow(),
      updatedAt: (0, import_pg_core.timestamp)("updated_at").notNull().defaultNow()
    });
    inventory = (0, import_pg_core.pgTable)("inventory", {
      id: (0, import_pg_core.varchar)("id", { length: 255 }).primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
      shopDomain: (0, import_pg_core.varchar)("shop_domain", { length: 255 }).notNull(),
      productId: (0, import_pg_core.varchar)("product_id", { length: 255 }).notNull(),
      locationId: (0, import_pg_core.varchar)("location_id", { length: 255 }).notNull(),
      sku: (0, import_pg_core.text)("sku"),
      quantity: (0, import_pg_core.integer)("quantity").notNull().default(0),
      threshold: (0, import_pg_core.integer)("threshold").default(5),
      // Alert when below this
      lastUpdated: (0, import_pg_core.timestamp)("last_updated").notNull().defaultNow()
    });
    alerts = (0, import_pg_core.pgTable)("alerts", {
      id: (0, import_pg_core.varchar)("id", { length: 255 }).primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
      shopDomain: (0, import_pg_core.varchar)("shop_domain", { length: 255 }).notNull(),
      productId: (0, import_pg_core.varchar)("product_id", { length: 255 }).notNull(),
      locationId: (0, import_pg_core.varchar)("location_id", { length: 255 }),
      quantity: (0, import_pg_core.integer)("quantity").notNull(),
      threshold: (0, import_pg_core.integer)("threshold").notNull(),
      status: (0, import_pg_core.varchar)("status", { length: 20 }).default("active"),
      // active, resolved, archived
      createdAt: (0, import_pg_core.timestamp)("created_at").notNull().defaultNow(),
      resolvedAt: (0, import_pg_core.timestamp)("resolved_at")
    });
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  db: () => db
});
var import_node_postgres, import_pg, databaseUrl, pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    import_node_postgres = require("drizzle-orm/node-postgres");
    import_pg = require("pg");
    init_schema();
    databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    pool = new import_pg.Pool({
      connectionString: databaseUrl
    });
    db = (0, import_node_postgres.drizzle)(pool, { schema: schema_exports });
  }
});

// server/index.ts
var index_exports = {};
__export(index_exports, {
  log: () => log
});
module.exports = __toCommonJS(index_exports);
var import_config = require("dotenv/config");
var import_express = __toESM(require("express"), 1);

// server/shopify.ts
var import_node = require("@shopify/shopify-api/adapters/node");
var import_shopify_api2 = require("@shopify/shopify-api");

// server/shopify-session-storage.ts
var import_shopify_api = require("@shopify/shopify-api");
var import_drizzle_orm2 = require("drizzle-orm");
init_db();
init_schema();
var PostgresSessionStorage = class {
  async storeSession(session) {
    try {
      const sessionData = {
        id: session.id,
        shop: session.shop,
        state: session.state || null,
        isOnline: session.isOnline,
        scope: session.scope || null,
        expires: session.expires ? new Date(session.expires) : null,
        accessToken: session.accessToken || null,
        onlineAccessInfo: session.onlineAccessInfo ? JSON.stringify(session.onlineAccessInfo) : null
      };
      await db.insert(shopifySessions).values(sessionData).onConflictDoUpdate({
        target: shopifySessions.id,
        set: sessionData
      });
      return true;
    } catch (error) {
      console.error("Failed to store session:", error);
      return false;
    }
  }
  async loadSession(id) {
    try {
      const [row] = await db.select().from(shopifySessions).where((0, import_drizzle_orm2.eq)(shopifySessions.id, id));
      if (!row) return void 0;
      const session = new import_shopify_api.Session({
        id: row.id,
        shop: row.shop,
        state: row.state || "",
        isOnline: row.isOnline || false
      });
      if (row.scope) session.scope = row.scope;
      if (row.expires) session.expires = new Date(row.expires);
      if (row.accessToken) session.accessToken = row.accessToken;
      if (row.onlineAccessInfo) {
        session.onlineAccessInfo = JSON.parse(row.onlineAccessInfo);
      }
      return session;
    } catch (error) {
      console.error("Failed to load session:", error);
      return void 0;
    }
  }
  async deleteSession(id) {
    try {
      await db.delete(shopifySessions).where((0, import_drizzle_orm2.eq)(shopifySessions.id, id));
      return true;
    } catch (error) {
      console.error("Failed to delete session:", error);
      return false;
    }
  }
  async deleteSessions(ids) {
    try {
      for (const id of ids) {
        await db.delete(shopifySessions).where((0, import_drizzle_orm2.eq)(shopifySessions.id, id));
      }
      return true;
    } catch (error) {
      console.error("Failed to delete sessions:", error);
      return false;
    }
  }
  async findSessionsByShop(shop) {
    try {
      const rows = await db.select().from(shopifySessions).where((0, import_drizzle_orm2.eq)(shopifySessions.shop, shop));
      return rows.map((row) => {
        const session = new import_shopify_api.Session({
          id: row.id,
          shop: row.shop,
          state: row.state || "",
          isOnline: row.isOnline || false
        });
        if (row.scope) session.scope = row.scope;
        if (row.expires) session.expires = new Date(row.expires);
        if (row.accessToken) session.accessToken = row.accessToken;
        if (row.onlineAccessInfo) {
          session.onlineAccessInfo = JSON.parse(row.onlineAccessInfo);
        }
        return session;
      });
    } catch (error) {
      console.error("Failed to find sessions:", error);
      return [];
    }
  }
};
var sessionStorage = new PostgresSessionStorage();

// server/shopify.ts
var apiKey = process.env.SHOPIFY_API_KEY;
var apiSecretKey = process.env.SHOPIFY_API_SECRET;
var scopes = (process.env.SCOPES || "write_products,read_products,write_inventory,read_inventory,write_webhooks,read_webhooks").split(",");
var apiVersion = process.env.SHOPIFY_API_VERSION || "2024-10";
var appUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null);
if (!appUrl) {
  throw new Error(
    "APP_URL must be set, or REPLIT_DEV_DOMAIN must be available"
  );
}
var hostName = appUrl.replace(/https?:\/\//, "");
if (!apiKey || !apiSecretKey) {
  throw new Error("SHOPIFY_API_KEY and SHOPIFY_API_SECRET must be set");
}
console.log(`[shopify] APP_URL resolved to: ${appUrl}`);
console.log(`[shopify] hostName: ${hostName}`);
console.log(`[shopify] Callback URL: ${appUrl}/api/auth/callback`);
var shopify = (0, import_shopify_api2.shopifyApi)({
  apiKey,
  apiSecretKey,
  scopes,
  hostName,
  apiVersion,
  isEmbeddedApp: true,
  logger: {
    level: import_shopify_api2.LogSeverity.Info
  }
});

// server/middleware.ts
var rateLimitTracker = /* @__PURE__ */ new Map();
async function verifySessionToken(req, res, next) {
  try {
    const sessionToken = req.headers.authorization?.split(" ")[1];
    if (!sessionToken) {
      res.status(401).json({ error: "Missing session token" });
      return;
    }
    const decoded = await shopify.session.decodeSessionToken(sessionToken);
    if (!decoded) {
      res.status(401).json({ error: "Invalid session token" });
      return;
    }
    const shop = decoded.dest.replace("https://", "").replace("http://", "");
    const sessions = await sessionStorage.findSessionsByShop(shop);
    if (!sessions.length) {
      res.status(401).json({ error: "No session found for shop" });
      return;
    }
    req.shopifySession = sessions[0];
    next();
  } catch (error) {
    console.error("[middleware] Session token verification error:", error);
    res.status(401).json({ error: "Failed to verify session token" });
  }
}
function getRateLimitStatus(shop) {
  const status = rateLimitTracker.get(shop);
  if (!status) {
    return null;
  }
  const percentUsed = status.current / status.max * 100;
  return {
    current: status.current,
    max: status.max,
    percentUsed: Math.round(percentUsed),
    isWarning: percentUsed > 80,
    isCritical: percentUsed > 95,
    lastCheck: new Date(status.lastCheck).toISOString()
  };
}
async function checkRateLimitThreshold(req, res, next) {
  const shop = req.shopifySession?.shop;
  if (!shop) {
    return next();
  }
  const status = getRateLimitStatus(shop);
  if (status && status.isCritical) {
    console.warn(`[middleware] Blocking API call for ${shop} due to rate limit`);
    return res.status(429).json({
      error: "Too many requests - Shopify API rate limit exceeded",
      retryAfter: 60
    });
  }
  next();
}
function logApiCall(req, _res, next) {
  const shop = req.shopifySession?.shop || "unknown";
  const status = getRateLimitStatus(shop);
  if (status) {
    console.log(
      `[api] ${req.method} ${req.path} - Rate limit: ${status.current}/${status.max}`
    );
  }
  next();
}

// server/auth-utils.ts
async function handleOAuthSession(session) {
  try {
    const stored = await sessionStorage.storeSession(session);
    if (!stored) {
      throw new Error("Failed to store session");
    }
    console.log(
      `[auth] Successfully stored session for ${session.shop} with access token`
    );
    return {
      success: true,
      shop: session.shop,
      accessToken: session.accessToken,
      scope: session.scope
    };
  } catch (error) {
    console.error("[auth] Error handling OAuth session:", error);
    throw error;
  }
}
async function getShopSession(shop) {
  try {
    const sessions = await sessionStorage.findSessionsByShop(shop);
    if (sessions.length === 0) {
      return null;
    }
    return sessions[0];
  } catch (error) {
    console.error("[auth] Error getting shop session:", error);
    return null;
  }
}
async function verifySessionToken2(token) {
  try {
    const decoded = await shopify.session.decodeSessionToken(token);
    if (!decoded) {
      return null;
    }
    const shop = decoded.dest.replace(/https?:\/\//, "").replace("http://", "");
    const session = await getShopSession(shop);
    if (!session) {
      console.log(`[auth] No stored session found for ${shop}`);
      return null;
    }
    return {
      valid: true,
      shop,
      scope: session.scope,
      accessToken: session.accessToken
    };
  } catch (error) {
    console.error("[auth] Error verifying session token:", error);
    return null;
  }
}
async function isShopInstalled(shop) {
  const session = await getShopSession(shop);
  return session !== null && session.accessToken !== null;
}

// server/webhook-handler.ts
var import_crypto = __toESM(require("crypto"), 1);
function verifyWebhookSignature(req, secret) {
  try {
    const hmacHeader = req.headers["x-shopify-hmac-sha256"];
    if (!hmacHeader) {
      console.log("[webhook] Missing HMAC header");
      return false;
    }
    const body = req.rawBody;
    if (!body) {
      console.log("[webhook] Missing raw body");
      return false;
    }
    const computed = import_crypto.default.createHmac("sha256", secret).update(body.toString("utf8")).digest("base64");
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
async function registerWebhooks(shop, accessToken) {
  try {
    const baseUrl = process.env.APP_URL || "https://localhost";
    const webhooksToRegister = [
      {
        topic: "products/create",
        address: `${baseUrl}/api/webhooks/products/create`
      },
      {
        topic: "products/update",
        address: `${baseUrl}/api/webhooks/products/update`
      },
      {
        topic: "inventory_levels/update",
        address: `${baseUrl}/api/webhooks/inventory_levels/update`
      }
    ];
    for (const webhook of webhooksToRegister) {
      try {
        console.log(`[webhook] Registering ${webhook.topic} for ${shop}`);
        const client = new shopify.clients.Rest({
          session: {
            shop,
            accessToken,
            scope: "",
            state: "",
            isOnline: false,
            id: `offline_${shop}`,
            expires: void 0
          }
        });
        await client.post({
          path: "/webhooks.json",
          data: {
            webhook: {
              topic: webhook.topic,
              address: webhook.address,
              format: "json"
            }
          }
        });
        console.log(`[webhook] Successfully registered ${webhook.topic}`);
      } catch (error) {
        console.error(`[webhook] Failed to register ${webhook.topic}:`, error);
      }
    }
    return true;
  } catch (error) {
    console.error("[webhook] Error registering webhooks:", error);
    return false;
  }
}
function logWebhookEvent(topic, shop, payload) {
  const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
  console.log(`[webhook] ${timestamp2} - ${topic} from ${shop}`);
  if (process.env.NODE_ENV !== "production") {
    console.log(`[webhook] Payload:`, JSON.stringify(payload, null, 2));
  }
}

// server/webhook-queue.ts
var import_bull = __toESM(require("bull"), 1);

// server/webhook-processors.ts
init_db();
init_schema();
var import_drizzle_orm4 = require("drizzle-orm");

// server/alerts.ts
init_db();
init_schema();
var import_drizzle_orm3 = require("drizzle-orm");
async function createLowStockAlert(shop, productId, locationId, quantity, threshold) {
  try {
    const alertId = `${shop}__${productId}__${locationId}__${Date.now()}`;
    const existing = await db.select().from(alerts).where(
      (0, import_drizzle_orm3.and)(
        (0, import_drizzle_orm3.eq)(alerts.shopDomain, shop),
        (0, import_drizzle_orm3.eq)(alerts.productId, productId),
        (0, import_drizzle_orm3.eq)(alerts.status, "active")
      )
    ).limit(1);
    if (existing.length > 0) {
      console.log(
        `[alerts] Active alert already exists for product ${productId} in ${shop}`
      );
      return existing[0].id;
    }
    await db.insert(alerts).values({
      id: alertId,
      shopDomain: shop,
      productId,
      locationId: locationId || null,
      quantity,
      threshold,
      status: "active"
    });
    console.log(
      `[alerts] Created low stock alert for ${productId}: ${quantity}/${threshold}`
    );
    return alertId;
  } catch (error) {
    console.error("[alerts] Error creating alert:", error);
    throw error;
  }
}
async function resolveAlert(alertId) {
  try {
    await db.update(alerts).set({
      status: "resolved",
      resolvedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm3.eq)(alerts.id, alertId));
    console.log(`[alerts] Resolved alert ${alertId}`);
  } catch (error) {
    console.error("[alerts] Error resolving alert:", error);
    throw error;
  }
}
async function getActiveAlerts(shop) {
  try {
    const shopAlerts = await db.select().from(alerts).where(
      (0, import_drizzle_orm3.and)((0, import_drizzle_orm3.eq)(alerts.shopDomain, shop), (0, import_drizzle_orm3.eq)(alerts.status, "active"))
    );
    const enriched = await Promise.all(
      shopAlerts.map(async (alert) => {
        const product = await db.select().from(products).where((0, import_drizzle_orm3.eq)(products.shopifyProductId, alert.productId)).limit(1);
        return {
          ...alert,
          product: product[0] || null
        };
      })
    );
    return enriched;
  } catch (error) {
    console.error("[alerts] Error getting active alerts:", error);
    return [];
  }
}
async function checkInventoryAlert(shop, productId, locationId, quantity, threshold) {
  try {
    if (quantity <= threshold) {
      const alertId = await createLowStockAlert(
        shop,
        productId,
        locationId,
        quantity,
        threshold
      );
      console.log(
        `[alerts] Alert created for low inventory: ${alertId}`
      );
    } else {
      const existing = await db.select().from(alerts).where(
        (0, import_drizzle_orm3.and)(
          (0, import_drizzle_orm3.eq)(alerts.shopDomain, shop),
          (0, import_drizzle_orm3.eq)(alerts.productId, productId),
          (0, import_drizzle_orm3.eq)(alerts.status, "active")
        )
      );
      for (const alert of existing) {
        if (quantity > threshold) {
          await resolveAlert(alert.id);
          console.log(
            `[alerts] Resolved alert ${alert.id} (inventory back to normal)`
          );
        }
      }
    }
  } catch (error) {
    console.error("[alerts] Error checking inventory alert:", error);
  }
}

// server/webhook-processors.ts
async function processProductCreate(shop, payload) {
  try {
    const { id, title, handle, image } = payload;
    const productId = `${shop}__${id}`;
    await db.insert(products).values({
      id: productId,
      shopDomain: shop,
      shopifyProductId: String(id),
      title,
      handle,
      imageUrl: image?.src || null
    });
    console.log(
      `[webhook] Created product "${title}" (${id}) for ${shop}`
    );
  } catch (error) {
    console.error("[webhook] Error processing product create:", error);
  }
}
async function processProductUpdate(shop, payload) {
  try {
    const { id, title, handle, image } = payload;
    const productId = `${shop}__${id}`;
    await db.update(products).set({
      title,
      handle,
      imageUrl: image?.src || null,
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm4.eq)(products.id, productId));
    console.log(
      `[webhook] Updated product "${title}" (${id}) for ${shop}`
    );
  } catch (error) {
    console.error("[webhook] Error processing product update:", error);
  }
}
async function processInventoryUpdate(shop, payload) {
  try {
    const {
      inventory_item_id: inventoryItemId,
      location_id: locationId,
      available: quantity,
      updated_at: updatedAt
    } = payload;
    if (!inventoryItemId || !locationId) {
      console.log("[webhook] Missing inventory_item_id or location_id");
      return;
    }
    const inventoryId = `${shop}__${inventoryItemId}__${locationId}`;
    const existing = await db.select().from(inventory).where(
      (0, import_drizzle_orm4.and)(
        (0, import_drizzle_orm4.eq)(inventory.shopDomain, shop),
        (0, import_drizzle_orm4.eq)(inventory.locationId, String(locationId))
      )
    ).limit(1);
    if (existing.length > 0) {
      await db.update(inventory).set({
        quantity: quantity || 0,
        lastUpdated: new Date(updatedAt)
      }).where((0, import_drizzle_orm4.eq)(inventory.id, existing[0].id));
      console.log(
        `[webhook] Updated inventory: ${inventoryItemId} at location ${locationId} = ${quantity}`
      );
      const threshold = existing[0].threshold || 5;
      if (quantity !== existing[0].quantity) {
        await checkInventoryAlert(
          shop,
          existing[0].productId,
          String(locationId),
          quantity || 0,
          threshold
        );
      }
    } else {
      const invRecord = {
        id: inventoryId,
        shopDomain: shop,
        productId: String(inventoryItemId),
        locationId: String(locationId),
        quantity: quantity || 0,
        lastUpdated: new Date(updatedAt)
      };
      await db.insert(inventory).values(invRecord);
      console.log(
        `[webhook] Created inventory: ${inventoryItemId} at location ${locationId} = ${quantity}`
      );
      const threshold = 5;
      await checkInventoryAlert(shop, invRecord.productId, String(locationId), quantity || 0, threshold);
    }
  } catch (error) {
    console.error("[webhook] Error processing inventory update:", error);
  }
}

// server/webhook-queue.ts
var webhookQueue = new import_bull.default("webhooks", {
  // Use default connection (will use REDIS_URL env var if available, else defaults to localhost:6379)
  redis: process.env.REDIS_URL || { host: "127.0.0.1", port: 6379 },
  defaultJobOptions: {
    attempts: 3,
    // Retry failed jobs up to 3 times
    backoff: {
      type: "exponential",
      delay: 2e3
      // Start with 2 seconds, exponentially increase
    },
    removeOnComplete: true
    // Clean up completed jobs
  }
});
webhookQueue.process(async (job) => {
  const { topic, shop, payload } = job.data;
  const jobId = job.id;
  try {
    console.log(`[webhook-queue] Processing ${topic} for ${shop} (job ${jobId})`);
    switch (topic) {
      case "products/create":
        await processProductCreate(shop, payload);
        break;
      case "products/update":
        await processProductUpdate(shop, payload);
        break;
      case "inventory_levels/update":
        await processInventoryUpdate(shop, payload);
        break;
      default:
        console.warn(`[webhook-queue] Unknown webhook topic: ${topic}`);
    }
    console.log(`[webhook-queue] Successfully processed ${topic} for ${shop} (job ${jobId})`);
  } catch (error) {
    console.error(`[webhook-queue] Error processing ${topic} for ${shop}:`, error);
    throw error;
  }
});
webhookQueue.on("completed", (job) => {
  console.log(`[webhook-queue] Job ${job.id} completed successfully`);
});
webhookQueue.on("failed", (job, err) => {
  console.error(`[webhook-queue] Job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);
});
webhookQueue.on("error", (error) => {
  console.error("[webhook-queue] Queue error:", error);
});
async function enqueueWebhook(topic, shop, payload) {
  try {
    const job = await webhookQueue.add(
      { topic, shop, payload },
      {
        jobId: `${topic}__${shop}__${Date.now()}`
        // Unique job ID for idempotency
      }
    );
    console.log(`[webhook-queue] Enqueued ${topic} for ${shop} (job ${job.id})`);
    return true;
  } catch (error) {
    console.error(`[webhook-queue] Failed to enqueue ${topic} for ${shop}:`, error);
    return false;
  }
}
async function closeWebhookQueue() {
  try {
    await webhookQueue.close();
    console.log("[webhook-queue] Queue closed successfully");
  } catch (error) {
    console.error("[webhook-queue] Error closing queue:", error);
  }
}

// server/shopify-api.ts
init_db();
init_schema();
var import_drizzle_orm5 = require("drizzle-orm");
async function fetchShopifyProducts(shop, accessToken) {
  try {
    const client = new shopify.clients.Rest({
      session: {
        shop,
        accessToken,
        scope: "",
        state: "",
        isOnline: false,
        id: `offline_${shop}`
      }
    });
    const allProducts = [];
    let sinceId = null;
    const pageSize = 250;
    console.log(`[shopify-api] Fetching products for ${shop}`);
    while (true) {
      let path = `/products.json?limit=${pageSize}&fields=id,title,handle,image,variants`;
      if (sinceId) {
        path += `&since_id=${sinceId}`;
      }
      const response = await client.get({
        path
      });
      if (!response?.body?.products) {
        console.error("[shopify-api] Invalid response:", response);
        break;
      }
      const products2 = response.body.products;
      for (const product of products2) {
        allProducts.push(product);
      }
      console.log(
        `[shopify-api] Fetched ${products2.length} products (total: ${allProducts.length})`
      );
      if (products2.length < pageSize) {
        break;
      }
      sinceId = products2[products2.length - 1].id;
    }
    console.log(
      `[shopify-api] Completed fetching ${allProducts.length} products for ${shop}`
    );
    return allProducts;
  } catch (error) {
    console.error("[shopify-api] Error fetching products:", error);
    throw error;
  }
}
async function syncProducts(shop, accessToken) {
  try {
    const shopifyProducts = await fetchShopifyProducts(shop, accessToken);
    let created = 0;
    let updated = 0;
    for (const product of shopifyProducts) {
      const productId = `${shop}__${product.id}`;
      const title = product.title;
      const handle = product.handle;
      const imageUrl = product.image?.src || null;
      const existing = await db.select().from(products).where((0, import_drizzle_orm5.eq)(products.id, productId)).limit(1);
      if (existing.length > 0) {
        await db.update(products).set({
          title,
          handle,
          imageUrl,
          updatedAt: /* @__PURE__ */ new Date()
        }).where((0, import_drizzle_orm5.eq)(products.id, productId));
        updated++;
      } else {
        await db.insert(products).values({
          id: productId,
          shopDomain: shop,
          shopifyProductId: product.id.replace("gid://shopify/Product/", ""),
          title,
          handle,
          imageUrl
        });
        created++;
      }
      if (product.variants && Array.isArray(product.variants)) {
        for (const variant of product.variants) {
          if (variant.inventory_item_id) {
            const inventoryItemId = variant.inventory_item_id;
            try {
              await syncInventoryForItem(shop, accessToken, inventoryItemId, productId);
            } catch (error) {
              console.log(
                `[shopify-api] Could not sync inventory for item ${inventoryItemId}:`,
                error
              );
            }
          }
        }
      }
    }
    console.log(
      `[shopify-api] Sync complete: ${created} created, ${updated} updated for ${shop}`
    );
    return { created, updated };
  } catch (error) {
    console.error("[shopify-api] Error syncing products:", error);
    throw error;
  }
}
async function syncInventoryForItem(shop, accessToken, inventoryItemId, productId) {
  try {
    const client = new shopify.clients.Rest({
      session: {
        shop,
        accessToken,
        scope: "",
        state: "",
        isOnline: false,
        id: `offline_${shop}`
      }
    });
    const response = await client.get({
      path: `/inventory_items/${inventoryItemId}`
    });
    if (!response?.body?.inventory_item) {
      return;
    }
    const item = response.body.inventory_item;
    const sku = item.sku;
    const locationsResponse = await client.get({
      path: `/inventory_levels?inventory_item_ids=${inventoryItemId}`
    });
    if (locationsResponse?.body?.inventory_levels) {
      for (const level of locationsResponse.body.inventory_levels) {
        const locationId = level.location_id;
        const quantity = level.available || 0;
        const inventoryId = `${shop}__${inventoryItemId}__${locationId}`;
        const existing = await db.select().from(inventory).where((0, import_drizzle_orm5.eq)(inventory.id, inventoryId)).limit(1);
        if (existing.length > 0) {
          await db.update(inventory).set({
            quantity,
            lastUpdated: /* @__PURE__ */ new Date()
          }).where((0, import_drizzle_orm5.eq)(inventory.id, inventoryId));
        } else {
          await db.insert(inventory).values({
            id: inventoryId,
            shopDomain: shop,
            productId,
            locationId: String(locationId),
            sku,
            quantity
          });
        }
      }
    }
  } catch (error) {
    console.error("[shopify-api] Error syncing inventory for item:", error);
  }
}

// server/routes.ts
async function registerRoutes(httpServer2, app2) {
  app2.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", message: "low-stock-alerts is running" });
  });
  app2.get("/api/auth", async (req, res) => {
    try {
      const shop = req.query.shop;
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
        rawResponse: res
      });
    } catch (error) {
      console.error("Auth begin error:", error);
      res.status(500).json({ error: "Failed to begin authentication" });
    }
  });
  app2.get("/api/auth/callback", async (req, res) => {
    try {
      const callback = await shopify.auth.callback({
        rawRequest: req,
        rawResponse: res
      });
      const session = callback.session;
      const result = await handleOAuthSession(session);
      if (!result.success) {
        throw new Error("Failed to handle OAuth session");
      }
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
      console.log(`[auth] Starting product sync for ${result.shop}`);
      syncProducts(result.shop, result.accessToken || "").then(({ created, updated }) => {
        console.log(
          `[auth] Product sync complete: ${created} created, ${updated} updated`
        );
      }).catch((error) => {
        console.error(`[auth] Product sync failed:`, error);
      });
      const host = req.query.host;
      const sanitizedShop = shopify.utils.sanitizeShop(result.shop);
      const redirectUrl = `/?shop=${sanitizedShop}&host=${host}`;
      console.log(`[auth] Redirecting to ${redirectUrl}`);
      res.redirect(redirectUrl);
    } catch (error) {
      const shop = req.query.shop;
      const host = req.query.host;
      if (error.constructor?.name === "CookieNotFound" || error.message?.includes("Could not find an OAuth cookie")) {
        if (shop) {
          const sanitizedShop = shopify.utils.sanitizeShop(shop);
          if (sanitizedShop) {
            console.log(
              `[auth] Cookie not found for ${sanitizedShop}, redirecting to app`
            );
            const redirectUrl = host ? `/?shop=${sanitizedShop}&host=${host}` : `/?shop=${sanitizedShop}`;
            res.redirect(redirectUrl);
            return;
          }
        }
      }
      console.error("[auth] Auth callback error:", error);
      res.status(500).json({ error: "Failed to complete authentication" });
    }
  });
  app2.post("/api/auth/session-status", async (req, res) => {
    try {
      const { shop, token } = req.body;
      if (!shop || !token) {
        res.status(400).json({ error: "Missing shop or token", installed: false });
        return;
      }
      const sanitizedShop = shopify.utils.sanitizeShop(shop);
      if (!sanitizedShop) {
        res.status(400).json({ error: "Invalid shop domain", installed: false });
        return;
      }
      const verified = await verifySessionToken2(token);
      if (verified && verified.valid) {
        console.log(`[auth] Session verified for ${sanitizedShop}`);
        res.json({
          installed: true,
          shop: sanitizedShop,
          scope: verified.scope
        });
      } else {
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
  app2.get("/api/auth/installed", async (req, res) => {
    try {
      const shop = req.query.shop;
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
  app2.get("/api/shopify/shop", verifySessionToken, (req, res) => {
    try {
      const session = req.shopifySession;
      res.json({
        shop: session.shop,
        scope: session.scope
      });
    } catch (error) {
      console.error("[auth] Get shop error:", error);
      res.status(500).json({ error: "Failed to get shop info" });
    }
  });
  app2.get(
    "/api/products",
    verifySessionToken,
    checkRateLimitThreshold,
    logApiCall,
    async (req, res) => {
      try {
        const session = req.shopifySession;
        const { db: database } = await Promise.resolve().then(() => (init_db(), db_exports));
        const { products: productsTable, inventory: inventoryTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        const { eq: eq5 } = await import("drizzle-orm");
        const shopProducts = await database.select().from(productsTable).where(eq5(productsTable.shopDomain, session.shop));
        const productsWithInventory = await Promise.all(
          shopProducts.map(async (product) => {
            const inventoryRecords = await database.select().from(inventoryTable).where(eq5(inventoryTable.productId, product.shopifyProductId));
            return {
              ...product,
              inventory: inventoryRecords
            };
          })
        );
        res.json({
          shop: session.shop,
          products: productsWithInventory,
          count: productsWithInventory.length
        });
      } catch (error) {
        console.error("[api] Get products error:", error);
        res.status(500).json({ error: "Failed to get products" });
      }
    }
  );
  app2.get(
    "/api/alerts",
    verifySessionToken,
    checkRateLimitThreshold,
    logApiCall,
    async (req, res) => {
      try {
        const session = req.shopifySession;
        const activeAlerts = await getActiveAlerts(session.shop);
        res.json({
          shop: session.shop,
          alerts: activeAlerts,
          count: activeAlerts.length
        });
      } catch (error) {
        console.error("[api] Get alerts error:", error);
        res.status(500).json({ error: "Failed to get alerts" });
      }
    }
  );
  app2.post(
    "/api/alerts/:alertId/resolve",
    verifySessionToken,
    checkRateLimitThreshold,
    logApiCall,
    async (req, res) => {
      try {
        const alertId = Array.isArray(req.params.alertId) ? req.params.alertId[0] : req.params.alertId;
        const session = req.shopifySession;
        const { db: database } = await Promise.resolve().then(() => (init_db(), db_exports));
        const { alerts: alertsTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        const { eq: eq5 } = await import("drizzle-orm");
        const alertResult = await database.select().from(alertsTable).where(eq5(alertsTable.id, alertId)).limit(1);
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
  const getShopFromPayload = (body) => {
    return body?.shop?.id ? `${body.shop.id}.myshopify.com` : null;
  };
  app2.post("/api/webhooks/products/create", async (req, res) => {
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
      const enqueued = await enqueueWebhook("products/create", shop, req.body);
      if (!enqueued) {
        console.warn("[webhook] Failed to enqueue products/create webhook, processing inline as fallback");
      }
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("[webhook] Error handling products/create:", error);
      res.status(200).json({ success: true });
    }
  });
  app2.post("/api/webhooks/products/update", async (req, res) => {
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
      const enqueued = await enqueueWebhook("products/update", shop, req.body);
      if (!enqueued) {
        console.warn("[webhook] Failed to enqueue products/update webhook, processing inline as fallback");
      }
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("[webhook] Error handling products/update:", error);
      res.status(200).json({ success: true });
    }
  });
  app2.post(
    "/api/webhooks/inventory_levels/update",
    async (req, res) => {
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
        const enqueued = await enqueueWebhook("inventory_levels/update", shop, req.body);
        if (!enqueued) {
          console.warn("[webhook] Failed to enqueue inventory webhook, processing inline as fallback");
        }
        res.status(200).json({ success: true });
      } catch (error) {
        console.error("[webhook] Error handling inventory_levels/update:", error);
        res.status(200).json({ success: true });
      }
    }
  );
  console.log("[routes] Auth, shop, and webhook routes registered");
  return httpServer2;
}

// server/index.ts
var import_http = require("http");
var import_path = require("path");
var app = (0, import_express.default)();
var httpServer = (0, import_http.createServer)(app);
app.use(
  import_express.default.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(import_express.default.urlencoded({ extended: false }));
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
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
(async () => {
  await registerRoutes(httpServer, app);
  app.use((err, _req, res, next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });
  if (process.env.NODE_ENV === "production") {
    const staticPath = (0, import_path.join)(process.cwd(), "dist/public");
    app.use(import_express.default.static(staticPath));
    app.use((req, res, next) => {
      if (!req.path.startsWith("/api") && !res.headersSent) {
        const indexPath = (0, import_path.join)(staticPath, "index.html");
        res.sendFile(indexPath, (err) => {
          if (err) next(err);
        });
      } else {
        next();
      }
    });
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0"
    },
    () => {
      log(`low-stock-alerts server running on port ${port}`);
      log(`Environment: ${process.env.NODE_ENV || "development"}`);
    }
  );
  process.on("SIGTERM", async () => {
    log("SIGTERM received, shutting down gracefully...");
    await closeWebhookQueue();
    httpServer.close(() => {
      log("Server closed");
      process.exit(0);
    });
  });
  process.on("SIGINT", async () => {
    log("SIGINT received, shutting down gracefully...");
    await closeWebhookQueue();
    httpServer.close(() => {
      log("Server closed");
      process.exit(0);
    });
  });
})();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  log
});
