import { shopify } from "./shopify";
import { sessionStorage } from "./shopify-session-storage";
import { db } from "./db";
import { shopSettings } from "@shared/schema.ts";
import { eq } from "drizzle-orm";

/**
 * Handle a new OAuth session after callback
 */
export async function handleOAuthSession(session: any) {
  if (!session) {
    throw new Error('Session is null or undefined');
  }

  if (!session.shop) {
    throw new Error('Session missing shop domain');
  }

  if (!session.accessToken) {
    throw new Error('Session missing access token - OAuth may have failed');
  }

  try {
    console.log('[auth] Saving session for shop:', session.shop);
    
    const stored = await sessionStorage.storeSession(session);
    if (!stored) {
      throw new Error("Failed to store session");
    }

    console.log(
      `[auth] ✅ Session successfully stored for ${session.shop}`
    );

    await saveAccessTokenToSettings(session.shop, session.accessToken);

    return {
      success: true,
      shop: session.shop,
      accessToken: session.accessToken,
      scope: session.scope,
    };
  } catch (error) {
    console.error("[auth] ❌ Failed to save session:", {
      shop: session?.shop,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Save the access token to shop_settings for redundancy.
 * The shopify_sessions table can lose data, but shop_settings persists.
 */
async function saveAccessTokenToSettings(shop: string, accessToken: string) {
  try {
    const existing = await db
      .select()
      .from(shopSettings)
      .where(eq(shopSettings.shopDomain, shop))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(shopSettings)
        .set({ accessToken, updatedAt: new Date() })
        .where(eq(shopSettings.shopDomain, shop));
    } else {
      await db.insert(shopSettings).values({
        shopDomain: shop,
        accessToken,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    console.log(`[auth] ✅ Access token saved to shop_settings for ${shop}`);
  } catch (error) {
    console.error(`[auth] ⚠️ Failed to save access token to shop_settings:`, error);
  }
}

/**
 * Get the access token for a shop from either sessions or shop_settings.
 * Falls back to shop_settings if sessions table is empty.
 */
export async function getAccessToken(shop: string): Promise<string | null> {
  const session = await getShopSession(shop);
  if (session?.accessToken) {
    return session.accessToken;
  }

  try {
    const settings = await db
      .select({ accessToken: shopSettings.accessToken })
      .from(shopSettings)
      .where(eq(shopSettings.shopDomain, shop))
      .limit(1);

    if (settings.length > 0 && settings[0].accessToken) {
      console.log(`[auth] Using access token from shop_settings for ${shop}`);
      return settings[0].accessToken;
    }
  } catch (error) {
    console.error(`[auth] Error fetching access token from shop_settings:`, error);
  }

  return null;
}

/**
 * Get or create a session for a shop
 */
export async function getShopSession(shop: string) {
  try {
    const sessions = await sessionStorage.findSessionsByShop(shop);
    if (sessions.length === 0) {
      return null;
    }

    // Return the most recent session
    return sessions[0];
  } catch (error) {
    console.error("[auth] Error getting shop session:", error);
    return null;
  }
}

/**
 * Verify a session token from the client
 */
export async function verifySessionToken(token: string) {
  try {
    const decoded = await shopify.session.decodeSessionToken(token);
    if (!decoded) {
      return null;
    }

    const shop = decoded.dest.replace(/https?:\/\//, "").replace("http://", "");
    const session = await getShopSession(shop);

    if (!session) {
      console.log(`[auth] No stored session found for ${shop}`);
      return null;
    }

    return {
      valid: true,
      shop,
      scope: session.scope,
      accessToken: session.accessToken,
    };
  } catch (error) {
    console.error("[auth] Error verifying session token:", error);
    return null;
  }
}

/**
 * Check if a shop is installed
 */
export async function isShopInstalled(shop: string) {
  const session = await getShopSession(shop);
  return session !== null && session.accessToken !== null;
}
