import { db } from "./db";
import { sql } from "drizzle-orm";

/**
 * Ensures database tables exist, using Drizzle schema definitions.
 * This is the fallback mechanism - in production, migrations should be used.
 * If tables don't exist, this creates them with correct column names matching Drizzle schema.
 */
export async function ensureTablesExist() {
  try {
    console.log("[db-init] Checking if tables exist...");

    // Try to query one table to see if it exists
    await db.execute(sql`SELECT 1 FROM shop_settings LIMIT 1`);
    console.log("[db-init] ✅ All tables exist, skipping creation");
    return true;
  } catch (error: any) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      // Table doesn't exist, create all tables
      console.log("[db-init] ⚠️  Tables missing, creating from Drizzle schema...");

      try {
        await createAllTables();
        console.log("[db-init] ✅ All tables created successfully");
        return true;
      } catch (createError) {
        console.error("[db-init] ❌ Failed to create tables:", createError);
        throw createError;
      }
    } else {
      // Different error
      console.error("[db-init] Database connection error:", error);
      throw error;
    }
  }
}

/**
 * Create all tables using Drizzle schema definitions.
 * Column names must match exactly what Drizzle expects (snake_case).
 */
async function createAllTables() {
  const tableDefinitions = [
    // shopify_sessions table - matches Drizzle schema exactly
    sql`
      CREATE TABLE IF NOT EXISTS shopify_sessions (
        id VARCHAR(255) PRIMARY KEY,
        shop VARCHAR(255) NOT NULL UNIQUE,
        state VARCHAR(255),
        is_online BOOLEAN NOT NULL DEFAULT false,
        scope TEXT,
        expires TIMESTAMP,
        access_token TEXT,
        online_access_info TEXT
      )
    `,

    // products table - matches Drizzle schema exactly
    sql`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(255) PRIMARY KEY,
        shop_domain VARCHAR(255) NOT NULL,
        shopify_product_id VARCHAR(255) NOT NULL,
        title TEXT NOT NULL,
        handle TEXT,
        image_url TEXT,
        threshold_type VARCHAR(20) DEFAULT 'quantity',
        threshold_value INTEGER DEFAULT 5,
        safety_stock INTEGER DEFAULT 10,
        location_id VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(shop_domain, shopify_product_id)
      )
    `,

    // inventory table - matches Drizzle schema exactly
    sql`
      CREATE TABLE IF NOT EXISTS inventory (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_domain VARCHAR(255) NOT NULL,
        product_id VARCHAR(255) NOT NULL,
        location_id VARCHAR(255) NOT NULL,
        sku TEXT,
        quantity INTEGER NOT NULL DEFAULT 0,
        threshold INTEGER DEFAULT 5,
        last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `,

    // alerts table - matches Drizzle schema exactly
    sql`
      CREATE TABLE IF NOT EXISTS alerts (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_domain VARCHAR(255) NOT NULL,
        product_id VARCHAR(255) NOT NULL,
        location_id VARCHAR(255),
        quantity INTEGER NOT NULL,
        threshold INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP
      )
    `,

    // shop_settings table - matches Drizzle schema exactly
    sql`
      CREATE TABLE IF NOT EXISTS shop_settings (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_domain VARCHAR(255) NOT NULL UNIQUE,
        notification_method VARCHAR(20) DEFAULT 'email',
        notification_email VARCHAR(255),
        whatsapp_number VARCHAR(20),
        threshold_type VARCHAR(20) DEFAULT 'quantity',
        threshold_value INTEGER DEFAULT 5,
        safety_stock INTEGER DEFAULT 10,
        batching_enabled BOOLEAN DEFAULT false,
        batching_interval VARCHAR(20) DEFAULT 'daily',
        email_alerts_enabled BOOLEAN DEFAULT true,
        is_onboarded BOOLEAN DEFAULT false,
        dismissed_upsell_banner BOOLEAN DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `,

    // billing_plan table - matches Drizzle schema exactly
    sql`
      CREATE TABLE IF NOT EXISTS billing_plan (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_domain VARCHAR(255) NOT NULL UNIQUE,
        plan VARCHAR(20) NOT NULL DEFAULT 'free',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `,

    // usage_tracker table - matches Drizzle schema exactly
    sql`
      CREATE TABLE IF NOT EXISTS usage_tracker (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_domain VARCHAR(255) NOT NULL,
        plan VARCHAR(20) NOT NULL,
        email_count INTEGER NOT NULL DEFAULT 0,
        whatsapp_count INTEGER NOT NULL DEFAULT 0,
        month VARCHAR(7) NOT NULL,
        usage_remaining INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `,

    // batching_queue table - matches Drizzle schema exactly
    sql`
      CREATE TABLE IF NOT EXISTS batching_queue (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_domain VARCHAR(255) NOT NULL,
        alert_id VARCHAR(255) NOT NULL,
        product_id VARCHAR(255) NOT NULL,
        location_id VARCHAR(255),
        quantity INTEGER NOT NULL,
        threshold INTEGER NOT NULL,
        alert_type VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        scheduled_for TIMESTAMP NOT NULL,
        sent_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `,
  ];

  for (const definition of tableDefinitions) {
    try {
      await db.execute(definition);
      console.log("[db-init] ✅ Table created");
    } catch (error: any) {
      // If table already exists (from partial creation), skip
      if (error.code === "42P07") {
        console.log("[db-init] ℹ️  Table already exists, skipping");
      } else {
        throw error;
      }
    }
  }
}
