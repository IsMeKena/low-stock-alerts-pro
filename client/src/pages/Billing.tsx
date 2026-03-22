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
  SkeletonPage,
  SkeletonBodyText,
  SkeletonDisplayText,
  Banner,
  List,
  Icon,
  Divider,
  Button,
  Box,
  Spinner,
} from "@shopify/polaris";
import {
  ChartVerticalFilledIcon,
  EmailIcon,
  ChatIcon,
  CheckCircleIcon,
  StarFilledIcon,
} from "@shopify/polaris-icons";
import { useNavigate } from "react-router-dom";
import { authenticatedFetch } from "../utils/fetch";

interface BillingProps {
  shop: string | null;
}

interface BillingData {
  plan: string;
  usage: {
    plan: string;
    month: string;
    emailUsed: number;
    emailLimit: number | string;
    whatsappUsed: number;
    whatsappLimit: number | string;
    usageRemaining: number;
  };
  tiers: Record<string, any>;
}

const PLANS = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    priceNote: "forever",
    features: [
      "10 email alerts per month",
      "Basic low stock monitoring",
      "Email notifications",
      "Single threshold setting",
    ],
    missing: [
      "WhatsApp notifications",
      "Alert batching / digests",
      "Priority support",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: "$9.99",
    priceNote: "per month",
    features: [
      "500 email alerts per month",
      "Advanced threshold settings",
      "Alert batching / digest mode",
      "Email notifications",
      "Hourly, daily, or weekly digests",
    ],
    missing: [
      "WhatsApp notifications",
      "Priority support",
    ],
  },
  {
    key: "premium",
    name: "Premium",
    price: "$24.99",
    priceNote: "per month",
    features: [
      "Unlimited email alerts",
      "WhatsApp notifications",
      "Advanced threshold settings",
      "Alert batching / digest mode",
      "Priority support",
      "All future features included",
    ],
    missing: [],
  },
];

