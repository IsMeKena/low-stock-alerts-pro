# Webhooks

Low Stock Alerts uses Shopify webhooks to monitor product and inventory changes in real-time.

## Registered Webhooks

After OAuth installation, the app automatically registers the following webhooks:

1. **products/create** - When a new product is created
   - Stores product info in database
   - Creates initial inventory records

2. **products/update** - When a product is modified
   - Updates product title, handle, image

3. **inventory_levels/update** - When inventory quantity changes
   - Updates inventory tracking
   - Triggers low stock alerts

## Webhook Endpoints

All webhooks are POSTed to:
- `GET /api/webhooks/products/create`
- `GET /api/webhooks/products/update`
- `GET /api/webhooks/inventory_levels/update`

## Webhook Signature Verification

All webhooks are signed with HMAC-SHA256. The signature is verified before processing:

- Header: `X-Shopify-Hmac-SHA256`
- Secret: `SHOPIFY_API_SECRET` environment variable
- Body: Raw request body (before JSON parsing)

## Webhook Processing

### Product Create

**Payload:**
```json
{
  "id": 1234567890,
  "title": "Example Product",
  "handle": "example-product",
  "image": {
    "src": "https://example.com/image.jpg"
  },
  "shop": {
    "id": "1234567890"
  }
}
```

**Processing:**
- Creates product record in `products` table
- Stores shop domain, product ID, title, handle, and image URL

### Product Update

**Payload:** Same as product/create

**Processing:**
- Updates existing product record
- Updates title, handle, and image URL

### Inventory Update

**Payload:**
```json
{
  "inventory_item_id": 1234567890,
  "location_id": 5678901234,
  "available": 25,
  "updated_at": "2025-03-15T10:30:00Z",
  "shop": {
    "id": "1234567890"
  }
}
```

**Processing:**
- Creates or updates inventory record
- Tracks available quantity by location
- Checks if quantity falls below threshold
- Triggers low stock alert if threshold exceeded

## Low Stock Alerts

When inventory falls below the threshold:
1. Alert is logged
2. Alert record is created in `alerts` table
3. Email notification sent (Mailgun integration)
4. Dashboard updated in real-time

## Testing Webhooks

### Manual Testing

1. **Send test webhook:**
```bash
curl -X POST http://localhost:5000/api/webhooks/products/create \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-SHA256: <valid_signature>" \
  -d '{"id": 123, "title": "Test", "shop": {"id": "12345"}}'
```

2. **Generate valid signature:**
```bash
# Using Node.js
const crypto = require('crypto');
const secret = process.env.SHOPIFY_API_SECRET;
const body = '{"id": 123}';
const signature = crypto
  .createHmac('sha256', secret)
  .update(body)
  .digest('base64');
```

### Using Shopify CLI

```bash
shopify app dev --tunnel=cloudflare

# In another terminal
shopify webhook trigger products/create --topic products/create
```

### Using ngrok for HTTPS

When testing locally with HTTPS tunneling:

1. Start ngrok:
```bash
ngrok http 5000
```

2. Update APP_URL:
```bash
export APP_URL=https://xxxxx.ngrok.io
```

3. Reinstall app to register webhooks with ngrok URL

## Troubleshooting

### Webhook Not Received

1. Check webhook registration:
   - Shopify Admin → Apps → Low Stock Alerts → Webhooks
   - Verify URL, topic, and format

2. Check logs:
   - Look for `[webhook]` entries in server logs
   - Verify signature validation passes

3. Verify signature:
   - Ensure `SHOPIFY_API_SECRET` is set correctly
   - Check HMAC header in request

### High Webhook Volume

For shops with many products:
- Use queues (Redis) for async processing
- Batch inventory updates
- Consider rate limiting

## Key Files

- `server/webhook-handler.ts` - Webhook signature verification and registration
- `server/webhook-processors.ts` - Business logic for each webhook type
- `server/routes.ts` - Webhook endpoints
- `shared/schema.ts` - Database tables for products and inventory
