/**
 * Test 3: Data Safety During Migrations
 * Scenario: Insert test data → run migrations → verify data intact
 * Expected: Data persists, no rows lost, migrations are safe
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { join } from "path";
import * as schema from "@shared/schema.ts";
import { shopSettings, alerts, products } from "@shared/schema.ts";

async function testDataSafety() {
  console.log("\n========================================");
  console.log("TEST 3: Data Safety During Migrations");
  console.log("========================================\n");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL not set");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });

  try {
    console.log("[test:data] 1️⃣ Running initial migrations...");
    const migrationsFolder = join(process.cwd(), "drizzle");
    await migrate(db, { migrationsFolder });
    console.log("[test:data] ✅ Migrations completed");

    // Insert test data
    console.log("\n[test:data] 2️⃣ Inserting test data...");
    const testShop = `test-shop-${Date.now()}.myshopify.com`;
    const testProduct = {
      id: `test-prod-${Date.now()}`,
      shopDomain: testShop,
      shopifyProductId: "123456",
      title: "Test Product",
      handle: "test-product",
      imageUrl: "https://example.com/image.png",
      thresholdType: "quantity" as const,
      thresholdValue: 5,
      safetyStock: 10,
    };

    // Insert shop settings
    await db.insert(shopSettings).values({
      shopDomain: testShop,
      notificationMethod: "email",
      notificationEmail: "test@example.com",
      isOnboarded: true,
    });
    console.log("[test:data] ✅ Inserted shop settings");

    // Insert product
    await db.insert(products).values(testProduct);
    console.log("[test:data] ✅ Inserted product");

    // Insert alert
    await db.insert(alerts).values({
      shopDomain: testShop,
      productId: testProduct.id,
      quantity: 2,
      threshold: 5,
      status: "active",
    });
    console.log("[test:data] ✅ Inserted alert");

    // Verify data exists
    console.log("\n[test:data] 3️⃣ Verifying test data exists...");
    const settingsBefore = await db
      .select()
      .from(shopSettings)
      .where(shopSettings.shopDomain === testShop);
    const productsBefore = await db
      .select()
      .from(products)
      .where(products.shopDomain === testShop);
    const alertsBefore = await db
      .select()
      .from(alerts)
      .where(alerts.shopDomain === testShop);

    console.log(`[test:data] Shop settings: ${settingsBefore.length} row(s)`);
    console.log(`[test:data] Products: ${productsBefore.length} row(s)`);
    console.log(`[test:data] Alerts: ${alertsBefore.length} row(s)`);

    if (!settingsBefore.length || !productsBefore.length || !alertsBefore.length) {
      console.error("[test:data] ❌ Failed to insert test data");
      process.exit(1);
    }

    // Run migrations again (simulating restart)
    console.log(
      "\n[test:data] 4️⃣ Running migrations again (restart simulation)..."
    );
    await migrate(db, { migrationsFolder });
    console.log("[test:data] ✅ Second migration run completed");

    // Verify data survived
    console.log("\n[test:data] 5️⃣ Verifying data survived migrations...");
    const settingsAfter = await db
      .select()
      .from(shopSettings)
      .where(shopSettings.shopDomain === testShop);
    const productsAfter = await db
      .select()
      .from(products)
      .where(products.shopDomain === testShop);
    const alertsAfter = await db
      .select()
      .from(alerts)
      .where(alerts.shopDomain === testShop);

    console.log(`[test:data] Shop settings: ${settingsAfter.length} row(s)`);
    console.log(`[test:data] Products: ${productsAfter.length} row(s)`);
    console.log(`[test:data] Alerts: ${alertsAfter.length} row(s)`);

    // Verify counts match
    if (settingsBefore.length !== settingsAfter.length) {
      console.error(
        `[test:data] ❌ Shop settings count changed: ${settingsBefore.length} → ${settingsAfter.length}`
      );
      process.exit(1);
    }

    if (productsBefore.length !== productsAfter.length) {
      console.error(
        `[test:data] ❌ Products count changed: ${productsBefore.length} → ${productsAfter.length}`
      );
      process.exit(1);
    }

    if (alertsBefore.length !== alertsAfter.length) {
      console.error(
        `[test:data] ❌ Alerts count changed: ${alertsBefore.length} → ${alertsAfter.length}`
      );
      process.exit(1);
    }

    // Verify data integrity
    console.log("\n[test:data] 6️⃣ Verifying data integrity...");
    const settingData = settingsAfter[0];
    if (
      settingData.shopDomain !== testShop ||
      settingData.notificationEmail !== "test@example.com"
    ) {
      console.error("[test:data] ❌ Shop settings data corrupted");
      process.exit(1);
    }

    const productData = productsAfter[0];
    if (
      productData.id !== testProduct.id ||
      productData.title !== "Test Product"
    ) {
      console.error("[test:data] ❌ Product data corrupted");
      process.exit(1);
    }

    const alertData = alertsAfter[0];
    if (alertData.shopDomain !== testShop || alertData.threshold !== 5) {
      console.error("[test:data] ❌ Alert data corrupted");
      process.exit(1);
    }

    console.log("[test:data] ✅ All data intact and uncorrupted");

    // Cleanup
    console.log("\n[test:data] 7️⃣ Cleaning up test data...");
    await db.delete(alerts).where(alerts.shopDomain === testShop);
    await db.delete(products).where(products.shopDomain === testShop);
    await db.delete(shopSettings).where(shopSettings.shopDomain === testShop);
    console.log("[test:data] ✅ Test data cleaned up");

    console.log("\n========================================");
    console.log("✅ TEST PASSED: Data is safe!");
    console.log("========================================\n");
  } finally {
    await pool.end();
  }
}

testDataSafety().catch((error) => {
  console.error("\n❌ TEST FAILED:", error.message);
  process.exit(1);
});
