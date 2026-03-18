/**
 * Test 1: Fresh Install
 * Scenario: Empty database → tables should be created on first run
 * Expected: All 8 tables created, migration history recorded
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { join } from "path";
import * as schema from "@shared/schema.ts";

async function testFreshInstall() {
  console.log("\n========================================");
  console.log("TEST 1: Fresh Install");
  console.log("========================================\n");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL not set");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });

  try {
    console.log("[test:fresh] 1️⃣ Checking for existing tables...");
    const result = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    const existingTables = result.rows.map((r) => r.table_name);
    console.log("[test:fresh] Existing tables:", existingTables);

    console.log("\n[test:fresh] 2️⃣ Running migrations (first time)...");
    const migrationsFolder = join(process.cwd(), "drizzle");
    await migrate(db, { migrationsFolder });
    console.log("[test:fresh] ✅ Migrations completed");

    console.log("\n[test:fresh] 3️⃣ Verifying all tables were created...");
    const afterMigration = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const tables = afterMigration.rows.map((r) => r.table_name);
    const expectedTables = [
      "alerts",
      "batching_queue",
      "billing_plan",
      "inventory",
      "products",
      "shop_settings",
      "shopify_sessions",
      "usage_tracker",
      "__drizzle_migrations__",
    ];

    console.log("\n[test:fresh] Created tables:");
    for (const table of tables) {
      const expected = expectedTables.includes(table);
      const status = expected ? "✅" : "⚠️";
      console.log(`  ${status} ${table}`);
    }

    const allTablesExist = expectedTables.every((t) => tables.includes(t));
    if (!allTablesExist) {
      console.error("\n[test:fresh] ❌ FAILED: Not all expected tables created");
      console.error("Missing:", expectedTables.filter((t) => !tables.includes(t)));
      process.exit(1);
    }

    console.log("\n[test:fresh] 4️⃣ Checking migration history...");
    const migrations = await pool.query(
      "SELECT * FROM __drizzle_migrations__ ORDER BY installed_on DESC LIMIT 5"
    );
    console.log(`[test:fresh] Found ${migrations.rows.length} migration record(s)`);
    console.log(
      "[test:fresh] Latest migration:",
      migrations.rows[0]?.name || "none"
    );

    console.log("\n========================================");
    console.log("✅ TEST PASSED: Fresh install works!");
    console.log("========================================\n");
  } finally {
    await pool.end();
  }
}

testFreshInstall().catch((error) => {
  console.error("\n❌ TEST FAILED:", error.message);
  process.exit(1);
});
