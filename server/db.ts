import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema.ts";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({
  connectionString: databaseUrl,
});

export const db = drizzle(pool, { schema });
export const client = pool;

/**
 * Ensure all 8 tables exist using raw SQL.
 * This runs on every startup and is idempotent (safe to restart anytime).
 */
async function ensureTables() {
  console.log("[db] Ensuring tables exist...");

  try {
    // Create all 8 tables with IF NOT EXISTS
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
    console.log("[db] ✅ All tables ready");
    return true;
  } catch (error) {
    console.error("[db] ❌ Failed to ensure tables:", error);
    throw error;
  }
}

/**
 * Create database indexes for commonly queried columns.
 * All use IF NOT EXISTS so this is safe to run on every startup.
 */
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
    console.log("[db] ✅ All indexes ready");
    return true;
  } catch (error) {
    console.error("[db] ❌ Failed to ensure indexes:", error);
    // Don't throw - indexes are optimization, not critical
    console.warn("[db] Continuing without indexes");
    return false;
  }
}

/**
 * Initialize database on startup.
 * Creates all tables and indexes if they don't exist.
 */
export async function runMigrations() {
  try {
    console.log("[db] Ensuring all tables exist...");
    await ensureTables();
    await ensureIndexes();
    console.log("[db] ✅ Database initialization complete");
    return true;
  } catch (error) {
    console.error("[db] ❌ Database initialization failed:", error);
    throw error;
  }
}
