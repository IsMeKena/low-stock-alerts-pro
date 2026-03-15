# Low Stock Alerts

The alert system monitors inventory levels and notifies merchants when stock falls below configured thresholds.

## How Alerts Work

1. **Inventory Update Webhook**
   - Shopify sends `inventory_levels/update` webhook
   - App receives inventory quantity change

2. **Alert Checking**
   - Compare new quantity against threshold
   - If quantity ≤ threshold: Create active alert
   - If quantity > threshold: Resolve existing alerts

3. **Notifications**
   - Email alert sent to merchant (optional, requires Mailgun)
   - Alert logged in database
   - Alert displayed in dashboard

## Alert Status

- **active** - Alert is currently active (low stock condition exists)
- **resolved** - Alert has been resolved (stock replenished or archived)
- **archived** - Alert manually archived by merchant

## API Endpoints

### GET /api/alerts
Get all active alerts for a shop.

**Headers:**
- `Authorization: Bearer <session_token>`

**Response:**
```json
{
  "shop": "my-store.myshopify.com",
  "alerts": [
    {
      "id": "alert_123",
      "shopDomain": "my-store.myshopify.com",
      "productId": "product_456",
      "locationId": "location_789",
      "quantity": 3,
      "threshold": 5,
      "status": "active",
      "createdAt": "2025-03-15T10:00:00Z",
      "resolvedAt": null,
      "product": {
        "id": "store_product_456",
        "title": "Example Product",
        "handle": "example-product",
        "imageUrl": "https://..."
      }
    }
  ],
  "count": 1
}
```

### POST /api/alerts/:alertId/resolve
Manually resolve an alert.

**Headers:**
- `Authorization: Bearer <session_token>`

**Response:**
```json
{
  "success": true,
  "alertId": "alert_123"
}
```

## Email Notifications

Alerts can be sent via email using Mailgun.

### Configuration

Set environment variables:
```bash
MAILGUN_DOMAIN=your-domain.com
MAILGUN_API_KEY=your-api-key
```

### Email Templates

1. **Low Stock Alert** - Sent immediately when inventory drops below threshold
   - Product name
   - Current quantity
   - Threshold
   - Shop domain

2. **Daily Summary** (optional) - Daily digest of all low stock items
   - List of all products below threshold
   - Current vs threshold quantities

## Database Schema

### alerts table

```sql
CREATE TABLE alerts (
  id VARCHAR(255) PRIMARY KEY,
  shop_domain VARCHAR(255) NOT NULL,
  product_id VARCHAR(255) NOT NULL,
  location_id VARCHAR(255),
  quantity INTEGER NOT NULL,
  threshold INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
```

## Threshold Management

### Default Threshold
- Default: 5 units per product
- Set when product is first created

### Custom Thresholds
Future feature: Allow merchants to set custom thresholds per product/location

### Bulk Management
Future feature: Set thresholds by product type, collection, or category

## Testing Alerts

### Manual Testing

1. **Create low stock condition:**
```bash
curl -X POST http://localhost:5000/api/webhooks/inventory_levels/update \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-SHA256: <valid_signature>" \
  -d '{
    "inventory_item_id": "123",
    "location_id": "456",
    "available": 2,
    "updated_at": "2025-03-15T10:00:00Z",
    "shop": {"id": "12345"}
  }'
```

2. **Get alerts:**
```bash
curl http://localhost:5000/api/alerts \
  -H "Authorization: Bearer <session_token>"
```

3. **Resolve alert:**
```bash
curl -X POST http://localhost:5000/api/alerts/alert_id/resolve \
  -H "Authorization: Bearer <session_token>"
```

## Future Enhancements

1. **Notification Channels**
   - SMS alerts (Twilio)
   - Slack notifications
   - Webhook to external systems

2. **Smart Thresholds**
   - Auto-calculated based on sales velocity
   - Seasonal adjustments
   - Lead time factoring

3. **Alert Rules**
   - Custom alert rules per product
   - Notification frequency control
   - Bulk threshold updates

4. **Analytics**
   - Alert frequency by product
   - Time-to-resolve metrics
   - Predictive stockouts

## Key Files

- `server/alerts.ts` - Alert logic and management
- `server/email.ts` - Email notification service
- `server/webhook-processors.ts` - Webhook alert triggering
- `server/routes.ts` - Alert API endpoints
- `shared/schema.ts` - Alerts database table
