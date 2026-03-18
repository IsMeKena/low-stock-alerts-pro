import { db } from "./db";
import { alerts, products, shopSettings } from "@shared/schema.ts";
import { eq, and } from "drizzle-orm";
import {
  canSendEmail,
  canSendWhatsApp,
  trackEmailUsage,
  trackWhatsAppUsage,
} from "./billing-service";
import {
  sendWhatsAppMessage,
  formatAlertMessage,
} from "./twilio-service";

/**
 * Calculate effective threshold based on threshold type (quantity vs percentage)
 */
async function calculateEffectiveThreshold(
  productId: string,
  currentQuantity: number
): Promise<number> {
  try {
    const product = await db
      .select()
      .from(products)
      .where(eq(products.shopifyProductId, productId))
      .limit(1);

    if (!product.length) {
      return currentQuantity; // Fallback
    }

    const prod = product[0];

    if (prod.thresholdType === "percentage" && prod.safetyStock) {
      // Calculate: alert when < X% of safety stock
      const percentage = (prod.thresholdValue || 20) / 100;
      return Math.floor(prod.safetyStock * percentage);
    }

    // Default: quantity-based threshold
    return prod.thresholdValue || 5;
  } catch (error) {
    console.error("[alerts] Error calculating threshold:", error);
    return 5; // Fallback
  }
}

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
 * Send email alert (stub - actual implementation in email.ts)
 */
export async function sendEmailAlert(
  shop: string,
  productName: string,
  quantity: number,
  threshold: number,
  _locationName?: string
): Promise<boolean> {
  try {
    // Check email limit
    const canSend = await canSendEmail(shop);
    if (!canSend) {
      console.warn(`[alerts] Email limit reached for ${shop}`);
      return false;
    }

    // Track usage
    await trackEmailUsage(shop);

    // Actual email sending would be handled by email.ts
    console.log(
      `[alerts] Email alert queued for ${shop}: ${productName} (${quantity}/${threshold})`
    );

    return true;
  } catch (error) {
    console.error("[alerts] Error sending email alert:", error);
    return false;
  }
}

/**
 * Send WhatsApp alert
 */
export async function sendWhatsAppAlert(
  shop: string,
  productName: string,
  quantity: number,
  threshold: number,
  locationName?: string
): Promise<boolean> {
  try {
    // Check WhatsApp limit
    const canSend = await canSendWhatsApp(shop);
    if (!canSend) {
      console.warn(`[alerts] WhatsApp limit reached for ${shop}`);
      return false;
    }

    // Get shop settings for phone number
    const settings = await db
      .select()
      .from(shopSettings)
      .where(eq(shopSettings.shopDomain, shop))
      .limit(1);

    if (!settings.length || !settings[0].whatsappNumber) {
      console.warn(`[alerts] No WhatsApp number configured for ${shop}`);
      return false;
    }

    const message = formatAlertMessage(productName, quantity, threshold, locationName);
    const result = await sendWhatsAppMessage(settings[0].whatsappNumber, message);

    if (result.success) {
      // Track usage
      await trackWhatsAppUsage(shop);
      console.log(`[alerts] WhatsApp alert sent for ${shop}: ${result.messageId}`);
      return true;
    } else {
      console.error(
        `[alerts] Failed to send WhatsApp: ${result.error}`
      );
      return false;
    }
  } catch (error) {
    console.error("[alerts] Error sending WhatsApp alert:", error);
    return false;
  }
}

/**
 * Check if inventory level should trigger an alert
 * Now supports smart thresholds and multiple notification channels
 */
export async function checkInventoryAlert(
  shop: string,
  productId: string,
  locationId: string,
  quantity: number,
  _legacyThreshold?: number
): Promise<void> {
  try {
    // Calculate effective threshold based on product configuration
    const threshold = await calculateEffectiveThreshold(productId, quantity);

    if (quantity <= threshold) {
      // Create alert
      const alertId = await createLowStockAlert(
        shop,
        productId,
        locationId,
        quantity,
        threshold
      );

      // Get product and settings info
      const product = await db
        .select()
        .from(products)
        .where(eq(products.shopifyProductId, productId))
        .limit(1);

      const settings = await db
        .select()
        .from(shopSettings)
        .where(eq(shopSettings.shopDomain, shop))
        .limit(1);

      const productName = product.length ? product[0].title : "Unknown Product";

      // Send notifications based on settings
      if (settings.length && settings[0].emailAlertsEnabled) {
        await sendEmailAlert(shop, productName, quantity, threshold);
      }

      if (
        settings.length &&
        settings[0].whatsappNumber &&
        !settings[0].batchingEnabled
      ) {
        // Send WhatsApp immediately if batching is disabled
        await sendWhatsAppAlert(shop, productName, quantity, threshold);
      }

      console.log(`[alerts] Alert created for low inventory: ${alertId}`);
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
