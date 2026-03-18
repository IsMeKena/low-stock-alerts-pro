# OAuth Flow Audit Report
**Date:** 2026-03-18  
**Issue:** `shopify_sessions` table is empty after installation  
**Status:** Analysis Complete - 3 Critical Issues Found

---

## Executive Summary

After a comprehensive code review of the entire OAuth flow, I've identified **3 critical issues** that explain why sessions aren't being saved:

1. **SESSION NOT BEING PASSED TO CALLBACK** - The most critical issue
2. **MISSING ERROR LOGGING** - Errors are being silently swallowed
3. **INSUFFICIENT NULL VALIDATION** - Invalid sessions can enter the database

---

## Phase 1: Code Review Findings

### File: `server/routes.ts`

#### ✅ OAuth Begin Endpoint (`/api/auth`)
```typescript
app.get("/api/auth", async (req: Request, res: Response) => {
  const shop = req.query.shop as string;
  // ... validation ...
  
  await shopify.auth.begin({
    shop: sanitizedShop,
    callbackPath: "/api/auth/callback",
    isOnline: false,
    rawRequest: req,
    rawResponse: res,
  });
});
```
**Status:** ✅ CORRECT - Properly initiates Shopify OAuth begin

---

#### ⚠️ OAuth Callback Endpoint (`/api/auth/callback`)
```typescript
app.get("/api/auth/callback", async (req: Request, res: Response) => {
  const callback = await shopify.auth.callback({
    rawRequest: req,
    rawResponse: res,
  });

  const session = callback.session;
  const result = await handleOAuthSession(session);
  
  if (!result.success) {
    throw new Error("Failed to handle OAuth session");
  }
  
  res.redirect(`/?shop=${sanitizedShop}&host=${host}`);
});
```

**Critical Issues:**
1. **NO VALIDATION OF SESSION BEFORE SAVING** ❌
   - Line: `const session = callback.session;`
   - **Problem:** No check if `session` exists or has required fields
   - **Impact:** If Shopify returns undefined/null session, code still tries to save it
   - **What happens:** `handleOAuthSession(undefined)` is called

2. **NO LOGGING OF SESSION OBJECT** ❌
   - **Problem:** We don't log what's actually in the session object
   - **Impact:** Can't debug if Shopify is returning incomplete data
   - **Missing logs:**
     ```typescript
     // Should log BEFORE trying to save
     console.log('[auth] Callback session received:', {
       id: session?.id,
       shop: session?.shop,
       accessToken: session?.accessToken ? '***' : 'MISSING',
       scope: session?.scope,
     });
     ```

3. **ERROR HANDLING MASKS REAL ISSUES** ⚠️
   - The catch block checks for `CookieNotFound` but silently redirects
   - If actual database error occurs, user is still redirected
   - Real error is logged but user sees success

---

### File: `server/auth-utils.ts`

#### ⚠️ handleOAuthSession Function
```typescript
export async function handleOAuthSession(session: any) {
  try {
    const stored = await sessionStorage.storeSession(session);
    if (!stored) {
      throw new Error("Failed to store session");
    }
    
    return {
      success: true,
      shop: session.shop,
      accessToken: session.accessToken,
      scope: session.scope,
    };
  } catch (error) {
    console.error("[auth] Error handling OAuth session:", error);
    throw error;
  }
}
```

**Issues:**

1. **MISSING NULL CHECKS** ❌
   - No validation that `session` has required properties
   - No check if `session.shop` exists
   - No check if `session.accessToken` exists
   - **What happens:** If session is malformed, code still returns `success: true`

2. **POOR ERROR REPORTING** ❌
   - Catches error but doesn't include session details
   - Error logs don't show what properties were missing
   - Should log:
     ```typescript
     console.error("[auth] Session object invalid:", {
       sessionExists: !!session,
       shop: session?.shop,
       accessToken: session?.accessToken ? 'present' : 'MISSING',
       scope: session?.scope,
       error: error.message,
     });
     ```

---

### File: `server/shopify-session-storage.ts`

#### ✅ storeSession Method - Structure is Good
```typescript
async storeSession(session: Session): Promise<boolean> {
  try {
    const sessionData = {
      id: session.id,
      shop: session.shop,
      state: session.state || null,
      isOnline: session.isOnline,
      scope: session.scope || null,
      expires: session.expires ? new Date(session.expires) : null,
      accessToken: session.accessToken || null,
      onlineAccessInfo: session.onlineAccessInfo
        ? JSON.stringify(session.onlineAccessInfo)
        : null,
    };

    await db
      .insert(shopifySessions)
      .values(sessionData)
      .onConflictDoUpdate({
        target: shopifySessions.id,
        set: sessionData,
      });

    return true;
  } catch (error) {
    console.error("Failed to store session:", error);
    return false;
  }
}
```

**Issues:**

1. **SILENT ERROR SWALLOWING** ⚠️
   - Catches error and returns `false`
   - Error is logged but caller (`handleOAuthSession`) throws generic error
   - **Real database error is lost**
   - Should re-throw:
     ```typescript
     } catch (error) {
       console.error("Failed to store session:", error);
       throw error;  // Re-throw instead of returning false
     }
     ```

