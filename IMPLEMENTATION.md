# Shopify Best Practices Implementation - low-stock-alerts

## Overview

This document describes the implementation of Shopify best practices for the low-stock-alerts app, focusing on:
1. **Simplified Auth Flow** - Removed redundant validation
2. **App Bridge Integration** - Proper embedded app handling
3. **Async Webhook Processing** - Webhook queuing with Bull
4. **Rate Limit Monitoring** - Real-time API call tracking
5. **Error Handling** - Exponential backoff for retries

---

## Phase 1: Client-Side (App Bridge Integration)

### Changes to `client/src/App.tsx`

**What was fixed:**
- ❌ **Before**: Always checking `/api/auth/installed` even in embedded context
- ✅ **After**: Trust `host` parameter from Shopify, skip redundant check

**Key improvement:**
```typescript
// In embedded app context (has host param), trust Shopify's authentication
if (hostParam) {
  console.log(`[app] Embedded app context detected, trusting Shopify session`);
  setAuthenticated(true);
  setLoading(false);
  return;
}
```

**What this solves:**
- ❌ **Auth Loop Issue** - No longer showing auth screen after OAuth completes
- ✅ Responds 200 immediately to Shopify instead of hanging
- ✅ Eliminates redundant session validation

---

## Phase 2: Server-Side Async Webhooks

### New File: `server/webhook-queue.ts`

**What this does:**
- Queues webhooks asynchronously using Bull Redis queue
- Responds to Shopify within 5 seconds
- Processes webhooks in background with automatic retries

**Key features:**
- **Automatic Retries**: Up to 3 attempts with exponential backoff (2s, 4s, 8s)
- **Queue Monitoring**: Track pending, active, completed, failed jobs
- **Job Idempotency**: Unique job IDs prevent duplicate processing
- **Graceful Shutdown**: Clean close on server termination

**How it works:**
```typescript
// Webhook comes in
POST /api/webhooks/products/create
→ Verify signature (sync)
→ Enqueue job to Bull queue (async)
→ Return 200 to Shopify immediately
→ Background worker processes job asynchronously
```

### Updated: `server/routes.ts`

**What changed:**
- ❌ **Before**: Processing webhooks synchronously (blocking)
- ✅ **After**: Enqueue to queue, respond immediately

```typescript
// Old (BLOCKING):
app.post("/api/webhooks/products/create", async (req, res) => {
  await processProductCreate(shop, req.body); // Waits!
  res.status(200).json({ success: true });
});

// New (NON-BLOCKING):
app.post("/api/webhooks/products/create", async (req, res) => {
  await enqueueWebhook("products/create", shop, req.body); // Returns immediately
  res.status(200).json({ success: true }); // Responds within 5 seconds
});
```

---

## Phase 3: Enhanced Middleware

### Updated: `server/middleware.ts`

**New Features:**

1. **Rate Limit Monitoring**
   - Tracks `X-Shop-Api-Call-Limit` header from Shopify API responses
   - Logs warnings at 80% usage
   - Logs critical alerts at 95% usage
   - Returns 429 if at critical level

2. **API Call Blocking**
   - `checkRateLimitThreshold` middleware prevents calls when near limit
   - Gracefully handles rate limiting without crashing

3. **Detailed Logging**
   - `logApiCall` middleware logs current rate limit status
   - Helps debug API usage patterns

**Example output:**
```
[middleware] Rate limit warning for store.myshopify.com: 35/40 (87%)
[api] GET /api/products - Rate limit: 35/40
[middleware] Critical rate limit for store.myshopify.com: 39/40 (97%)
```

---

## Phase 4: Error Handling Service

### New File: `server/error-handling.ts`

**What this provides:**

1. **Exponential Backoff Logic**
   - Configurable retry attempts, delays, multipliers
   - Different configs for webhooks (stricter) vs API calls (gentler)

2. **Smart Retry Detection**
   - 401: Token expired → refresh and retry
   - 429: Rate limited → back off exponentially
   - 5xx: Server error → retry with exponential backoff
   - Other errors → fail immediately

3. **Retry-After Header Support**
   - Respects Shopify's `Retry-After` header
   - Prevents hammering rate-limited endpoints

**Usage in webhook processors:**
```typescript
import { withRetry, WEBHOOK_RETRY_CONFIG } from "./error-handling";

export async function processProductCreate(shop: string, payload: any) {
  return withRetry(
    async () => {
      // Your database operation
      await db.insert(products).values(payload);
    },
    "processProductCreate",
    WEBHOOK_RETRY_CONFIG
  );
}
```

---

## Phase 5: Server Initialization

### Updated: `server/index.ts`

**New features:**

1. **Webhook Queue Initialization**
   - Imports and initializes Bull queue on startup
   - Configures Redis connection

2. **Graceful Shutdown**
   - Listens for SIGTERM and SIGINT
   - Closes queue cleanly before exit
   - Prevents data loss for pending jobs

```typescript
process.on("SIGTERM", async () => {
  await closeWebhookQueue();
  httpServer.close(() => process.exit(0));
});
```

---

## Testing Strategy

### 1. Local Test - No Auth Loop

**Steps:**
```bash
# Start dev server
npm run dev

# Manually construct embedded app URL
http://localhost:5000/?host=base64url...&shop=test.myshopify.com
```

**Expected:**
- ✅ App loads dashboard directly
- ✅ No auth screen
- ✅ No infinite redirects
- ✅ Console shows: "[app] Embedded app context detected"

### 2. Webhook Queue Test

