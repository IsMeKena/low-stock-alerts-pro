import { db } from "./db";
import { sql } from "drizzle-orm";

export async function ensureTablesExist() {
  try {
    console.log("[db-init] Checking if tables exist...");

    // Try to query one table
    await db.execute(sql`SELECT 1 FROM shop_settings LIMIT 1`);
    console.log("[db-init] ✅ All tables exist, skipping creation");
    return true;
  } catch (error: any) {
    if (error.code === "42P01") {
      // Table doesn't exist, create all tables
      console.log("[db-init] ⚠️  Tables missing, creating now...");

      try {
        await createAllTables();
        console.log(
          "[db-init] ✅ All tables created successfully"
        );
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

async function createAllTables() {
  const tableDefinitions = [
    // shopify_sessions table
    sql`
      CREATE TABLE IF NOT EXISTS shopify_sessions (
        id TEXT PRIMARY KEY,
        shop TEXT NOT NULL UNIQUE,
        state TEXT NOT NULL,
        isOnline BOOLEAN NOT NULL DEFAULT false,
        accessToken TEXT NOT NULL,
        scope TEXT,
        expiresAt BIGINT,
        userId BIGINT,
        firstName TEXT,
        lastName TEXT,
        email TEXT,
        accountOwner BOOLEAN,
        locale TEXT,
        collaborator BOOLEAN,
        emailVerified BOOLEAN,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,

    // products table
    sql`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        shop TEXT NOT NULL,
        shopifyProductId BIGINT NOT NULL,
        title TEXT NOT NULL,
        handle TEXT,
        vendor TEXT,
        productType TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(shop, shopifyProductId)
      )
    `,

    // inventory_levels table
    sql`
      CREATE TABLE IF NOT EXISTS inventory_levels (
        id TEXT PRIMARY KEY,
        shop TEXT NOT NULL,
        productId TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        locationId BIGINT,
        available INTEGER DEFAULT 0,
        reserved INTEGER DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(shop, locationId, productId)
      )
    `,

    // shop_settings table
    sql`
      CREATE TABLE IF NOT EXISTS shop_settings (
        id TEXT PRIMARY KEY,
        shop TEXT NOT NULL UNIQUE,
        notificationEmail TEXT,
        notificationWhatsapp TEXT,
        notificationMethod TEXT DEFAULT 'email',
        thresholdType TEXT DEFAULT 'quantity',
        thresholdValue INTEGER DEFAULT 10,
        safetyStock INTEGER DEFAULT 100,
        locationId BIGINT,
        batchingEnabled BOOLEAN DEFAULT false,
        batchingInterval INTEGER DEFAULT 3600,
        onboarded BOOLEAN DEFAULT false,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,

    // billing_plan table
    sql`
      CREATE TABLE IF NOT EXISTS billing_plan (
        id TEXT PRIMARY KEY,
        shop TEXT NOT NULL UNIQUE,
        plan TEXT DEFAULT 'free',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,

    // usage_tracker table
    sql`
      CREATE TABLE IF NOT EXISTS usage_tracker (
        id TEXT PRIMARY KEY,
        shop TEXT NOT NULL,
        month TEXT NOT NULL,
        emailCount INTEGER DEFAULT 0,
        whatsappCount INTEGER DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(shop, month)
      )
    `,

    // alerts table
    sql`
      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        shop TEXT NOT NULL,
        productId TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        alertType TEXT,
        status TEXT DEFAULT 'pending',
        sentAt TIMESTAMP,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,

    // alert_logs table
    sql`
      CREATE TABLE IF NOT EXISTS alert_logs (
        id TEXT PRIMARY KEY,
        shop TEXT NOT NULL,
        alertId TEXT REFERENCES alerts(id) ON DELETE CASCADE,
        channel TEXT,
        recipient TEXT,
        sentAt TIMESTAMP,
        status TEXT,
        errorMessage TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,

    // batching_queue table
    sql`
      CREATE TABLE IF NOT EXISTS batching_queue (
        id TEXT PRIMARY KEY,
        shop TEXT NOT NULL,
        alertId TEXT NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
        batchedAt TIMESTAMP,
        sentAt TIMESTAMP,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,
  ];

  for (const definition of tableDefinitions) {
    try {
      await db.execute(definition);
      console.log("[db-init] Table created");
    } catch (error: any) {
      // If table already exists (from partial creation), skip
      if (error.code === "42P07") {
        console.log("[db-init] Table already exists, skipping");
      } else {
        throw error;
      }
    }
  }
}
