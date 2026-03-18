import { shopify } from "./shopify";
import { sessionStorage } from "./shopify-session-storage";

/**
 * Handle a new OAuth session after callback
 */
export async function handleOAuthSession(session: any) {
  // CRITICAL: Validate before attempting to save
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
    
    // Store the session in the database
    const stored = await sessionStorage.storeSession(session);
    if (!stored) {
      throw new Error("Failed to store session");
    }

    console.log(
      `[auth] ✅ Session successfully stored for ${session.shop}`
    );

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
