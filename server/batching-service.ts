import { db } from "./db";
import { batchingQueue, shopSettings } from "@shared/schema";
import { eq, and, lte } from "drizzle-orm";
import {
  sendWhatsAppMessage,
  formatBatchedAlertsMessage,
} from "./twilio-service";

/**
 * Batch interval durations in milliseconds
 */
const BATCH_INTERVALS = {
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

/**
 * Add alert to batching queue
 */
export async function addToBatch(
  shop: string,
  alertId: string,
  productId: string,
  locationId: string | null,
  quantity: number,
  threshold: number,
  alertType: "email" | "whatsapp"
): Promise<void> {
  try {
    const settings = await db
      .select()
      .from(shopSettings)
      .where(eq(shopSettings.shopDomain, shop))
      .limit(1);

    if (!settings.length || !settings[0].batchingEnabled) {
      console.log(
        `[batching] Batching disabled for ${shop}, skipping queue`
      );
      return;
    }

    // Calculate scheduled time based on interval
    const interval =
      BATCH_INTERVALS[
        settings[0].batchingInterval as keyof typeof BATCH_INTERVALS
      ] || BATCH_INTERVALS.daily;

    const scheduledFor = new Date(Date.now() + interval);

    await db.insert(batchingQueue).values({
      shopDomain: shop,
      alertId,
      productId,
      locationId,
      quantity,
      threshold,
      alertType,
      status: "pending",
      scheduledFor,
      createdAt: new Date(),
    });

    console.log(
      `[batching] Added alert ${alertId} to batch queue for ${shop}`
    );
  } catch (error) {
    console.error("[batching] Error adding to batch:", error);
  }
}

/**
 * Get pending batches ready to send
 */
export async function getPendingBatches(
  shop?: string
): Promise<Map<string, any[]>> {
  try {
    const now = new Date();

    let query = db
      .select()
      .from(batchingQueue)
      .where(
        and(
          eq(batchingQueue.status, "pending"),
          lte(batchingQueue.scheduledFor, now)
        )
      );

    const pending = await query;

    // Filter by shop if provided
    let filtered = pending;
    if (shop) {
      filtered = pending.filter((item) => item.shopDomain === shop);
    }

    // Group by shop and alert type
    const grouped = new Map<string, any[]>();

    for (const item of filtered) {
      const key = `${item.shopDomain}__${item.alertType}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(item);
    }

    return grouped;
  } catch (error) {
    console.error("[batching] Error getting pending batches:", error);
    return new Map();
  }
}

/**
 * Format batch for WhatsApp sending
 */
async function formatWhatsAppBatch(
  alerts: any[]
): Promise<{
  productName: string;
  quantity: number;
  threshold: number;
  location?: string;
}[]> {
  return alerts.map((alert) => ({
    productName: `Product ${alert.productId.substring(0, 8)}...`,
    quantity: alert.quantity,
    threshold: alert.threshold,
    location: alert.locationId || undefined,
  }));
}

/**
 * Send batched alerts for a shop
 */
export async function sendBatch(
  shop: string,
  alertType: "email" | "whatsapp"
): Promise<void> {
  try {
    const pending = await db
      .select()
      .from(batchingQueue)
      .where(
        and(
          eq(batchingQueue.shopDomain, shop),
          eq(batchingQueue.alertType, alertType),
          eq(batchingQueue.status, "pending")
        )
      );

    if (!pending.length) {
      console.log(
        `[batching] No pending ${alertType} alerts for ${shop}`
      );
      return;
    }

    if (alertType === "whatsapp") {
      const settings = await db
        .select()
        .from(shopSettings)
        .where(eq(shopSettings.shopDomain, shop))
        .limit(1);

      if (!settings.length || !settings[0].whatsappNumber) {
        console.warn(
          `[batching] No WhatsApp number configured for ${shop}`
        );
        // Mark as failed
        for (const alert of pending) {
          await db
            .update(batchingQueue)
            .set({ status: "failed" })
            .where(eq(batchingQueue.id, alert.id));
        }
        return;
      }

      // Format batch message
      const formatted = await formatWhatsAppBatch(pending);
      const message = formatBatchedAlertsMessage(formatted);

      // Send
      const result = await sendWhatsAppMessage(
        settings[0].whatsappNumber,
        message
      );

      if (result.success) {
        // Mark all as sent
        const now = new Date();
        for (const alert of pending) {
          await db
            .update(batchingQueue)
            .set({
              status: "sent",
              sentAt: now,
            })
            .where(eq(batchingQueue.id, alert.id));
        }

        console.log(
          `[batching] Sent ${pending.length} WhatsApp alerts for ${shop}`
        );
      } else {
        // Mark as failed
        for (const alert of pending) {
          await db
            .update(batchingQueue)
            .set({ status: "failed" })
            .where(eq(batchingQueue.id, alert.id));
        }

        console.error(`[batching] Failed to send batch for ${shop}`);
      }
    } else if (alertType === "email") {
      // For email batching, send digest email
      console.log(
        `[batching] Email batch sending stub for ${shop}: ${pending.length} alerts`
      );

      // Mark as sent
      const now = new Date();
      for (const alert of pending) {
        await db
          .update(batchingQueue)
          .set({
            status: "sent",
            sentAt: now,
          })
          .where(eq(batchingQueue.id, alert.id));
      }
    }
  } catch (error) {
    console.error(`[batching] Error sending batch for ${shop}:`, error);
  }
}

/**
 * Process all pending batches (called periodically)
 */
export async function processPendingBatches(): Promise<void> {
  try {
    const batches = await getPendingBatches();

    for (const [key, alerts] of batches.entries()) {
      const [shop, alertType] = key.split("__");
      if (!shop || !alertType) continue;

      console.log(
        `[batching] Processing batch for ${shop} (${alertType}): ${alerts.length} alerts`
      );
      await sendBatch(shop, alertType as "email" | "whatsapp");
    }
  } catch (error) {
    console.error("[batching] Error processing pending batches:", error);
  }
}

/**
 * Start batching processor (runs periodically)
 */
export function startBatchingProcessor(
  intervalMs: number = 5 * 60 * 1000
): NodeJS.Timer {
  // Process every 5 minutes by default
  console.log(
    `[batching] Starting batch processor (interval: ${intervalMs}ms)`
  );

  const timer = setInterval(() => {
    processPendingBatches().catch((err) => {
      console.error("[batching] Batch processor error:", err);
    });
  }, intervalMs);

  return timer;
}
