import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, integer } from "drizzle-orm/pg-core";
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
