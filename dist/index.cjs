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
  batchingQueue: () => batchingQueue,
  billingPlans: () => billingPlans,
  insertShopifySessionSchema: () => insertShopifySessionSchema,
  inventory: () => inventory,
  products: () => products,
  shopSettings: () => shopSettings,
  shopifySessions: () => shopifySessions,
  usageTracker: () => usageTracker
});
var import_drizzle_orm, import_pg_core, import_drizzle_zod, shopifySessions, insertShopifySessionSchema, products, inventory, alerts, billingPlans, usageTracker, shopSettings, batchingQueue;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    import_drizzle_orm = require("drizzle-orm");
    import_pg_core = require("drizzle-orm/pg-core");
    import_drizzle_zod = require("drizzle-zod");
    shopifySessions = (0, import_pg_core.pgTable)(
      "shopify_sessions",
      {
        id: (0, import_pg_core.varchar)("id", { length: 255 }).primaryKey(),
        shop: (0, import_pg_core.varchar)("shop", { length: 255 }).notNull(),
        state: (0, import_pg_core.varchar)("state", { length: 255 }),
        isOnline: (0, import_pg_core.boolean)("is_online").default(false),
        scope: (0, import_pg_core.text)("scope"),
        expires: (0, import_pg_core.timestamp)("expires"),
        accessToken: (0, import_pg_core.text)("access_token"),
        onlineAccessInfo: (0, import_pg_core.text)("online_access_info")
      },
      (table) => [
        (0, import_pg_core.index)("idx_sessions_shop").on(table.shop),
        import_drizzle_orm.sql`CONSTRAINT check_session_validity CHECK (access_token IS NOT NULL OR state IS NOT NULL)`
      ]
    );
    insertShopifySessionSchema = (0, import_drizzle_zod.createInsertSchema)(shopifySessions).omit({});
    products = (0, import_pg_core.pgTable)("products", {
      id: (0, import_pg_core.varchar)("id", { length: 255 }).primaryKey(),
      shopDomain: (0, import_pg_core.varchar)("shop_domain", { length: 255 }).notNull(),
      shopifyProductId: (0, import_pg_core.varchar)("shopify_product_id", { length: 255 }).notNull(),
      title: (0, import_pg_core.text)("title").notNull(),
      handle: (0, import_pg_core.text)("handle"),
      imageUrl: (0, import_pg_core.text)("image_url"),
      // Smart thresholds (Phase 4)
      thresholdType: (0, import_pg_core.varchar)("threshold_type", { length: 20 }).default("quantity"),
      // quantity or percentage
      thresholdValue: (0, import_pg_core.integer)("threshold_value").default(5),
      // units or %
      safetyStock: (0, import_pg_core.integer)("safety_stock").default(10),
      // for percentage mode
      locationId: (0, import_pg_core.varchar)("location_id", { length: 255 }),
      // for location-aware alerts
      createdAt: (0, import_pg_core.timestamp)("created_at").notNull().defaultNow(),
      updatedAt: (0, import_pg_core.timestamp)("updated_at").notNull().defaultNow()
    }, (table) => [
      (0, import_pg_core.index)("idx_products_shop_domain").on(table.shopDomain),
      (0, import_pg_core.index)("idx_products_shopify_id").on(table.shopifyProductId)
    ]);
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
    }, (table) => [
      (0, import_pg_core.index)("idx_inventory_shop_domain").on(table.shopDomain),
      (0, import_pg_core.index)("idx_inventory_product_id").on(table.productId),
      (0, import_pg_core.index)("idx_inventory_product_location").on(table.productId, table.locationId)
    ]);
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
    }, (table) => [
      (0, import_pg_core.index)("idx_alerts_shop_domain").on(table.shopDomain),
      (0, import_pg_core.index)("idx_alerts_shop_product_status").on(table.shopDomain, table.productId, table.status),
      (0, import_pg_core.index)("idx_alerts_shop_product_location_status").on(table.shopDomain, table.productId, table.locationId, table.status)
    ]);
    billingPlans = (0, import_pg_core.pgTable)("billing_plan", {
      id: (0, import_pg_core.varchar)("id", { length: 255 }).primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
      shopDomain: (0, import_pg_core.varchar)("shop_domain", { length: 255 }).notNull().unique(),
      plan: (0, import_pg_core.varchar)("plan", { length: 20 }).notNull().default("free"),
      // free, pro, premium
      createdAt: (0, import_pg_core.timestamp)("created_at").notNull().defaultNow(),
      updatedAt: (0, import_pg_core.timestamp)("updated_at").notNull().defaultNow()
    });
    usageTracker = (0, import_pg_core.pgTable)("usage_tracker", {
      id: (0, import_pg_core.varchar)("id", { length: 255 }).primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
      shopDomain: (0, import_pg_core.varchar)("shop_domain", { length: 255 }).notNull(),
      plan: (0, import_pg_core.varchar)("plan", { length: 20 }).notNull(),
      emailCount: (0, import_pg_core.integer)("email_count").notNull().default(0),
      whatsappCount: (0, import_pg_core.integer)("whatsapp_count").notNull().default(0),
      month: (0, import_pg_core.varchar)("month", { length: 7 }).notNull(),
      // YYYY-MM
      usageRemaining: (0, import_pg_core.integer)("usage_remaining").notNull().default(0),
      createdAt: (0, import_pg_core.timestamp)("created_at").notNull().defaultNow(),
      updatedAt: (0, import_pg_core.timestamp)("updated_at").notNull().defaultNow()
    }, (table) => [
      (0, import_pg_core.uniqueIndex)("idx_usage_tracker_shop_month").on(table.shopDomain, table.month)
    ]);
    shopSettings = (0, import_pg_core.pgTable)("shop_settings", {
      id: (0, import_pg_core.varchar)("id", { length: 255 }).primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
      shopDomain: (0, import_pg_core.varchar)("shop_domain", { length: 255 }).notNull().unique(),
      // Notification settings
      notificationMethod: (0, import_pg_core.varchar)("notification_method", { length: 20 }).default("email"),
      // email, whatsapp, both
      notificationEmail: (0, import_pg_core.varchar)("notification_email", { length: 255 }),
      // Custom email for alerts
      whatsappNumber: (0, import_pg_core.varchar)("whatsapp_number", { length: 20 }),
      // +1234567890 format
      // Threshold settings (defaults)
      thresholdType: (0, import_pg_core.varchar)("threshold_type", { length: 20 }).default("quantity"),
      // quantity or percentage
      thresholdValue: (0, import_pg_core.integer)("threshold_value").default(5),
      // units or %
      safetyStock: (0, import_pg_core.integer)("safety_stock").default(10),
      // for percentage mode
      // Batching settings
      batchingEnabled: (0, import_pg_core.boolean)("batching_enabled").default(false),
      batchingInterval: (0, import_pg_core.varchar)("batching_interval", { length: 20 }).default("daily"),
      // hourly, daily, weekly
      emailAlertsEnabled: (0, import_pg_core.boolean)("email_alerts_enabled").default(true),
      // Onboarding & upsell
      isOnboarded: (0, import_pg_core.boolean)("is_onboarded").default(false),
      dismissedUpsellBanner: (0, import_pg_core.boolean)("dismissed_upsell_banner").default(false),
      accessToken: (0, import_pg_core.text)("access_token"),
      webhooksRegistered: (0, import_pg_core.boolean)("webhooks_registered").default(false),
      createdAt: (0, import_pg_core.timestamp)("created_at").notNull().defaultNow(),
      updatedAt: (0, import_pg_core.timestamp)("updated_at").notNull().defaultNow()
    });
    batchingQueue = (0, import_pg_core.pgTable)("batching_queue", {
      id: (0, import_pg_core.varchar)("id", { length: 255 }).primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
      shopDomain: (0, import_pg_core.varchar)("shop_domain", { length: 255 }).notNull(),
      alertId: (0, import_pg_core.varchar)("alert_id", { length: 255 }).notNull(),
      productId: (0, import_pg_core.varchar)("product_id", { length: 255 }).notNull(),
      locationId: (0, import_pg_core.varchar)("location_id", { length: 255 }),
      quantity: (0, import_pg_core.integer)("quantity").notNull(),
      threshold: (0, import_pg_core.integer)("threshold").notNull(),
      alertType: (0, import_pg_core.varchar)("alert_type", { length: 20 }).notNull(),
      // email, whatsapp
      status: (0, import_pg_core.varchar)("status", { length: 20 }).default("pending"),
      // pending, sent, failed
      scheduledFor: (0, import_pg_core.timestamp)("scheduled_for").notNull(),
      sentAt: (0, import_pg_core.timestamp)("sent_at"),
      createdAt: (0, import_pg_core.timestamp)("created_at").notNull().defaultNow()
    }, (table) => [
      (0, import_pg_core.index)("idx_batching_shop_status").on(table.shopDomain, table.status),
      (0, import_pg_core.index)("idx_batching_scheduled").on(table.status, table.scheduledFor)
    ]);
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  client: () => client,
  db: () => db,
  runMigrations: () => runMigrations
});
async function ensureTables() {
  console.log("[db] Ensuring tables exist...");
  try {
    const createTablesSQL = `
      CREATE TABLE IF NOT EXISTS shopify_sessions (
        id varchar(255) PRIMARY KEY NOT NULL,
        shop varchar(255) NOT NULL,
        state varchar(255),
        is_online boolean DEFAULT false,
        scope text,
        expires timestamp,
        access_token text,
        online_access_info text,
        CONSTRAINT check_session_validity CHECK (access_token IS NOT NULL OR state IS NOT NULL)
      );

      CREATE TABLE IF NOT EXISTS products (
        id varchar(255) PRIMARY KEY NOT NULL,
        shop_domain varchar(255) NOT NULL,
        shopify_product_id varchar(255) NOT NULL,
        title text NOT NULL,
        handle text,
        image_url text,
        threshold_type varchar(20) DEFAULT 'quantity',
        threshold_value integer DEFAULT 5,
        safety_stock integer DEFAULT 10,
        location_id varchar(255),
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        shop_domain varchar(255) NOT NULL,
        product_id varchar(255) NOT NULL,
        location_id varchar(255) NOT NULL,
        sku text,
        quantity integer DEFAULT 0 NOT NULL,
        threshold integer DEFAULT 5,
        last_updated timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS alerts (
        id varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        shop_domain varchar(255) NOT NULL,
        product_id varchar(255) NOT NULL,
        location_id varchar(255),
        quantity integer NOT NULL,
        threshold integer NOT NULL,
        status varchar(20) DEFAULT 'active',
        created_at timestamp DEFAULT now() NOT NULL,
        resolved_at timestamp
      );

      CREATE TABLE IF NOT EXISTS batching_queue (
        id varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        shop_domain varchar(255) NOT NULL,
        alert_id varchar(255) NOT NULL,
        product_id varchar(255) NOT NULL,
        location_id varchar(255),
        quantity integer NOT NULL,
        threshold integer NOT NULL,
        alert_type varchar(20) NOT NULL,
        status varchar(20) DEFAULT 'pending',
        scheduled_for timestamp NOT NULL,
        sent_at timestamp,
        created_at timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS billing_plan (
        id varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        shop_domain varchar(255) NOT NULL,
        plan varchar(20) DEFAULT 'free' NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        CONSTRAINT billing_plan_shop_domain_unique UNIQUE(shop_domain)
      );

      CREATE TABLE IF NOT EXISTS usage_tracker (
        id varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        shop_domain varchar(255) NOT NULL,
        plan varchar(20) NOT NULL,
        email_count integer DEFAULT 0 NOT NULL,
        whatsapp_count integer DEFAULT 0 NOT NULL,
        month varchar(7) NOT NULL,
        usage_remaining integer DEFAULT 0 NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS shop_settings (
        id varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        shop_domain varchar(255) NOT NULL,
        notification_method varchar(20) DEFAULT 'email',
        notification_email varchar(255),
        whatsapp_number varchar(20),
        threshold_type varchar(20) DEFAULT 'quantity',
        threshold_value integer DEFAULT 5,
        safety_stock integer DEFAULT 10,
        batching_enabled boolean DEFAULT false,
        batching_interval varchar(20) DEFAULT 'daily',
        email_alerts_enabled boolean DEFAULT true,
        is_onboarded boolean DEFAULT false,
        dismissed_upsell_banner boolean DEFAULT false,
        access_token text,
        webhooks_registered boolean DEFAULT false,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        CONSTRAINT shop_settings_shop_domain_unique UNIQUE(shop_domain)
      );
    `;
    await client.query(createTablesSQL);
    await client.query(`
      ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS access_token text;
      ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS webhooks_registered boolean DEFAULT false;
    `);
    console.log("[db] \u2705 All tables ready");
    return true;
  } catch (error) {
    console.error("[db] \u274C Failed to ensure tables:", error);
    throw error;
  }
}
async function ensureIndexes() {
  console.log("[db] Ensuring indexes exist...");
  try {
    const createIndexesSQL = `
      -- Sessions: lookup by shop
      CREATE INDEX IF NOT EXISTS idx_sessions_shop ON shopify_sessions(shop);

      -- Products: lookup by shop domain and Shopify product ID
      CREATE INDEX IF NOT EXISTS idx_products_shop_domain ON products(shop_domain);
      CREATE INDEX IF NOT EXISTS idx_products_shopify_id ON products(shopify_product_id);

      -- Inventory: lookup by product and location
      CREATE INDEX IF NOT EXISTS idx_inventory_shop_domain ON inventory(shop_domain);
      CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_product_location ON inventory(product_id, location_id);

      -- Alerts: lookup by shop, product, and status (the most common query pattern)
      CREATE INDEX IF NOT EXISTS idx_alerts_shop_domain ON alerts(shop_domain);
      CREATE INDEX IF NOT EXISTS idx_alerts_shop_product_status ON alerts(shop_domain, product_id, status);
      CREATE INDEX IF NOT EXISTS idx_alerts_shop_product_location_status ON alerts(shop_domain, product_id, location_id, status);

      -- Usage tracker: lookup by shop and month (unique constraint for upsert safety)
      CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_tracker_shop_month ON usage_tracker(shop_domain, month);

      -- Batching queue: lookup by shop+status and by scheduled time
      CREATE INDEX IF NOT EXISTS idx_batching_shop_status ON batching_queue(shop_domain, status);
      CREATE INDEX IF NOT EXISTS idx_batching_scheduled ON batching_queue(status, scheduled_for);
    `;
    await client.query(createIndexesSQL);
    console.log("[db] \u2705 All indexes ready");
    return true;
  } catch (error) {
    console.error("[db] \u274C Failed to ensure indexes:", error);
    console.warn("[db] Continuing without indexes");
    return false;
  }
}
async function runMigrations() {
  try {
    console.log("[db] Ensuring all tables exist...");
    await ensureTables();
    await ensureIndexes();
    console.log("[db] \u2705 Database initialization complete");
    return true;
  } catch (error) {
    console.error("[db] \u274C Database initialization failed:", error);
    throw error;
  }
}
var import_node_postgres, import_pg, databaseUrl, pool, db, client;
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
    client = pool;
  }
});

