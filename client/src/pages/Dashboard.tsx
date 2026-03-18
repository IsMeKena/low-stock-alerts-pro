import { useEffect, useState } from "react";
import {
  Card,
  Layout,
  Button,
  Text,
  Box,
  BlockStack,
  InlineStack,
  Badge,
  ProgressBar,
  Divider,
} from "@shopify/polaris";
import { UpsellBanner } from "../components/UpsellBanner";

interface DashboardProps {
  shop: string | null;
}

interface BillingInfo {
  plan: string;
  emailUsed: number;
  emailLimit: string | number;
  whatsappUsed: number;
  whatsappLimit: string | number;
  month: string;
  usageRemaining: number;
}

interface ShopSettings {
  notificationMethod: string;
  dismissedUpsellBanner?: boolean;
}

export default function Dashboard({ shop }: DashboardProps) {
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (shop) {
      fetchBillingInfo();
      fetchShopSettings();
    }
  }, [shop]);

  const fetchBillingInfo = async () => {
    try {
      const response = await fetch(`/api/billing/plan?shop=${shop}`);
      if (!response.ok) throw new Error("Failed to fetch billing info");

      const data = await response.json();
      setBilling(data.usage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchShopSettings = async () => {
    try {
      const response = await fetch(`/api/onboarding/status?shop=${shop}`);
      if (!response.ok) throw new Error("Failed to fetch shop settings");

      const data = await response.json();
      if (data.plan) {
        setShopSettings(data.plan);
      }
    } catch (err) {
      console.error("Error fetching shop settings:", err);
      // Don't fail the whole dashboard if this fails
    }
  };

  const handleUpgrade = () => {
    // Redirect to billing/upgrade page
    window.location.href = `/billing?shop=${shop}`;
  };

  const handleDismissBanner = async () => {
    try {
      // Optionally persist dismissal in backend
      await fetch(`/api/onboarding/dismiss-banner?shop=${shop}`, {
        method: "POST",
      });
    } catch (err) {
      console.error("Error dismissing banner:", err);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "var(--p-space-400) var(--p-space-200)",
          width: "100%",
        }}
      >
        <Box paddingBlockStart="400" paddingBlockEnd="400">
          <Layout>
            <Layout.Section>
              <Card>
                <Text as="h2" variant="headingLg">
                  Loading...
                </Text>
              </Card>
            </Layout.Section>
          </Layout>
        </Box>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "var(--p-space-400) var(--p-space-200)",
          width: "100%",
        }}
      >
        <Box paddingBlockStart="400" paddingBlockEnd="400">
          <Layout>
            <Layout.Section>
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingLg" tone="critical">
                    Error
                  </Text>
                  <Text as="p" variant="bodyMd">
                    {error}
                  </Text>
                  <Button onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        </Box>
      </div>
    );
  }

  const getPlanColor = (plan: string): "success" | "warning" | "attention" | "info" => {
    const planLower = plan.toLowerCase();
    if (planLower === "free") return "info";
    if (planLower === "pro") return "warning";
    if (planLower === "premium") return "success";
    return "info";
  };

  const getEmailProgress = (): number => {
    if (typeof billing?.emailLimit === "string" || !billing?.emailLimit) return 0;
    return Math.min((billing.emailUsed / (billing.emailLimit as number)) * 100, 100);
  };

  const getWhatsappProgress = (): number => {
    if (typeof billing?.whatsappLimit === "string" || billing?.whatsappLimit === 0 || !billing?.whatsappLimit) return 0;
    return Math.min((billing.whatsappUsed / (billing.whatsappLimit as number)) * 100, 100);
  };

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "var(--p-space-400) var(--p-space-200)",
        width: "100%",
      }}
    >
      <Box paddingBlockStart="400" paddingBlockEnd="400">
        <Layout>
        {/* Upsell Banner - Phase 2 */}
        {shopSettings && (
          <Layout.Section>
            <UpsellBanner
              userPlan={billing?.plan || "free"}
              selectedWhatsApp={
                shopSettings.notificationMethod?.includes("whatsapp") || false
              }
              onUpgrade={handleUpgrade}
              onDismiss={handleDismissBanner}
            />
          </Layout.Section>
        )}

        {/* Header Section */}
        <Layout.Section>
          <Card>
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <Text as="h1" variant="headingLg">
                    📊 Low Stock Alerts Dashboard
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    {shop}
                  </Text>
                </BlockStack>
                <Badge tone={getPlanColor(billing?.plan || "free")}>
                  {billing?.plan?.toUpperCase()}
                </Badge>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Billing & Usage Section - Grid layout */}
        <Layout.Section>
          <BlockStack gap="300">
            {/* Email and WhatsApp Usage in a row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "20px",
              }}
            >
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    📧 Email Usage
                  </Text>
                  <BlockStack gap="200">
                    <ProgressBar
                      progress={getEmailProgress()}
                    />
                    <InlineStack align="space-between">
                      <Text as="p" variant="bodySm">
                        {billing?.emailUsed} / {billing?.emailLimit}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {Math.round(getEmailProgress())}%
                      </Text>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    💬 WhatsApp Usage
                  </Text>
                  <BlockStack gap="200">
                    <ProgressBar
                      progress={getWhatsappProgress()}
                    />
                    <InlineStack align="space-between">
                      <Text as="p" variant="bodySm">
                        {billing?.whatsappUsed} / {billing?.whatsappLimit}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {Math.round(getWhatsappProgress())}%
                      </Text>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Card>
            </div>
          </BlockStack>
        </Layout.Section>

        {/* Quick Actions */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingMd">
                ⚙️ Quick Actions
              </Text>
              <Divider />
              <InlineStack gap="200" wrap>
                <Button>Edit Thresholds</Button>
                <Button>Manage Notifications</Button>
                <Button>View Products</Button>
                <Button variant="primary">Upgrade Plan</Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Status Info */}
        <Layout.Section>
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingMd">
                ℹ️ Status
              </Text>
              <Divider />
              <Text as="p" variant="bodyMd" tone="success">
                ✓ All systems operational. Alerts are being monitored for your products.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
        </Box>
      </div>
    );
  }
