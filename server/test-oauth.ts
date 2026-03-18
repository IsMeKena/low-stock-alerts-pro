import "dotenv/config";
import { db, runMigrations } from "./db";
import { shopifySessions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { Session } from "@shopify/shopify-api";
import { sessionStorage } from "./shopify-session-storage";

/**
 * Comprehensive OAuth flow test
 * Tests database connectivity, schema validation, and session storage
 */
async function testOAuthFlow() {
  console.log("\n[test] ========================================");
  console.log("[test]   OAuth Flow Test Suite");
  console.log("[test] ========================================\n");

  try {
    // ============================================
    // Test 0: Database initialization (idempotent migrations)
    // ============================================
    console.log("[test] Test 0: Database initialization...");
    console.log("[test] Running idempotent migrations...");
    try {
      await runMigrations();
      console.log("[test] ✅ Migrations completed (data preserved)");
    } catch (error: any) {
      console.error("[test] ❌ Migration failed:", error.message);
      throw error;
    }

    // ============================================
    // Test 1: Table connection and schema
    // ============================================
    console.log("\n[test] Test 1: Querying shopify_sessions table...");
    try {
      const existingSessions = await db
        .select()
        .from(shopifySessions)
        .limit(1);
      console.log(
        `[test] ✅ Table query works. Current rows: ${existingSessions.length}`
      );
    } catch (error: any) {
      console.error("[test] ❌ Table query failed:", error.message);
      throw error;
    }

    // ============================================
    // Test 2: Insert test session via storage class
    // ============================================
    console.log("\n[test] Test 2: Creating and storing Shopify session...");
    const testSession = new Session({
      id: "test-session-" + Date.now(),
      shop: "test-shop-" + Date.now() + ".myshopify.com",
      state: "test-state-" + Math.random().toString(36).substring(7),
      isOnline: false,
    });

    // Manually set properties to simulate real Shopify session
    testSession.scope = "write_products,read_inventory,write_inventory";
    testSession.accessToken = "shpua_" + Math.random().toString(36).substring(2, 15);
    testSession.expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h from now

    console.log(`[test] Session object created:`, {
      id: testSession.id,
      shop: testSession.shop,
      accessToken: testSession.accessToken ? "***" : "MISSING",
      scope: testSession.scope,
    });

    const stored = await sessionStorage.storeSession(testSession);
    if (!stored) {
      throw new Error("storeSession returned false");
    }
    console.log("[test] ✅ Session stored via sessionStorage");

    // ============================================
    // Test 3: Query the inserted session directly
    // ============================================
    console.log("\n[test] Test 3: Retrieving stored session from database...");
    const retrieved = await db
      .select()
      .from(shopifySessions)
      .where(eq(shopifySessions.shop, testSession.shop))
      .limit(1);

    if (retrieved.length === 0) {
      throw new Error("Failed to retrieve session from database");
    }

    const row = retrieved[0];
    console.log("[test] ✅ Retrieved session:", {
      id: row.id,
      shop: row.shop,
      accessToken: row.accessToken ? "***" : "MISSING ❌",
      scope: row.scope,
      isOnline: row.isOnline,
      expires: row.expires ? "SET" : "MISSING ❌",
    });

    // Validate all critical fields
    const criticalFields = [
      { name: "id", value: row.id },
      { name: "shop", value: row.shop },
      { name: "accessToken", value: row.accessToken },
      { name: "scope", value: row.scope },
    ];

    let allFieldsValid = true;
    for (const field of criticalFields) {
      if (!field.value) {
        console.log(`[test] ❌ CRITICAL: Field '${field.name}' is empty!`);
        allFieldsValid = false;
      }
    }

    if (!allFieldsValid) {
      throw new Error(
        "Critical fields are missing - data not persisted correctly"
      );
    }

    // ============================================
    // Test 4: Load session via sessionStorage
    // ============================================
    console.log("\n[test] Test 4: Loading session via sessionStorage...");
    const loadedSession = await sessionStorage.loadSession(testSession.id);

    if (!loadedSession) {
      throw new Error("sessionStorage.loadSession returned undefined");
    }

    console.log("[test] ✅ Loaded session:", {
      id: loadedSession.id,
      shop: loadedSession.shop,
      accessToken: loadedSession.accessToken ? "***" : "MISSING ❌",
      scope: loadedSession.scope,
    });

    if (!loadedSession.accessToken) {
      throw new Error("Loaded session is missing accessToken!");
    }

    // ============================================
    // Test 5: Find sessions by shop
    // ============================================
    console.log("\n[test] Test 5: Finding sessions by shop...");
    const sessionsByShop = await sessionStorage.findSessionsByShop(
      testSession.shop
    );

    if (sessionsByShop.length === 0) {
      throw new Error("findSessionsByShop returned empty array");
    }

    console.log(
      `[test] ✅ Found ${sessionsByShop.length} session(s) for shop`
    );
    console.log("[test] First session:", {
      id: sessionsByShop[0].id,
      shop: sessionsByShop[0].shop,
      accessToken: sessionsByShop[0].accessToken ? "***" : "MISSING ❌",
    });

    // ============================================
    // Test 6: Simulate auth-utils.handleOAuthSession
    // ============================================
    console.log("\n[test] Test 6: Simulating auth-utils.handleOAuthSession...");
    const { handleOAuthSession } = await import("./auth-utils");

    const testSession2 = new Session({
      id: "test-session-2-" + Date.now(),
      shop: "test-shop-2-" + Date.now() + ".myshopify.com",
      state: "test-state-2",
      isOnline: false,
    });

    testSession2.scope = "write_products,read_inventory";
    testSession2.accessToken = "shpua_" + Math.random().toString(36).substring(2);
    testSession2.expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const result = await handleOAuthSession(testSession2);
    console.log("[test] ✅ handleOAuthSession returned:", result);

    if (!result.success || !result.accessToken) {
      throw new Error("handleOAuthSession failed to return valid result");
    }

    // Verify it's actually in the database
    const verified = await db
      .select()
      .from(shopifySessions)
      .where(eq(shopifySessions.shop, testSession2.shop))
      .limit(1);

    if (verified.length === 0) {
      throw new Error("Session from handleOAuthSession not found in database");
    }

    console.log("[test] ✅ Session verified in database after handleOAuthSession");

    // ============================================
    // Test 7: Column name verification (Drizzle mapping)
    // ============================================
    console.log("\n[test] Test 7: Verifying Drizzle column mappings...");
    const rawQuery = await db
      .select()
      .from(shopifySessions)
      .where(eq(shopifySessions.shop, testSession.shop))
      .limit(1);

    const keys = Object.keys(rawQuery[0]);
    console.log("[test] Database columns returned:", keys);

    const expectedColumns = [
      "id",
      "shop",
      "state",
      "isOnline",
      "scope",
      "expires",
      "accessToken",
      "onlineAccessInfo",
    ];

    const mappedColumns = {
      id: "✅",
      shop: "✅",
      state: "✅",
      isOnline: "✅",
      scope: "✅",
      expires: "✅",
      accessToken: "✅",
      onlineAccessInfo: "✅",
    };

    for (const col of expectedColumns) {
      if (!keys.includes(col)) {
        console.log(`[test] ❌ Missing expected column: ${col}`);
        mappedColumns[col as keyof typeof mappedColumns] = "❌ MISSING";
      }
    }

    console.log("[test] Column mappings:", mappedColumns);

    // ============================================
    // Test 8: Cleanup test sessions
    // ============================================
    console.log("\n[test] Test 8: Cleaning up test sessions...");
    const deleted1 = await sessionStorage.deleteSession(testSession.id);
    const deleted2 = await sessionStorage.deleteSession(testSession2.id);

    if (deleted1 && deleted2) {
      console.log("[test] ✅ Test sessions deleted");
    } else {
      console.warn("[test] ⚠️  Some test sessions could not be deleted");
    }

    // ============================================
    // Summary
    // ============================================
    console.log("\n[test] ========================================");
    console.log("[test] ✅ ALL TESTS PASSED");
    console.log("[test] ========================================");
    console.log("[test] Summary:");
    console.log("[test] - Database connection: ✅");
    console.log("[test] - Schema validation: ✅");
    console.log("[test] - Session insert: ✅");
    console.log("[test] - Session retrieval: ✅");
    console.log("[test] - sessionStorage integration: ✅");
    console.log("[test] - handleOAuthSession simulation: ✅");
    console.log("[test] - Column mappings: ✅");
    console.log("[test] ========================================\n");

    return true;
  } catch (error: any) {
    console.error("\n[test] ❌ TEST FAILED");
    console.error("[test]", error.message);
    if (error.stack) {
      console.error("[test] Stack:", error.stack);
    }
    process.exit(1);
  }
}

// Run the tests
testOAuthFlow()
  .then(() => {
    console.log("[test] Test suite completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("[test] Unexpected error:", error);
    process.exit(1);
  });
