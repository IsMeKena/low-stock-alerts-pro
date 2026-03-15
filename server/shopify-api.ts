import { shopify } from "./shopify";
import { db } from "./db";
import { products, inventory } from "@shared/schema.ts";
import { eq } from "drizzle-orm";

/**
 * Fetch all products from Shopify for a shop
 */
export async function fetchShopifyProducts(
  shop: string,
  accessToken: string
): Promise<any[]> {
  try {
    const client = new shopify.clients.Rest({
      session: {
        shop,
        accessToken,
        scope: "",
        state: "",
        isOnline: false,
        id: `offline_${shop}`,
      } as any,
    });

    const allProducts: any[] = [];
    let sinceId: string | null = null;
    const pageSize = 250; // Max for REST API

    console.log(`[shopify-api] Fetching products for ${shop}`);

    while (true) {
      let path = `/products.json?limit=${pageSize}&fields=id,title,handle,image,variants`;
      if (sinceId) {
        path += `&since_id=${sinceId}`;
      }

      const response = (await client.get({
        path,
      })) as any;

      if (!response?.body?.products) {
        console.error("[shopify-api] Invalid response:", response);
        break;
      }

      const products = response.body.products;

      for (const product of products) {
        allProducts.push(product);
      }

      console.log(
        `[shopify-api] Fetched ${products.length} products (total: ${allProducts.length})`
      );

      if (products.length < pageSize) {
        break;
      }

      sinceId = products[products.length - 1].id;
    }

    console.log(
      `[shopify-api] Completed fetching ${allProducts.length} products for ${shop}`
    );
    return allProducts;
  } catch (error) {
    console.error("[shopify-api] Error fetching products:", error);
    throw error;
  }
}

/**
 * Sync products from Shopify to database
 */
export async function syncProducts(
  shop: string,
  accessToken: string
): Promise<{ created: number; updated: number }> {
  try {
    const shopifyProducts = await fetchShopifyProducts(shop, accessToken);

    let created = 0;
    let updated = 0;

    for (const product of shopifyProducts) {
      const productId = `${shop}__${product.id}`;
      const title = product.title;
      const handle = product.handle;
      const imageUrl = product.image?.src || null;

      const existing = await db
        .select()
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(products)
          .set({
            title,
            handle,
            imageUrl,
            updatedAt: new Date(),
          })
          .where(eq(products.id, productId));

        updated++;
      } else {
        await db.insert(products).values({
          id: productId,
          shopDomain: shop,
          shopifyProductId: product.id.replace("gid://shopify/Product/", ""),
          title,
          handle,
          imageUrl,
        });

        created++;
      }

      // Sync inventory for variants
      if (product.variants && Array.isArray(product.variants)) {
        for (const variant of product.variants) {
          if (variant.inventory_item_id) {
            const inventoryItemId = variant.inventory_item_id;

            // Fetch inventory levels for this item
            try {
              await syncInventoryForItem(shop, accessToken, inventoryItemId, productId);
            } catch (error) {
              console.log(
                `[shopify-api] Could not sync inventory for item ${inventoryItemId}:`,
                error
              );
            }
          }
        }
      }
    }

    console.log(
      `[shopify-api] Sync complete: ${created} created, ${updated} updated for ${shop}`
    );
    return { created, updated };
  } catch (error) {
    console.error("[shopify-api] Error syncing products:", error);
    throw error;
  }
}

/**
 * Sync inventory levels for a specific inventory item
 */
export async function syncInventoryForItem(
  shop: string,
  accessToken: string,
  inventoryItemId: string,
  productId: string
): Promise<void> {
  try {
    const client = new shopify.clients.Rest({
      session: {
        shop,
        accessToken,
        scope: "",
        state: "",
        isOnline: false,
        id: `offline_${shop}`,
      } as any,
    });

    const response = await client.get({
      path: `/inventory_items/${inventoryItemId}`,
    }) as any;

    if (!response?.body?.inventory_item) {
      return;
    }

    const item = response.body.inventory_item;
    const sku = item.sku;

    // Get locations for this inventory item
    const locationsResponse = await client.get({
      path: `/inventory_levels?inventory_item_ids=${inventoryItemId}`,
    }) as any;

    if (locationsResponse?.body?.inventory_levels) {
      for (const level of locationsResponse.body.inventory_levels) {
        const locationId = level.location_id;
        const quantity = level.available || 0;

        const inventoryId = `${shop}__${inventoryItemId}__${locationId}`;
        const existing = await db
          .select()
          .from(inventory)
          .where(eq(inventory.id, inventoryId))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(inventory)
            .set({
              quantity,
              lastUpdated: new Date(),
            })
            .where(eq(inventory.id, inventoryId));
        } else {
          await db.insert(inventory).values({
            id: inventoryId,
            shopDomain: shop,
            productId: productId,
            locationId: String(locationId),
            sku,
            quantity,
          });
        }
      }
    }
  } catch (error) {
    console.error("[shopify-api] Error syncing inventory for item:", error);
  }
}
