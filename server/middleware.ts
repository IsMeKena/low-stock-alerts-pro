import type { Request, Response, NextFunction } from "express";
import { shopify } from "./shopify";
import { sessionStorage } from "./shopify-session-storage";

// Track API rate limits per shop
const rateLimitTracker = new Map<string, { current: number; max: number; lastCheck: number }>();

/**
 * Verify session token from App Bridge
 * Validates JWT signature and attaches session to request
 */
export async function verifySessionToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const sessionToken = req.headers.authorization?.split(" ")[1];
    if (!sessionToken) {
      res.status(401).json({ error: "Missing session token" });
      return;
    }

    const decoded = await shopify.session.decodeSessionToken(sessionToken);
    if (!decoded) {
      res.status(401).json({ error: "Invalid session token" });
      return;
    }

    const shop = decoded.dest.replace("https://", "").replace("http://", "");
    const sessions = await sessionStorage.findSessionsByShop(shop);
    if (!sessions.length) {
      res.status(401).json({ error: "No session found for shop" });
      return;
    }

    (req as any).shopifySession = sessions[0];
    next();
  } catch (error) {
    console.error("[middleware] Session token verification error:", error);
    res.status(401).json({ error: "Failed to verify session token" });
  }
}

/**
 * Monitor and track Shopify API rate limits
 * Extract rate limit header from responses and log if approaching limit
 */
export function monitorRateLimits(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Capture the original send method
  const originalSend = res.send;

  res.send = function (data: any) {
    // Check for Shopify rate limit header
    const rateLimitHeader = res.getHeader("x-shop-api-call-limit");
    if (rateLimitHeader && typeof rateLimitHeader === "string") {
      const [current, max] = rateLimitHeader.split("/").map(Number);
      const shop = (req as any).shopifySession?.shop || "unknown";

      // Track the rate limit
      rateLimitTracker.set(shop, {
        current,
        max,
        lastCheck: Date.now(),
      });

      // Warn if approaching limit (80% threshold)
      if (current > max * 0.8) {
        console.warn(
          `[middleware] Rate limit warning for ${shop}: ${current}/${max} (${Math.round((current / max) * 100)}%)`
        );
      }

      // Log critical if at limit (95% threshold)
      if (current > max * 0.95) {
        console.error(
          `[middleware] Critical rate limit for ${shop}: ${current}/${max} (${Math.round((current / max) * 100)}%)`
        );
      }
    }

    // Call the original send
    return originalSend.call(this, data);
  };

  next();
}

/**
 * Get current rate limit status for a shop
 */
export function getRateLimitStatus(shop: string) {
  const status = rateLimitTracker.get(shop);
  if (!status) {
    return null;
  }

  const percentUsed = (status.current / status.max) * 100;
  return {
    current: status.current,
    max: status.max,
    percentUsed: Math.round(percentUsed),
    isWarning: percentUsed > 80,
    isCritical: percentUsed > 95,
    lastCheck: new Date(status.lastCheck).toISOString(),
  };
}

/**
 * Middleware to prevent API calls when at or near rate limit
 * Returns 429 if rate limit is critical
 */
export async function checkRateLimitThreshold(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const shop = (req as any).shopifySession?.shop;
  if (!shop) {
    return next();
  }

  const status = getRateLimitStatus(shop);
  if (status && status.isCritical) {
    console.warn(`[middleware] Blocking API call for ${shop} due to rate limit`);
    return res.status(429).json({
      error: "Too many requests - Shopify API rate limit exceeded",
      retryAfter: 60,
    });
  }

  next();
}

/**
 * Log API call details with rate limit info
 */
export function logApiCall(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const shop = (req as any).shopifySession?.shop || "unknown";
  const status = getRateLimitStatus(shop);

  if (status) {
    console.log(
      `[api] ${req.method} ${req.path} - Rate limit: ${status.current}/${status.max}`
    );
  }

  next();
}
