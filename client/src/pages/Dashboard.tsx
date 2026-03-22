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
  Button,
  CalloutCard,
  List,
} from "@shopify/polaris";
import {
  AlertCircleIcon,
  EmailIcon,
  ChatIcon,
  InventoryIcon,
  ChartVerticalFilledIcon,
  CheckCircleIcon,
  SettingsIcon,
  NotificationIcon,
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
    } else {
      setLoading(false);
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

  const currentPlan = billing?.plan || "free";
  const isPremium = currentPlan === "premium";

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

  const hasAlerts = alerts.length > 0;

  return (
    <Page
      title="Dashboard"
      subtitle={shop || undefined}
      primaryAction={{
        content: "Settings",
        onAction: () => navigate("/settings"),
      }}
      secondaryActions={[
        {
          content: "Billing",
          onAction: () => navigate("/billing"),
        },
      ]}
      titleMetadata={billing ? getPlanBadge(currentPlan) : undefined}
    >
      <Layout>
        {shopSettings && (
          <Layout.Section>
            <UpsellBanner
              userPlan={currentPlan}
              selectedWhatsApp={
                shopSettings.notificationMethod?.includes("whatsapp") || false
              }
              onUpgrade={() => navigate("/billing")}
              onDismiss={handleDismissBanner}
            />
          </Layout.Section>
        )}

        {!hasAlerts && (
          <Layout.Section>
            <Banner tone="success" icon={CheckCircleIcon}>
              <p>
                Your inventory is being monitored. You'll receive alerts when
                stock drops below your configured thresholds.
              </p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <InlineStack gap="200" blockAlign="center">
                  <Icon source={EmailIcon} tone="base" />
                  <Text as="h3" variant="headingMd">
                    Email alerts
                  </Text>
                </InlineStack>
                <Text as="span" variant="bodySm" tone="subdued">
                  this month
                </Text>
              </InlineStack>
              <BlockStack gap="200">
                <ProgressBar
                  progress={getEmailProgress()}
                  tone={getEmailProgress() > 80 ? "critical" : "primary"}
                />
                <InlineStack align="space-between">
                  <Text as="p" variant="bodySm">
                    {billing?.emailUsed ?? 0} of{" "}
                    {typeof billing?.emailLimit === "number"
                      ? billing.emailLimit
                      : billing?.emailLimit ?? 0}{" "}
                    sent
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
          {isPremium ? (
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={ChatIcon} tone="base" />
                    <Text as="h3" variant="headingMd">
                      WhatsApp alerts
                    </Text>
                  </InlineStack>
                  <Badge tone="success">ACTIVE</Badge>
                </InlineStack>
                <BlockStack gap="200">
                  <ProgressBar
                    progress={
                      billing && typeof billing.whatsappLimit === "number" && billing.whatsappLimit > 0
                        ? Math.min((billing.whatsappUsed / billing.whatsappLimit) * 100, 100)
                        : 0
                    }
                    tone="primary"
                  />
                  <InlineStack align="space-between">
                    <Text as="p" variant="bodySm">
                      {billing?.whatsappUsed ?? 0} of{" "}
                      {typeof billing?.whatsappLimit === "number"
                        ? billing.whatsappLimit
                        : billing?.whatsappLimit ?? 0}{" "}
                      sent
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      this month
                    </Text>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>
          ) : (
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={ChatIcon} tone="subdued" />
                    <Text as="h3" variant="headingMd" tone="subdued">
                      WhatsApp alerts
                    </Text>
                  </InlineStack>
                  <Badge tone="info">PREMIUM</Badge>
                </InlineStack>
                <Text as="p" variant="bodySm" tone="subdued">
                  Get instant low stock alerts delivered straight to your WhatsApp.
                  Never miss a restock window again.
                </Text>
                <Button
                  onClick={() => navigate("/billing")}
                  variant="plain"
                >
                  Upgrade to Premium
                </Button>
              </BlockStack>
            </Card>
          )}
        </Layout.Section>

        <Layout.Section>
          {hasAlerts ? (
            <Card padding="0">
              <BlockStack>
                <Box padding="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="200" blockAlign="center">
                      <Icon source={AlertCircleIcon} tone="caution" />
                      <Text as="h2" variant="headingMd">
                        Active alerts ({alerts.length})
                      </Text>
                    </InlineStack>
                    <Button
                      variant="plain"
                      onClick={() => navigate("/settings")}
                    >
                      Adjust thresholds
                    </Button>
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
                heading="All stocked up!"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                action={{
                  content: "Configure alert thresholds",
                  onAction: () => navigate("/settings"),
                }}
                secondaryAction={{
                  content: "View billing",
                  onAction: () => navigate("/billing"),
                }}
              >
                <p>
                  None of your products are below their alert thresholds right
                  now. When inventory runs low, you'll see alerts here and
                  receive notifications automatically.
                </p>
              </EmptyState>
            </Card>
          )}
        </Layout.Section>

        {!hasAlerts && (
          <Layout.Section>
            <CalloutCard
              title="How Low Stock Alerts works"
              illustration="https://cdn.shopify.com/s/assets/admin/checkout/settings-customizecart-702d57c108542974c38f0b28c1f45f08af0ad1b5446a2b6eae58e9a3d9ab4e26.svg"
              primaryAction={{
                content: "Configure settings",
                onAction: () => navigate("/settings"),
              }}
            >
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">
                  We continuously monitor your Shopify inventory and send you
                  alerts the moment stock drops below your thresholds.
                </Text>
                <List>
                  <List.Item>
                    Set custom thresholds per product or use a global default
                  </List.Item>
                  <List.Item>
                    Receive alerts via email
                    {isPremium ? " or WhatsApp" : " (or WhatsApp on Premium)"}
                  </List.Item>
                  <List.Item>
                    Batch alerts into hourly, daily, or weekly digests
                  </List.Item>
                  <List.Item>
                    Track all alerts and usage from this dashboard
                  </List.Item>
                </List>
              </BlockStack>
            </CalloutCard>
          </Layout.Section>
        )}

        {!hasAlerts && currentPlan === "free" && (
          <Layout.Section>
            <CalloutCard
              title="Unlock more with Premium"
              illustration="https://cdn.shopify.com/s/assets/admin/checkout/settings-customizecart-702d57c108542974c38f0b28c1f45f08af0ad1b5446a2b6eae58e9a3d9ab4e26.svg"
              primaryAction={{
                content: "View plans",
                onAction: () => navigate("/billing"),
              }}
            >
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">
                  You're on the Free plan with 50 email alerts per month. Upgrade
                  to unlock more features:
                </Text>
                <List>
                  <List.Item>
                    <Text as="span" fontWeight="semibold">
                      Pro:
                    </Text>{" "}
                    500 email alerts + alert batching
                  </List.Item>
                  <List.Item>
                    <Text as="span" fontWeight="semibold">
                      Premium:
                    </Text>{" "}
                    Unlimited emails + WhatsApp alerts + priority support
                  </List.Item>
                </List>
              </BlockStack>
            </CalloutCard>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}
