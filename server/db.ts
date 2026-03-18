import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";
import { join } from "path";
import fs from "fs";
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
 * Clean up old corrupted tables from failed migrations.
 * These block new migrations from running cleanly.
 */
async function cleanupOldTables() {
  try {
    console.log("[db] >>> CLEANUP: Checking for old corrupted tables <<<");
    
    // List of old tables that shouldn't exist anymore
    const oldTables = [
      "alert_logs",
      "inventory_levels",
      "inventory_level",
      "alerts_log",
      "old_alerts",
      "old_inventory",
    ];

    // Query existing tables
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);

    const existingTables = result.rows.map((r: any) => r.table_name);
    console.log("[db] Existing tables:", existingTables);

    // Find which old tables exist
    const tablesToDrop = oldTables.filter((t) => existingTables.includes(t));

    if (tablesToDrop.length > 0) {
      console.log("[db] Found old tables to drop:", tablesToDrop);

      // Drop each old table
      for (const table of tablesToDrop) {
        try {
          console.log(`[db] Dropping old table: ${table}`);
          await db.execute(sql`DROP TABLE IF EXISTS ${sql.identifier(table)} CASCADE`);
          console.log(`[db] ✅ Dropped ${table}`);
        } catch (err) {
          console.error(`[db] Failed to drop ${table}:`, err);
        }
      }
    } else {
      console.log("[db] No old tables found - clean slate");
    }

    // Clear migration history to force fresh migrations
    console.log("[db] Clearing migration history...");
    await db.execute(sql`DELETE FROM __drizzle_migrations__`);
    console.log("[db] ✅ Migration history cleared");

  } catch (error) {
    console.error("[db] ⚠️  Cleanup warning (non-fatal):", error);
    // Don't throw - this is best-effort
  }
}

/**
 * Run pending migrations from the drizzle migrations folder.
 * This is a safety net for auto-migration on startup.
 * In production, Railway should run migrations via Procfile release task.
 */
export async function runMigrations() {
  try {
    console.log("[db] >>> MIGRATION CHECK STARTING <<<");
    console.log("[db] NODE_ENV:", process.env.NODE_ENV);
    
    // STEP 1: Clean up old corrupted tables first
    await cleanupOldTables();

    // STEP 2: Run migrations from the drizzle folder
    // In production, the bundled code runs from dist/index.cjs, so migrations are in dist/drizzle
    // In development, migrations are in ./drizzle (source folder)
    let migrationsFolder = join(process.cwd(), "drizzle");
    
    // If migrations don't exist at the source location, try the bundled location
    if (!fs.existsSync(migrationsFolder)) {
      const bundledMigrationsFolder = join(process.cwd(), "dist", "drizzle");
      if (fs.existsSync(bundledMigrationsFolder)) {
        migrationsFolder = bundledMigrationsFolder;
        console.log("[db] Source migrations not found, using bundled location");
      }
    }

    console.log("[db] Using migrations path:", migrationsFolder);
    console.log("[db] Does path exist?", fs.existsSync(migrationsFolder));
    
    // List migration files
    if (fs.existsSync(migrationsFolder)) {
      const files = fs.readdirSync(migrationsFolder);
      console.log("[db] Migration files found:", files);
    }

    console.log("[db] Checking for pending migrations...");
    await migrate(db, {
      migrationsFolder,
    });

    console.log("[db] ✅ Migrations completed successfully");
    return true;
  } catch (error) {
    console.error("[db] ❌ Migration error:", error);
    console.error("[db] Error details:", JSON.stringify(error, null, 2));
    // Don't throw - just log and continue
    // If migrations already ran or tables exist, this is fine
    return false;
  }
}
