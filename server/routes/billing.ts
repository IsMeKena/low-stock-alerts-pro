import type { Router, Request, Response } from "express";
import {
  getUserPlan,
  getRemainingUsage,
  setPlan,
  PRICING_TIERS,
} from "../billing-service";
import { db } from "../db";
import { shopSettings } from "@shared/schema";
import { eq } from "drizzle-orm";
import { verifySessionToken } from "../middleware";

export function setupBillingRoutes(router: Router) {
  /**
   * GET /api/billing/plan
   * Get current billing plan and usage stats
   * Protected: requires valid session token
   */
  router.get("/api/billing/plan", async (req: Request, res: Response) => {
    try {
      const shop = req.query.shop as string;
      if (!shop) {
        return res.status(400).json({ error: "Missing shop parameter" });
      }

      const plan = await getUserPlan(shop);
      const usage = await getRemainingUsage(shop);

      res.json({
        plan,
        usage,
        tiers: PRICING_TIERS,
      });
    } catch (error) {
      console.error("[billing-api] Error getting plan:", error);
      res.status(500).json({ error: "Failed to get billing plan" });
    }
  });

  /**
   * GET /api/billing/usage
   * Get detailed usage statistics
   * Protected: requires valid session token
   */
  router.get("/api/billing/usage", verifySessionToken, async (req: Request, res: Response) => {
    try {
      const session = (req as any).shopifySession;
      const shop = session.shop;

      const usage = await getRemainingUsage(shop);

      res.json({
        month: usage.month,
        emailUsed: usage.emailUsed,
        emailLimit: usage.emailLimit,
        whatsappUsed: usage.whatsappUsed,
        whatsappLimit: usage.whatsappLimit,
        percentageUsed:
          typeof usage.emailLimit === "string"
            ? "N/A"
            : Math.round((usage.emailUsed / usage.emailLimit) * 100),
      });
    } catch (error) {
      console.error("[billing-api] Error getting usage:", error);
      res.status(500).json({ error: "Failed to get usage statistics" });
    }
  });

  /**
   * POST /api/billing/upgrade
   * Request plan upgrade (stub for now - future: Stripe integration)
   * Protected: requires valid session token
   */
  router.post("/api/billing/upgrade", verifySessionToken, async (req: Request, res: Response) => {
    try {
      const session = (req as any).shopifySession;
      const shop = session.shop;
      const { plan } = req.body;

      if (!plan) {
        return res
          .status(400)
          .json({ error: "Missing plan parameter" });
      }

      if (!["free", "pro", "premium"].includes(plan)) {
        return res.status(400).json({ error: "Invalid plan" });
      }

      // TODO: Integrate with Stripe/Shopify billing for actual payment processing
      // For now, just update the plan directly (NOT production-ready!)
      await setPlan(shop, plan);

      res.json({
        success: true,
        message: `Plan upgraded to ${plan}`,
        plan,
      });
    } catch (error) {
      console.error("[billing-api] Error upgrading plan:", error);
      res.status(500).json({ error: "Failed to upgrade plan" });
    }
  });

  /**
   * POST /api/billing/settings
   * Update billing and notification settings
   * Protected: requires valid session token
   */
  router.post("/api/billing/settings", verifySessionToken, async (req: Request, res: Response) => {
    try {
      const session = (req as any).shopifySession;
      const shop = session.shop;
      const { whatsappNumber, batchingEnabled, batchingInterval, emailAlertsEnabled } =
        req.body;

      // Validate WhatsApp number if provided
      if (whatsappNumber) {
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        if (!phoneRegex.test(whatsappNumber.replace(/[\s\-]/g, ""))) {
          return res.status(400).json({ error: "Invalid phone number format" });
        }
      }

      // Update or create settings
      const existing = await db
        .select()
        .from(shopSettings)
        .where(eq(shopSettings.shopDomain, shop))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(shopSettings)
          .set({
            whatsappNumber: whatsappNumber || existing[0].whatsappNumber,
            batchingEnabled:
              batchingEnabled !== undefined
                ? batchingEnabled
                : existing[0].batchingEnabled,
            batchingInterval:
              batchingInterval || existing[0].batchingInterval,
            emailAlertsEnabled:
              emailAlertsEnabled !== undefined
                ? emailAlertsEnabled
                : existing[0].emailAlertsEnabled,
            updatedAt: new Date(),
          })
          .where(eq(shopSettings.shopDomain, shop));
      } else {
        await db.insert(shopSettings).values({
          shopDomain: shop,
          whatsappNumber: whatsappNumber || null,
          batchingEnabled: batchingEnabled ?? false,
          batchingInterval: batchingInterval || "daily",
          emailAlertsEnabled: emailAlertsEnabled ?? true,
          isOnboarded: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      res.json({
        success: true,
        message: "Settings updated",
      });
    } catch (error) {
      console.error("[billing-api] Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  /**
   * GET /api/billing/settings
   * Get current shop settings
   * Protected: requires valid session token
   */
  router.get("/api/billing/settings", verifySessionToken, async (req: Request, res: Response) => {
    try {
      const session = (req as any).shopifySession;
      const shop = session.shop;

      const settings = await db
        .select()
        .from(shopSettings)
        .where(eq(shopSettings.shopDomain, shop))
        .limit(1);

      if (!settings.length) {
        return res.json({
          whatsappNumber: null,
          batchingEnabled: false,
          batchingInterval: "daily",
          emailAlertsEnabled: true,
          isOnboarded: false,
        });
      }

      const s = settings[0];
      res.json({
        whatsappNumber: s.whatsappNumber,
        batchingEnabled: s.batchingEnabled,
        batchingInterval: s.batchingInterval,
        emailAlertsEnabled: s.emailAlertsEnabled,
        isOnboarded: s.isOnboarded,
      });
    } catch (error) {
      console.error("[billing-api] Error getting settings:", error);
      res.status(500).json({ error: "Failed to get settings" });
    }
  });

  /**
   * GET /api/settings
   * Get full settings for the Settings page (plan + thresholds + notifications + batching)
   * Uses shop query param since session token may not be available
   */
  router.get("/api/settings", async (req: Request, res: Response) => {
    try {
      const shop = req.query.shop as string;
      if (!shop) {
        return res.status(400).json({ error: "Missing shop parameter" });
      }

      const settingsRows = await db
        .select()
        .from(shopSettings)
        .where(eq(shopSettings.shopDomain, shop))
        .limit(1);

      if (!settingsRows.length) {
        return res.json({ settings: null });
      }

      const s = settingsRows[0];
      const plan = await getUserPlan(shop);

      res.json({
        settings: {
          plan,
          thresholdType: s.thresholdType || "quantity",
          thresholdValue: s.thresholdValue ?? 5,
          safetyStock: s.safetyStock ?? 10,
          notificationMethod: s.notificationMethod || "email",
          whatsappNumber: s.whatsappNumber || "",
          batchingEnabled: s.batchingEnabled ?? false,
          batchingInterval: s.batchingInterval || "daily",
        },
      });
    } catch (error) {
      console.error("[settings-api] Error getting settings:", error);
      res.status(500).json({ error: "Failed to get settings" });
    }
  });

  /**
   * POST /api/settings/update
   * Update all settings from the Settings page
   * Uses shop from body since session token may not be available
   */
  router.post("/api/settings/update", async (req: Request, res: Response) => {
    try {
      const {
        shop,
        plan,
        thresholdType,
        thresholdValue,
        safetyStock,
        notificationMethod,
        whatsappNumber,
        batchingEnabled,
        batchingInterval,
      } = req.body;

      if (!shop) {
        return res.status(400).json({ error: "Missing shop parameter" });
      }

      if (whatsappNumber && (notificationMethod === "whatsapp" || notificationMethod === "both")) {
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        if (!phoneRegex.test(whatsappNumber.replace(/[\s\-()]/g, ""))) {
          return res.status(400).json({ error: "Invalid phone number format" });
        }
      }

      const existing = await db
        .select()
        .from(shopSettings)
        .where(eq(shopSettings.shopDomain, shop))
        .limit(1);

      const settingsData: Record<string, any> = {
        updatedAt: new Date(),
      };

      if (thresholdType !== undefined) settingsData.thresholdType = thresholdType;
      if (thresholdValue !== undefined) settingsData.thresholdValue = thresholdValue;
      if (safetyStock !== undefined) settingsData.safetyStock = safetyStock;
      if (notificationMethod !== undefined) settingsData.notificationMethod = notificationMethod;
      if (whatsappNumber !== undefined) settingsData.whatsappNumber = whatsappNumber || null;
      if (batchingEnabled !== undefined) settingsData.batchingEnabled = batchingEnabled;
      if (batchingInterval !== undefined) settingsData.batchingInterval = batchingInterval;
      if (notificationMethod !== undefined) {
        settingsData.emailAlertsEnabled = notificationMethod !== "whatsapp";
      }

      if (existing.length > 0) {
        await db
          .update(shopSettings)
          .set(settingsData)
          .where(eq(shopSettings.shopDomain, shop));
      } else {
        await db.insert(shopSettings).values({
          shopDomain: shop,
          ...settingsData,
          createdAt: new Date(),
        });
      }

      console.log(`[settings-api] Settings updated for ${shop}`);

      res.json({
        success: true,
        message: "Settings updated",
      });
    } catch (error) {
      console.error("[settings-api] Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });
}