2. **NO VALIDATION BEFORE INSERT** ⚠️
   - Doesn't check if `session.id` is valid
   - Doesn't check if `session.shop` is non-empty
   - Doesn't validate `session.accessToken` exists
   - **What happens:** Can insert rows with NULL accessToken or shop

3. **CONSTRAINT NOT DEFINED ON SHOP** ⚠️
   - Table has `shop` but it's NOT UNIQUE
   - Multiple sessions for same shop won't cause conflict
   - Should probably have a UNIQUE constraint on `(shop, isOnline)`

---

### File: `shared/schema.ts`

#### ⚠️ shopifySessions Table Definition
```typescript
export const shopifySessions = pgTable("shopify_sessions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  shop: varchar("shop", { length: 255 }).notNull(),
  state: varchar("state", { length: 255 }),
  isOnline: boolean("is_online").default(false),
  scope: text("scope"),
  expires: timestamp("expires"),
  accessToken: text("access_token"),
  onlineAccessInfo: text("online_access_info"),
});
```

**Issues:**

1. **NO UNIQUE CONSTRAINT ON SHOP** ⚠️
   - Multiple invalid/partial sessions could accumulate
   - No way to prevent duplicate sessions
   - Should add:
     ```typescript
     unique("unique_session_per_shop_mode").on(shopifySessions.shop, shopifySessions.isOnline)
     ```

2. **NO VALIDATION CONSTRAINTS** ⚠️
   - `accessToken` can be NULL even after successful OAuth
   - `scope` can be NULL
   - No CHECK constraint to ensure data integrity
   - Database allows rows like:
     ```
     id: "some-id"
     shop: "test-shop.myshopify.com"
     accessToken: NULL
     scope: NULL
     ```

---

## Phase 2-5: Root Cause Analysis

### Why Sessions Table Stays Empty

**Scenario 1: Session is NULL from Shopify Callback**
1. Shopify OAuth callback returns `callback.session = null`
2. Code doesn't check: `const session = callback.session;` (no validation)
3. `handleOAuthSession(null)` is called
4. Returns success but doesn't insert anything
5. **Result:** Empty table, user doesn't notice the failure

**Scenario 2: Session Object is Incomplete**
1. Shopify returns session with missing `accessToken`
2. Code doesn't validate: `handleOAuthSession(session)` accepts incomplete session
3. Inserts row with `accessToken: NULL`
4. App later checks `isShopInstalled()` which returns `true` (because row exists)
5. But when app tries to call Shopify API, it fails (no token)
6. **Result:** Session exists but is useless, app loops asking to install again

**Scenario 3: Database Insert Fails Silently**
1. Database connection fails (wrong permissions, constraint violation)
2. `storeSession()` catches error, logs it, returns `false`
3. `handleOAuthSession()` throws generic error
4. Callback endpoint catches error, logs it, redirects to home anyway
5. User doesn't see the error
6. **Result:** Redirect succeeds but no session saved

---

## Critical Fixes Required

### Fix 1: Add Session Validation in Callback (CRITICAL)

**File:** `server/routes.ts`

**Change:**
```typescript
app.get("/api/auth/callback", async (req: Request, res: Response) => {
  try {
    const callback = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    const session = callback.session;

    // ✅ CRITICAL: Validate session before saving
    if (!session) {
      console.error('[auth] ❌ Shopify returned null/undefined session');
      throw new Error('No session returned from Shopify callback');
    }

    if (!session.shop) {
      console.error('[auth] ❌ Session missing shop:', session);
      throw new Error('Session missing shop domain');
    }

    if (!session.accessToken) {
      console.error('[auth] ❌ Session missing accessToken:', {
        shop: session.shop,
        scope: session.scope,
      });
      throw new Error('Session missing access token');
    }

    // ✅ Log before saving
    console.log('[auth] ✅ Valid session received:', {
      shop: session.shop,
      accessToken: '***' + session.accessToken.slice(-4),
      scope: session.scope,
    });

    const result = await handleOAuthSession(session);

    if (!result.success) {
      throw new Error("Failed to handle OAuth session");
    }

    // ... rest of code
  } catch (error: any) {
    console.error("[auth] ❌ Callback failed:", {
      errorMessage: error.message,
      shop: req.query.shop,
    });
    // Don't redirect on error - return error response
    res.status(500).json({
      error: "Authentication failed",
      message: error.message,
    });
  }
});
```

---

### Fix 2: Add Validation in handleOAuthSession (CRITICAL)

**File:** `server/auth-utils.ts`

