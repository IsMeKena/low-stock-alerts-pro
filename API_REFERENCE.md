# API Reference - v2 MVP

## Onboarding Endpoints

### POST /api/onboarding/complete
Complete onboarding wizard and save configuration.

**Request:**
```json
{
  "shop": "my-store.myshopify.com",
  "plan": "free|pro|premium",
  "thresholdType": "quantity|percentage",
  "thresholdValue": 5,
  "safetyStock": 10,
  "notificationMethod": "email|whatsapp|both",
  "whatsappNumber": "+1234567890",
  "batchingEnabled": false,
  "batchingInterval": "hourly|daily|weekly"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Onboarding completed",
  "shop": "my-store.myshopify.com",
  "plan": "free"
}
```

**Error Responses:**
- 400: Invalid plan, threshold type, phone number format, etc.
- 500: Database error

---

### GET /api/onboarding/status
Check if shop has completed onboarding.

**Query Parameters:**
- `shop` (required): Shop domain

**Response:**
```json
{
  "isOnboarded": true,
  "plan": {
    "shopDomain": "my-store.myshopify.com",
    "whatsappNumber": "+1234567890",
    "batchingEnabled": true,
    "batchingInterval": "daily",
    "emailAlertsEnabled": true,
    "isOnboarded": true
  }
}
```

---

## Billing Endpoints

### GET /api/billing/plan
Get current billing plan and usage statistics.

**Query Parameters:**
- `shop` (required): Shop domain

**Response:**
```json
{
  "plan": "free",
  "usage": {
    "plan": "free",
    "emailUsed": 2,
    "emailLimit": 10,
    "whatsappUsed": 0,
    "whatsappLimit": 0,
    "month": "2026-03",
    "usageRemaining": 8
  },
  "tiers": {
    "free": { "plan": "free", "emailLimit": 10, "whatsappLimit": 0 },
    "pro": { "plan": "pro", "emailLimit": 500, "whatsappLimit": 0 },
    "premium": { "plan": "premium", "emailLimit": -1, "whatsappLimit": 500 }
  }
}
```

---

### GET /api/billing/usage
Get detailed usage statistics.

**Query Parameters:**
- `shop` (required): Shop domain

**Response:**
```json
{
  "month": "2026-03",
  "emailUsed": 5,
  "emailLimit": 500,
  "whatsappUsed": 2,
  "whatsappLimit": 500,
  "percentageUsed": 1
}
```

---

### POST /api/billing/upgrade
Request plan upgrade (stub - future Stripe integration).

**Request:**
```json
{
  "shop": "my-store.myshopify.com",
  "plan": "pro|premium"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Plan upgraded to pro",
  "plan": "pro"
}
```

**Note:** Currently a stub. Future implementation will integrate Stripe for payment processing.

---

### GET /api/billing/settings
Get current shop settings.

**Query Parameters:**
- `shop` (required): Shop domain

**Response:**
```json
{
  "whatsappNumber": "+1234567890",
  "batchingEnabled": true,
  "batchingInterval": "daily",
  "emailAlertsEnabled": true,
  "isOnboarded": true
}
```

---

### POST /api/billing/settings
Update shop settings (WhatsApp, batching, email preferences).

**Request:**
```json
{
  "shop": "my-store.myshopify.com",
  "whatsappNumber": "+1234567890",
  "batchingEnabled": true,
  "batchingInterval": "hourly|daily|weekly",
  "emailAlertsEnabled": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Settings updated"
}
```

**Validation:**
- Phone number must be E.164 format: `+1234567890`
- Batching interval must be one of: hourly, daily, weekly
- All fields optional (only provided fields updated)

---

## Alert Endpoints (Internal/Webhook)

### POST /api/webhooks/inventory_levels/update
Shopify webhook for inventory updates (existing - unchanged).

Triggers alert checking logic with new features:
- Smart threshold calculation (quantity vs %)
- Batching queue dispatch (if enabled)
- Usage tracking and limits

---

## Database Queries for Testing

### Check User's Current Plan
```sql
SELECT bp.plan, us.* 
FROM billing_plan bp
LEFT JOIN usage_tracker us ON bp.shop_domain = us.shop_domain
WHERE bp.shop_domain = 'my-store.myshopify.com';
```

