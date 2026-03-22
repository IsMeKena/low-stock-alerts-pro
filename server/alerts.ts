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
import { sendLowStockAlert } from "./email";
import { enqueueBatchAlert } from "./batching-service";

/**
 * Calculate effective threshold based on threshold type (quantity vs percentage)
 */
async function calculateEffectiveThreshold(
  productId: string,
  _currentQuantity: number
): Promise<number> {
  try {
    const product = await db
      .select()
      .from(products)
      .where(eq(products.shopifyProductId, productId))
      .limit(1);

    if (!product.length) {
      return 5; // Fallback default threshold
    }

    const prod = product[0];

    if (prod.thresholdType === "percentage" && prod.safetyStock) {
      // Percentage mode: alert when stock falls below X% of the safety stock level
      // Example: safetyStock=100, thresholdValue=20 => alert when stock < 20 units
      const percentage = (prod.thresholdValue || 20) / 100;
      return Math.ceil(prod.safetyStock * percentage);
    }

    // Default: quantity-based threshold (alert when stock <= this number)
    return prod.thresholdValue || 5;
  } catch (error) {
    console.error("[alerts] Error calculating threshold:", error);
    return 5; // Fallback
  }
}

/**
 * Create a low stock alert
 * Uses locationId in deduplication to support multi-location stores
 */
export async function createLowStockAlert(
  shop: string,
  productId: string,
  locationId: string | null,
  quantity: number,
  threshold: number
): Promise<string | null> {
  try {
    const alertId = `${shop}__${productId}__${locationId || "default"}__${Date.now()}`;

    // Check if alert already exists and is active for this product AND location
    const conditions = [
      eq(alerts.shopDomain, shop),
      eq(alerts.productId, productId),
      eq(alerts.status, "active"),
    ];

    // Include locationId in dedup check for multi-location support
    if (locationId) {
      conditions.push(eq(alerts.locationId, locationId));
    }

    const existing = await db
      .select()
      .from(alerts)
      .where(and(...conditions))
      .limit(1);

    if (existing.length > 0) {
      // Update quantity on existing alert instead of creating duplicate
      await db
        .update(alerts)
        .set({ quantity })
        .where(eq(alerts.id, existing[0].id));

      console.log(
        `[alerts] Updated existing alert for product ${productId} at location ${locationId || "all"} in ${shop}`
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
      `[alerts] Created low stock alert for ${productId} at location ${locationId || "all"}: ${quantity}/${threshold}`
    );

    return alertId;
  } catch (error: any) {
    // Handle race condition: if a duplicate insert happens due to concurrent webhooks,
    // catch the unique constraint violation and return null
    if (error.code === "23505") {
      console.log(
        `[alerts] Duplicate alert suppressed for ${productId} at location ${locationId || "all"} (concurrent webhook)`
      );
      return null;
    }
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
 * Send email alert - actually delivers via Mailgun
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
      console.warn(`[alerts] Email limit reached for ${shop}. Alert for "${productName}" will NOT be delivered.`);
      return false;
    }

    // Get the notification email from shop settings
    const settings = await db
      .select()
      .from(shopSettings)
      .where(eq(shopSettings.shopDomain, shop))
      .limit(1);

    const recipientEmail = settings.length ? settings[0].notificationEmail : null;

    if (!recipientEmail) {
      console.warn(`[alerts] No notification email configured for ${shop}. Cannot send alert for "${productName}".`);
      return false;
    }

    // Actually send the email via Mailgun
    const sent = await sendLowStockAlert(shop, productName, quantity, threshold, recipientEmail);

    if (sent) {
      // Track usage only on successful send
      await trackEmailUsage(shop);
      console.log(`[alerts] Email alert sent for ${shop}: ${productName} (${quantity}/${threshold})`);
    } else {
      console.error(`[alerts] Failed to send email alert for ${shop}: ${productName}`);
    }

    return sent;
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
      console.warn(`[alerts] WhatsApp limit reached for ${shop}. Alert for "${productName}" will NOT be delivered.`);
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
 * Supports smart thresholds and multiple notification channels
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
      // Create alert (deduplicates per product+location)
      const alertId = await createLowStockAlert(
        shop,
        productId,
        locationId,
        quantity,
        threshold
      );

      // If alertId is null, it was a duplicate from a concurrent webhook - skip notifications
      if (!alertId) {
        return;
      }

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
      const notificationMethod = settings.length ? settings[0].notificationMethod : "email";
      const batchingEnabled = settings.length ? settings[0].batchingEnabled : false;

      // Send notifications based on settings
      const shouldEmail = notificationMethod === "email" || notificationMethod === "both";
      const shouldWhatsApp = notificationMethod === "whatsapp" || notificationMethod === "both";

      if (shouldEmail && settings.length && settings[0].emailAlertsEnabled) {
        if (batchingEnabled) {
          await enqueueBatchAlert(shop, alertId, productId, locationId, quantity, threshold, "email");
        } else {
          await sendEmailAlert(shop, productName, quantity, threshold);
        }
      }

      if (shouldWhatsApp && settings.length && settings[0].whatsappNumber) {
        if (batchingEnabled) {
          await enqueueBatchAlert(shop, alertId, productId, locationId, quantity, threshold, "whatsapp");
        } else {
          await sendWhatsAppAlert(shop, productName, quantity, threshold);
        }
      }

      console.log(`[alerts] Alert processed for low inventory: ${alertId}`);
    } else {
      // Check if we need to resolve existing alerts (stock is back to normal)
      const existingConditions = [
        eq(alerts.shopDomain, shop),
        eq(alerts.productId, productId),
        eq(alerts.status, "active"),
      ];

      // Also match by location for multi-location resolution
      if (locationId) {
        existingConditions.push(eq(alerts.locationId, locationId));
      }

      const existing = await db
        .select()
        .from(alerts)
        .where(and(...existingConditions));

      for (const alert of existing) {
        await resolveAlert(alert.id);
        console.log(
          `[alerts] Resolved alert ${alert.id} (inventory back to normal: ${quantity}/${threshold})`
        );
      }
    }
  } catch (error) {
    console.error("[alerts] Error checking inventory alert:", error);
  }
}
