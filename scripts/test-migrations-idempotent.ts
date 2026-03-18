/**
 * Test 2: Idempotent Migrations
 * Scenario: Run migrations multiple times (simulating app restarts)
 * Expected: Second run should succeed without errors, tables unchanged
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { join } from "path";
import * as schema from "@shared/schema.ts";

async function testIdempotent() {
  console.log("\n========================================");
  console.log("TEST 2: Idempotent Migrations");
  console.log("========================================\n");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL not set");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });

  try {
    console.log("[test:idempotent] 1️⃣ First migration run...");
    const migrationsFolder = join(process.cwd(), "drizzle");
    await migrate(db, { migrationsFolder });
    console.log("[test:idempotent] ✅ First run completed");

    // Get table checksums before second run
    console.log("\n[test:idempotent] 2️⃣ Recording table structure before restart...");
    const beforeSecond = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    const tablesBefore = beforeSecond.rows.map((r) => r.table_name);
    console.log(`[test:idempotent] Tables before: ${tablesBefore.length}`);

    // Get column count per table (to verify structure unchanged)
    const columnsBefore = await pool.query(`
      SELECT table_name, COUNT(*) as column_count
      FROM information_schema.columns
      WHERE table_schema = 'public'
      GROUP BY table_name
      ORDER BY table_name
    `);
    const columnsMap = new Map(
      columnsBefore.rows.map((r) => [r.table_name, r.column_count])
    );

    console.log("[test:idempotent] Column counts recorded");

    // Run migrations again (simulating app restart)
    console.log(
      "\n[test:idempotent] 3️⃣ Running migrations again (restart simulation)..."
    );
    await migrate(db, { migrationsFolder });
    console.log("[test:idempotent] ✅ Second run completed");

    // Verify tables are unchanged
    console.log(
      "\n[test:idempotent] 4️⃣ Verifying tables unchanged after second run..."
    );
    const afterSecond = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    const tablesAfter = afterSecond.rows.map((r) => r.table_name);
    console.log(`[test:idempotent] Tables after: ${tablesAfter.length}`);

    // Verify column counts are identical
    const columnsAfter = await pool.query(`
      SELECT table_name, COUNT(*) as column_count
      FROM information_schema.columns
      WHERE table_schema = 'public'
      GROUP BY table_name
      ORDER BY table_name
    `);

    let structureChanged = false;
    for (const row of columnsAfter.rows) {
      const before = columnsMap.get(row.table_name);
      if (before && before !== row.column_count) {
        console.error(
          `[test:idempotent] ❌ Column count changed for ${row.table_name}: ${before} → ${row.column_count}`
        );
        structureChanged = true;
      }
    }

    if (JSON.stringify(tablesBefore) !== JSON.stringify(tablesAfter)) {
      console.error("[test:idempotent] ❌ Table list changed after second run");
      console.error("Before:", tablesBefore);
      console.error("After:", tablesAfter);
      process.exit(1);
    }

    if (structureChanged) {
      console.error("[test:idempotent] ❌ Table structure changed");
      process.exit(1);
    }

    console.log("[test:idempotent] ✅ All tables and columns unchanged");

    console.log("\n[test:idempotent] 5️⃣ Checking migration history...");
    const migrations = await pool.query(
      "SELECT COUNT(*) as count FROM __drizzle_migrations__"
    );
    console.log(`[test:idempotent] Migration records: ${migrations.rows[0].count}`);

    console.log("\n========================================");
    console.log("✅ TEST PASSED: Migrations are idempotent!");
    console.log("========================================\n");
  } finally {
    await pool.end();
  }
}

testIdempotent().catch((error) => {
  console.error("\n❌ TEST FAILED:", error.message);
  process.exit(1);
});