### View Shop Settings
```sql
SELECT * FROM shop_settings 
WHERE shop_domain = 'my-store.myshopify.com';
```

### Check Pending Batches
```sql
SELECT COUNT(*) as pending, alert_type, batching_interval
FROM batching_queue
WHERE shop_domain = 'my-store.myshopify.com' 
  AND status = 'pending'
  AND scheduled_for <= now()
GROUP BY alert_type, batching_interval;
```

### View Usage History
```sql
SELECT shop_domain, plan, month, email_count, whatsapp_count, usage_remaining
FROM usage_tracker
WHERE shop_domain = 'my-store.myshopify.com'
ORDER BY month DESC;
```

### Check Active Alerts
```sql
SELECT a.*, p.title
FROM alerts a
LEFT JOIN products p ON a.product_id = p.shopify_product_id
WHERE a.shop_domain = 'my-store.myshopify.com' 
  AND a.status = 'active';
```

---

## Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 400 | Missing or invalid parameters | Check request body/query params |
| 401 | Unauthorized (webhook signature) | Verify Shopify webhook secret |
| 404 | Resource not found | Shop/alert doesn't exist |
| 409 | Conflict (duplicate key) | Resource already exists |
| 429 | Rate limited | Wait before retrying |
| 500 | Server error | Check logs, retry after delay |

---

## Rate Limiting

- No explicit rate limits implemented yet
- Twilio: Up to 100 messages/second (respects API limits)
- Email: Uses existing email provider limits
- Database: PostgreSQL connection pooling via Bull

---

## Authentication

All endpoints use session authentication (Shopify session store).
- Sessions stored in `shopify_sessions` table
- Access token attached to each request
- Verify session in middleware before endpoint execution

---

## Webhook Events (Incoming)

These existing webhooks now trigger enhanced alert logic:

### inventory_levels/update
```json
{
  "inventory_item_id": 123456,
  "sku": "ABC-123",
  "location_id": 987654,
  "available_quantity": 5,
  "updated_at": "2026-03-17T21:14:00Z"
}
```

**Triggered Actions:**
1. Calculate effective threshold (smart thresholds)
2. Check usage limits (billing)
3. Create alert if below threshold
4. Queue for batching (if enabled)
5. Send immediately or queue (based on batching settings)

---

## Response Time Goals

| Endpoint | Target | Notes |
|----------|--------|-------|
| Onboarding complete | <1s | Synchronous |
| Billing plan | <500ms | Cached in app |
| Inventory webhook | <5s | Queued async |
| WhatsApp send | <10s | Twilio API |

---

## Testing with cURL

### Complete Onboarding
```bash
curl -X POST http://localhost:5000/api/onboarding/complete \
  -H "Content-Type: application/json" \
  -d '{
    "shop": "test-shop.myshopify.com",
    "plan": "free",
    "thresholdType": "quantity",
    "thresholdValue": 5,
    "safetyStock": 10,
    "notificationMethod": "email",
    "whatsappNumber": null,
    "batchingEnabled": false,
    "batchingInterval": "daily"
  }'
```

### Check Onboarding Status
```bash
curl http://localhost:5000/api/onboarding/status?shop=test-shop.myshopify.com
```

### Get Billing Plan
```bash
curl http://localhost:5000/api/billing/plan?shop=test-shop.myshopify.com
```

### Update Settings
```bash
curl -X POST http://localhost:5000/api/billing/settings \
  -H "Content-Type: application/json" \
  -d '{
    "shop": "test-shop.myshopify.com",
    "whatsappNumber": "+1234567890",
    "batchingEnabled": true,
    "batchingInterval": "daily",
    "emailAlertsEnabled": true
  }'
```

---

## Changelog - v2 MVP

### New
- ✅ WhatsApp alerts via Twilio
- ✅ Smart configurable thresholds (quantity & percentage)
- ✅ Multi-step onboarding wizard
- ✅ Notification batching/digest mode
- ✅ Pricing tiers and usage tracking
- ✅ Billing settings management
- ✅ Usage dashboard

### Modified
- ✅ Alert system supports multiple notification channels
- ✅ Webhook processor respects batching configuration
- ✅ Server initialization includes Twilio and batching

### Deprecated
- ❌ None

---

**Last Updated:** 2026-03-17
**Version:** v2 MVP
**Status:** Ready for Testing ✅
