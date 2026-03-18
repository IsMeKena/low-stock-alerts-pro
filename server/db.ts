import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
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
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    
    // Determine migrations folder path based on environment
    // In production (bundled): dist/drizzle/
    // In development: drizzle/
    let migrationsFolder: string;
    
    if (process.env.NODE_ENV === "production") {
      // In production, we're bundled in dist/
      migrationsFolder = join(__dirname, "../drizzle");
    } else {
      // In development, migrations are in the root drizzle folder
      migrationsFolder = join(__dirname, "../drizzle");
    }

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
