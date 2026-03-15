import type { Request, Response, NextFunction } from "express";
import { shopify } from "./shopify";
import { sessionStorage } from "./shopify-session-storage";

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
    console.error("Session token verification error:", error);
    res.status(401).json({ error: "Failed to verify session token" });
  }
}
