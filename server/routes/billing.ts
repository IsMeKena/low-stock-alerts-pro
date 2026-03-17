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

export function setupBillingRoutes(router: Router) {
  /**
   * GET /api/billing/plan
   * Get current billing plan and usage stats
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
   */
  router.get("/api/billing/usage", async (req: Request, res: Response) => {
    try {
      const shop = req.query.shop as string;
      if (!shop) {
        return res.status(400).json({ error: "Missing shop parameter" });
      }

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
   */
  router.post("/api/billing/upgrade", async (req: Request, res: Response) => {
    try {
      const { shop, plan } = req.body;

      if (!shop || !plan) {
        return res
          .status(400)
          .json({ error: "Missing shop or plan parameter" });
      }

      if (!["free", "pro", "premium"].includes(plan)) {
        return res.status(400).json({ error: "Invalid plan" });
      }

      // TODO: Integrate with Stripe for actual payment processing
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
   */
  router.post("/api/billing/settings", async (req: Request, res: Response) => {
    try {
      const { shop, whatsappNumber, batchingEnabled, batchingInterval, emailAlertsEnabled } =
        req.body;

      if (!shop) {
        return res.status(400).json({ error: "Missing shop parameter" });
      }

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
   */
  router.get("/api/billing/settings", async (req: Request, res: Response) => {
    try {
      const shop = req.query.shop as string;
      if (!shop) {
        return res.status(400).json({ error: "Missing shop parameter" });
      }

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
}
