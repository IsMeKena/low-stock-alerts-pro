import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, integer, smallint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Shopify session management
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

export const insertShopifySessionSchema = createInsertSchema(shopifySessions).omit({});
export type InsertShopifySession = z.infer<typeof insertShopifySessionSchema>;
export type ShopifySession = typeof shopifySessions.$inferSelect;

// Products from Shopify
export const products = pgTable("products", {
  id: varchar("id", { length: 255 }).primaryKey(),
  shopDomain: varchar("shop_domain", { length: 255 }).notNull(),
  shopifyProductId: varchar("shopify_product_id", { length: 255 }).notNull(),
  title: text("title").notNull(),
  handle: text("handle"),
  imageUrl: text("image_url"),
  // Smart thresholds (Phase 4)
  thresholdType: varchar("threshold_type", { length: 20 }).default("quantity"), // quantity or percentage
  thresholdValue: integer("threshold_value").default(5), // units or %
  safetyStock: integer("safety_stock").default(10), // for percentage mode
  locationId: varchar("location_id", { length: 255 }), // for location-aware alerts
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Product = typeof products.$inferSelect;

// Inventory tracking per product/location
export const inventory = pgTable("inventory", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  shopDomain: varchar("shop_domain", { length: 255 }).notNull(),
  productId: varchar("product_id", { length: 255 }).notNull(),
  locationId: varchar("location_id", { length: 255 }).notNull(),
  sku: text("sku"),
  quantity: integer("quantity").notNull().default(0),
  threshold: integer("threshold").default(5), // Alert when below this
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export type Inventory = typeof inventory.$inferSelect;

// Low stock alerts
export const alerts = pgTable("alerts", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  shopDomain: varchar("shop_domain", { length: 255 }).notNull(),
  productId: varchar("product_id", { length: 255 }).notNull(),
  locationId: varchar("location_id", { length: 255 }),
  quantity: integer("quantity").notNull(),
  threshold: integer("threshold").notNull(),
  status: varchar("status", { length: 20 }).default("active"), // active, resolved, archived
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export type Alert = typeof alerts.$inferSelect;

// Billing plans (Phase 1)
export const billingPlans = pgTable("billing_plan", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  shopDomain: varchar("shop_domain", { length: 255 }).notNull().unique(),
  plan: varchar("plan", { length: 20 }).notNull().default("free"), // free, pro, premium
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type BillingPlan = typeof billingPlans.$inferSelect;

// Usage tracking (Phase 1)
export const usageTracker = pgTable("usage_tracker", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  shopDomain: varchar("shop_domain", { length: 255 }).notNull(),
  plan: varchar("plan", { length: 20 }).notNull(),
  emailCount: integer("email_count").notNull().default(0),
  whatsappCount: integer("whatsapp_count").notNull().default(0),
  month: varchar("month", { length: 7 }).notNull(), // YYYY-MM
  usageRemaining: integer("usage_remaining").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type UsageTracker = typeof usageTracker.$inferSelect;

// Shop settings (Phase 1, 3, 5)
export const shopSettings = pgTable("shop_settings", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  shopDomain: varchar("shop_domain", { length: 255 }).notNull().unique(),
  whatsappNumber: varchar("whatsapp_number", { length: 20 }), // +1234567890 format
  batchingEnabled: boolean("batching_enabled").default(false),
  batchingInterval: varchar("batching_interval", { length: 20 }).default("daily"), // hourly, daily, weekly
  emailAlertsEnabled: boolean("email_alerts_enabled").default(true),
  isOnboarded: boolean("is_onboarded").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type ShopSettings = typeof shopSettings.$inferSelect;

// Batching queue (Phase 5)
export const batchingQueue = pgTable("batching_queue", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  shopDomain: varchar("shop_domain", { length: 255 }).notNull(),
  alertId: varchar("alert_id", { length: 255 }).notNull(),
  productId: varchar("product_id", { length: 255 }).notNull(),
  locationId: varchar("location_id", { length: 255 }),
  quantity: integer("quantity").notNull(),
  threshold: integer("threshold").notNull(),
  alertType: varchar("alert_type", { length: 20 }).notNull(), // email, whatsapp
  status: varchar("status", { length: 20 }).default("pending"), // pending, sent, failed
  scheduledFor: timestamp("scheduled_for").notNull(),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type BatchingQueue = typeof batchingQueue.$inferSelect;
