import { db } from "./db";
import { billingPlans, usageTracker } from "@shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * Pricing tiers configuration
 */
export const PRICING_TIERS = {
  free: { plan: "free", emailLimit: 10, whatsappLimit: 0 },
  pro: { plan: "pro", emailLimit: 500, whatsappLimit: 0 },
  premium: { plan: "premium", emailLimit: -1, whatsappLimit: 500 }, // -1 = unlimited
};

/**
 * Get the current billing plan for a shop
 */
export async function getUserPlan(
  shopDomain: string
): Promise<string> {
  try {
    const plan = await db
      .select()
      .from(billingPlans)
      .where(eq(billingPlans.shopDomain, shopDomain))
      .limit(1);

    return plan.length > 0 ? plan[0].plan : "free";
  } catch (error) {
    console.error("[billing] Error getting user plan:", error);
    return "free";
  }
}

/**
 * Set the billing plan for a shop
 */
export async function setPlan(
  shopDomain: string,
  plan: "free" | "pro" | "premium"
): Promise<void> {
  try {
    const existing = await db
      .select()
      .from(billingPlans)
      .where(eq(billingPlans.shopDomain, shopDomain))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(billingPlans)
        .set({
          plan,
          updatedAt: new Date(),
        })
        .where(eq(billingPlans.shopDomain, shopDomain));
    } else {
      await db.insert(billingPlans).values({
        shopDomain,
        plan,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    console.log(`[billing] Set plan for ${shopDomain}: ${plan}`);

    // Reset usage for new plan
    await resetUsageForMonth(shopDomain);
  } catch (error) {
    console.error("[billing] Error setting plan:", error);
    throw error;
  }
}

/**
 * Get current month in YYYY-MM format
 */
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

/**
 * Get or initialize usage tracker for current month
 */
async function getOrInitializeUsageTracker(
  shopDomain: string
): Promise<any> {
  const month = getCurrentMonth();
  const plan = await getUserPlan(shopDomain);

  const existing = await db
    .select()
    .from(usageTracker)
    .where(
      and(
        eq(usageTracker.shopDomain, shopDomain),
        eq(usageTracker.month, month)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Initialize new tracker for this month
  const tierConfig = PRICING_TIERS[plan as keyof typeof PRICING_TIERS];
  const limit = Math.max(tierConfig.emailLimit + tierConfig.whatsappLimit, 10);

  await db.insert(usageTracker).values({
    shopDomain,
    plan,
    emailCount: 0,
    whatsappCount: 0,
    month,
    usageRemaining: limit,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    shopDomain,
    plan,
    emailCount: 0,
    whatsappCount: 0,
    month,
    usageRemaining: limit,
  };
}

/**
 * Track email usage
 */
export async function trackEmailUsage(shopDomain: string): Promise<void> {
  try {
    const tracker = await getOrInitializeUsageTracker(shopDomain);

    await db
      .update(usageTracker)
      .set({
        emailCount: tracker.emailCount + 1,
        usageRemaining: Math.max(tracker.usageRemaining - 1, 0),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(usageTracker.shopDomain, shopDomain),
          eq(usageTracker.month, tracker.month)
        )
      );

    console.log(`[billing] Tracked email usage for ${shopDomain}`);
  } catch (error) {
    console.error("[billing] Error tracking email usage:", error);
  }
}

/**
 * Track WhatsApp usage
 */
export async function trackWhatsAppUsage(shopDomain: string): Promise<void> {
  try {
    const tracker = await getOrInitializeUsageTracker(shopDomain);

    await db
      .update(usageTracker)
      .set({
        whatsappCount: tracker.whatsappCount + 1,
        usageRemaining: Math.max(tracker.usageRemaining - 1, 0),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(usageTracker.shopDomain, shopDomain),
          eq(usageTracker.month, tracker.month)
        )
      );

    console.log(`[billing] Tracked WhatsApp usage for ${shopDomain}`);
  } catch (error) {
    console.error("[billing] Error tracking WhatsApp usage:", error);
  }
}

/**
 * Check if shop can send email
 */
export async function canSendEmail(shopDomain: string): Promise<boolean> {
  try {
    const plan = await getUserPlan(shopDomain);
    const tracker = await getOrInitializeUsageTracker(shopDomain);

    const tierConfig = PRICING_TIERS[plan as keyof typeof PRICING_TIERS];

    if (tierConfig.emailLimit === -1) {
      // Unlimited
      return true;
    }

    return tracker.emailCount < tierConfig.emailLimit;
  } catch (error) {
    console.error("[billing] Error checking email limit:", error);
    return false;
  }
}

/**
 * Check if shop can send WhatsApp
 */
export async function canSendWhatsApp(shopDomain: string): Promise<boolean> {
  try {
    const plan = await getUserPlan(shopDomain);
    const tracker = await getOrInitializeUsageTracker(shopDomain);

    const tierConfig = PRICING_TIERS[plan as keyof typeof PRICING_TIERS];

    if (tierConfig.whatsappLimit === -1) {
      // Unlimited
      return true;
    }

    return tracker.whatsappCount < tierConfig.whatsappLimit;
  } catch (error) {
    console.error("[billing] Error checking WhatsApp limit:", error);
    return false;
  }
}

/**
 * Get remaining usage for dashboard
 */
export async function getRemainingUsage(shopDomain: string): Promise<any> {
  try {
    const plan = await getUserPlan(shopDomain);
    const tracker = await getOrInitializeUsageTracker(shopDomain);
    const tierConfig = PRICING_TIERS[plan as keyof typeof PRICING_TIERS];

    const emailLimit =
      tierConfig.emailLimit === -1 ? "Unlimited" : tierConfig.emailLimit;
    const whatsappLimit =
      tierConfig.whatsappLimit === -1 ? "Unlimited" : tierConfig.whatsappLimit;

    return {
      plan,
      emailUsed: tracker.emailCount,
      emailLimit,
      whatsappUsed: tracker.whatsappCount,
      whatsappLimit,
      month: tracker.month,
      usageRemaining: tracker.usageRemaining,
    };
  } catch (error) {
    console.error("[billing] Error getting remaining usage:", error);
    return {
      plan: "free",
      emailUsed: 0,
      emailLimit: 10,
      whatsappUsed: 0,
      whatsappLimit: 0,
      month: getCurrentMonth(),
      usageRemaining: 10,
    };
  }
}

/**
 * Reset usage for current month (called when plan changes)
 */
export async function resetUsageForMonth(shopDomain: string): Promise<void> {
  try {
    const plan = await getUserPlan(shopDomain);
    const month = getCurrentMonth();
    const tierConfig = PRICING_TIERS[plan as keyof typeof PRICING_TIERS];
    const limit = Math.max(tierConfig.emailLimit + tierConfig.whatsappLimit, 10);

    const existing = await db
      .select()
      .from(usageTracker)
      .where(
        and(
          eq(usageTracker.shopDomain, shopDomain),
          eq(usageTracker.month, month)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(usageTracker)
        .set({
          plan,
          emailCount: 0,
          whatsappCount: 0,
          usageRemaining: limit,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(usageTracker.shopDomain, shopDomain),
            eq(usageTracker.month, month)
          )
        );
    }

    console.log(`[billing] Reset usage for ${shopDomain}: ${month}`);
  } catch (error) {
    console.error("[billing] Error resetting usage:", error);
  }
}

/**
 * Enforce usage limits and return whether to proceed
 */
export async function enforceUsageLimits(
  shopDomain: string,
  alertType: "email" | "whatsapp"
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    if (alertType === "email") {
      const canSend = await canSendEmail(shopDomain);
      if (!canSend) {
        return {
          allowed: false,
          reason: "Email alert limit reached for this month",
        };
      }
    } else if (alertType === "whatsapp") {
      const canSend = await canSendWhatsApp(shopDomain);
      if (!canSend) {
        return {
          allowed: false,
          reason: "WhatsApp alert limit reached for this month",
        };
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error("[billing] Error enforcing usage limits:", error);
    return { allowed: false, reason: "Error checking usage limits" };
  }
}