export default function Billing({ shop }: BillingProps) {
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchBilling = useCallback(async () => {
    if (!shop) return;
    try {
      const response = await authenticatedFetch(`/api/billing/plan?shop=${shop}`);
      if (!response.ok) throw new Error("Failed to fetch billing info");
      const data = await response.json();
      setBilling(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [shop]);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  const handleUpgrade = async (planKey: string) => {
    if (!shop) return;
    setUpgrading(planKey);
    setError(null);
    setSuccessMsg(null);

    try {
      const response = await authenticatedFetch("/api/billing/upgrade", {
        method: "POST",
        body: JSON.stringify({ shop, plan: planKey }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to change plan");
      }

      const data = await response.json();
      setSuccessMsg(
        `Plan changed to ${planKey.charAt(0).toUpperCase() + planKey.slice(1)}!`
      );
      await fetchBilling();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change plan");
    } finally {
      setUpgrading(null);
    }
  };

  if (loading) {
    return (
      <SkeletonPage title="Plans & Billing" backAction>
        <Layout>
          <Layout.Section variant="oneThird">
            <Card>
              <SkeletonDisplayText size="small" />
              <SkeletonBodyText lines={6} />
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <SkeletonDisplayText size="small" />
              <SkeletonBodyText lines={6} />
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <SkeletonDisplayText size="small" />
              <SkeletonBodyText lines={6} />
            </Card>
          </Layout.Section>
        </Layout>
      </SkeletonPage>
    );
  }

  const currentPlan = billing?.usage?.plan || billing?.plan || "free";
  const usage = billing?.usage;

  const emailPercent =
    usage && typeof usage.emailLimit === "number" && usage.emailLimit > 0
      ? Math.round((usage.emailUsed / usage.emailLimit) * 100)
      : 0;

  const whatsappPercent =
    usage && typeof usage.whatsappLimit === "number" && usage.whatsappLimit > 0
      ? Math.round((usage.whatsappUsed / usage.whatsappLimit) * 100)
      : 0;

  const planOrder = ["free", "pro", "premium"];
  const currentPlanIndex = planOrder.indexOf(currentPlan);

  return (
    <Page
      title="Plans & Billing"
      backAction={{ content: "Dashboard", onAction: () => navigate("/") }}
    >
      <Layout>
        {error && (
          <Layout.Section>
            <Banner tone="critical" onDismiss={() => setError(null)}>
              <p>{error}</p>
            </Banner>
          </Layout.Section>
        )}

        {successMsg && (
          <Layout.Section>
            <Banner tone="success" onDismiss={() => setSuccessMsg(null)}>
              <p>{successMsg}</p>
            </Banner>
          </Layout.Section>
        )}

        {PLANS.map((plan) => {
          const isCurrentPlan = plan.key === currentPlan;
          const planIndex = planOrder.indexOf(plan.key);
          const isUpgrade = planIndex > currentPlanIndex;
          const isDowngrade = planIndex < currentPlanIndex;

          return (
            <Layout.Section variant="oneThird" key={plan.key}>
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="100">
                      <InlineStack gap="200" blockAlign="center">
                        {plan.key === "premium" && (
                          <Icon source={StarFilledIcon} tone="warning" />
                        )}
                        <Text as="h2" variant="headingLg">
                          {plan.name}
                        </Text>
                      </InlineStack>
                      <InlineStack gap="100" blockAlign="end">
                        <Text as="span" variant="headingXl">
                          {plan.price}
                        </Text>
                        <Text as="span" variant="bodySm" tone="subdued">
                          {plan.priceNote}
                        </Text>
                      </InlineStack>
                    </BlockStack>
                    {isCurrentPlan && (
                      <Badge tone="success" size="large">
                        CURRENT
                      </Badge>
                    )}
                  </InlineStack>

                  <Divider />

                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm">
                      Included
                    </Text>
                    <List>
                      {plan.features.map((feature, i) => (
                        <List.Item key={i}>{feature}</List.Item>
                      ))}
                    </List>
                  </BlockStack>

                  {plan.missing.length > 0 && (
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm" tone="subdued">
                        Not included
                      </Text>
                      {plan.missing.map((feature, i) => (
                        <Text key={i} as="p" variant="bodySm" tone="subdued">
                          — {feature}
                        </Text>
                      ))}
                    </BlockStack>
                  )}

                  <Box paddingBlockStart="200">
                    {isCurrentPlan ? (
                      <Button disabled fullWidth>
                        Current plan
                      </Button>
                    ) : isUpgrade ? (
                      <Button
                        variant="primary"
                        fullWidth
                        onClick={() => handleUpgrade(plan.key)}
                        loading={upgrading === plan.key}
                        disabled={!!upgrading}
                      >
                        Upgrade to {plan.name}
                      </Button>
                    ) : (
                      <Button
                        fullWidth
                        onClick={() => handleUpgrade(plan.key)}
                        loading={upgrading === plan.key}
                        disabled={!!upgrading}
                        tone="critical"
                      >
                        Downgrade to {plan.name}
                      </Button>
                    )}
                  </Box>
                </BlockStack>
              </Card>
            </Layout.Section>
          );
        })}

        {usage && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack gap="200" blockAlign="center">
                  <Icon source={ChartVerticalFilledIcon} tone="base" />
                  <Text as="h2" variant="headingLg">
                    Usage this month
                  </Text>
                  <Text as="span" variant="bodySm" tone="subdued">
                    ({usage.month})
                  </Text>
                </InlineStack>

                <Divider />

                <BlockStack gap="300">
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={EmailIcon} tone="base" />
                    <Text as="span" variant="headingSm">
                      Email alerts
                    </Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm">
                      {usage.emailUsed} of{" "}
                      {typeof usage.emailLimit === "number"
                        ? usage.emailLimit
                        : usage.emailLimit}{" "}
                      sent
                    </Text>
                    <Text as="span" variant="bodySm" tone="subdued">
                      {emailPercent}%
                    </Text>
                  </InlineStack>
                  <ProgressBar
                    progress={emailPercent}
                    tone={emailPercent > 80 ? "critical" : "primary"}
                    size="small"
                  />
                </BlockStack>

                {currentPlan === "premium" && (
                  <BlockStack gap="300">
                    <InlineStack gap="200" blockAlign="center">
                      <Icon source={ChatIcon} tone="base" />
                      <Text as="span" variant="headingSm">
                        WhatsApp alerts
                      </Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodySm">
                        {usage.whatsappUsed} of{" "}
                        {typeof usage.whatsappLimit === "number"
                          ? usage.whatsappLimit
                          : usage.whatsappLimit}{" "}
                        sent
                      </Text>
                      <Text as="span" variant="bodySm" tone="subdued">
                        {whatsappPercent}%
                      </Text>
                    </InlineStack>
                    <ProgressBar
                      progress={whatsappPercent}
                      tone={whatsappPercent > 80 ? "critical" : "primary"}
                      size="small"
                    />
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        <Layout.Section>
          <Box paddingBlockEnd="800">
            <Text as="p" variant="bodySm" tone="subdued" alignment="center">
              Plan changes take effect immediately. Usage counters reset at the
              start of each month. Need help? Contact support.
            </Text>
          </Box>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
