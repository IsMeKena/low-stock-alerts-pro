# Authentication Flow

## OAuth Overview

Low Stock Alerts uses Shopify's OAuth 2.0 flow for app authentication.

## Flow Diagram

```
1. User visits app → Check if installed
2. If not installed:
   - User enters shop domain
   - Clicks "Install App" button
3. Frontend calls GET /api/auth?shop=<domain>
4. Server initiates Shopify OAuth
5. User redirected to Shopify authorization page
6. User grants permissions
7. Shopify redirects to GET /api/auth/callback?code=...&shop=...&host=...
8. Server exchanges code for access token
9. Access token stored in database
10. User redirected to app dashboard with shop param
11. App loads with full functionality
```

## Endpoints

### GET /api/auth/installed
Check if an app is already installed for a shop.

**Query Parameters:**
- `shop` (required) - Shop domain (e.g., "my-store.myshopify.com")

**Response:**
```json
{
  "installed": true,
  "shop": "my-store.myshopify.com"
}
```

### GET /api/auth
Begin OAuth flow.

**Query Parameters:**
- `shop` (required) - Shop domain

**Response:**
- Redirects to Shopify authorization page

### GET /api/auth/callback
OAuth callback endpoint (called by Shopify).

**Query Parameters:**
- `code` (required) - Authorization code
- `shop` (required) - Shop domain
- `host` (optional) - App host parameter
- `state` (required) - CSRF protection

**Response:**
- Redirects to app dashboard: `/?shop=<sanitized_shop>&host=<host>`

### POST /api/auth/session-status
Verify a session token from the client.

**Request Body:**
```json
{
  "shop": "my-store.myshopify.com",
  "token": "<session_token>"
}
```

**Response:**
```json
{
  "installed": true,
  "shop": "my-store.myshopify.com",
  "scope": "write_products,read_products,..."
}
```

## Session Storage

Sessions are stored in the `shopify_sessions` table with:
- `id` - Session ID
- `shop` - Shop domain
- `state` - OAuth state for CSRF protection
- `isOnline` - Online vs offline token
- `scope` - Granted scopes
- `expires` - Token expiration date
- `accessToken` - API access token
- `onlineAccessInfo` - Online token metadata

## Testing the Auth Flow

### Local Testing

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Visit app:**
   - Open http://localhost:5000 in browser

3. **Install app:**
   - Enter test shop: `filesweep-dev.myshopify.com`
   - Click "Install App"
   - You'll be redirected to Shopify
   - Grant permissions
   - You'll be redirected back to the app

4. **Verify session:**
   - Session should be stored in database
   - Check `shopify_sessions` table for new row

### With ngrok (for HTTPS tunneling)

```bash
# In separate terminal
ngrok http 5000

# Use the ngrok URL for APP_URL
export APP_URL=https://xxxxx-xx-xxx-xxx.ngrok.io

# Start server
npm run dev
```

### Testing Session Endpoint

```bash
curl -X POST http://localhost:5000/api/auth/session-status \
  -H "Content-Type: application/json" \
  -d '{
    "shop": "filesweep-dev.myshopify.com",
    "token": "<actual_session_token>"
  }'
```

## Key Files

- `server/auth-utils.ts` - Auth helper functions
- `server/routes.ts` - Auth endpoints
- `server/middleware.ts` - Session verification middleware
- `server/shopify-session-storage.ts` - Database session storage
- `client/src/App.tsx` - Frontend auth UI
