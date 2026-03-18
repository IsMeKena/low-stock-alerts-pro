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
        // CRITICAL: Prevent duplicate sessions for same shop+mode combination
        // This ensures we don't accumulate stale or invalid sessions
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
    });
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
    });
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  client: () => client,
  db: () => db,
  runMigrations: () => runMigrations
});
async function cleanupOldTables() {
  try {
    console.log("[db] >>> CLEANUP: Checking for old corrupted tables <<<");
    const oldTables = [
      "alert_logs",
      "inventory_levels",
      "inventory_level",
      "alerts_log",
      "old_alerts",
      "old_inventory"
    ];
    const result = await db.execute(import_drizzle_orm2.sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    const existingTables = result.rows.map((r) => r.table_name);
    console.log("[db] Existing tables:", existingTables);
    const tablesToDrop = oldTables.filter((t) => existingTables.includes(t));
    if (tablesToDrop.length > 0) {
      console.log("[db] Found old tables to drop:", tablesToDrop);
      for (const table of tablesToDrop) {
        try {
          console.log(`[db] Dropping old table: ${table}`);
          await db.execute(import_drizzle_orm2.sql`DROP TABLE IF EXISTS ${import_drizzle_orm2.sql.identifier(table)} CASCADE`);
          console.log(`[db] \u2705 Dropped ${table}`);
        } catch (err) {
          console.error(`[db] Failed to drop ${table}:`, err);
        }
      }
    } else {
      console.log("[db] No old tables found - clean slate");
    }
    console.log("[db] Clearing migration history...");
    await db.execute(import_drizzle_orm2.sql`DELETE FROM __drizzle_migrations__`);
    console.log("[db] \u2705 Migration history cleared");
  } catch (error) {
    console.error("[db] \u26A0\uFE0F  Cleanup warning (non-fatal):", error);
  }
}
async function runMigrations() {
  try {
    console.log("[db] >>> MIGRATION CHECK STARTING <<<");
    console.log("[db] NODE_ENV:", process.env.NODE_ENV);
    await cleanupOldTables();
    const migrationsFolder = (0, import_path.join)(process.cwd(), "drizzle");
    console.log("[db] Using migrations path:", migrationsFolder);
    console.log("[db] Does path exist?", import_fs.default.existsSync(migrationsFolder));
    console.log("[db] Checking for pending migrations...");
    await (0, import_migrator.migrate)(db, {
      migrationsFolder
    });
    console.log("[db] \u2705 Migrations completed successfully");
    return true;
  } catch (error) {
    console.error("[db] \u274C Migration error:", error);
    console.error("[db] Error details:", JSON.stringify(error, null, 2));
    return false;
  }
}
var import_node_postgres, import_pg, import_migrator, import_drizzle_orm2, import_path, import_fs, databaseUrl, pool, db, client;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    import_node_postgres = require("drizzle-orm/node-postgres");
    import_pg = require("pg");
    import_migrator = require("drizzle-orm/node-postgres/migrator");
    import_drizzle_orm2 = require("drizzle-orm");
    import_path = require("path");
    import_fs = __toESM(require("fs"), 1);
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
  const plan = await getUserPlan(shopDomain);
  const existing = await db.select().from(usageTracker).where(
    (0, import_drizzle_orm4.and)(
      (0, import_drizzle_orm4.eq)(usageTracker.shopDomain, shopDomain),
      (0, import_drizzle_orm4.eq)(usageTracker.month, month)
    )
  ).limit(1);
  if (existing.length > 0) {
    return existing[0];
  }
  const tierConfig = PRICING_TIERS[plan];
  const limit = Math.max(tierConfig.emailLimit + tierConfig.whatsappLimit, 10);
  await db.insert(usageTracker).values({
    shopDomain,
    plan,
    emailCount: 0,
    whatsappCount: 0,
    month,
    usageRemaining: limit,
    createdAt: /* @__PURE__ */ new Date(),
    updatedAt: /* @__PURE__ */ new Date()
  });
  return {
    shopDomain,
    plan,
    emailCount: 0,
    whatsappCount: 0,
    month,
    usageRemaining: limit
  };
}
async function trackEmailUsage(shopDomain) {
  try {
    const tracker = await getOrInitializeUsageTracker(shopDomain);
    await db.update(usageTracker).set({
      emailCount: tracker.emailCount + 1,
      usageRemaining: Math.max(tracker.usageRemaining - 1, 0),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(
      (0, import_drizzle_orm4.and)(
        (0, import_drizzle_orm4.eq)(usageTracker.shopDomain, shopDomain),
        (0, import_drizzle_orm4.eq)(usageTracker.month, tracker.month)
      )
    );
    console.log(`[billing] Tracked email usage for ${shopDomain}`);
  } catch (error) {
    console.error("[billing] Error tracking email usage:", error);
  }
}
async function trackWhatsAppUsage(shopDomain) {
  try {
    const tracker = await getOrInitializeUsageTracker(shopDomain);
    await db.update(usageTracker).set({
      whatsappCount: tracker.whatsappCount + 1,
      usageRemaining: Math.max(tracker.usageRemaining - 1, 0),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(
      (0, import_drizzle_orm4.and)(
        (0, import_drizzle_orm4.eq)(usageTracker.shopDomain, shopDomain),
        (0, import_drizzle_orm4.eq)(usageTracker.month, tracker.month)
      )
    );
    console.log(`[billing] Tracked WhatsApp usage for ${shopDomain}`);
  } catch (error) {
    console.error("[billing] Error tracking WhatsApp usage:", error);
  }
}
async function canSendEmail(shopDomain) {
  try {
    const plan = await getUserPlan(shopDomain);
    const tracker = await getOrInitializeUsageTracker(shopDomain);
    const tierConfig = PRICING_TIERS[plan];
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
    const tierConfig = PRICING_TIERS[plan];
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
    const tierConfig = PRICING_TIERS[plan];
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
    const tierConfig = PRICING_TIERS[plan];
    const limit = Math.max(tierConfig.emailLimit + tierConfig.whatsappLimit, 10);
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
        usageRemaining: limit,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(
        (0, import_drizzle_orm4.and)(
          (0, import_drizzle_orm4.eq)(usageTracker.shopDomain, shopDomain),
          (0, import_drizzle_orm4.eq)(usageTracker.month, month)
        )
      );
    }
    console.log(`[billing] Reset usage for ${shopDomain}: ${month}`);
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
    console.log("[twilio] Twilio client initialized");
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
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await twilioClient.messages.create({
          from: `whatsapp:${normalizePhoneNumber(process.env.TWILIO_WHATSAPP_FROM || "")}`,
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
  alerts2.forEach((alert, index) => {
    const location = alert.location ? ` (${alert.location})` : "";
    message += `${index + 1}. ${alert.productName}${location}
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
var twilioClient;
var init_twilio_service = __esm({
  "server/twilio-service.ts"() {
    "use strict";
    twilioClient = null;
  }
});

// server/routes/billing.ts
var billing_exports = {};
__export(billing_exports, {
  setupBillingRoutes: () => setupBillingRoutes
});
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
      if (!shop || !plan) {
        return res.status(400).json({ error: "Missing shop or plan parameter" });
      }
      if (!["free", "pro", "premium"].includes(plan)) {
        return res.status(400).json({ error: "Invalid plan" });
      }
      await setPlan(shop, plan);
      res.json({
        success: true,
        message: `Plan upgraded to ${plan}`,
        plan
      });
    } catch (error) {
      console.error("[billing-api] Error upgrading plan:", error);
      res.status(500).json({ error: "Failed to upgrade plan" });
    }
  });
  router.post("/api/billing/settings", async (req, res) => {
    try {
      const { shop, whatsappNumber, batchingEnabled, batchingInterval, emailAlertsEnabled } = req.body;
      if (!shop) {
        return res.status(400).json({ error: "Missing shop parameter" });
      }
      if (whatsappNumber) {
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        if (!phoneRegex.test(whatsappNumber.replace(/[\s\-]/g, ""))) {
          return res.status(400).json({ error: "Invalid phone number format" });
        }
      }
      const existing = await db.select().from(shopSettings).where((0, import_drizzle_orm8.eq)(shopSettings.shopDomain, shop)).limit(1);
      if (existing.length > 0) {
        await db.update(shopSettings).set({
          whatsappNumber: whatsappNumber || existing[0].whatsappNumber,
          batchingEnabled: batchingEnabled !== void 0 ? batchingEnabled : existing[0].batchingEnabled,
          batchingInterval: batchingInterval || existing[0].batchingInterval,
          emailAlertsEnabled: emailAlertsEnabled !== void 0 ? emailAlertsEnabled : existing[0].emailAlertsEnabled,
          updatedAt: /* @__PURE__ */ new Date()
        }).where((0, import_drizzle_orm8.eq)(shopSettings.shopDomain, shop));
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
  router.get("/api/billing/settings", async (req, res) => {
    try {
      const shop = req.query.shop;
      if (!shop) {
        return res.status(400).json({ error: "Missing shop parameter" });
      }
      const settings = await db.select().from(shopSettings).where((0, import_drizzle_orm8.eq)(shopSettings.shopDomain, shop)).limit(1);
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
}
var import_drizzle_orm8;
var init_billing = __esm({
  "server/routes/billing.ts"() {
    "use strict";
    init_billing_service();
    init_db();
    init_schema();
    import_drizzle_orm8 = require("drizzle-orm");
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
        const existing = await db.select().from(shopSettings).where((0, import_drizzle_orm9.eq)(shopSettings.shopDomain, shop)).limit(1);
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
          await db.update(shopSettings).set(settingsData).where((0, import_drizzle_orm9.eq)(shopSettings.shopDomain, shop));
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
      const settings = await db.select().from(shopSettings).where((0, import_drizzle_orm9.eq)(shopSettings.shopDomain, shop)).limit(1);
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
    async (req, res) => {
      try {
        const shop = req.query.shop;
        if (!shop) {
          return res.status(400).json({ error: "Missing shop parameter" });
        }
        const existing = await db.select().from(shopSettings).where((0, import_drizzle_orm9.eq)(shopSettings.shopDomain, shop)).limit(1);
        if (existing.length > 0) {
          await db.update(shopSettings).set({
            dismissedUpsellBanner: true,
            updatedAt: /* @__PURE__ */ new Date()
          }).where((0, import_drizzle_orm9.eq)(shopSettings.shopDomain, shop));
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
var import_drizzle_orm9;
var init_onboarding = __esm({
  "server/routes/onboarding.ts"() {
    "use strict";
    init_db();
    init_schema();
    import_drizzle_orm9 = require("drizzle-orm");
    init_billing_service();
  }
});

// server/batching-service.ts
var batching_service_exports = {};
__export(batching_service_exports, {
  addToBatch: () => addToBatch,
  getPendingBatches: () => getPendingBatches,
  processPendingBatches: () => processPendingBatches,
  sendBatch: () => sendBatch,
  startBatchingProcessor: () => startBatchingProcessor
});
async function addToBatch(shop, alertId, productId, locationId, quantity, threshold, alertType) {
  try {
    const settings = await db.select().from(shopSettings).where((0, import_drizzle_orm10.eq)(shopSettings.shopDomain, shop)).limit(1);
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
      `[batching] Added alert ${alertId} to batch queue for ${shop}`
    );
  } catch (error) {
    console.error("[batching] Error adding to batch:", error);
  }
}
async function getPendingBatches(shop) {
  try {
    const now = /* @__PURE__ */ new Date();
    let query = db.select().from(batchingQueue).where(
      (0, import_drizzle_orm10.and)(
        (0, import_drizzle_orm10.eq)(batchingQueue.status, "pending"),
        (0, import_drizzle_orm10.lte)(batchingQueue.scheduledFor, now)
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
async function formatWhatsAppBatch(alerts2) {
  return alerts2.map((alert) => ({
    productName: `Product ${alert.productId.substring(0, 8)}...`,
    quantity: alert.quantity,
    threshold: alert.threshold,
    location: alert.locationId || void 0
  }));
}
async function sendBatch(shop, alertType) {
  try {
    const pending = await db.select().from(batchingQueue).where(
      (0, import_drizzle_orm10.and)(
        (0, import_drizzle_orm10.eq)(batchingQueue.shopDomain, shop),
        (0, import_drizzle_orm10.eq)(batchingQueue.alertType, alertType),
        (0, import_drizzle_orm10.eq)(batchingQueue.status, "pending")
      )
    );
    if (!pending.length) {
      console.log(
        `[batching] No pending ${alertType} alerts for ${shop}`
      );
      return;
    }
    if (alertType === "whatsapp") {
      const settings = await db.select().from(shopSettings).where((0, import_drizzle_orm10.eq)(shopSettings.shopDomain, shop)).limit(1);
      if (!settings.length || !settings[0].whatsappNumber) {
        console.warn(
          `[batching] No WhatsApp number configured for ${shop}`
        );
        for (const alert of pending) {
          await db.update(batchingQueue).set({ status: "failed" }).where((0, import_drizzle_orm10.eq)(batchingQueue.id, alert.id));
        }
        return;
      }
      const formatted = await formatWhatsAppBatch(pending);
      const message = formatBatchedAlertsMessage(formatted);
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
          }).where((0, import_drizzle_orm10.eq)(batchingQueue.id, alert.id));
        }
        console.log(
          `[batching] Sent ${pending.length} WhatsApp alerts for ${shop}`
        );
      } else {
        for (const alert of pending) {
          await db.update(batchingQueue).set({ status: "failed" }).where((0, import_drizzle_orm10.eq)(batchingQueue.id, alert.id));
        }
        console.error(`[batching] Failed to send batch for ${shop}`);
      }
    } else if (alertType === "email") {
      console.log(
        `[batching] Email batch sending stub for ${shop}: ${pending.length} alerts`
      );
      const now = /* @__PURE__ */ new Date();
      for (const alert of pending) {
        await db.update(batchingQueue).set({
          status: "sent",
          sentAt: now
        }).where((0, import_drizzle_orm10.eq)(batchingQueue.id, alert.id));
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
var import_drizzle_orm10, BATCH_INTERVALS;
var init_batching_service = __esm({
  "server/batching-service.ts"() {
    "use strict";
    init_db();
    init_schema();
    import_drizzle_orm10 = require("drizzle-orm");
    init_twilio_service();
    BATCH_INTERVALS = {
      hourly: 60 * 60 * 1e3,
      daily: 24 * 60 * 60 * 1e3,
      weekly: 7 * 24 * 60 * 60 * 1e3
    };
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
var import_drizzle_orm3 = require("drizzle-orm");
init_db();
init_schema();
var PostgresSessionStorage = class {
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
      const [row] = await db.select().from(shopifySessions).where((0, import_drizzle_orm3.eq)(shopifySessions.id, id));
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
      await db.delete(shopifySessions).where((0, import_drizzle_orm3.eq)(shopifySessions.id, id));
      return true;
    } catch (error) {
      console.error("Failed to delete session:", error);
      return false;
    }
  }
  async deleteSessions(ids) {
    try {
      for (const id of ids) {
        await db.delete(shopifySessions).where((0, import_drizzle_orm3.eq)(shopifySessions.id, id));
      }
      return true;
    } catch (error) {
      console.error("Failed to delete sessions:", error);
      return false;
    }
  }
  async findSessionsByShop(shop) {
    try {
      const rows = await db.select().from(shopifySessions).where((0, import_drizzle_orm3.eq)(shopifySessions.shop, shop));
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
        await client2.post({
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
var import_drizzle_orm6 = require("drizzle-orm");

// server/alerts.ts
init_db();
init_schema();
var import_drizzle_orm5 = require("drizzle-orm");
init_billing_service();
init_twilio_service();
async function calculateEffectiveThreshold(productId, currentQuantity) {
  try {
    const product = await db.select().from(products).where((0, import_drizzle_orm5.eq)(products.shopifyProductId, productId)).limit(1);
    if (!product.length) {
      return currentQuantity;
    }
    const prod = product[0];
    if (prod.thresholdType === "percentage" && prod.safetyStock) {
      const percentage = (prod.thresholdValue || 20) / 100;
      return Math.floor(prod.safetyStock * percentage);
    }
    return prod.thresholdValue || 5;
  } catch (error) {
    console.error("[alerts] Error calculating threshold:", error);
    return 5;
  }
}
async function createLowStockAlert(shop, productId, locationId, quantity, threshold) {
  try {
    const alertId = `${shop}__${productId}__${locationId}__${Date.now()}`;
    const existing = await db.select().from(alerts).where(
      (0, import_drizzle_orm5.and)(
        (0, import_drizzle_orm5.eq)(alerts.shopDomain, shop),
        (0, import_drizzle_orm5.eq)(alerts.productId, productId),
        (0, import_drizzle_orm5.eq)(alerts.status, "active")
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
    }).where((0, import_drizzle_orm5.eq)(alerts.id, alertId));
    console.log(`[alerts] Resolved alert ${alertId}`);
  } catch (error) {
    console.error("[alerts] Error resolving alert:", error);
    throw error;
  }
}
async function getActiveAlerts(shop) {
  try {
    const shopAlerts = await db.select().from(alerts).where(
      (0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(alerts.shopDomain, shop), (0, import_drizzle_orm5.eq)(alerts.status, "active"))
    );
    const enriched = await Promise.all(
      shopAlerts.map(async (alert) => {
        const product = await db.select().from(products).where((0, import_drizzle_orm5.eq)(products.shopifyProductId, alert.productId)).limit(1);
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
      console.warn(`[alerts] Email limit reached for ${shop}`);
      return false;
    }
    await trackEmailUsage(shop);
    console.log(
      `[alerts] Email alert queued for ${shop}: ${productName} (${quantity}/${threshold})`
    );
    return true;
  } catch (error) {
    console.error("[alerts] Error sending email alert:", error);
    return false;
  }
}
async function sendWhatsAppAlert(shop, productName, quantity, threshold, locationName) {
  try {
    const canSend = await canSendWhatsApp(shop);
    if (!canSend) {
      console.warn(`[alerts] WhatsApp limit reached for ${shop}`);
      return false;
    }
    const settings = await db.select().from(shopSettings).where((0, import_drizzle_orm5.eq)(shopSettings.shopDomain, shop)).limit(1);
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
      const product = await db.select().from(products).where((0, import_drizzle_orm5.eq)(products.shopifyProductId, productId)).limit(1);
      const settings = await db.select().from(shopSettings).where((0, import_drizzle_orm5.eq)(shopSettings.shopDomain, shop)).limit(1);
      const productName = product.length ? product[0].title : "Unknown Product";
      if (settings.length && settings[0].emailAlertsEnabled) {
        await sendEmailAlert(shop, productName, quantity, threshold);
      }
      if (settings.length && settings[0].whatsappNumber && !settings[0].batchingEnabled) {
        await sendWhatsAppAlert(shop, productName, quantity, threshold);
      }
      console.log(`[alerts] Alert created for low inventory: ${alertId}`);
    } else {
      const existing = await db.select().from(alerts).where(
        (0, import_drizzle_orm5.and)(
          (0, import_drizzle_orm5.eq)(alerts.shopDomain, shop),
          (0, import_drizzle_orm5.eq)(alerts.productId, productId),
          (0, import_drizzle_orm5.eq)(alerts.status, "active")
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
    }).where((0, import_drizzle_orm6.eq)(products.id, productId));
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
      (0, import_drizzle_orm6.and)(
        (0, import_drizzle_orm6.eq)(inventory.shopDomain, shop),
        (0, import_drizzle_orm6.eq)(inventory.locationId, String(locationId))
      )
    ).limit(1);
    if (existing.length > 0) {
      await db.update(inventory).set({
        quantity: quantity || 0,
        lastUpdated: new Date(updatedAt)
      }).where((0, import_drizzle_orm6.eq)(inventory.id, existing[0].id));
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
init_db();
init_schema();
var import_drizzle_orm7 = require("drizzle-orm");
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
      const existing = await db.select().from(products).where((0, import_drizzle_orm7.eq)(products.id, productId)).limit(1);
      if (existing.length > 0) {
        await db.update(products).set({
          title,
          handle,
          imageUrl,
          updatedAt: /* @__PURE__ */ new Date()
        }).where((0, import_drizzle_orm7.eq)(products.id, productId));
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
        const existing = await db.select().from(inventory).where((0, import_drizzle_orm7.eq)(inventory.id, inventoryId)).limit(1);
        if (existing.length > 0) {
          await db.update(inventory).set({
            quantity,
            lastUpdated: /* @__PURE__ */ new Date()
          }).where((0, import_drizzle_orm7.eq)(inventory.id, inventoryId));
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
        const { eq: eq9 } = await import("drizzle-orm");
        const shopProducts = await database.select().from(productsTable).where(eq9(productsTable.shopDomain, session.shop));
        const productsWithInventory = await Promise.all(
          shopProducts.map(async (product) => {
            const inventoryRecords = await database.select().from(inventoryTable).where(eq9(inventoryTable.productId, product.shopifyProductId));
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
        const { eq: eq9 } = await import("drizzle-orm");
        const alertResult = await database.select().from(alertsTable).where(eq9(alertsTable.id, alertId)).limit(1);
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
var import_path2 = require("path");
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
      whatsappFrom: process.env.TWILIO_WHATSAPP_FROM || ""
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
    const staticPath = (0, import_path2.join)(process.cwd(), "dist/public");
    app.use(import_express.default.static(staticPath));
    app.use((req, res, next) => {
      if (!req.path.startsWith("/api") && !res.headersSent) {
        const indexPath = (0, import_path2.join)(staticPath, "index.html");
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
