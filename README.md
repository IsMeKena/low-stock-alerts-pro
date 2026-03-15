# Low Stock Alerts

A Shopify app to monitor product inventory and alert when stock falls below thresholds.

## Stack

- **Server**: Express.js + TypeScript
- **Frontend**: React + Vite
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Shopify OAuth

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Update the following:
- `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` (from Shopify Partner Dashboard)
- `DATABASE_URL` (PostgreSQL connection string)
- `APP_URL` (your app's public URL, e.g., from Railway)

### 3. Initialize database

```bash
npm run db:push
```

### 4. Run development server

```bash
npm run dev
```

The app will start on http://localhost:5000

## Build for production

```bash
npm run build
npm start
```

## Routes

- `GET /health` - Health check
- `GET /api/auth` - Begin OAuth flow
- `GET /api/auth/callback` - OAuth callback
- `POST /api/auth/session-status` - Check auth status
- `GET /api/shopify/shop` - Get shop info (requires session token)

## Database Schema

- `shopify_sessions` - OAuth sessions
- `products` - Shopify products
- `inventory` - Product inventory levels
- `alerts` - Low stock alerts