// server/shopify-session-storage.ts
var import_shopify_api, import_drizzle_orm2, PostgresSessionStorage, sessionStorage;
var init_shopify_session_storage = __esm({
  "server/shopify-session-storage.ts"() {
    "use strict";
    import_shopify_api = require("@shopify/shopify-api");
    import_drizzle_orm2 = require("drizzle-orm");
    init_db();
    init_schema();
    PostgresSessionStorage = class {
      async storeSession(session) {
        if (!session.id || !session.shop || !session.accessToken) {
          console.error("[db] \u274C Invalid session - missing critical fields:", {
            id: !!session.id,
            shop: !!session.shop,
            accessToken: !!session.accessToken
          });
          throw new Error("Session missing required fields (id, shop, or accessToken)");
        }
        try {
          const sessionData = {
            id: session.id,
            shop: session.shop,
            state: session.state || null,
            isOnline: session.isOnline,
            scope: session.scope || null,
            expires: session.expires ? new Date(session.expires) : null,
            accessToken: session.accessToken,
            onlineAccessInfo: session.onlineAccessInfo ? JSON.stringify(session.onlineAccessInfo) : null
          };
          console.log("[db] Inserting session:", { shop: session.shop, id: session.id });
          await db.insert(shopifySessions).values(sessionData).onConflictDoUpdate({
            target: shopifySessions.id,
            set: sessionData
          });
          console.log("[db] \u2705 Session inserted successfully");
          return true;
        } catch (error) {
          console.error("[db] \u274C Failed to store session:", {
            shop: session.shop,
            error: error instanceof Error ? error.message : "Unknown error"
          });
          throw error;
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
    sessionStorage = new PostgresSessionStorage();
  }
});

// server/shopify.ts
var import_node, import_shopify_api2, apiKey, apiSecretKey, scopes, apiVersion, appUrl, hostName, shopify;
var init_shopify = __esm({
  "server/shopify.ts"() {
    "use strict";
    import_node = require("@shopify/shopify-api/adapters/node");
    import_shopify_api2 = require("@shopify/shopify-api");
    init_shopify_session_storage();
    apiKey = process.env.SHOPIFY_API_KEY;
    apiSecretKey = process.env.SHOPIFY_API_SECRET;
    scopes = (process.env.SCOPES || "write_products,read_products,write_inventory,read_inventory,write_webhooks,read_webhooks").split(",");
    apiVersion = process.env.SHOPIFY_API_VERSION || "2024-10";
    appUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null);
    if (!appUrl) {
      throw new Error(
        "APP_URL must be set, or REPLIT_DEV_DOMAIN must be available"
      );
    }
    hostName = appUrl.replace(/https?:\/\//, "");
    if (!apiKey || !apiSecretKey) {
      throw new Error("SHOPIFY_API_KEY and SHOPIFY_API_SECRET must be set");
    }
    console.log(`[shopify] APP_URL resolved to: ${appUrl}`);
    console.log(`[shopify] hostName: ${hostName}`);
    console.log(`[shopify] Callback URL: ${appUrl}/api/auth/callback`);
    shopify = (0, import_shopify_api2.shopifyApi)({
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
  }
});

// server/middleware.ts
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
var rateLimitTracker;
var init_middleware = __esm({
  "server/middleware.ts"() {
    "use strict";
    init_shopify();
    init_shopify_session_storage();
    rateLimitTracker = /* @__PURE__ */ new Map();
  }
});

// server/webhook-handler.ts
var webhook_handler_exports = {};
__export(webhook_handler_exports, {
  getShopFromWebhook: () => getShopFromWebhook,
  logWebhookEvent: () => logWebhookEvent,
  registerWebhooks: () => registerWebhooks,
  verifyWebhookSignature: () => verifyWebhookSignature
});
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
    const verified = import_crypto.default.timingSafeEqual(
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
function getShopFromWebhook(req) {
  const shopDomain = req.headers["x-shopify-shop-domain"];
  if (shopDomain) return shopDomain;
  const shopHeader = req.headers["x-shopify-shop-id"];
  return shopHeader || null;
}
async function registerWebhooks(shop, accessToken) {
  try {
    const baseUrl = process.env.APP_URL || process.env.HOST || "";
    if (!baseUrl) {
      console.error("[webhook] APP_URL or HOST env var is not set \u2014 cannot register webhooks");
      return false;
    }
    if (!accessToken) {
      console.error(`[webhook] No access token for ${shop} \u2014 cannot register webhooks`);
      return false;
    }
    console.log(`[webhook] Registering webhooks for ${shop} with base URL: ${baseUrl}`);
    const webhooksToRegister = [
      { topic: "app/uninstalled", address: `${baseUrl}/api/webhooks/app/uninstalled` },
      { topic: "products/create", address: `${baseUrl}/api/webhooks/products/create` },
      { topic: "products/update", address: `${baseUrl}/api/webhooks/products/update` },
      { topic: "inventory_levels/update", address: `${baseUrl}/api/webhooks/inventory_levels/update` }
    ];
    const client2 = new shopify.clients.Rest({
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
    let successCount = 0;
    for (const webhook of webhooksToRegister) {
      try {
        console.log(`[webhook] Registering ${webhook.topic} \u2192 ${webhook.address}`);
        await client2.post({
          path: "webhooks",
          data: {
            webhook: {
              topic: webhook.topic,
              address: webhook.address,
              format: "json"
            }
          }
        });
        successCount++;
        console.log(`[webhook] \u2705 Registered ${webhook.topic}`);
      } catch (error) {
        const statusCode = error?.response?.code || error?.code || "unknown";
        const body = error?.response?.body || error?.message || "unknown error";
        const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
        if (statusCode === 409 || statusCode === 422 || bodyStr.includes("already been taken")) {
          console.log(`[webhook] \u2705 ${webhook.topic} already registered`);
          successCount++;
        } else {
          console.error(
            `[webhook] \u274C Failed to register ${webhook.topic} (status=${statusCode}):`,
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
function logWebhookEvent(topic, shop, payload) {
  const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
  console.log(`[webhook] ${timestamp2} - ${topic} from ${shop}`);
  if (process.env.NODE_ENV !== "production") {
    console.log(`[webhook] Payload:`, JSON.stringify(payload, null, 2));
  }
}
var import_crypto;
var init_webhook_handler = __esm({
  "server/webhook-handler.ts"() {
    "use strict";
    import_crypto = __toESM(require("crypto"), 1);
    init_shopify();
  }
});

// server/billing-service.ts
async function getUserPlan(shopDomain) {
  try {
    const plan = await db.select().from(billingPlans).where((0, import_drizzle_orm4.eq)(billingPlans.shopDomain, shopDomain)).limit(1);
    return plan.length > 0 ? plan[0].plan : "free";
  } catch (error) {
    console.error("[billing] Error getting user plan:", error);
    return "free";
  }
}
async function setPlan(shopDomain, plan) {
  try {
    const existing = await db.select().from(billingPlans).where((0, import_drizzle_orm4.eq)(billingPlans.shopDomain, shopDomain)).limit(1);
    if (existing.length > 0) {
      await db.update(billingPlans).set({
        plan,
        updatedAt: /* @__PURE__ */ new Date()
      }).where((0, import_drizzle_orm4.eq)(billingPlans.shopDomain, shopDomain));
    } else {
      await db.insert(billingPlans).values({
        shopDomain,
        plan,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      });
    }
    console.log(`[billing] Set plan for ${shopDomain}: ${plan}`);
    await resetUsageForMonth(shopDomain);
  } catch (error) {
    console.error("[billing] Error setting plan:", error);
    throw error;
  }
}
function getCurrentMonth() {
  const now = /* @__PURE__ */ new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}
async function getOrInitializeUsageTracker(shopDomain) {
  const month = getCurrentMonth();
  const existing = await db.select().from(usageTracker).where(
    (0, import_drizzle_orm4.and)(
      (0, import_drizzle_orm4.eq)(usageTracker.shopDomain, shopDomain),
      (0, import_drizzle_orm4.eq)(usageTracker.month, month)
    )
  ).limit(1);
  if (existing.length > 0) {
    return existing[0];
  }
  const plan = await getUserPlan(shopDomain);
  const tierConfig = PRICING_TIERS[plan] || PRICING_TIERS.free;
  const emailLimit = tierConfig.emailLimit === -1 ? 999999 : tierConfig.emailLimit;
  const whatsappLimit = tierConfig.whatsappLimit === -1 ? 999999 : tierConfig.whatsappLimit;
  const totalLimit = emailLimit + whatsappLimit;
  try {
    await db.insert(usageTracker).values({
      shopDomain,
      plan,
      emailCount: 0,
      whatsappCount: 0,
      month,
      usageRemaining: totalLimit,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    });
  } catch (error) {
    if (error.code === "23505") {
      const retry = await db.select().from(usageTracker).where(
        (0, import_drizzle_orm4.and)(
          (0, import_drizzle_orm4.eq)(usageTracker.shopDomain, shopDomain),
          (0, import_drizzle_orm4.eq)(usageTracker.month, month)
        )
      ).limit(1);
      if (retry.length > 0) {
        return retry[0];
      }
    }
    throw error;
  }
  return {
    shopDomain,
    plan,
    emailCount: 0,
    whatsappCount: 0,
    month,
    usageRemaining: totalLimit
  };
}
async function trackEmailUsage(shopDomain) {
  try {
    const tracker = await getOrInitializeUsageTracker(shopDomain);
    const month = getCurrentMonth();
    await db.update(usageTracker).set({
      emailCount: tracker.emailCount + 1,
      usageRemaining: Math.max(tracker.usageRemaining - 1, 0),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(
      (0, import_drizzle_orm4.and)(
        (0, import_drizzle_orm4.eq)(usageTracker.shopDomain, shopDomain),
        (0, import_drizzle_orm4.eq)(usageTracker.month, month)
      )
    );
    console.log(`[billing] Tracked email usage for ${shopDomain} (${tracker.emailCount + 1} total this month)`);
  } catch (error) {
    console.error("[billing] Error tracking email usage:", error);
  }
}
async function trackWhatsAppUsage(shopDomain) {
  try {
    const tracker = await getOrInitializeUsageTracker(shopDomain);
    const month = getCurrentMonth();
    await db.update(usageTracker).set({
      whatsappCount: tracker.whatsappCount + 1,
      usageRemaining: Math.max(tracker.usageRemaining - 1, 0),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(
      (0, import_drizzle_orm4.and)(
        (0, import_drizzle_orm4.eq)(usageTracker.shopDomain, shopDomain),
        (0, import_drizzle_orm4.eq)(usageTracker.month, month)
      )
    );
    console.log(`[billing] Tracked WhatsApp usage for ${shopDomain} (${tracker.whatsappCount + 1} total this month)`);
  } catch (error) {
    console.error("[billing] Error tracking WhatsApp usage:", error);
  }
}
async function canSendEmail(shopDomain) {
  try {
    const plan = await getUserPlan(shopDomain);
    const tracker = await getOrInitializeUsageTracker(shopDomain);
    const tierConfig = PRICING_TIERS[plan] || PRICING_TIERS.free;
    if (tierConfig.emailLimit === -1) {
      return true;
    }
    return tracker.emailCount < tierConfig.emailLimit;
  } catch (error) {
    console.error("[billing] Error checking email limit:", error);
    return false;
  }
}
async function canSendWhatsApp(shopDomain) {
  try {
    const plan = await getUserPlan(shopDomain);
    const tracker = await getOrInitializeUsageTracker(shopDomain);
    const tierConfig = PRICING_TIERS[plan] || PRICING_TIERS.free;
    if (tierConfig.whatsappLimit === -1) {
      return true;
    }
    return tracker.whatsappCount < tierConfig.whatsappLimit;
  } catch (error) {
    console.error("[billing] Error checking WhatsApp limit:", error);
    return false;
  }
}
async function getRemainingUsage(shopDomain) {
  try {
    const plan = await getUserPlan(shopDomain);
    const tracker = await getOrInitializeUsageTracker(shopDomain);
    const tierConfig = PRICING_TIERS[plan] || PRICING_TIERS.free;
    const emailLimit = tierConfig.emailLimit === -1 ? "Unlimited" : tierConfig.emailLimit;
    const whatsappLimit = tierConfig.whatsappLimit === -1 ? "Unlimited" : tierConfig.whatsappLimit;
    return {
      plan,
      emailUsed: tracker.emailCount,
      emailLimit,
      whatsappUsed: tracker.whatsappCount,
      whatsappLimit,
      month: tracker.month,
      usageRemaining: tracker.usageRemaining
    };
  } catch (error) {
    console.error("[billing] Error getting remaining usage:", error);
    return {
      plan: "free",
      emailUsed: 0,
      emailLimit: 10,
      whatsappUsed: 0,
      whatsappLimit: 0,
      month: getCurrentMonth(),
      usageRemaining: 10
    };
  }
}
async function resetUsageForMonth(shopDomain) {
  try {
    const plan = await getUserPlan(shopDomain);
    const month = getCurrentMonth();
    const tierConfig = PRICING_TIERS[plan] || PRICING_TIERS.free;
    const emailLimit = tierConfig.emailLimit === -1 ? 999999 : tierConfig.emailLimit;
    const whatsappLimit = tierConfig.whatsappLimit === -1 ? 999999 : tierConfig.whatsappLimit;
    const totalLimit = emailLimit + whatsappLimit;
    const existing = await db.select().from(usageTracker).where(
      (0, import_drizzle_orm4.and)(
        (0, import_drizzle_orm4.eq)(usageTracker.shopDomain, shopDomain),
        (0, import_drizzle_orm4.eq)(usageTracker.month, month)
      )
    ).limit(1);
    if (existing.length > 0) {
      await db.update(usageTracker).set({
        plan,
        emailCount: 0,
        whatsappCount: 0,
        usageRemaining: totalLimit,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(
        (0, import_drizzle_orm4.and)(
          (0, import_drizzle_orm4.eq)(usageTracker.shopDomain, shopDomain),
          (0, import_drizzle_orm4.eq)(usageTracker.month, month)
        )
      );
    }
    console.log(`[billing] Reset usage for ${shopDomain}: ${month} (limit: ${totalLimit})`);
  } catch (error) {
    console.error("[billing] Error resetting usage:", error);
  }
}
var import_drizzle_orm4, PRICING_TIERS;
var init_billing_service = __esm({
  "server/billing-service.ts"() {
    "use strict";
    init_db();
    init_schema();
    import_drizzle_orm4 = require("drizzle-orm");
    PRICING_TIERS = {
      free: { plan: "free", emailLimit: 10, whatsappLimit: 0 },
      pro: { plan: "pro", emailLimit: 500, whatsappLimit: 0 },
      premium: { plan: "premium", emailLimit: -1, whatsappLimit: 500 }
      // -1 = unlimited
    };
  }
});

// server/twilio-service.ts
var twilio_service_exports = {};
__export(twilio_service_exports, {
  formatAlertMessage: () => formatAlertMessage,
  formatBatchedAlertsMessage: () => formatBatchedAlertsMessage,
  initTwilio: () => initTwilio,
  isTwilioAvailable: () => isTwilioAvailable,
  normalizePhoneNumber: () => normalizePhoneNumber,
  sendWhatsAppMessage: () => sendWhatsAppMessage,
  validateWhatsAppNumber: () => validateWhatsAppNumber
});
function initTwilio(config) {
  try {
    const twilio = require("twilio");
    twilioClient = twilio(config.accountSid, config.authToken);
    twilioFromNumber = config.whatsappFrom;
    console.log("[twilio] Twilio client initialized");
    console.log(`[twilio] Account SID: ${config.accountSid.substring(0, 8)}...`);
    console.log(`[twilio] WhatsApp FROM number: "${config.whatsappFrom}"`);
  } catch (error) {
    console.warn("[twilio] Twilio SDK not installed. WhatsApp alerts will be simulated.");
  }
}
function validateWhatsAppNumber(phoneNumber) {
  const cleaned = phoneNumber.replace(/[\s\-]/g, "");
  if (cleaned.startsWith("+")) {
    return /^\+[1-9]\d{1,14}$/.test(cleaned);
  }
  return /^[1-9]\d{9,14}$/.test(cleaned);
}
function normalizePhoneNumber(phoneNumber) {
  let normalized = phoneNumber.replace(/[\s\-()]/g, "");
  if (!normalized.startsWith("+")) {
    if (!normalized.startsWith("1") && normalized.length === 10) {
      normalized = "1" + normalized;
    }
    normalized = "+" + normalized;
  }
  return normalized;
}
async function sendWhatsAppMessage(toPhoneNumber, message, maxRetries = 3) {
  try {
    if (!validateWhatsAppNumber(toPhoneNumber)) {
      return {
        success: false,
        error: `Invalid phone number format: ${toPhoneNumber}`
      };
    }
    const normalizedNumber = normalizePhoneNumber(toPhoneNumber);
    if (!twilioClient) {
      console.log(
        `[twilio] SIMULATED WhatsApp to ${normalizedNumber}: ${message.substring(
          0,
          50
        )}...`
      );
      return {
        success: true,
        messageId: `simulated_${Date.now()}`
      };
    }
    const fromNumber = twilioFromNumber || process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_WHATSAPP_NUMBER || "";
    if (!fromNumber || fromNumber.length < 5) {
      console.error(`[twilio] WhatsApp FROM number is not set or invalid: "${fromNumber}"`);
      console.error(`[twilio] twilioFromNumber="${twilioFromNumber}", TWILIO_WHATSAPP_FROM="${process.env.TWILIO_WHATSAPP_FROM}", TWILIO_WHATSAPP_NUMBER="${process.env.TWILIO_WHATSAPP_NUMBER}"`);
      return {
        success: false,
        error: `WhatsApp FROM number is not configured. Set TWILIO_WHATSAPP_FROM or TWILIO_WHATSAPP_NUMBER env var to your Twilio WhatsApp number (e.g., +14155238886).`
      };
    }
    const normalizedFrom = normalizePhoneNumber(fromNumber);
    console.log(`[twilio] Sending from whatsapp:${normalizedFrom} to whatsapp:${normalizedNumber}`);
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await twilioClient.messages.create({
          from: `whatsapp:${normalizedFrom}`,
          to: `whatsapp:${normalizedNumber}`,
          body: message
        });
        console.log(
          `[twilio] WhatsApp sent to ${normalizedNumber}: ${response.sid}`
        );
        return {
          success: true,
          messageId: response.sid
        };
      } catch (error) {
        lastError = error;
        console.warn(
          `[twilio] Attempt ${attempt}/${maxRetries} failed: ${error.message}`
        );
        if (attempt < maxRetries) {
          await new Promise(
            (resolve) => setTimeout(resolve, Math.pow(2, attempt - 1) * 1e3)
          );
        }
      }
    }
    return {
      success: false,
      error: `Failed to send after ${maxRetries} attempts: ${lastError?.message}`
    };
  } catch (error) {
    console.error("[twilio] Error sending WhatsApp:", error);
    return {
      success: false,
      error: error.message
    };
  }
}
function formatAlertMessage(productName, currentQuantity, threshold, locationName) {
  const location = locationName ? ` at ${locationName}` : "";
  return `\u{1F6A8} Low Stock Alert!

Product: ${productName}${location}
Current Stock: ${currentQuantity} units
Alert Threshold: ${threshold} units

Please restock as soon as possible.`;
}
function formatBatchedAlertsMessage(alerts2) {
  let message = `\u{1F4E6} Inventory Batch Alert

${alerts2.length} products need attention:

`;
  alerts2.forEach((alert, index2) => {
    const location = alert.location ? ` (${alert.location})` : "";
    message += `${index2 + 1}. ${alert.productName}${location}
`;
    message += `   Stock: ${alert.quantity} / ${alert.threshold}
`;
  });
  message += `
Please review your inventory.`;
  return message;
}
function isTwilioAvailable() {
  return twilioClient !== null;
}
var twilioClient, twilioFromNumber;
var init_twilio_service = __esm({
  "server/twilio-service.ts"() {
    "use strict";
    twilioClient = null;
    twilioFromNumber = "";
  }
});

// server/email.ts
async function sendEmail(options) {
  try {
    const domain = process.env.MAILGUN_DOMAIN;
    const apiKey2 = process.env.MAILGUN_API_KEY;
    if (!domain || !apiKey2) {
      console.log("[email] Mailgun credentials not configured, skipping email");
      return false;
    }
    const from = `Low Stock Alerts <noreply@${domain}>`;
    const response = await import_axios.default.post(
      `https://api.mailgun.net/v3/${domain}/messages`,
      {
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html || options.text
      },
      {
        auth: {
          username: "api",
          password: apiKey2
        }
      }
    );
    console.log(`[email] Email sent to ${options.to}: ${response.data.id}`);
    return true;
  } catch (error) {
    console.error("[email] Error sending email:", error);
    return false;
  }
}
async function sendLowStockAlert(shopDomain, productTitle, quantity, threshold, recipientEmail) {
  const subject = `\u{1F6A8} Low Stock Alert: ${productTitle}`;
  const text2 = `
    Low Stock Alert

    Product: ${productTitle}
    Current Stock: ${quantity}
    Threshold: ${threshold}
    Shop: ${shopDomain}

    Please restock this item as soon as possible.
  `;
  const html = `
    <h2>\u{1F6A8} Low Stock Alert</h2>
    <p><strong>Product:</strong> ${productTitle}</p>
    <p><strong>Current Stock:</strong> ${quantity}</p>
    <p><strong>Threshold:</strong> ${threshold}</p>
    <p><strong>Shop:</strong> ${shopDomain}</p>
    <p>Please restock this item as soon as possible.</p>
  `;
  return sendEmail({
    to: recipientEmail,
    subject,
    text: text2,
    html
  });
}
async function sendDailyStockSummary(shopDomain, lowStockItems, recipientEmail) {
  const itemsList = lowStockItems.map((item) => `- ${item.productTitle}: ${item.quantity}/${item.threshold}`).join("\n");
  const subject = `Daily Stock Summary: ${lowStockItems.length} items low`;
  const text2 = `
    Daily Stock Summary for ${shopDomain}

    Low Stock Items (${lowStockItems.length}):
    ${itemsList}

    Log in to Low Stock Alerts to manage inventory.
  `;
  const html = `
    <h2>Daily Stock Summary</h2>
    <p>Shop: <strong>${shopDomain}</strong></p>
    <h3>Low Stock Items (${lowStockItems.length})</h3>
    <ul>
      ${lowStockItems.map(
    (item) => `<li>${item.productTitle}: <strong>${item.quantity}/${item.threshold}</strong></li>`
  ).join("")}
    </ul>
    <p>Log in to Low Stock Alerts to manage inventory.</p>
  `;
  return sendEmail({
    to: recipientEmail,
    subject,
    text: text2,
    html
  });
}
var import_axios;
var init_email = __esm({
  "server/email.ts"() {
    "use strict";
    import_axios = __toESM(require("axios"), 1);
  }
});

// server/batching-service.ts
var batching_service_exports = {};
__export(batching_service_exports, {
  addToBatch: () => addToBatch,
  enqueueBatchAlert: () => enqueueBatchAlert,
  getPendingBatches: () => getPendingBatches,
  processPendingBatches: () => processPendingBatches,
  sendBatch: () => sendBatch,
  startBatchingProcessor: () => startBatchingProcessor
});
async function addToBatch(shop, alertId, productId, locationId, quantity, threshold, alertType) {
  try {
    const settings = await db.select().from(shopSettings).where((0, import_drizzle_orm5.eq)(shopSettings.shopDomain, shop)).limit(1);
    if (!settings.length || !settings[0].batchingEnabled) {
      console.log(
        `[batching] Batching disabled for ${shop}, skipping queue`
      );
      return;
    }
    const interval = BATCH_INTERVALS[settings[0].batchingInterval] || BATCH_INTERVALS.daily;
    const scheduledFor = new Date(Date.now() + interval);
    await db.insert(batchingQueue).values({
      shopDomain: shop,
      alertId,
      productId,
      locationId,
      quantity,
      threshold,
      alertType,
      status: "pending",
      scheduledFor,
      createdAt: /* @__PURE__ */ new Date()
    });
    console.log(
      `[batching] Added alert ${alertId} to batch queue for ${shop} (${alertType}, scheduled for ${scheduledFor.toISOString()})`
    );
  } catch (error) {
    console.error("[batching] Error adding to batch:", error);
  }
}
async function getPendingBatches(shop) {
  try {
    const now = /* @__PURE__ */ new Date();
    let query = db.select().from(batchingQueue).where(
      (0, import_drizzle_orm5.and)(
        (0, import_drizzle_orm5.eq)(batchingQueue.status, "pending"),
        (0, import_drizzle_orm5.lte)(batchingQueue.scheduledFor, now)
      )
    );
    const pending = await query;
    let filtered = pending;
    if (shop) {
      filtered = pending.filter((item) => item.shopDomain === shop);
    }
    const grouped = /* @__PURE__ */ new Map();
    for (const item of filtered) {
      const key = `${item.shopDomain}__${item.alertType}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(item);
    }
    return grouped;
  } catch (error) {
    console.error("[batching] Error getting pending batches:", error);
    return /* @__PURE__ */ new Map();
  }
}
async function resolveProductNames(alerts2) {
  return Promise.all(
    alerts2.map(async (alert) => {
      const product = await db.select().from(products).where((0, import_drizzle_orm5.eq)(products.shopifyProductId, alert.productId)).limit(1);
      return {
        productName: product.length ? product[0].title : `Product ${alert.productId.substring(0, 8)}...`,
        quantity: alert.quantity,
        threshold: alert.threshold,
        location: alert.locationId || void 0
      };
    })
  );
}
async function sendBatch(shop, alertType) {
  try {
    const pending = await db.select().from(batchingQueue).where(
      (0, import_drizzle_orm5.and)(
        (0, import_drizzle_orm5.eq)(batchingQueue.shopDomain, shop),
        (0, import_drizzle_orm5.eq)(batchingQueue.alertType, alertType),
        (0, import_drizzle_orm5.eq)(batchingQueue.status, "pending")
      )
    );
    if (!pending.length) {
      console.log(
        `[batching] No pending ${alertType} alerts for ${shop}`
      );
      return;
    }
    const settings = await db.select().from(shopSettings).where((0, import_drizzle_orm5.eq)(shopSettings.shopDomain, shop)).limit(1);
    if (alertType === "whatsapp") {
      if (!settings.length || !settings[0].whatsappNumber) {
        console.warn(
          `[batching] No WhatsApp number configured for ${shop}`
        );
        for (const alert of pending) {
          await db.update(batchingQueue).set({ status: "failed" }).where((0, import_drizzle_orm5.eq)(batchingQueue.id, alert.id));
        }
        return;
      }
      const resolved = await resolveProductNames(pending);
      const message = formatBatchedAlertsMessage(resolved);
      const result = await sendWhatsAppMessage(
        settings[0].whatsappNumber,
        message
      );
      if (result.success) {
        const now = /* @__PURE__ */ new Date();
        for (const alert of pending) {
          await db.update(batchingQueue).set({
            status: "sent",
            sentAt: now
          }).where((0, import_drizzle_orm5.eq)(batchingQueue.id, alert.id));
        }
        console.log(
          `[batching] Sent ${pending.length} WhatsApp alerts for ${shop}`
        );
      } else {
        for (const alert of pending) {
          await db.update(batchingQueue).set({ status: "failed" }).where((0, import_drizzle_orm5.eq)(batchingQueue.id, alert.id));
        }
        console.error(`[batching] Failed to send WhatsApp batch for ${shop}`);
      }
    } else if (alertType === "email") {
      const recipientEmail = settings.length ? settings[0].notificationEmail : null;
      if (!recipientEmail) {
        console.warn(`[batching] No notification email configured for ${shop}`);
        for (const alert of pending) {
          await db.update(batchingQueue).set({ status: "failed" }).where((0, import_drizzle_orm5.eq)(batchingQueue.id, alert.id));
        }
        return;
      }
      const resolved = await resolveProductNames(pending);
      const lowStockItems = resolved.map((item) => ({
        productTitle: item.productName,
        quantity: item.quantity,
        threshold: item.threshold
      }));
      const sent = await sendDailyStockSummary(shop, lowStockItems, recipientEmail);
      const now = /* @__PURE__ */ new Date();
      for (const alert of pending) {
        await db.update(batchingQueue).set({
          status: sent ? "sent" : "failed",
          sentAt: sent ? now : void 0
        }).where((0, import_drizzle_orm5.eq)(batchingQueue.id, alert.id));
      }
      if (sent) {
        console.log(
          `[batching] Sent email digest with ${pending.length} alerts for ${shop}`
        );
      } else {
        console.error(`[batching] Failed to send email digest for ${shop}`);
      }
    }
  } catch (error) {
    console.error(`[batching] Error sending batch for ${shop}:`, error);
  }
}
async function processPendingBatches() {
  try {
    const batches = await getPendingBatches();
    for (const [key, alerts2] of batches.entries()) {
      const [shop, alertType] = key.split("__");
      if (!shop || !alertType) continue;
      console.log(
        `[batching] Processing batch for ${shop} (${alertType}): ${alerts2.length} alerts`
      );
      await sendBatch(shop, alertType);
    }
  } catch (error) {
    console.error("[batching] Error processing pending batches:", error);
  }
}
function startBatchingProcessor(intervalMs = 5 * 60 * 1e3) {
  console.log(
    `[batching] Starting batch processor (interval: ${intervalMs}ms)`
  );
  const timer = setInterval(() => {
    processPendingBatches().catch((err) => {
      console.error("[batching] Batch processor error:", err);
    });
  }, intervalMs);
  return timer;
}
var import_drizzle_orm5, BATCH_INTERVALS, enqueueBatchAlert;
var init_batching_service = __esm({
  "server/batching-service.ts"() {
    "use strict";
    init_db();
    init_schema();
    import_drizzle_orm5 = require("drizzle-orm");
    init_twilio_service();
    init_email();
    BATCH_INTERVALS = {
      hourly: 60 * 60 * 1e3,
      daily: 24 * 60 * 60 * 1e3,
      weekly: 7 * 24 * 60 * 60 * 1e3
    };
    enqueueBatchAlert = addToBatch;
  }
});

// server/alerts.ts
async function calculateEffectiveThreshold(productId, _currentQuantity) {
  try {
    const product = await db.select().from(products).where((0, import_drizzle_orm6.eq)(products.shopifyProductId, productId)).limit(1);
    if (!product.length) {
      return 5;
    }
    const prod = product[0];
    if (prod.thresholdType === "percentage" && prod.safetyStock) {
      const percentage = (prod.thresholdValue || 20) / 100;
      return Math.ceil(prod.safetyStock * percentage);
    }
    return prod.thresholdValue || 5;
  } catch (error) {
    console.error("[alerts] Error calculating threshold:", error);
    return 5;
  }
}
async function createLowStockAlert(shop, productId, locationId, quantity, threshold) {
  try {
    const alertId = `${shop}__${productId}__${locationId || "default"}__${Date.now()}`;
    const conditions = [
      (0, import_drizzle_orm6.eq)(alerts.shopDomain, shop),
      (0, import_drizzle_orm6.eq)(alerts.productId, productId),
      (0, import_drizzle_orm6.eq)(alerts.status, "active")
    ];
    if (locationId) {
      conditions.push((0, import_drizzle_orm6.eq)(alerts.locationId, locationId));
    }
    const existing = await db.select().from(alerts).where((0, import_drizzle_orm6.and)(...conditions)).limit(1);
    if (existing.length > 0) {
      await db.update(alerts).set({ quantity }).where((0, import_drizzle_orm6.eq)(alerts.id, existing[0].id));
      console.log(
        `[alerts] Updated existing alert for product ${productId} at location ${locationId || "all"} in ${shop}`
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
      `[alerts] Created low stock alert for ${productId} at location ${locationId || "all"}: ${quantity}/${threshold}`
    );
    return alertId;
  } catch (error) {
    if (error.code === "23505") {
      console.log(
        `[alerts] Duplicate alert suppressed for ${productId} at location ${locationId || "all"} (concurrent webhook)`
      );
      return null;
    }
    console.error("[alerts] Error creating alert:", error);
    throw error;
  }
}
async function resolveAlert(alertId) {
  try {
    await db.update(alerts).set({
      status: "resolved",
      resolvedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm6.eq)(alerts.id, alertId));
    console.log(`[alerts] Resolved alert ${alertId}`);
  } catch (error) {
    console.error("[alerts] Error resolving alert:", error);
    throw error;
  }
}
async function getActiveAlerts(shop) {
  try {
    const shopAlerts = await db.select().from(alerts).where(
      (0, import_drizzle_orm6.and)((0, import_drizzle_orm6.eq)(alerts.shopDomain, shop), (0, import_drizzle_orm6.eq)(alerts.status, "active"))
    );
    const enriched = await Promise.all(
      shopAlerts.map(async (alert) => {
        const product = await db.select().from(products).where((0, import_drizzle_orm6.eq)(products.shopifyProductId, alert.productId)).limit(1);
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
async function sendEmailAlert(shop, productName, quantity, threshold, _locationName) {
  try {
    const canSend = await canSendEmail(shop);
    if (!canSend) {
      console.warn(`[alerts] Email limit reached for ${shop}. Alert for "${productName}" will NOT be delivered.`);
      return false;
    }
    const settings = await db.select().from(shopSettings).where((0, import_drizzle_orm6.eq)(shopSettings.shopDomain, shop)).limit(1);
    const recipientEmail = settings.length ? settings[0].notificationEmail : null;
    if (!recipientEmail) {
      console.warn(`[alerts] No notification email configured for ${shop}. Cannot send alert for "${productName}".`);
      return false;
    }
    const sent = await sendLowStockAlert(shop, productName, quantity, threshold, recipientEmail);
    if (sent) {
      await trackEmailUsage(shop);
      console.log(`[alerts] Email alert sent for ${shop}: ${productName} (${quantity}/${threshold})`);
    } else {
      console.error(`[alerts] Failed to send email alert for ${shop}: ${productName}`);
    }
    return sent;
  } catch (error) {
    console.error("[alerts] Error sending email alert:", error);
    return false;
  }
}
async function sendWhatsAppAlert(shop, productName, quantity, threshold, locationName) {
  try {
    const canSend = await canSendWhatsApp(shop);
    if (!canSend) {
      console.warn(`[alerts] WhatsApp limit reached for ${shop}. Alert for "${productName}" will NOT be delivered.`);
      return false;
    }
    const settings = await db.select().from(shopSettings).where((0, import_drizzle_orm6.eq)(shopSettings.shopDomain, shop)).limit(1);
    if (!settings.length || !settings[0].whatsappNumber) {
      console.warn(`[alerts] No WhatsApp number configured for ${shop}`);
      return false;
    }
    const message = formatAlertMessage(productName, quantity, threshold, locationName);
    const result = await sendWhatsAppMessage(settings[0].whatsappNumber, message);
    if (result.success) {
      await trackWhatsAppUsage(shop);
      console.log(`[alerts] WhatsApp alert sent for ${shop}: ${result.messageId}`);
      return true;
    } else {
      console.error(
        `[alerts] Failed to send WhatsApp: ${result.error}`
      );
      return false;
    }
  } catch (error) {
    console.error("[alerts] Error sending WhatsApp alert:", error);
    return false;
  }
}
async function checkInventoryAlert(shop, productId, locationId, quantity, _legacyThreshold) {
  try {
    const threshold = await calculateEffectiveThreshold(productId, quantity);
    if (quantity <= threshold) {
      const alertId = await createLowStockAlert(
        shop,
        productId,
        locationId,
        quantity,
        threshold
      );
      if (!alertId) {
        return;
      }
      const product = await db.select().from(products).where((0, import_drizzle_orm6.eq)(products.shopifyProductId, productId)).limit(1);
      const settings = await db.select().from(shopSettings).where((0, import_drizzle_orm6.eq)(shopSettings.shopDomain, shop)).limit(1);
      const productName = product.length ? product[0].title : "Unknown Product";
      const notificationMethod = settings.length ? settings[0].notificationMethod : "email";
      const batchingEnabled = settings.length ? settings[0].batchingEnabled : false;
      const shouldEmail = notificationMethod === "email" || notificationMethod === "both";
      const shouldWhatsApp = notificationMethod === "whatsapp" || notificationMethod === "both";
      if (shouldEmail && settings.length && settings[0].emailAlertsEnabled) {
        if (batchingEnabled) {
          await enqueueBatchAlert(shop, alertId, productId, locationId, quantity, threshold, "email");
        } else {
          await sendEmailAlert(shop, productName, quantity, threshold);
        }
      }
      if (shouldWhatsApp && settings.length && settings[0].whatsappNumber) {
        if (batchingEnabled) {
          await enqueueBatchAlert(shop, alertId, productId, locationId, quantity, threshold, "whatsapp");
        } else {
          await sendWhatsAppAlert(shop, productName, quantity, threshold);
        }
      }
      console.log(`[alerts] Alert processed for low inventory: ${alertId}`);
    } else {
      const existingConditions = [
        (0, import_drizzle_orm6.eq)(alerts.shopDomain, shop),
        (0, import_drizzle_orm6.eq)(alerts.productId, productId),
        (0, import_drizzle_orm6.eq)(alerts.status, "active")
      ];
      if (locationId) {
        existingConditions.push((0, import_drizzle_orm6.eq)(alerts.locationId, locationId));
      }
      const existing = await db.select().from(alerts).where((0, import_drizzle_orm6.and)(...existingConditions));
      for (const alert of existing) {
        await resolveAlert(alert.id);
        console.log(
          `[alerts] Resolved alert ${alert.id} (inventory back to normal: ${quantity}/${threshold})`
        );
      }
    }
  } catch (error) {
    console.error("[alerts] Error checking inventory alert:", error);
  }
}
var import_drizzle_orm6;
var init_alerts = __esm({
  "server/alerts.ts"() {
    "use strict";
    init_db();
    init_schema();
    import_drizzle_orm6 = require("drizzle-orm");
    init_billing_service();
    init_twilio_service();
    init_email();
    init_batching_service();
  }
});

// server/webhook-processors.ts
var webhook_processors_exports = {};
__export(webhook_processors_exports, {
  processAppUninstalled: () => processAppUninstalled,
  processCustomersDataRequest: () => processCustomersDataRequest,
  processCustomersRedact: () => processCustomersRedact,
  processInventoryUpdate: () => processInventoryUpdate,
  processProductCreate: () => processProductCreate,
  processProductUpdate: () => processProductUpdate,
  processShopRedact: () => processShopRedact
});
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
    }).where((0, import_drizzle_orm7.eq)(products.id, productId));
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
      (0, import_drizzle_orm7.and)(
        (0, import_drizzle_orm7.eq)(inventory.shopDomain, shop),
        (0, import_drizzle_orm7.eq)(inventory.locationId, String(locationId))
      )
    ).limit(1);
    if (existing.length > 0) {
      await db.update(inventory).set({
        quantity: quantity || 0,
        lastUpdated: new Date(updatedAt)
      }).where((0, import_drizzle_orm7.eq)(inventory.id, existing[0].id));
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
async function processAppUninstalled(shop, _payload) {
  try {
    console.log(`[webhook] Processing app/uninstalled for ${shop} \u2014 deleting all shop data`);
    await db.delete(batchingQueue).where((0, import_drizzle_orm7.eq)(batchingQueue.shopDomain, shop));
    console.log(`[webhook] Deleted batching queue entries for ${shop}`);
    await db.delete(alerts).where((0, import_drizzle_orm7.eq)(alerts.shopDomain, shop));
    console.log(`[webhook] Deleted alerts for ${shop}`);
    await db.delete(inventory).where((0, import_drizzle_orm7.eq)(inventory.shopDomain, shop));
    console.log(`[webhook] Deleted inventory for ${shop}`);
    await db.delete(products).where((0, import_drizzle_orm7.eq)(products.shopDomain, shop));
    console.log(`[webhook] Deleted products for ${shop}`);
    await db.delete(usageTracker).where((0, import_drizzle_orm7.eq)(usageTracker.shopDomain, shop));
    console.log(`[webhook] Deleted usage tracking for ${shop}`);
    await db.delete(billingPlans).where((0, import_drizzle_orm7.eq)(billingPlans.shopDomain, shop));
    console.log(`[webhook] Deleted billing plan for ${shop}`);
    await db.delete(shopSettings).where((0, import_drizzle_orm7.eq)(shopSettings.shopDomain, shop));
    console.log(`[webhook] Deleted shop settings for ${shop}`);
    await db.delete(shopifySessions).where((0, import_drizzle_orm7.eq)(shopifySessions.shop, shop));
    console.log(`[webhook] Deleted sessions for ${shop}`);
    console.log(`[webhook] All data deleted for uninstalled shop ${shop}`);
  } catch (error) {
    console.error("[webhook] Error processing app/uninstalled:", error);
  }
}
async function processCustomersDataRequest(shop, payload) {
  try {
    const { customer, orders_requested } = payload;
    console.log(
      `[webhook] customers/data_request from ${shop} for customer ${customer?.id}`
    );
    console.log(
      `[webhook] This app does not store customer-specific data. No data to export.`
    );
  } catch (error) {
    console.error("[webhook] Error processing customers/data_request:", error);
  }
}
async function processCustomersRedact(shop, payload) {
  try {
    const { customer } = payload;
    console.log(
      `[webhook] customers/redact from ${shop} for customer ${customer?.id}`
    );
    console.log(
      `[webhook] This app does not store customer-specific data. No data to redact.`
    );
  } catch (error) {
    console.error("[webhook] Error processing customers/redact:", error);
  }
}
async function processShopRedact(shop, _payload) {
  try {
    console.log(
      `[webhook] shop/redact from ${shop} \u2014 deleting all remaining shop data`
    );
    await processAppUninstalled(shop, _payload);
    console.log(`[webhook] Shop redact complete for ${shop}`);
  } catch (error) {
    console.error("[webhook] Error processing shop/redact:", error);
  }
}
var import_drizzle_orm7;
var init_webhook_processors = __esm({
  "server/webhook-processors.ts"() {
    "use strict";
    init_db();
    init_schema();
    import_drizzle_orm7 = require("drizzle-orm");
    init_alerts();
  }
});

// server/routes/billing.ts
var billing_exports = {};
__export(billing_exports, {
  setupBillingRoutes: () => setupBillingRoutes
});
async function getOfflineSession(shop) {
  const sessionId = `offline_${shop}`;
  const session = await sessionStorage.loadSession(sessionId);
  if (!session || !session.accessToken) {
    const sessions = await sessionStorage.findSessionsByShop(shop);
    const validSession = sessions.find((s) => s.accessToken);
    if (!validSession) {
      throw new Error(`No valid session found for ${shop}`);
    }
    return validSession;
  }
  return session;
}
async function cancelActiveSubscription(shop) {
  try {
    const session = await getOfflineSession(shop);
    const client2 = new shopify.clients.Rest({
      session
    });
    const response = await client2.get({
      path: "recurring_application_charges"
    });
    const charges = response.body?.recurring_application_charges || [];
    const activeCharge = charges.find((c) => c.status === "active");
    if (activeCharge) {
      await client2.delete({
        path: `recurring_application_charges/${activeCharge.id}`
      });
      console.log(`[billing-api] Cancelled active subscription ${activeCharge.id} for ${shop}`);
    } else {
      console.log(`[billing-api] No active subscription to cancel for ${shop}`);
    }
  } catch (error) {
    console.error(`[billing-api] Error cancelling subscription for ${shop}:`, error);
  }
}
function setupBillingRoutes(router) {
  router.get("/api/billing/plan", async (req, res) => {
    try {
      const shop = req.query.shop;
      if (!shop) {
        return res.status(400).json({ error: "Missing shop parameter" });
      }
      const plan = await getUserPlan(shop);
      const usage = await getRemainingUsage(shop);
      res.json({
        plan,
        usage,
        tiers: PRICING_TIERS
      });
    } catch (error) {
      console.error("[billing-api] Error getting plan:", error);
      res.status(500).json({ error: "Failed to get billing plan" });
    }
  });
  router.get("/api/billing/usage", async (req, res) => {
    try {
      const shop = req.query.shop;
      if (!shop) {
        return res.status(400).json({ error: "Missing shop parameter" });
      }
      const usage = await getRemainingUsage(shop);
      res.json({
        month: usage.month,
        emailUsed: usage.emailUsed,
        emailLimit: usage.emailLimit,
        whatsappUsed: usage.whatsappUsed,
        whatsappLimit: usage.whatsappLimit,
        percentageUsed: typeof usage.emailLimit === "string" ? "N/A" : Math.round(usage.emailUsed / usage.emailLimit * 100)
      });
    } catch (error) {
      console.error("[billing-api] Error getting usage:", error);
      res.status(500).json({ error: "Failed to get usage statistics" });
    }
  });
  router.post("/api/billing/upgrade", async (req, res) => {
    try {
      const { shop, plan } = req.body;
      if (!shop) {
        return res.status(400).json({ error: "Missing shop parameter" });
      }
      if (!plan) {
        return res.status(400).json({ error: "Missing plan parameter" });
      }
      if (!["free", "pro", "premium"].includes(plan)) {
        return res.status(400).json({ error: "Invalid plan" });
      }
      const currentPlan = await getUserPlan(shop);
      console.log(`[billing-api] Plan change requested: ${shop} from ${currentPlan} to ${plan}`);
      if (plan !== "free") {
        return res.status(400).json({
          error: "Paid plans must be activated through Shopify billing. Use /api/billing/subscribe instead."
        });
      }
      await cancelActiveSubscription(shop);
      await setPlan(shop, plan);
      res.json({
        success: true,
        message: `Plan changed to ${plan}`,
        plan,
        previousPlan: currentPlan
      });
    } catch (error) {
      console.error("[billing-api] Error upgrading plan:", error);
      res.status(500).json({ error: "Failed to upgrade plan" });
    }
  });
  router.get("/api/billing/subscribe", async (req, res) => {
    try {
      const shop = req.query.shop;
      const plan = req.query.plan;
      if (!shop || !plan) {
        return res.status(400).json({ error: "Missing shop or plan parameter" });
      }
      const planConfig = SHOPIFY_PLANS[plan];
      if (!planConfig) {
        return res.status(400).json({ error: `Invalid plan: ${plan}. Must be 'pro' or 'premium'.` });
      }
      console.log(`[billing-api] Creating Shopify subscription for ${shop}: ${plan} ($${planConfig.price}/mo)`);
      const session = await getOfflineSession(shop);
      const client2 = new shopify.clients.Rest({
        session
      });
      const appUrl2 = process.env.APP_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;
      const returnUrl = `${appUrl2}/api/billing/callback?shop=${encodeURIComponent(shop)}&plan=${encodeURIComponent(plan)}`;
      const response = await client2.post({
        path: "recurring_application_charges",
        data: {
          recurring_application_charge: {
            name: `Low Stock Alerts Pro - ${planConfig.name}`,
            price: planConfig.price,
            return_url: returnUrl,
            trial_days: planConfig.trialDays,
            test: process.env.NODE_ENV !== "production"
          }
        }
      });
      const charge = response.body?.recurring_application_charge;
      if (!charge || !charge.confirmation_url) {
        console.error("[billing-api] No confirmation URL in Shopify response:", response.body);
        return res.status(500).json({ error: "Failed to create subscription" });
      }
      console.log(`[billing-api] Subscription created for ${shop}: charge ID ${charge.id}`);
      console.log(`[billing-api] Confirmation URL: ${charge.confirmation_url}`);
      res.json({
        confirmationUrl: charge.confirmation_url,
        chargeId: charge.id
      });
    } catch (error) {
      console.error("[billing-api] Error creating subscription:", error?.response?.body || error);
      res.status(500).json({ error: "Failed to create Shopify subscription" });
    }
  });
  router.get("/api/billing/callback", async (req, res) => {
    try {
      const shop = req.query.shop;
      const plan = req.query.plan;
      const chargeId = req.query.charge_id;
      if (!shop || !plan || !chargeId) {
        console.error("[billing-api] Missing callback parameters:", { shop, plan, chargeId });
        return res.redirect(`/?shop=${encodeURIComponent(shop || "")}`);
      }
      console.log(`[billing-api] Billing callback for ${shop}: plan=${plan}, charge_id=${chargeId}`);
      const session = await getOfflineSession(shop);
      const client2 = new shopify.clients.Rest({
        session
      });
      const response = await client2.get({
        path: `recurring_application_charges/${chargeId}`
      });
      const charge = response.body?.recurring_application_charge;
      if (!charge) {
        console.error("[billing-api] Could not find charge:", chargeId);
        return res.redirect(`/?shop=${encodeURIComponent(shop)}`);
      }
      console.log(`[billing-api] Charge status for ${shop}: ${charge.status}`);
      if (charge.status === "accepted") {
        const activateResponse = await client2.post({
          path: `recurring_application_charges/${chargeId}/activate`,
          data: {
            recurring_application_charge: {
              id: chargeId
            }
          }
        });
        const activatedCharge = activateResponse.body?.recurring_application_charge;
        console.log(`[billing-api] Charge activated for ${shop}: ${activatedCharge?.status}`);
        if (activatedCharge?.status === "active") {
          await setPlan(shop, plan);
          console.log(`[billing-api] Plan set to ${plan} for ${shop}`);
        } else {
          console.error(`[billing-api] Charge not active after activation: ${activatedCharge?.status}`);
        }
      } else if (charge.status === "active") {
        await setPlan(shop, plan);
        console.log(`[billing-api] Charge already active, plan set to ${plan} for ${shop}`);
      } else if (charge.status === "declined") {
        console.log(`[billing-api] Charge declined by merchant ${shop}`);
      } else {
        console.log(`[billing-api] Unexpected charge status for ${shop}: ${charge.status}`);
      }
      const appUrl2 = process.env.APP_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;
      return res.redirect(`${appUrl2}/?shop=${encodeURIComponent(shop)}`);
    } catch (error) {
      console.error("[billing-api] Error in billing callback:", error);
      const shop = req.query.shop;
      return res.redirect(`/?shop=${encodeURIComponent(shop || "")}`);
    }
  });
  router.post("/api/billing/settings", verifySessionToken, async (req, res) => {
    try {
      const session = req.shopifySession;
      const shop = session.shop;
      const { whatsappNumber, batchingEnabled, batchingInterval, emailAlertsEnabled } = req.body;
      if (whatsappNumber) {
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        if (!phoneRegex.test(whatsappNumber.replace(/[\s\-]/g, ""))) {
          return res.status(400).json({ error: "Invalid phone number format" });
        }
      }
      const existing = await db.select().from(shopSettings).where((0, import_drizzle_orm9.eq)(shopSettings.shopDomain, shop)).limit(1);
      if (existing.length > 0) {
        await db.update(shopSettings).set({
          whatsappNumber: whatsappNumber || existing[0].whatsappNumber,
          batchingEnabled: batchingEnabled !== void 0 ? batchingEnabled : existing[0].batchingEnabled,
          batchingInterval: batchingInterval || existing[0].batchingInterval,
          emailAlertsEnabled: emailAlertsEnabled !== void 0 ? emailAlertsEnabled : existing[0].emailAlertsEnabled,
          updatedAt: /* @__PURE__ */ new Date()
        }).where((0, import_drizzle_orm9.eq)(shopSettings.shopDomain, shop));
      } else {
        await db.insert(shopSettings).values({
          shopDomain: shop,
          whatsappNumber: whatsappNumber || null,
          batchingEnabled: batchingEnabled ?? false,
          batchingInterval: batchingInterval || "daily",
          emailAlertsEnabled: emailAlertsEnabled ?? true,
          isOnboarded: false,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        });
      }
      res.json({
        success: true,
        message: "Settings updated"
      });
    } catch (error) {
      console.error("[billing-api] Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });
  router.get("/api/billing/settings", verifySessionToken, async (req, res) => {
    try {
      const session = req.shopifySession;
      const shop = session.shop;
      const settings = await db.select().from(shopSettings).where((0, import_drizzle_orm9.eq)(shopSettings.shopDomain, shop)).limit(1);
      if (!settings.length) {
        return res.json({
          whatsappNumber: null,
          batchingEnabled: false,
          batchingInterval: "daily",
          emailAlertsEnabled: true,
          isOnboarded: false
        });
      }
      const s = settings[0];
      res.json({
        whatsappNumber: s.whatsappNumber,
        batchingEnabled: s.batchingEnabled,
        batchingInterval: s.batchingInterval,
        emailAlertsEnabled: s.emailAlertsEnabled,
        isOnboarded: s.isOnboarded
      });
    } catch (error) {
      console.error("[billing-api] Error getting settings:", error);
      res.status(500).json({ error: "Failed to get settings" });
    }
  });
  router.get("/api/settings", async (req, res) => {
    try {
      const shop = req.query.shop;
      if (!shop) {
        return res.status(400).json({ error: "Missing shop parameter" });
      }
      const settingsRows = await db.select().from(shopSettings).where((0, import_drizzle_orm9.eq)(shopSettings.shopDomain, shop)).limit(1);
      if (!settingsRows.length) {
        return res.json({ settings: null });
      }
      const s = settingsRows[0];
      const plan = await getUserPlan(shop);
      res.json({
        settings: {
          plan,
          thresholdType: s.thresholdType || "quantity",
          thresholdValue: s.thresholdValue ?? 5,
          safetyStock: s.safetyStock ?? 10,
          notificationMethod: s.notificationMethod || "email",
          whatsappNumber: s.whatsappNumber || "",
          batchingEnabled: s.batchingEnabled ?? false,
          batchingInterval: s.batchingInterval || "daily"
        }
      });
    } catch (error) {
      console.error("[settings-api] Error getting settings:", error);
      res.status(500).json({ error: "Failed to get settings" });
    }
  });
  router.post("/api/settings/update", async (req, res) => {
    try {
      const {
        shop,
        plan,
        thresholdType,
        thresholdValue,
        safetyStock,
        notificationMethod,
        whatsappNumber,
        batchingEnabled,
        batchingInterval
      } = req.body;
      if (!shop) {
        return res.status(400).json({ error: "Missing shop parameter" });
      }
      if (whatsappNumber && (notificationMethod === "whatsapp" || notificationMethod === "both")) {
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        if (!phoneRegex.test(whatsappNumber.replace(/[\s\-()]/g, ""))) {
          return res.status(400).json({ error: "Invalid phone number format" });
        }
      }
      const existing = await db.select().from(shopSettings).where((0, import_drizzle_orm9.eq)(shopSettings.shopDomain, shop)).limit(1);
      const settingsData = {
        updatedAt: /* @__PURE__ */ new Date()
      };
      if (thresholdType !== void 0) settingsData.thresholdType = thresholdType;
      if (thresholdValue !== void 0) settingsData.thresholdValue = thresholdValue;
      if (safetyStock !== void 0) settingsData.safetyStock = safetyStock;
      if (notificationMethod !== void 0) settingsData.notificationMethod = notificationMethod;
      if (whatsappNumber !== void 0) settingsData.whatsappNumber = whatsappNumber || null;
      if (batchingEnabled !== void 0) settingsData.batchingEnabled = batchingEnabled;
      if (batchingInterval !== void 0) settingsData.batchingInterval = batchingInterval;
      if (notificationMethod !== void 0) {
        settingsData.emailAlertsEnabled = notificationMethod !== "whatsapp";
      }
      if (existing.length > 0) {
        await db.update(shopSettings).set(settingsData).where((0, import_drizzle_orm9.eq)(shopSettings.shopDomain, shop));
      } else {
        await db.insert(shopSettings).values({
          shopDomain: shop,
          ...settingsData,
          createdAt: /* @__PURE__ */ new Date()
        });
      }
      console.log(`[settings-api] Settings updated for ${shop}`);
      res.json({
        success: true,
        message: "Settings updated"
      });
    } catch (error) {
      console.error("[settings-api] Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });
}
var import_drizzle_orm9, SHOPIFY_PLANS;
var init_billing = __esm({
  "server/routes/billing.ts"() {
    "use strict";
    init_billing_service();
    init_db();
    init_schema();
    import_drizzle_orm9 = require("drizzle-orm");
    init_middleware();
    init_shopify();
    init_shopify_session_storage();
    SHOPIFY_PLANS = {
      pro: { name: "Pro", price: 5, trialDays: 0 },
      premium: { name: "Premium", price: 15, trialDays: 0 }
    };
  }
});

// server/routes/onboarding.ts
var onboarding_exports = {};
__export(onboarding_exports, {
  setupOnboardingRoutes: () => setupOnboardingRoutes
});
function setupOnboardingRoutes(router) {
  router.post(
    "/api/onboarding/complete",
    async (req, res) => {
      try {
        const {
          shop,
          plan,
          thresholdType,
          thresholdValue,
          safetyStock,
          notificationMethod,
          notificationEmail,
          whatsappNumber,
          batchingEnabled,
          batchingInterval
        } = req.body;
        if (!shop) {
          return res.status(400).json({ error: "Missing shop parameter" });
        }
        const planToSet = plan || "free";
        if (!["free", "pro", "premium"].includes(planToSet)) {
          return res.status(400).json({ error: "Invalid plan" });
        }
        if (!["quantity", "percentage"].includes(thresholdType)) {
          return res.status(400).json({ error: "Invalid threshold type" });
        }
        if (!["email", "whatsapp", "both"].includes(notificationMethod)) {
          return res.status(400).json({ error: "Invalid notification method" });
        }
        if (!["hourly", "daily", "weekly"].includes(batchingInterval)) {
          return res.status(400).json({ error: "Invalid batching interval" });
        }
        if (notificationMethod === "email" || notificationMethod === "both") {
          if (!notificationEmail) {
            return res.status(400).json({ error: "Email address required for selected notification method" });
          }
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(notificationEmail)) {
            return res.status(400).json({ error: "Invalid email address" });
          }
        }
        if (notificationMethod === "whatsapp" || notificationMethod === "both") {
          if (!whatsappNumber) {
            return res.status(400).json({ error: "WhatsApp number required for selected notification method" });
          }
          const phoneRegex = /^\+\d{1,3}\d{1,14}$/;
          const cleaned = whatsappNumber.replace(/[\s\-()]/g, "");
          if (!phoneRegex.test("+" + cleaned.replace(/^\+/, ""))) {
            return res.status(400).json({ error: "Invalid phone number format" });
          }
        }
        await setPlan(shop, planToSet);
        const existing = await db.select().from(shopSettings).where((0, import_drizzle_orm10.eq)(shopSettings.shopDomain, shop)).limit(1);
        const settingsData = {
          notificationMethod,
          notificationEmail: notificationMethod.includes("email") ? notificationEmail : null,
          whatsappNumber: notificationMethod.includes("whatsapp") ? whatsappNumber : null,
          thresholdType,
          thresholdValue,
          safetyStock: safetyStock || 10,
          batchingEnabled,
          batchingInterval,
          emailAlertsEnabled: notificationMethod !== "whatsapp",
          isOnboarded: true,
          updatedAt: /* @__PURE__ */ new Date()
        };
        if (existing.length > 0) {
          await db.update(shopSettings).set(settingsData).where((0, import_drizzle_orm10.eq)(shopSettings.shopDomain, shop));
        } else {
          await db.insert(shopSettings).values({
            shopDomain: shop,
            ...settingsData,
            createdAt: /* @__PURE__ */ new Date()
          });
        }
        console.log(
          `[onboarding] Completed for ${shop}: plan=${planToSet}, threshold=${thresholdType}:${thresholdValue}, notifications=${notificationMethod}`
        );
        res.json({
          success: true,
          message: "Onboarding completed",
          shop,
          plan: planToSet
        });
      } catch (error) {
        console.error("[onboarding] Error completing onboarding:", error);
        res.status(500).json({ error: "Failed to complete onboarding" });
      }
    }
  );
  router.get("/api/onboarding/status", async (req, res) => {
    try {
      const shop = req.query.shop;
      if (!shop) {
        return res.status(400).json({ error: "Missing shop parameter" });
      }
      const settings = await db.select().from(shopSettings).where((0, import_drizzle_orm10.eq)(shopSettings.shopDomain, shop)).limit(1);
      if (!settings.length) {
        return res.json({
          isOnboarded: false,
          message: "Please complete onboarding"
        });
      }
      res.json({
        isOnboarded: settings[0].isOnboarded,
        plan: settings[0]
      });
    } catch (error) {
      console.error("[onboarding] Error checking status:", error);
      res.status(500).json({ error: "Failed to check onboarding status" });
    }
  });
  router.post(
    "/api/onboarding/dismiss-banner",
    verifySessionToken,
    async (req, res) => {
      try {
        const session = req.shopifySession;
        const shop = session.shop;
        const existing = await db.select().from(shopSettings).where((0, import_drizzle_orm10.eq)(shopSettings.shopDomain, shop)).limit(1);
        if (existing.length > 0) {
          await db.update(shopSettings).set({
            dismissedUpsellBanner: true,
            updatedAt: /* @__PURE__ */ new Date()
          }).where((0, import_drizzle_orm10.eq)(shopSettings.shopDomain, shop));
        } else {
          await db.insert(shopSettings).values({
            shopDomain: shop,
            dismissedUpsellBanner: true,
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          });
        }
        console.log(
          `[onboarding] Upsell banner dismissed for ${shop}`
        );
        res.json({
          success: true,
          message: "Banner dismissed",
          shop
        });
      } catch (error) {
        console.error("[onboarding] Error dismissing banner:", error);
        res.status(500).json({ error: "Failed to dismiss banner" });
      }
    }
  );
}
var import_drizzle_orm10;
var init_onboarding = __esm({
  "server/routes/onboarding.ts"() {
    "use strict";
    init_db();
    init_schema();
    import_drizzle_orm10 = require("drizzle-orm");
    init_billing_service();
    init_middleware();
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

// server/routes.ts
init_shopify();
init_middleware();

// server/auth-utils.ts
init_shopify();
init_shopify_session_storage();
init_db();
init_schema();
var import_drizzle_orm3 = require("drizzle-orm");
async function handleOAuthSession(session) {
  if (!session) {
    throw new Error("Session is null or undefined");
  }
  if (!session.shop) {
    throw new Error("Session missing shop domain");
  }
  if (!session.accessToken) {
    throw new Error("Session missing access token - OAuth may have failed");
  }
  try {
    console.log("[auth] Saving session for shop:", session.shop);
    const stored = await sessionStorage.storeSession(session);
    if (!stored) {
      throw new Error("Failed to store session");
    }
    console.log(
      `[auth] \u2705 Session successfully stored for ${session.shop}`
    );
    await saveAccessTokenToSettings(session.shop, session.accessToken);
    return {
      success: true,
      shop: session.shop,
      accessToken: session.accessToken,
      scope: session.scope
    };
  } catch (error) {
    console.error("[auth] \u274C Failed to save session:", {
      shop: session?.shop,
      errorMessage: error instanceof Error ? error.message : "Unknown error"
    });
    throw error;
  }
}
async function saveAccessTokenToSettings(shop, accessToken) {
  try {
    const existing = await db.select().from(shopSettings).where((0, import_drizzle_orm3.eq)(shopSettings.shopDomain, shop)).limit(1);
    if (existing.length > 0) {
      await db.update(shopSettings).set({ accessToken, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm3.eq)(shopSettings.shopDomain, shop));
    } else {
      await db.insert(shopSettings).values({
        shopDomain: shop,
        accessToken,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      });
    }
    console.log(`[auth] \u2705 Access token saved to shop_settings for ${shop}`);
  } catch (error) {
    console.error(`[auth] \u26A0\uFE0F Failed to save access token to shop_settings:`, error);
  }
}
async function getAccessToken(shop) {
  const session = await getShopSession(shop);
  if (session?.accessToken) {
    return session.accessToken;
  }
  try {
    const settings = await db.select({ accessToken: shopSettings.accessToken }).from(shopSettings).where((0, import_drizzle_orm3.eq)(shopSettings.shopDomain, shop)).limit(1);
    if (settings.length > 0 && settings[0].accessToken) {
      console.log(`[auth] Using access token from shop_settings for ${shop}`);
      return settings[0].accessToken;
    }
  } catch (error) {
    console.error(`[auth] Error fetching access token from shop_settings:`, error);
  }
  return null;
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

// server/routes.ts
init_webhook_handler();

// server/webhook-queue.ts
var import_bull = __toESM(require("bull"), 1);
init_webhook_processors();
var webhookQueue = null;
var queueReady = false;
var initializeQueue = async () => {
  try {
    webhookQueue = new import_bull.default("webhooks", {
      redis: process.env.REDIS_URL || { host: "127.0.0.1", port: 6379 },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2e3
        },
        removeOnComplete: true
      }
    });
    await webhookQueue.client.ping();
    queueReady = true;
    console.log("[webhook-queue] \u2705 Connected to Redis, queue ready");
    webhookQueue.on("completed", (job) => {
      console.log(`[webhook-queue] Job ${job.id} completed successfully`);
    });
    webhookQueue.on("failed", (job, err) => {
      console.error(`[webhook-queue] Job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);
    });
    webhookQueue.on("error", (error) => {
      console.error("[webhook-queue] Queue connection error:", error);
    });
    webhookQueue.process(async (job) => {
      await processWebhook(job.data.topic, job.data.shop, job.data.payload, job.id);
    });
  } catch (error) {
    console.warn(`[webhook-queue] \u26A0\uFE0F  Redis unavailable (${error.code}), using synchronous fallback`);
    webhookQueue = null;
  }
};
async function processWebhook(topic, shop, payload, jobId = "sync") {
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
}
async function enqueueWebhook(topic, shop, payload) {
  try {
    if (queueReady && webhookQueue) {
      const job = await webhookQueue.add(
        { topic, shop, payload },
        {
          jobId: `${topic}__${shop}__${Date.now()}`
        }
      );
      console.log(`[webhook-queue] Enqueued ${topic} for ${shop} (job ${job.id})`);
      return true;
    }
    console.log(`[webhook-queue] (fallback mode) Processing ${topic} for ${shop} synchronously`);
    setImmediate(() => {
      processWebhook(topic, shop, payload, "sync").catch((error) => {
        console.error(`[webhook-queue] Fallback processing failed:`, error);
      });
    });
    return true;
  } catch (error) {
    console.error(`[webhook-queue] Failed to enqueue ${topic} for ${shop}:`, error);
    return false;
  }
}
async function closeWebhookQueue() {
  if (!webhookQueue) {
    console.log("[webhook-queue] No queue to close (fallback mode)");
    return;
  }
  try {
    await webhookQueue.close();
    console.log("[webhook-queue] Queue closed successfully");
  } catch (error) {
    console.error("[webhook-queue] Error closing queue:", error);
  }
}
initializeQueue();

// server/shopify-api.ts
init_shopify();
init_db();
init_schema();
var import_drizzle_orm8 = require("drizzle-orm");
async function fetchShopifyProducts(shop, accessToken) {
  try {
    const client2 = new shopify.clients.Rest({
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
      const response = await client2.get({
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
      const existing = await db.select().from(products).where((0, import_drizzle_orm8.eq)(products.id, productId)).limit(1);
      if (existing.length > 0) {
        await db.update(products).set({
          title,
          handle,
          imageUrl,
          updatedAt: /* @__PURE__ */ new Date()
        }).where((0, import_drizzle_orm8.eq)(products.id, productId));
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
    const client2 = new shopify.clients.Rest({
      session: {
        shop,
        accessToken,
        scope: "",
        state: "",
        isOnline: false,
        id: `offline_${shop}`
      }
    });
    const response = await client2.get({
      path: `/inventory_items/${inventoryItemId}`
    });
    if (!response?.body?.inventory_item) {
      return;
    }
    const item = response.body.inventory_item;
    const sku = item.sku;
    const locationsResponse = await client2.get({
      path: `/inventory_levels?inventory_item_ids=${inventoryItemId}`
    });
    if (locationsResponse?.body?.inventory_levels) {
      for (const level of locationsResponse.body.inventory_levels) {
        const locationId = level.location_id;
        const quantity = level.available || 0;
        const inventoryId = `${shop}__${inventoryItemId}__${locationId}`;
        const existing = await db.select().from(inventory).where((0, import_drizzle_orm8.eq)(inventory.id, inventoryId)).limit(1);
        if (existing.length > 0) {
          await db.update(inventory).set({
            quantity,
            lastUpdated: /* @__PURE__ */ new Date()
          }).where((0, import_drizzle_orm8.eq)(inventory.id, inventoryId));
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
init_alerts();
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
      const appUrl2 = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "");
      const scopes2 = process.env.SCOPES || "write_products,read_products,write_inventory,read_inventory,write_webhooks,read_webhooks";
      const nonce = Math.random().toString(36).substring(2);
      const callbackUrl = `${appUrl2}/api/auth/callback`;
      const authUrl = `https://${sanitizedShop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=${scopes2}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${nonce}`;
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
  app2.get("/api/auth/callback", async (req, res) => {
    try {
      const callback = await shopify.auth.callback({
        rawRequest: req,
        rawResponse: res
      });
      const session = callback.session;
      if (!session) {
        console.error("[auth] \u274C Shopify returned null/undefined session");
        throw new Error("No session returned from Shopify callback");
      }
      if (!session.shop) {
        console.error("[auth] \u274C Session missing shop:", session);
        throw new Error("Session missing shop domain");
      }
      if (!session.accessToken) {
        console.error("[auth] \u274C Session missing accessToken:", {
          shop: session.shop,
          scope: session.scope
        });
        throw new Error("Session missing access token");
      }
      console.log("[auth] \u2705 Valid session received:", {
        shop: session.shop,
        accessToken: "***" + session.accessToken.slice(-4),
        scope: session.scope
      });
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
        const { db: database } = await Promise.resolve().then(() => (init_db(), db_exports));
        const { shopSettings: settingsTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        const { eq: eq10 } = await import("drizzle-orm");
        await database.update(settingsTable).set({ webhooksRegistered: true, updatedAt: /* @__PURE__ */ new Date() }).where(eq10(settingsTable.shopDomain, result.shop)).catch((e) => console.warn("[auth] Could not update webhooksRegistered flag:", e));
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
      const code = req.query.code;
      const isCookieError = error.constructor?.name === "CookieNotFound" || error.message?.includes("Could not find an OAuth cookie");
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
                  code
                })
              }
            );
            if (!tokenResponse.ok) {
              const errText = await tokenResponse.text();
              console.error(`[auth] Token exchange failed (${tokenResponse.status}):`, errText);
              throw new Error(`Token exchange failed: ${tokenResponse.status}`);
            }
            const tokenData = await tokenResponse.json();
            console.log(`[auth] \u2705 Manual token exchange successful for ${sanitizedShop}`);
            const { Session: Session2 } = await import("@shopify/shopify-api");
            const manualSession = new Session2({
              id: `offline_${sanitizedShop}`,
              shop: sanitizedShop,
              state: "",
              isOnline: false
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
              syncProducts(result.shop, result.accessToken || "").then(({ created, updated }) => {
                console.log(
                  `[auth] Product sync complete: ${created} created, ${updated} updated`
                );
              }).catch((syncError) => {
                console.error(`[auth] Product sync failed:`, syncError);
              });
            }
            const redirectUrl = host ? `/?shop=${sanitizedShop}&host=${host}` : `/?shop=${sanitizedShop}`;
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
        const { eq: eq10 } = await import("drizzle-orm");
        const shopProducts = await database.select().from(productsTable).where(eq10(productsTable.shopDomain, session.shop));
        const productsWithInventory = await Promise.all(
          shopProducts.map(async (product) => {
            const inventoryRecords = await database.select().from(inventoryTable).where(eq10(inventoryTable.productId, product.shopifyProductId));
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
    async (req, res) => {
      try {
        const shop = req.query.shop;
        if (!shop) {
          return res.status(400).json({ error: "Missing shop parameter" });
        }
        const activeAlerts = await getActiveAlerts(shop);
        res.json({
          shop,
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
        const { eq: eq10 } = await import("drizzle-orm");
        const alertResult = await database.select().from(alertsTable).where(eq10(alertsTable.id, alertId)).limit(1);
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
  app2.post("/api/test/whatsapp", async (req, res) => {
    try {
      const { shop, phoneNumber } = req.body;
      if (!phoneNumber) {
        res.status(400).json({ error: "Missing phoneNumber" });
        return;
      }
      console.log(`[test] Sending test WhatsApp to ${phoneNumber}`);
      const { sendWhatsAppMessage: sendWhatsAppMessage2, formatAlertMessage: formatAlertMessage2 } = await Promise.resolve().then(() => (init_twilio_service(), twilio_service_exports));
      const message = formatAlertMessage2(
        "Test Product \u2014 Low Stock Alert",
        3,
        5,
        "Main Warehouse"
      );
      const result = await sendWhatsAppMessage2(phoneNumber, message);
      if (result.success) {
        console.log(`[test] WhatsApp test sent successfully: ${result.messageId}`);
        res.json({
          success: true,
          messageId: result.messageId,
          simulated: result.messageId?.startsWith("simulated_") || false
        });
      } else {
        console.error(`[test] WhatsApp test failed: ${result.error}`);
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error("[test] Error sending test WhatsApp:", error);
      res.status(500).json({
        error: error.message || "Failed to send test message"
      });
    }
  });
  const getShopFromWebhookRequest = (req) => {
    const fromHeader = req.headers["x-shopify-shop-domain"];
    if (fromHeader) return fromHeader;
    if (req.body?.shop_domain) return req.body.shop_domain;
    if (req.body?.domain) return req.body.domain;
    return null;
  };
  const handleWebhook = (topic, processor, options) => {
    return async (req, res) => {
      const startTime = Date.now();
      const webhookId = req.headers["x-shopify-webhook-id"] || "unknown";
      const apiVersion2 = req.headers["x-shopify-api-version"] || "unknown";
      console.log(`[webhook] ========================================`);
      console.log(`[webhook] RECEIVED: ${topic}`);
      console.log(`[webhook] Webhook ID: ${webhookId}`);
      console.log(`[webhook] API Version: ${apiVersion2}`);
      console.log(`[webhook] Timestamp: ${(/* @__PURE__ */ new Date()).toISOString()}`);
      try {
        const secret = process.env.SHOPIFY_API_SECRET || "";
        if (!secret) {
          console.error(`[webhook] \u274C SHOPIFY_API_SECRET env var is not set \u2014 cannot verify webhook`);
        }
        const hasRawBody = !!req.rawBody;
        console.log(`[webhook] Raw body available: ${hasRawBody}`);
        console.log(`[webhook] HMAC header present: ${!!req.headers["x-shopify-hmac-sha256"]}`);
        if (!verifyWebhookSignature(req, secret)) {
          console.error(`[webhook] \u274C SIGNATURE VERIFICATION FAILED for ${topic}`);
          console.error(`[webhook] Secret length: ${secret.length} chars`);
          res.status(401).json({ error: "Unauthorized" });
          return;
        }
        console.log(`[webhook] \u2705 Signature verified for ${topic}`);
        const shop = getShopFromWebhookRequest(req);
        if (!shop) {
          console.error(`[webhook] \u274C COULD NOT DETERMINE SHOP for ${topic}`);
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
            console.log(`[webhook] \u2705 Enqueued ${topic} for async processing`);
          } else {
            console.warn(`[webhook] \u26A0\uFE0F Queue unavailable, processing ${topic} inline`);
            await processor(shop, req.body);
            console.log(`[webhook] \u2705 Processed ${topic} inline`);
          }
        } else {
          await processor(shop, req.body);
          console.log(`[webhook] \u2705 Processed ${topic} successfully`);
        }
        const duration = Date.now() - startTime;
        console.log(`[webhook] \u2705 COMPLETED: ${topic} for ${shop} in ${duration}ms`);
        console.log(`[webhook] ========================================`);
        res.status(200).json({ success: true });
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[webhook] \u274C ERROR handling ${topic} after ${duration}ms:`, error);
        console.log(`[webhook] ========================================`);
        res.status(200).json({ success: true });
      }
    };
  };
  app2.post(
    "/api/webhooks/products/create",
    handleWebhook("products/create", async (shop, payload) => {
      const { processProductCreate: processProductCreate2 } = await Promise.resolve().then(() => (init_webhook_processors(), webhook_processors_exports));
      await processProductCreate2(shop, payload);
    }, { useQueue: true })
  );
  app2.post(
    "/api/webhooks/products/update",
    handleWebhook("products/update", async (shop, payload) => {
      const { processProductUpdate: processProductUpdate2 } = await Promise.resolve().then(() => (init_webhook_processors(), webhook_processors_exports));
      await processProductUpdate2(shop, payload);
    }, { useQueue: true })
  );
  app2.post(
    "/api/webhooks/inventory_levels/update",
    handleWebhook("inventory_levels/update", async (shop, payload) => {
      const { processInventoryUpdate: processInventoryUpdate2 } = await Promise.resolve().then(() => (init_webhook_processors(), webhook_processors_exports));
      await processInventoryUpdate2(shop, payload);
    }, { useQueue: true })
  );
  app2.post(
    "/api/webhooks/app/uninstalled",
    handleWebhook("app/uninstalled", async (shop, payload) => {
      const { processAppUninstalled: processAppUninstalled2 } = await Promise.resolve().then(() => (init_webhook_processors(), webhook_processors_exports));
      await processAppUninstalled2(shop, payload);
    })
  );
  app2.post(
    "/api/webhooks/customers/data_request",
    handleWebhook("customers/data_request", async (shop, payload) => {
      const { processCustomersDataRequest: processCustomersDataRequest2 } = await Promise.resolve().then(() => (init_webhook_processors(), webhook_processors_exports));
      await processCustomersDataRequest2(shop, payload);
    })
  );
  app2.post(
    "/api/webhooks/customers/redact",
    handleWebhook("customers/redact", async (shop, payload) => {
      const { processCustomersRedact: processCustomersRedact2 } = await Promise.resolve().then(() => (init_webhook_processors(), webhook_processors_exports));
      await processCustomersRedact2(shop, payload);
    })
  );
  app2.post(
    "/api/webhooks/shop/redact",
    handleWebhook("shop/redact", async (shop, payload) => {
      const { processShopRedact: processShopRedact2 } = await Promise.resolve().then(() => (init_webhook_processors(), webhook_processors_exports));
      await processShopRedact2(shop, payload);
    })
  );
  app2.delete("/api/admin/shop-data", async (req, res) => {
    try {
      const adminSecret = process.env.ADMIN_SECRET;
      const authHeader = req.headers.authorization;
      if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const shop = req.query.shop;
      if (!shop) {
        res.status(400).json({ error: "Missing shop parameter" });
        return;
      }
      const { processAppUninstalled: processAppUninstalled2 } = await Promise.resolve().then(() => (init_webhook_processors(), webhook_processors_exports));
      await processAppUninstalled2(shop, {});
      console.log(`[admin] Manually cleaned up data for ${shop}`);
      res.json({ success: true, message: `All data deleted for ${shop}` });
    } catch (error) {
      console.error("[admin] Error cleaning up shop data:", error);
      res.status(500).json({ error: "Failed to clean up shop data" });
    }
  });
  app2.get("/api/webhooks/status", async (req, res) => {
    try {
      const shop = req.query.shop;
      if (!shop) {
        return res.status(400).json({ error: "Missing shop parameter" });
      }
      const sanitizedShop = shopify.utils.sanitizeShop(shop);
      if (!sanitizedShop) {
        return res.status(400).json({ error: "Invalid shop domain" });
      }
      const accessToken = await getAccessToken(sanitizedShop);
      if (!accessToken) {
        return res.json({
          registered: false,
          webhooks: [],
          reason: "no_access_token",
          message: "No access token available. Please reinstall the app."
        });
      }
      try {
        const client2 = new shopify.clients.Rest({
          session: {
            shop: sanitizedShop,
            accessToken,
            scope: "",
            state: "",
            isOnline: false,
            id: `offline_${sanitizedShop}`,
            expires: void 0
          }
        });
        const response = await client2.get({ path: "webhooks" });
        const webhooks = response?.body?.webhooks || [];
        const requiredTopics = [
          "inventory_levels/update",
          "products/create",
          "products/update",
          "app/uninstalled"
        ];
        const registeredTopics = webhooks.map((w) => w.topic);
        const missingTopics = requiredTopics.filter(
          (t) => !registeredTopics.includes(t)
        );
        console.log(
          `[webhook] Status check for ${sanitizedShop}: ${webhooks.length} registered, ${missingTopics.length} missing`
        );
        res.json({
          registered: missingTopics.length === 0,
          webhooks: webhooks.map((w) => ({
            id: w.id,
            topic: w.topic,
            address: w.address
          })),
          missingTopics,
          total: webhooks.length
        });
      } catch (apiError) {
        console.error(`[webhook] Error checking webhook status:`, apiError?.message);
        res.json({
          registered: false,
          webhooks: [],
          reason: "api_error",
          message: apiError?.message || "Failed to check webhooks"
        });
      }
    } catch (error) {
      console.error("[webhook] Status check error:", error);
      res.status(500).json({ error: "Failed to check webhook status" });
    }
  });
  app2.post("/api/webhooks/register", async (req, res) => {
    try {
      const shop = req.body.shop || req.query.shop;
      if (!shop) {
        return res.status(400).json({ error: "Missing shop parameter" });
      }
      const sanitizedShop = shopify.utils.sanitizeShop(shop);
      if (!sanitizedShop) {
        return res.status(400).json({ error: "Invalid shop domain" });
      }
      const accessToken = await getAccessToken(sanitizedShop);
      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: "No access token found. Please reinstall the app from Shopify admin."
        });
      }
      console.log(`[webhook] Manual registration triggered for ${sanitizedShop}`);
      const result = await registerWebhooks(sanitizedShop, accessToken);
      if (result) {
        const { db: database } = await Promise.resolve().then(() => (init_db(), db_exports));
        const { shopSettings: settingsTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        const { eq: eq10 } = await import("drizzle-orm");
        await database.update(settingsTable).set({ webhooksRegistered: true, updatedAt: /* @__PURE__ */ new Date() }).where(eq10(settingsTable.shopDomain, sanitizedShop));
      }
      res.json({
        success: result,
        message: result ? "Webhooks registered successfully" : "Some webhooks failed to register"
      });
    } catch (error) {
      console.error("[webhook] Manual registration error:", error);
      res.status(500).json({ error: "Failed to register webhooks" });
    }
  });
  app2.post("/api/webhooks/ensure", async (req, res) => {
    try {
      const shop = req.body.shop || req.query.shop;
      if (!shop) {
        return res.status(400).json({ error: "Missing shop parameter" });
      }
      const sanitizedShop = shopify.utils.sanitizeShop(shop);
      if (!sanitizedShop) {
        return res.status(400).json({ error: "Invalid shop domain" });
      }
      const accessToken = await getAccessToken(sanitizedShop);
      if (!accessToken) {
        console.log(`[webhook] No access token for ${sanitizedShop}, skipping ensure`);
        return res.json({
          success: false,
          action: "skipped",
          reason: "no_access_token"
        });
      }
      try {
        const client2 = new shopify.clients.Rest({
          session: {
            shop: sanitizedShop,
            accessToken,
            scope: "",
            state: "",
            isOnline: false,
            id: `offline_${sanitizedShop}`,
            expires: void 0
          }
        });
        const response = await client2.get({ path: "webhooks" });
        const webhooks = response?.body?.webhooks || [];
        const registeredTopics = webhooks.map((w) => w.topic);
        const requiredTopics = [
          "inventory_levels/update",
          "products/create",
          "products/update",
          "app/uninstalled"
        ];
        const missingTopics = requiredTopics.filter(
          (t) => !registeredTopics.includes(t)
        );
        if (missingTopics.length === 0) {
          console.log(`[webhook] All webhooks already registered for ${sanitizedShop}`);
          return res.json({
            success: true,
            action: "already_registered",
            total: webhooks.length
          });
        }
        console.log(
          `[webhook] Auto-healing: ${missingTopics.length} missing webhooks for ${sanitizedShop}, registering...`
        );
        const result = await registerWebhooks(sanitizedShop, accessToken);
        if (result) {
          const { db: database } = await Promise.resolve().then(() => (init_db(), db_exports));
          const { shopSettings: settingsTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
          const { eq: eq10 } = await import("drizzle-orm");
          await database.update(settingsTable).set({ webhooksRegistered: true, updatedAt: /* @__PURE__ */ new Date() }).where(eq10(settingsTable.shopDomain, sanitizedShop));
        }
        res.json({
          success: result,
          action: "registered",
          missingTopics
        });
      } catch (apiError) {
        console.error(`[webhook] Ensure check failed:`, apiError?.message);
        res.json({
          success: false,
          action: "error",
          reason: apiError?.message
        });
      }
    } catch (error) {
      console.error("[webhook] Ensure error:", error);
      res.status(500).json({ error: "Failed to ensure webhooks" });
    }
  });
  console.log("[routes] Auth, shop, webhook, and webhook-health routes registered");
  try {
    const { setupBillingRoutes: setupBillingRoutes2 } = await Promise.resolve().then(() => (init_billing(), billing_exports));
    const { setupOnboardingRoutes: setupOnboardingRoutes2 } = await Promise.resolve().then(() => (init_onboarding(), onboarding_exports));
    setupBillingRoutes2(app2);
    setupOnboardingRoutes2(app2);
    console.log("[routes] Billing and onboarding routes registered");
  } catch (error) {
    console.error("[routes] Failed to register billing/onboarding routes:", error);
  }
  return httpServer2;
}

// server/index.ts
var import_http = require("http");
var import_path = require("path");
init_db();
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
async function startServer() {
  console.log("[startup] === SERVER STARTUP ===");
  try {
    console.log("[startup] Running idempotent migrations...");
    await runMigrations();
    console.log("[startup] \u2705 Migrations completed safely (data preserved)");
  } catch (error) {
    console.error("[startup] \u274C Migration failed:", error);
    process.exit(1);
  }
  console.log("[startup] Starting Express...");
  try {
    const { initTwilio: initTwilio2 } = await Promise.resolve().then(() => (init_twilio_service(), twilio_service_exports));
    const twilioConfig = {
      accountSid: process.env.TWILIO_ACCOUNT_SID || "",
      authToken: process.env.TWILIO_AUTH_TOKEN || "",
      whatsappFrom: process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_WHATSAPP_NUMBER || ""
    };
    if (twilioConfig.accountSid && twilioConfig.authToken) {
      initTwilio2(twilioConfig);
      log("Twilio initialized for WhatsApp alerts");
    } else {
      log("Twilio credentials not configured, WhatsApp alerts will be simulated");
    }
  } catch (error) {
    console.error("Failed to initialize Twilio:", error);
  }
  try {
    const { startBatchingProcessor: startBatchingProcessor2 } = await Promise.resolve().then(() => (init_batching_service(), batching_service_exports));
    const batchingTimer = startBatchingProcessor2(5 * 60 * 1e3);
    global.batchingTimer = batchingTimer;
    log("Batching processor started");
  } catch (error) {
    console.error("Failed to initialize batching processor:", error);
  }
  await registerRoutes(httpServer, app);
  setTimeout(async () => {
    try {
      const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { shopifySessions: shopifySessions2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { registerWebhooks: registerWebhooks2 } = await Promise.resolve().then(() => (init_webhook_handler(), webhook_handler_exports));
      const { isNotNull } = await import("drizzle-orm");
      const sessions = await db2.select().from(shopifySessions2).where(isNotNull(shopifySessions2.accessToken));
      log(`[startup] Found ${sessions.length} session(s) for webhook re-registration`);
      if (sessions.length > 0) {
        for (const session of sessions) {
          try {
            log(`[startup] Re-registering webhooks for ${session.shop}...`);
            await registerWebhooks2(session.shop, session.accessToken);
            log(`[startup] Webhooks re-registered for ${session.shop}`);
          } catch (err) {
            console.error(`[startup] Failed to re-register webhooks for ${session.shop}:`, err);
          }
        }
      } else {
        log("[startup] No existing sessions found \u2014 skipping webhook re-registration");
      }
    } catch (error) {
      console.error("[startup] Webhook re-registration failed:", error);
    }
  }, 5e3);
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
  const port = parseInt(process.env.PORT || "8080", 10);
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
    if (global.batchingTimer) {
      clearInterval(global.batchingTimer);
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
    if (global.batchingTimer) {
      clearInterval(global.batchingTimer);
      log("Batching processor stopped");
    }
    await closeWebhookQueue();
    httpServer.close(() => {
      log("Server closed");
      process.exit(0);
    });
  });
}
startServer().catch((error) => {
  console.error("[startup] Fatal error:", error);
  process.exit(1);
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  log
});