**Change:**
```typescript
export async function handleOAuthSession(session: any) {
  // ✅ CRITICAL: Validate before attempting to save
  if (!session) {
    throw new Error('Session is null or undefined');
  }

  if (!session.shop) {
    throw new Error('Session missing shop domain');
  }

  if (!session.accessToken) {
    throw new Error('Session missing access token - OAuth may have failed');
  }

  try {
    console.log('[auth] Saving session for shop:', session.shop);
    
    const stored = await sessionStorage.storeSession(session);
    if (!stored) {
      throw new Error("Session storage returned false - check database");
    }

    console.log('[auth] ✅ Session successfully saved:', {
      shop: session.shop,
      accessToken: '***' + session.accessToken.slice(-4),
      scope: session.scope,
    });

    return {
      success: true,
      shop: session.shop,
      accessToken: session.accessToken,
      scope: session.scope,
    };
  } catch (error) {
    console.error("[auth] ❌ Failed to save session:", {
      shop: session?.shop,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
```

---

### Fix 3: Add Validation in storeSession (IMPORTANT)

**File:** `server/shopify-session-storage.ts`

**Change:**
```typescript
async storeSession(session: Session): Promise<boolean> {
  // ✅ Validate before insert
  if (!session.id || !session.shop || !session.accessToken) {
    console.error("Invalid session - missing critical fields:", {
      id: !!session.id,
      shop: !!session.shop,
      accessToken: !!session.accessToken,
    });
    throw new Error('Session missing required fields');
  }

  try {
    const sessionData = {
      id: session.id,
      shop: session.shop,
      state: session.state || null,
      isOnline: session.isOnline,
      scope: session.scope || null,
      expires: session.expires ? new Date(session.expires) : null,
      accessToken: session.accessToken,  // ✅ Should not be null
      onlineAccessInfo: session.onlineAccessInfo
        ? JSON.stringify(session.onlineAccessInfo)
        : null,
    };

    console.log('[db] Inserting session:', { shop: session.shop, id: session.id });

    await db
      .insert(shopifySessions)
      .values(sessionData)
      .onConflictDoUpdate({
        target: shopifySessions.id,
        set: sessionData,
      });

    console.log('[db] ✅ Session inserted successfully');
    return true;
  } catch (error) {
    console.error("[db] ❌ Failed to store session:", {
      shop: session.shop,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // ✅ Re-throw instead of returning false
    throw error;
  }
}
```

---

### Fix 4: Add Schema Constraints (IMPORTANT)

**File:** `shared/schema.ts`

**Change:**
```typescript
export const shopifySessions = pgTable(
  "shopify_sessions",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    shop: varchar("shop", { length: 255 }).notNull(),
    state: varchar("state", { length: 255 }),
    isOnline: boolean("is_online").default(false),
    scope: text("scope").notNull(),  // ✅ Must have scope
    expires: timestamp("expires"),
    accessToken: text("access_token").notNull(),  // ✅ Must have token
    onlineAccessInfo: text("online_access_info"),
  },
  (table) => [
    // ✅ Prevent duplicate sessions for same shop
    unique("unique_shop_session").on(table.shop, table.isOnline),
  ]
);
```

---

## Test Script Status

✅ **Created:** `server/test-oauth.ts`

The test script includes:
- Database connectivity test
- Schema validation
- Session insert/retrieve tests
- sessionStorage class validation
- handleOAuthSession simulation
- Column mapping verification
- Cleanup

**To run locally:**
```bash
npm run test:oauth
```

This requires a valid DATABASE_URL pointing to a Postgres instance.

---

## Summary Table

| Issue | Severity | File | Line | Fix |
|-------|----------|------|------|-----|
| No session validation | 🔴 CRITICAL | routes.ts | ~70 | Add `if (!session) throw` |
| No accessToken validation | 🔴 CRITICAL | auth-utils.ts | ~5 | Add `if (!accessToken) throw` |
| Silent error swallowing | 🟠 HIGH | shopify-session-storage.ts | ~34 | Re-throw instead of return false |
| No schema constraints | 🟠 HIGH | schema.ts | ~7 | Add UNIQUE + NOT NULL constraints |
| Missing debug logging | 🟡 MEDIUM | routes.ts, auth-utils.ts | multiple | Add detailed logs at each step |

---

## Next Steps

1. **Immediate (before next deploy):**
   - Apply Fix #1 (session validation in callback)
   - Apply Fix #2 (validation in handleOAuthSession)
   - Apply Fix #3 (validation in storeSession)

2. **Before production:**
   - Apply Fix #4 (schema constraints)
   - Run migrations: `npm run db:generate && npm run db:push`

3. **Testing:**
   - Run `npm run test:oauth` with a test database
   - Test full OAuth flow with real Shopify test store
   - Check `shopify_sessions` table after install

4. **Monitoring:**
   - Watch server logs for "[auth]" messages
   - Monitor `shopify_sessions` table for empty or incomplete rows
   - Check for NULL accessToken or scope values

---

## Verification Checklist

After applying fixes, verify:

- [ ] Session validation logs appear in callback
- [ ] ✅ message appears in logs when session is saved
- [ ] ❌ message appears and error is thrown if session invalid
- [ ] Table has rows with non-NULL accessToken and scope
- [ ] isShopInstalled() returns true after OAuth
- [ ] App doesn't loop asking to install again
- [ ] Webhooks are registered after OAuth succeeds
- [ ] Product sync begins after session save
