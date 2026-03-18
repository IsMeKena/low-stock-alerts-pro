# Database Migrations - Production-Safe Implementation

## Overview

This project uses **idempotent migrations** that are safe to run multiple times. No data is lost on app restarts.

## Architecture

### Migration Files
- **Location:** `drizzle/0000_outgoing_greymalkin.sql`
- **Pattern:** `CREATE TABLE IF NOT EXISTS` (not just `CREATE TABLE`)
- **Tracking:** `__drizzle_migrations__` table tracks executed migrations
- **Safety:** Migrations can be run unlimited times without errors or data loss

### Startup Sequence
1. App starts → `server/index.ts`
2. Calls `runMigrations()` from `server/db.ts`
3. Drizzle checks migration history in `__drizzle_migrations__`
4. Runs only **new/pending** migrations
5. Returns safely (no DROP TABLE, no data loss)

### Why `IF NOT EXISTS`?

**❌ DANGEROUS (pre-Phase 2):**
```sql
CREATE TABLE products (id SERIAL PRIMARY KEY, ...);
-- FAILS on second run: "table already exists"
```

**✅ SAFE (Phase 2+):**
```sql
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  ...
);
-- Succeeds first run (creates table)
-- Succeeds on restarts (table exists, no-op)
```

## Test Scenarios

### 1. Fresh Install
```bash
npm run test:migrations:fresh
```
**What it does:**
- Checks for existing tables
- Runs migrations
- Verifies all 8 tables created
- Confirms `__drizzle_migrations__` records migrations

**Expected Result:** ✅ Tables created from scratch

### 2. Idempotent Restarts
```bash
npm run test:migrations:idempotent
```
**What it does:**
- Runs migrations twice (simulating app restart)
- Verifies table structure unchanged
- Confirms column counts identical
- Checks migration history

**Expected Result:** ✅ Second run succeeds, no changes to schema

### 3. Data Safety
```bash
npm run test:migrations:data-safety
```
**What it does:**
- Inserts test data (shop settings, products, alerts)
- Runs migrations again
- Verifies data still exists
- Confirms data integrity (no corruption)

**Expected Result:** ✅ Data persists across migrations

### Run All Tests
```bash
npm run test:migrations:all
```

## Production Deployment

### Before (❌ NOT SAFE)
```typescript
// server/db.ts
export async function cleanupCorruptedTables() {
  const tables = ["products", "alerts", ...];
  const dropStatement = tables
    .map((table) => `DROP TABLE IF EXISTS "${table}" CASCADE`)
    .join("; ");
  await client.query(dropStatement); // 🔥 WIPES ALL DATA!
}

// server/index.ts
await cleanupCorruptedTables(); // Runs on every startup!
await migrate(db);
```

### After (✅ SAFE)
```typescript
// server/db.ts
export async function runMigrations() {
  console.log("[startup] Running idempotent migrations...");
  try {
    await migrate(db, { migrationsFolder });
    console.log("[startup] ✅ Migrations completed safely (data preserved)");
  } catch (error) {
    console.error("[startup] ❌ Migration failed:", error);
    process.exit(1);
  }
}

// server/index.ts
await runMigrations(); // Safe! No DROP TABLE, no data loss!
```

## How Drizzle Tracks Migrations

Drizzle creates a `__drizzle_migrations__` table on first run:

```
┌────────────────────────────────┐
│     __drizzle_migrations__     │
├─────────────────┬──────────────┤
│ name            │ installed_on │
├─────────────────┼──────────────┤
│ 0000_out...sql  │ 2026-03-18   │
└─────────────────┴──────────────┘
```

**Behavior:**
- ✅ First app start: Records migration name
- ✅ Second app start: Sees migration already ran, skips it
- ✅ New migration added: Runs only the new one
- ✅ Data: Never touched, always safe

## Adding New Migrations

When you need to add a column or create a new table:

### 1. Update Schema
Edit `shared/schema.ts`:
```typescript
export const products = pgTable("products", {
  id: varchar("id", { length: 255 }).primaryKey(),
  // ... existing columns ...
  newColumn: varchar("new_column", { length: 255 }), // ← ADD HERE
});
```

### 2. Generate Migration
```bash
npm run db:generate
```
This creates a new file like `drizzle/0001_add_newcolumn.sql`

### 3. Verify Migration Uses `IF NOT EXISTS`
Open the generated file and verify:
```sql
-- Good:
ALTER TABLE products ADD COLUMN IF NOT EXISTS new_column VARCHAR(255);

-- If it's just ALTER without IF EXISTS, add it manually
```

### 4. Deploy
- Commit the new migration file
- No manual SQL needed — app startup runs it automatically
- Data preserved, no downtime

## Troubleshooting

### "Table already exists" Error
If you see: `ERROR: relation "products" already exists`

**Cause:** Migration file missing `IF NOT EXISTS`

**Fix:**
1. Edit the migration file
2. Find bare `CREATE TABLE` (no IF NOT EXISTS)
3. Add `IF NOT EXISTS` after CREATE TABLE
4. Re-run app

### Migrations Not Running
Check:
1. `DATABASE_URL` is set correctly
2. Database user has permissions to `CREATE TABLE`
3. `drizzle/` folder exists and has migration files

### Data Loss
If tables were dropped unexpectedly:
1. Check `git log` for recent changes
2. Look for `DROP TABLE` in code (should be none post-Phase 2)
3. Review database backups

## Checklist ✅

- [x] No `DROP TABLE` statements in startup
- [x] All `CREATE TABLE` have `IF NOT EXISTS`
- [x] All `CREATE INDEX` have `IF NOT EXISTS`
- [x] `__drizzle_migrations__` preserved
- [x] Fresh install test passes
- [x] Restart test passes (idempotent)
- [x] Data safety test passes
- [x] Logging shows migration progress

## References

- **Drizzle Docs:** https://orm.drizzle.team/docs/migrations
- **PostgreSQL:** https://www.postgresql.org/docs/current/sql-createtable.html
- **Phase 2 Implementation:** See Git history for removal of `cleanupCorruptedTables()`
