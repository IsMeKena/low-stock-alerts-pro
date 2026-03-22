import { useEffect, useState, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  ProgressBar,
  EmptyState,
  IndexTable,
  useIndexResourceState,
  SkeletonPage,
  SkeletonBodyText,
  SkeletonDisplayText,
  Banner,
  Box,
  Icon,
  Divider,
} from "@shopify/polaris";
import {
  AlertCircleIcon,
  EmailIcon,
  ChatIcon,
  InventoryIcon,
  ChartVerticalFilledIcon,
} from "@shopify/polaris-icons";
import { useNavigate } from "react-router-dom";
import { UpsellBanner } from "../components/UpsellBanner";
import { authenticatedFetch } from "../utils/fetch";

interface DashboardProps {
  shop: string | null;
  isOnboarded: boolean;
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

interface AlertItem {
  id: string;
  productId: string;
  locationId: string | null;
  quantity: number;
  threshold: number;
  status: string;
  createdAt: string;
  product?: {
    title: string;
    imageUrl?: string;
  } | null;
}

interface ShopSettingsData {
  notificationMethod: string;
  dismissedUpsellBanner?: boolean;
}

export default function Dashboard({ shop, isOnboarded }: DashboardProps) {
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [shopSettings, setShopSettings] = useState<ShopSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    if (!shop) return;

    try {
      const [billingRes, settingsRes, alertsRes] = await Promise.all([
        authenticatedFetch(`/api/billing/plan?shop=${shop}`),
        authenticatedFetch(`/api/onboarding/status?shop=${shop}`),
        authenticatedFetch(`/api/alerts?shop=${shop}`).catch(() => null),
      ]);

      if (billingRes.ok) {
        const billingData = await billingRes.json();
        setBilling(billingData.usage);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.plan) {
          setShopSettings(settingsData.plan);
        }
      }

      if (alertsRes?.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData.alerts || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [shop]);

  useEffect(() => {
    if (shop) {
      fetchData();
    }
  }, [shop, fetchData]);

  const handleDismissBanner = async () => {
    try {
      await authenticatedFetch(`/api/onboarding/dismiss-banner?shop=${shop}`, {
        method: "POST",
      });
    } catch (err) {
      console.error("Error dismissing banner:", err);
    }
  };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(alerts);

  const getPlanBadge = (plan: string) => {
    const toneMap: Record<string, "success" | "attention" | "info"> = {
      free: "info",
      pro: "attention",
      premium: "success",
    };
    return (
      <Badge tone={toneMap[plan.toLowerCase()] || "info"}>
        {plan.toUpperCase()}
      </Badge>
    );
  };

  const getEmailProgress = (): number => {
    if (typeof billing?.emailLimit === "string" || !billing?.emailLimit) return 0;
    return Math.min(
      (billing.emailUsed / (billing.emailLimit as number)) * 100,
      100
    );
  };

  const getWhatsappProgress = (): number => {
    if (
      typeof billing?.whatsappLimit === "string" ||
      billing?.whatsappLimit === 0 ||
      !billing?.whatsappLimit
    )
      return 0;
    return Math.min(
      (billing.whatsappUsed / (billing.whatsappLimit as number)) * 100,
      100
    );
  };

  if (loading) {
    return (
      <SkeletonPage title="Dashboard" primaryAction>
        <Layout>
          <Layout.Section>
            <Card>
              <SkeletonDisplayText size="small" />
              <SkeletonBodyText lines={2} />
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneHalf">
            <Card>
              <SkeletonDisplayText size="small" />
              <SkeletonBodyText lines={3} />
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneHalf">
            <Card>
              <SkeletonDisplayText size="small" />
              <SkeletonBodyText lines={3} />
            </Card>
          </Layout.Section>
          <Layout.Section>
            <Card>
              <SkeletonDisplayText size="small" />
              <SkeletonBodyText lines={5} />
            </Card>
          </Layout.Section>
        </Layout>
      </SkeletonPage>
    );
  }

  if (error) {
    return (
      <Page title="Dashboard">
        <Layout>
          <Layout.Section>
            <Banner
              title="Something went wrong"
              tone="critical"
              action={{ content: "Retry", onAction: fetchData }}
            >
              <p>{error}</p>
            </Banner>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const alertRows = alerts.map((alert, index) => (
    <IndexTable.Row
      id={alert.id}
      key={alert.id}
      position={index}
      selected={selectedResources.includes(alert.id)}
    >
      <IndexTable.Cell>
        <Text as="span" variant="bodyMd" fontWeight="semibold">
          {alert.product?.title || `Product ${alert.productId}`}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" variant="bodyMd" tone="critical">
          {alert.quantity}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{alert.threshold}</IndexTable.Cell>
      <IndexTable.Cell>{alert.locationId || "All locations"}</IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone={alert.status === "active" ? "attention" : "success"}>
          {alert.status}
        </Badge>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page
      title="Dashboard"
      subtitle={shop || undefined}
      primaryAction={{
        content: "Settings",
        onAction: () => navigate("/settings"),
      }}
      titleMetadata={billing ? getPlanBadge(billing.plan) : undefined}
    >
      <Layout>
        {shopSettings && (
          <Layout.Section>
            <UpsellBanner
              userPlan={billing?.plan || "free"}
              selectedWhatsApp={
                shopSettings.notificationMethod?.includes("whatsapp") || false
              }
              onUpgrade={() => navigate("/settings")}
              onDismiss={handleDismissBanner}
            />
          </Layout.Section>
        )}

        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="300">
              <InlineStack gap="200" blockAlign="center">
                <Icon source={EmailIcon} tone="base" />
                <Text as="h3" variant="headingMd">
                  Email usage
                </Text>
              </InlineStack>
              <BlockStack gap="200">
                <ProgressBar
                  progress={getEmailProgress()}
                  tone={getEmailProgress() > 80 ? "critical" : "primary"}
                />
                <InlineStack align="space-between">
                  <Text as="p" variant="bodySm">
                    {billing?.emailUsed ?? 0} / {billing?.emailLimit ?? 0}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {Math.round(getEmailProgress())}% used
                  </Text>
                </InlineStack>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="300">
              <InlineStack gap="200" blockAlign="center">
                <Icon source={ChatIcon} tone="base" />
                <Text as="h3" variant="headingMd">
                  WhatsApp usage
                </Text>
              </InlineStack>
              <BlockStack gap="200">
                <ProgressBar
                  progress={getWhatsappProgress()}
                  tone={getWhatsappProgress() > 80 ? "critical" : "primary"}
                />
                <InlineStack align="space-between">
                  <Text as="p" variant="bodySm">
                    {billing?.whatsappUsed ?? 0} / {billing?.whatsappLimit ?? 0}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {Math.round(getWhatsappProgress())}% used
                  </Text>
                </InlineStack>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          {alerts.length > 0 ? (
            <Card padding="0">
              <BlockStack>
                <Box padding="400">
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={AlertCircleIcon} tone="caution" />
                    <Text as="h2" variant="headingMd">
                      Active alerts ({alerts.length})
                    </Text>
                  </InlineStack>
                </Box>
                <Divider />
                <IndexTable
                  resourceName={{ singular: "alert", plural: "alerts" }}
                  itemCount={alerts.length}
                  selectedItemsCount={
                    allResourcesSelected ? "All" : selectedResources.length
                  }
                  onSelectionChange={handleSelectionChange}
                  headings={[
                    { title: "Product" },
                    { title: "Current stock" },
                    { title: "Threshold" },
                    { title: "Location" },
                    { title: "Status" },
                  ]}
                  selectable={false}
                >
                  {alertRows}
                </IndexTable>
              </BlockStack>
            </Card>
          ) : (
            <Card>
              <EmptyState
                heading="No active alerts"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>
                  When your product inventory drops below the configured
                  thresholds, alerts will appear here. Your inventory is being
                  monitored automatically.
                </p>
              </EmptyState>
            </Card>
          )}
        </Layout.Section>

        <Layout.Section>
          <Card>
            <InlineStack gap="200" blockAlign="center">
              <Icon source={ChartVerticalFilledIcon} tone="success" />
              <Text as="p" variant="bodyMd" tone="success">
                All systems operational. Alerts are being monitored for your
                products.
              </Text>
            </InlineStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