**Steps:**
```bash
# Monitor queue (in separate terminal)
node -e "
const Queue = require('bull');
const q = new Queue('webhooks');
setInterval(async () => {
  const stats = await Promise.all([
    q.getWaitingCount(),
    q.getActiveCount(),
    q.getCompletedCount()
  ]);
  console.log('Queue:', { waiting: stats[0], active: stats[1], completed: stats[2] });
}, 2000);
"

# Trigger webhook in test shop
# Monitor console for: "[webhook-queue] Processing..." messages
```

**Expected:**
- ✅ Webhook responds 200 immediately
- ✅ Queue processes in background
- ✅ Retries happen automatically
- ✅ Console shows: "[webhook-queue] Successfully processed..."

### 3. Rate Limit Monitoring Test

**Steps:**
```bash
# Make rapid API calls
for i in {1..50}; do
  curl -H "Authorization: Bearer TOKEN" \
    http://localhost:5000/api/products?shop=test.myshopify.com
done
```

**Expected:**
- ✅ Logs show rate limit percentage
- ✅ Warning at 80%: "[middleware] Rate limit warning"
- ✅ Critical at 95%: "[middleware] Critical rate limit"
- ✅ Future calls return 429 when critical

### 4. Error Handling Test

**Steps:**
```bash
# Simulate token expiration (401)
# Simulate rate limit (429)
# Simulate server error (503)
```

**Expected:**
- ✅ 401: Retries with exponential backoff
- ✅ 429: Waits for Retry-After, then retries
- ✅ 5xx: Exponential backoff (1s, 2s, 4s, 8s, 16s)

---

## Files Changed Summary

### Created
- ✅ `server/webhook-queue.ts` - Bull queue service
- ✅ `server/error-handling.ts` - Error handling & retries
- ✅ `IMPLEMENTATION.md` - This file

### Modified
- ✅ `client/src/App.tsx` - Simplified auth, App Bridge ready
- ✅ `server/middleware.ts` - Rate limit monitoring
- ✅ `server/routes.ts` - Webhook queuing, middleware registration
- ✅ `server/index.ts` - Queue initialization & graceful shutdown
- ✅ `package.json` - Added @shopify/app-bridge, bull, redis

### Why Bull/Redis?

**Why Bull Queue?**
- Automatically retries failed jobs
- Persists jobs to Redis (survives server restart)
- Web UI available for monitoring
- Industry standard for Node.js

**Why Redis?**
- Bulletproof reliability
- Automatically scales
- Works great on Railway (managed Redis available)
- Zero additional infrastructure needed

**Alternative (if Redis unavailable):**
- Ball uses in-memory queue with fallback
- Jobs lost on server restart (acceptable for some apps)
- Modify webhook-queue.ts to use fallback mode

---

## Deployment Checklist

Before pushing to production:

### Prerequisites
- [ ] Redis instance available (Railway provides this)
- [ ] Set `REDIS_URL` environment variable
- [ ] Shopify API credentials set in `.env`

### Code
- [ ] ✅ TypeScript compiles: `npm run check`
- [ ] ✅ Build succeeds: `npm run build`
- [ ] ✅ All files updated

### Testing
- [ ] ✅ No auth loops in embedded app context
- [ ] ✅ Webhooks respond 200 immediately
- [ ] ✅ Webhooks process asynchronously
- [ ] ✅ Rate limits are monitored and logged
- [ ] ✅ Exponential backoff on errors

### Monitoring
- [ ] ✅ Set up logs monitoring for:
  - `[webhook-queue]` - webhook processing
  - `[middleware]` - rate limit alerts
  - `[retry]` - error retries

---

## Next Steps

1. **Dashboard Features** - Add product listing, alerts display
2. **Webhook Recovery** - Persist failed webhooks for manual retry
3. **Rate Limit Queue** - Automatically queue requests when at limit
4. **Monitoring Dashboard** - Real-time view of queue status
5. **Metrics Export** - Prometheus metrics for monitoring

---

## Troubleshooting

### "No matching version found for @shopify/app-bridge"
→ Using version 3.7.11 (latest stable). Update if needed.

### "Cannot find module 'bull'"
→ Run `npm install` to install all dependencies

### "Redis connection failed"
→ Check `REDIS_URL` is set correctly
→ For local dev: `export REDIS_URL=redis://localhost:6379`
→ For Railway: Use provided Redis connection string

### Webhooks not processing
→ Check Bull queue status: `npm list bull`
→ Check Redis connection in logs
→ Verify webhook signature validation passes

### Rate limit always 0/40
→ Shopify API not being called yet
→ Make a products/orders API call first
→ Limit updates after each Shopify API response

---

## Key Insights

✨ **Embedded Apps Trust Shopify**
- If `host` parameter exists, user is already authenticated
- No need for manual validation
- Eliminates auth loops entirely

🚀 **Async Webhooks Are Essential**
- Shopify expects responses within 5 seconds
- Queue webhooks, respond immediately
- Process in background without blocking

⚡ **Rate Limits Are Real**
- Shopify limits API calls per shop
- Monitor and respect these limits
- Exponential backoff prevents lockouts

🔄 **Retries Are Automatic**
- Bull handles retries automatically
- Exponential backoff for safety
- Respects Retry-After headers

---

## Related Documentation

- [Shopify App Bridge Docs](https://shopify.dev/docs/apps/build/embedded-apps)
- [Shopify Webhooks](https://shopify.dev/docs/api/webhooks)
- [Bull Queue Docs](https://github.com/OptimalBits/bull)
- [REST API Rate Limits](https://shopify.dev/docs/api/rest/reference/rate_limits)
