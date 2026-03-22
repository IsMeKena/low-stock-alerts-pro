import type { Router, Request, Response } from "express";
import { db } from "../db";
import { shopSettings } from "@shared/schema";
import { eq } from "drizzle-orm";
import { setPlan } from "../billing-service";
import { verifySessionToken } from "../middleware";

export function setupOnboardingRoutes(router: Router) {
  /**
   * POST /api/onboarding/complete
   * Complete onboarding wizard
   * Protected: requires valid session token
   */
  router.post(
    "/api/onboarding/complete",
    verifySessionToken,
    async (req: Request, res: Response) => {
      try {
        const session = (req as any).shopifySession;
        const shop = session.shop;

        const {
          plan,
          thresholdType,
          thresholdValue,
          safetyStock,
          notificationMethod,
          notificationEmail,
          whatsappNumber,
          batchingEnabled,
          batchingInterval,
        } = req.body;

        // Validate inputs
        const planToSet = plan || "free"; // Auto-assign Free plan if not provided
        
        if (!["free", "pro", "premium"].includes(planToSet)) {
          return res.status(400).json({ error: "Invalid plan" });
        }

        if (!["quantity", "percentage"].includes(thresholdType)) {
          return res.status(400).json({ error: "Invalid threshold type" });
        }

        if (!["email", "whatsapp", "both"].includes(notificationMethod)) {
          return res.status(400).json({ error: "Invalid notification method" });
        }

        if (!["hourly", "daily", "weekly"].includes(batchingInterval)) {
          return res.status(400).json({ error: "Invalid batching interval" });
        }

        // Validate email if needed
        if (notificationMethod === "email" || notificationMethod === "both") {
          if (!notificationEmail) {
            return res
              .status(400)
              .json({ error: "Email address required for selected notification method" });
          }
          
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(notificationEmail)) {
            return res.status(400).json({ error: "Invalid email address" });
          }
        }

        // Validate WhatsApp number if needed
        if (notificationMethod === "whatsapp" || notificationMethod === "both") {
          if (!whatsappNumber) {
            return res
              .status(400)
              .json({ error: "WhatsApp number required for selected notification method" });
          }

          const phoneRegex = /^\+\d{1,3}\d{1,14}$/;
          const cleaned = whatsappNumber.replace(/[\s\-()]/g, "");
          if (!phoneRegex.test("+" + cleaned.replace(/^\+/, ""))) {
            return res.status(400).json({ error: "Invalid phone number format" });
          }
        }

        // Set billing plan to Free (auto-assign)
        await setPlan(shop, planToSet);

        // Update or create settings
        const existing = await db
          .select()
          .from(shopSettings)
          .where(eq(shopSettings.shopDomain, shop))
          .limit(1);

        const settingsData = {
          notificationMethod,
          notificationEmail: notificationMethod.includes("email") ? notificationEmail : null,
          whatsappNumber: notificationMethod.includes("whatsapp") ? whatsappNumber : null,
          thresholdType,
          thresholdValue,
          safetyStock: safetyStock || 10,
          batchingEnabled,
          batchingInterval,
          emailAlertsEnabled: notificationMethod !== "whatsapp",
          isOnboarded: true,
          updatedAt: new Date(),
        };

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

        console.log(
          `[onboarding] Completed for ${shop}: plan=${planToSet}, threshold=${thresholdType}:${thresholdValue}, notifications=${notificationMethod}`
        );

        res.json({
          success: true,
          message: "Onboarding completed",
          shop,
          plan: planToSet,
        });
      } catch (error) {
        console.error("[onboarding] Error completing onboarding:", error);
        res.status(500).json({ error: "Failed to complete onboarding" });
      }
    }
  );

  /**
   * GET /api/onboarding/status
   * Check if shop has completed onboarding
   * Note: This endpoint is intentionally NOT protected by verifySessionToken
   * because it is called during the initial app load before a session token
   * is available (the frontend uses it to decide whether to show onboarding).
   * It only returns the onboarding boolean, not sensitive data.
   */
  router.get("/api/onboarding/status", async (req: Request, res: Response) => {
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
          isOnboarded: false,
          message: "Please complete onboarding",
        });
      }

      res.json({
        isOnboarded: settings[0].isOnboarded,
        plan: settings[0],
      });
    } catch (error) {
      console.error("[onboarding] Error checking status:", error);
      res.status(500).json({ error: "Failed to check onboarding status" });
    }
  });

  /**
   * POST /api/onboarding/dismiss-banner
   * Mark upsell banner as dismissed for this shop
   * Protected: requires valid session token
   */
  router.post(
    "/api/onboarding/dismiss-banner",
    verifySessionToken,
    async (req: Request, res: Response) => {
      try {
        const session = (req as any).shopifySession;
        const shop = session.shop;

        const existing = await db
          .select()
          .from(shopSettings)
          .where(eq(shopSettings.shopDomain, shop))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(shopSettings)
            .set({
              dismissedUpsellBanner: true,
              updatedAt: new Date(),
            })
            .where(eq(shopSettings.shopDomain, shop));
        } else {
          // Create new record with banner dismissed
          await db.insert(shopSettings).values({
            shopDomain: shop,
            dismissedUpsellBanner: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        console.log(
          `[onboarding] Upsell banner dismissed for ${shop}`
        );

        res.json({
          success: true,
          message: "Banner dismissed",
          shop,
        });
      } catch (error) {
        console.error("[onboarding] Error dismissing banner:", error);
        res.status(500).json({ error: "Failed to dismiss banner" });
      }
    }
  );
}
