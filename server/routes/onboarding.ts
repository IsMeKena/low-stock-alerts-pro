import type { Router, Request, Response } from "express";
import { db } from "../db";
import { shopSettings } from "@shared/schema";
import { eq } from "drizzle-orm";
import { setPlan } from "../billing-service";

export function setupOnboardingRoutes(router: Router) {
  /**
   * POST /api/onboarding/complete
   * Complete onboarding wizard
   */
  router.post(
    "/api/onboarding/complete",
    async (req: Request, res: Response) => {
      try {
        const {
          shop,
          plan,
          thresholdType,
          thresholdValue,
          notificationMethod,
          whatsappNumber,
          batchingEnabled,
          batchingInterval,
        } = req.body;

        if (!shop) {
          return res.status(400).json({ error: "Missing shop parameter" });
        }

        // Validate inputs
        if (!["free", "pro", "premium"].includes(plan)) {
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

        // Validate WhatsApp number if needed
        if (
          notificationMethod === "whatsapp" ||
          notificationMethod === "both"
        ) {
          if (!whatsappNumber) {
            return res
              .status(400)
              .json({ error: "WhatsApp number required for selected method" });
          }

          const phoneRegex = /^\+[1-9]\d{1,14}$/;
          const cleaned = whatsappNumber.replace(/[\s\-()]/g, "");
          if (!phoneRegex.test("+" + cleaned.replace(/^\+/, ""))) {
            return res.status(400).json({ error: "Invalid phone number" });
          }
        }

        // Set billing plan
        await setPlan(shop, plan);

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
              whatsappNumber:
                notificationMethod === "email" ? null : whatsappNumber,
              batchingEnabled,
              batchingInterval,
              emailAlertsEnabled: notificationMethod !== "whatsapp",
              isOnboarded: true,
              updatedAt: new Date(),
            })
            .where(eq(shopSettings.shopDomain, shop));
        } else {
          await db.insert(shopSettings).values({
            shopDomain: shop,
            whatsappNumber:
              notificationMethod === "email" ? null : whatsappNumber,
            batchingEnabled,
            batchingInterval,
            emailAlertsEnabled: notificationMethod !== "whatsapp",
            isOnboarded: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        // Note: In a real app, you'd also set product-level thresholds here
        // For now, we store the defaults in settings and apply to products on the client
        console.log(
          `[onboarding] Completed for ${shop}: plan=${plan}, threshold=${thresholdType}:${thresholdValue}`
        );

        res.json({
          success: true,
          message: "Onboarding completed",
          shop,
          plan,
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
}
