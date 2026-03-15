import { db } from "./db";
import { products, inventory } from "@shared/schema.ts";
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
