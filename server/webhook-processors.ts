import { db } from "./db";
import {
  products,
  inventory,
  alerts,
  shopSettings,
  billingPlans,
  usageTracker,
  batchingQueue,
  shopifySessions,
} from "@shared/schema.ts";
import { eq, and } from "drizzle-orm";
import { checkInventoryAlert } from "./alerts";

/**
 * Process products/create webhook
 */
export async function processProductCreate(
  shop: string,
  payload: any
): Promise<void> {
  try {
    const { id, title, handle, image } = payload;

    const productId = `${shop}__${id}`;

    await db.insert(products).values({
      id: productId,
      shopDomain: shop,
      shopifyProductId: String(id),
      title,
      handle,
      imageUrl: image?.src || null,
    });

    console.log(
      `[webhook] Created product "${title}" (${id}) for ${shop}`
    );
  } catch (error) {
    console.error("[webhook] Error processing product create:", error);
  }
}

/**
 * Process products/update webhook
 */
export async function processProductUpdate(
  shop: string,
  payload: any
): Promise<void> {
  try {
    const { id, title, handle, image } = payload;
    const productId = `${shop}__${id}`;

    await db
      .update(products)
      .set({
        title,
        handle,
        imageUrl: image?.src || null,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));

    console.log(
      `[webhook] Updated product "${title}" (${id}) for ${shop}`
    );
  } catch (error) {
    console.error("[webhook] Error processing product update:", error);
  }
}

/**
 * Process inventory_levels/update webhook
 */
export async function processInventoryUpdate(
  shop: string,
  payload: any
): Promise<void> {
  try {
    const {
      inventory_item_id: inventoryItemId,
      location_id: locationId,
      available: quantity,
      updated_at: updatedAt,
    } = payload;

    if (!inventoryItemId || !locationId) {
      console.log("[webhook] Missing inventory_item_id or location_id");
      return;
    }

    const inventoryId = `${shop}__${inventoryItemId}__${locationId}`;

    // Get or create inventory record
    const existing = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.shopDomain, shop),
          eq(inventory.locationId, String(locationId))
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      await db
        .update(inventory)
        .set({
          quantity: quantity || 0,
          lastUpdated: new Date(updatedAt),
        })
        .where(eq(inventory.id, existing[0].id));

      console.log(
        `[webhook] Updated inventory: ${inventoryItemId} at location ${locationId} = ${quantity}`
      );

      // Check if we need to create an alert
      const threshold = existing[0].threshold || 5;
      if (quantity !== existing[0].quantity) {
        // Inventory changed, check alert status
        await checkInventoryAlert(
          shop,
          existing[0].productId,
          String(locationId),
          quantity || 0,
          threshold
        );
      }
    } else {
      // Create new
      const invRecord = {
        id: inventoryId,
        shopDomain: shop,
        productId: String(inventoryItemId),
        locationId: String(locationId),
        quantity: quantity || 0,
        lastUpdated: new Date(updatedAt),
      };

      await db.insert(inventory).values(invRecord);

      console.log(
        `[webhook] Created inventory: ${inventoryItemId} at location ${locationId} = ${quantity}`
      );

      // Check if initial quantity is low
      const threshold = 5;
      await checkInventoryAlert(shop, invRecord.productId, String(locationId), quantity || 0, threshold);
    }
  } catch (error) {
    console.error("[webhook] Error processing inventory update:", error);
  }
}

export async function processAppUninstalled(
  shop: string,
  _payload: any
): Promise<void> {
  try {
    console.log(`[webhook] Processing app/uninstalled for ${shop} — deleting all shop data`);

    await db.delete(batchingQueue).where(eq(batchingQueue.shopDomain, shop));
    console.log(`[webhook] Deleted batching queue entries for ${shop}`);

    await db.delete(alerts).where(eq(alerts.shopDomain, shop));
    console.log(`[webhook] Deleted alerts for ${shop}`);

    await db.delete(inventory).where(eq(inventory.shopDomain, shop));
    console.log(`[webhook] Deleted inventory for ${shop}`);

    await db.delete(products).where(eq(products.shopDomain, shop));
    console.log(`[webhook] Deleted products for ${shop}`);

    await db.delete(usageTracker).where(eq(usageTracker.shopDomain, shop));
    console.log(`[webhook] Deleted usage tracking for ${shop}`);

    await db.delete(billingPlans).where(eq(billingPlans.shopDomain, shop));
    console.log(`[webhook] Deleted billing plan for ${shop}`);

    await db.delete(shopSettings).where(eq(shopSettings.shopDomain, shop));
    console.log(`[webhook] Deleted shop settings for ${shop}`);

    await db.delete(shopifySessions).where(eq(shopifySessions.shop, shop));
    console.log(`[webhook] Deleted sessions for ${shop}`);

    console.log(`[webhook] All data deleted for uninstalled shop ${shop}`);
  } catch (error) {
    console.error("[webhook] Error processing app/uninstalled:", error);
  }
}

export async function processCustomersDataRequest(
  shop: string,
  payload: any
): Promise<void> {
  try {
    const { customer, orders_requested } = payload;
    console.log(
      `[webhook] customers/data_request from ${shop} for customer ${customer?.id}`
    );
    console.log(
      `[webhook] This app does not store customer-specific data. No data to export.`
    );
  } catch (error) {
    console.error("[webhook] Error processing customers/data_request:", error);
  }
}

export async function processCustomersRedact(
  shop: string,
  payload: any
): Promise<void> {
  try {
    const { customer } = payload;
    console.log(
      `[webhook] customers/redact from ${shop} for customer ${customer?.id}`
    );
    console.log(
      `[webhook] This app does not store customer-specific data. No data to redact.`
    );
  } catch (error) {
    console.error("[webhook] Error processing customers/redact:", error);
  }
}

export async function processShopRedact(
  shop: string,
  _payload: any
): Promise<void> {
  try {
    console.log(
      `[webhook] shop/redact from ${shop} — deleting all remaining shop data`
    );
    await processAppUninstalled(shop, _payload);
    console.log(`[webhook] Shop redact complete for ${shop}`);
  } catch (error) {
    console.error("[webhook] Error processing shop/redact:", error);
  }
}
