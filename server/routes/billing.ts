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
import { shopify } from "../shopify";
import { sessionStorage } from "../shopify-session-storage";

const SHOPIFY_PLANS: Record<string, { name: string; price: number; trialDays: number }> = {
  pro: { name: "Pro", price: 5.0, trialDays: 0 },
  premium: { name: "Premium", price: 15.0, trialDays: 0 },
};

async function getOfflineSession(shop: string) {
  const sessionId = `offline_${shop}`;
  const session = await sessionStorage.loadSession(sessionId);
  if (!session || !session.accessToken) {
    const sessions = await sessionStorage.findSessionsByShop(shop);
    const validSession = sessions.find((s) => s.accessToken);
    if (!validSession) {
      throw new Error(`No valid session found for ${shop}`);
    }
    return validSession;
  }
  return session;
}

async function cancelActiveSubscription(shop: string) {
  try {
    const session = await getOfflineSession(shop);
    const client = new shopify.clients.Rest({
      session: session as any,
    });

    const response = await client.get({
      path: "recurring_application_charges",
    }) as any;

    const charges = response.body?.recurring_application_charges || [];
    const activeCharge = charges.find((c: any) => c.status === "active");

    if (activeCharge) {
      await client.delete({
        path: `recurring_application_charges/${activeCharge.id}`,
      });
      console.log(`[billing-api] Cancelled active subscription ${activeCharge.id} for ${shop}`);
    } else {
      console.log(`[billing-api] No active subscription to cancel for ${shop}`);
    }
  } catch (error) {
    console.error(`[billing-api] Error cancelling subscription for ${shop}:`, error);
  }
}

export function setupBillingRoutes(router: Router) {
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

  router.post("/api/billing/upgrade", async (req: Request, res: Response) => {
    try {
      const { shop, plan } = req.body;

      if (!shop) {
        return res.status(400).json({ error: "Missing shop parameter" });
      }

      if (!plan) {
        return res.status(400).json({ error: "Missing plan parameter" });
      }

      if (!["free", "pro", "premium"].includes(plan)) {
        return res.status(400).json({ error: "Invalid plan" });
      }

      const currentPlan = await getUserPlan(shop);
      console.log(`[billing-api] Plan change requested: ${shop} from ${currentPlan} to ${plan}`);

      if (plan !== "free") {
        return res.status(400).json({
          error: "Paid plans must be activated through Shopify billing. Use /api/billing/subscribe instead.",
        });
      }

      await cancelActiveSubscription(shop);
      await setPlan(shop, plan);

      res.json({
        success: true,
        message: `Plan changed to ${plan}`,
        plan,
        previousPlan: currentPlan,
      });
    } catch (error) {
      console.error("[billing-api] Error upgrading plan:", error);
      res.status(500).json({ error: "Failed to upgrade plan" });
    }
  });

  router.get("/api/billing/subscribe", async (req: Request, res: Response) => {
    try {
      const shop = req.query.shop as string;
      const plan = req.query.plan as string;

      if (!shop || !plan) {
        return res.status(400).json({ error: "Missing shop or plan parameter" });
      }

      const planConfig = SHOPIFY_PLANS[plan];
      if (!planConfig) {
        return res.status(400).json({ error: `Invalid plan: ${plan}. Must be 'pro' or 'premium'.` });
      }

      console.log(`[billing-api] Creating Shopify subscription for ${shop}: ${plan} ($${planConfig.price}/mo)`);

      const session = await getOfflineSession(shop);

      const client = new shopify.clients.Rest({
        session: session as any,
      });

      const appUrl = process.env.APP_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;
      const returnUrl = `${appUrl}/api/billing/callback?shop=${encodeURIComponent(shop)}&plan=${encodeURIComponent(plan)}`;

      const response = await client.post({
        path: "recurring_application_charges",
        data: {
          recurring_application_charge: {
            name: `Low Stock Alerts Pro - ${planConfig.name}`,
            price: planConfig.price,
            return_url: returnUrl,
            trial_days: planConfig.trialDays,
            test: process.env.NODE_ENV !== "production",
          },
        },
      }) as any;

      const charge = response.body?.recurring_application_charge;

      if (!charge || !charge.confirmation_url) {
        console.error("[billing-api] No confirmation URL in Shopify response:", response.body);
        return res.status(500).json({ error: "Failed to create subscription" });
      }

      console.log(`[billing-api] Subscription created for ${shop}: charge ID ${charge.id}`);
      console.log(`[billing-api] Confirmation URL: ${charge.confirmation_url}`);

      res.json({
        confirmationUrl: charge.confirmation_url,
        chargeId: charge.id,
      });
    } catch (error: any) {
      console.error("[billing-api] Error creating subscription:", error?.response?.body || error);
      res.status(500).json({ error: "Failed to create Shopify subscription" });
    }
  });

  router.get("/api/billing/callback", async (req: Request, res: Response) => {
    try {
      const shop = req.query.shop as string;
      const plan = req.query.plan as string;
      const chargeId = req.query.charge_id as string;

      if (!shop || !plan || !chargeId) {
        console.error("[billing-api] Missing callback parameters:", { shop, plan, chargeId });
        return res.redirect(`/?shop=${encodeURIComponent(shop || "")}`);
      }

      console.log(`[billing-api] Billing callback for ${shop}: plan=${plan}, charge_id=${chargeId}`);

      const session = await getOfflineSession(shop);

      const client = new shopify.clients.Rest({
        session: session as any,
      });

      const response = await client.get({
        path: `recurring_application_charges/${chargeId}`,
      }) as any;

      const charge = response.body?.recurring_application_charge;

      if (!charge) {
        console.error("[billing-api] Could not find charge:", chargeId);
        return res.redirect(`/?shop=${encodeURIComponent(shop)}`);
      }

      console.log(`[billing-api] Charge status for ${shop}: ${charge.status}`);

      if (charge.status === "accepted") {
        const activateResponse = await client.post({
          path: `recurring_application_charges/${chargeId}/activate`,
          data: {
            recurring_application_charge: {
              id: chargeId,
            },
          },
        }) as any;

        const activatedCharge = activateResponse.body?.recurring_application_charge;
        console.log(`[billing-api] Charge activated for ${shop}: ${activatedCharge?.status}`);

        if (activatedCharge?.status === "active") {
          await setPlan(shop, plan as "free" | "pro" | "premium");
          console.log(`[billing-api] Plan set to ${plan} for ${shop}`);
        } else {
          console.error(`[billing-api] Charge not active after activation: ${activatedCharge?.status}`);
        }
      } else if (charge.status === "active") {
        await setPlan(shop, plan as "free" | "pro" | "premium");
        console.log(`[billing-api] Charge already active, plan set to ${plan} for ${shop}`);
      } else if (charge.status === "declined") {
        console.log(`[billing-api] Charge declined by merchant ${shop}`);
      } else {
        console.log(`[billing-api] Unexpected charge status for ${shop}: ${charge.status}`);
      }

      const appUrl = process.env.APP_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;
      return res.redirect(`${appUrl}/?shop=${encodeURIComponent(shop)}`);
    } catch (error) {
      console.error("[billing-api] Error in billing callback:", error);
      const shop = req.query.shop as string;
      return res.redirect(`/?shop=${encodeURIComponent(shop || "")}`);
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
