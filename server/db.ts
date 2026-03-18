import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { migrate } from "drizzle-orm/node-postgres/migrator";
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
 * Run pending migrations from the drizzle migrations folder.
 * This is a safety net for auto-migration on startup.
 * In production, Railway should run migrations via Procfile release task.
 */
export async function runMigrations() {
  try {
    console.log("[db] >>> MIGRATION CHECK STARTING <<<");
    console.log("[db] NODE_ENV:", process.env.NODE_ENV);
    
    // Use process.cwd() for migrations folder - works in both dev (tsx) and bundled (CommonJS)
    // In production: migrations are in dist/drizzle (copied during build)
    // In development: migrations are in drizzle folder
    const migrationsFolder = join(process.cwd(), "drizzle");

    console.log("[db] Using migrations path:", migrationsFolder);
    console.log("[db] Does path exist?", fs.existsSync(migrationsFolder));

    // Run migrations from the drizzle folder
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
