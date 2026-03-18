import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
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
    console.log("[db] Checking for pending migrations...");

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const migrationsFolder = join(__dirname, "../drizzle");

    // Run migrations from the drizzle folder
    await migrate(db, {
      migrationsFolder,
    });

    console.log("[db] ✅ Migrations completed successfully");
    return true;
  } catch (error) {
    console.error("[db] ❌ Migration error:", error);
    // Don't throw - just log and continue
    // If migrations already ran or tables exist, this is fine
    return false;
  }
}
