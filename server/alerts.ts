import { db } from "./db";
import { alerts, products } from "@shared/schema.ts";
import { eq, and } from "drizzle-orm";

/**
 * Create a low stock alert
 */
export async function createLowStockAlert(
  shop: string,
  productId: string,
  locationId: string | null,
  quantity: number,
  threshold: number
): Promise<string> {
  try {
    const alertId = `${shop}__${productId}__${locationId}__${Date.now()}`;

    // Check if alert already exists and is active
    const existing = await db
      .select()
      .from(alerts)
      .where(
        and(
          eq(alerts.shopDomain, shop),
          eq(alerts.productId, productId),
          eq(alerts.status, "active")
        )
      )
      .limit(1);

    if (existing.length > 0) {
      console.log(
        `[alerts] Active alert already exists for product ${productId} in ${shop}`
      );
      return existing[0].id;
    }

    await db.insert(alerts).values({
      id: alertId,
      shopDomain: shop,
      productId,
      locationId: locationId || null,
      quantity,
      threshold,
      status: "active",
    });

    console.log(
      `[alerts] Created low stock alert for ${productId}: ${quantity}/${threshold}`
    );

    return alertId;
  } catch (error) {
    console.error("[alerts] Error creating alert:", error);
    throw error;
  }
}

/**
 * Resolve an alert (mark as resolved)
 */
export async function resolveAlert(alertId: string): Promise<void> {
  try {
    await db
      .update(alerts)
      .set({
        status: "resolved",
        resolvedAt: new Date(),
      })
      .where(eq(alerts.id, alertId));

    console.log(`[alerts] Resolved alert ${alertId}`);
  } catch (error) {
    console.error("[alerts] Error resolving alert:", error);
    throw error;
  }
}

/**
 * Get active alerts for a shop
 */
export async function getActiveAlerts(shop: string): Promise<any[]> {
  try {
    const shopAlerts = await db
      .select()
      .from(alerts)
      .where(
        and(eq(alerts.shopDomain, shop), eq(alerts.status, "active"))
      );

    // Enrich with product info
    const enriched = await Promise.all(
      shopAlerts.map(async (alert) => {
        const product = await db
          .select()
          .from(products)
          .where(eq(products.shopifyProductId, alert.productId))
          .limit(1);

        return {
          ...alert,
          product: product[0] || null,
        };
      })
    );

    return enriched;
  } catch (error) {
    console.error("[alerts] Error getting active alerts:", error);
    return [];
  }
}

/**
 * Check if inventory level should trigger an alert
 */
export async function checkInventoryAlert(
  shop: string,
  productId: string,
  locationId: string,
  quantity: number,
  threshold: number
): Promise<void> {
  try {
    if (quantity <= threshold) {
      // Create alert
      const alertId = await createLowStockAlert(
        shop,
        productId,
        locationId,
        quantity,
        threshold
      );

      // TODO: Send email notification
      console.log(
        `[alerts] Alert created for low inventory: ${alertId}`
      );
    } else {
      // Check if we need to resolve existing alerts
      const existing = await db
        .select()
        .from(alerts)
        .where(
          and(
            eq(alerts.shopDomain, shop),
            eq(alerts.productId, productId),
            eq(alerts.status, "active")
          )
        );

      for (const alert of existing) {
        if (quantity > threshold) {
          await resolveAlert(alert.id);
          console.log(
            `[alerts] Resolved alert ${alert.id} (inventory back to normal)`
          );
        }
      }
    }
  } catch (error) {
    console.error("[alerts] Error checking inventory alert:", error);
  }
}
