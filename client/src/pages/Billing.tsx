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
} from "@shopify/polaris";
import {
  ChartVerticalFilledIcon,
  EmailIcon,
  ChatIcon,
} from "@shopify/polaris-icons";
import { useNavigate } from "react-router-dom";
import { authenticatedFetch } from "../utils/fetch";

interface BillingProps {
  shop: string | null;
}

interface BillingData {
  plan: string;
  usage: {
    month: string;
    emailUsed: number;
    emailLimit: number | string;
    whatsappUsed: number;
    whatsappLimit: number | string;
    usageRemaining: number;
  };
  tiers: Record<string, any>;
}

export default function Billing({ shop }: BillingProps) {
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  if (loading) {
    return (
      <SkeletonPage title="Billing" backAction>
        <Layout>
          <Layout.Section>
            <Card>
              <SkeletonDisplayText size="small" />
              <SkeletonBodyText lines={4} />
            </Card>
          </Layout.Section>
          <Layout.Section>
            <Card>
              <SkeletonDisplayText size="small" />
              <SkeletonBodyText lines={3} />
            </Card>
          </Layout.Section>
        </Layout>
      </SkeletonPage>
    );
  }

  const planName = billing?.plan || "free";
  const usage = billing?.usage;

  const emailPercent =
    usage && typeof usage.emailLimit === "number" && usage.emailLimit > 0
      ? Math.round((usage.emailUsed / usage.emailLimit) * 100)
      : 0;

  const whatsappPercent =
    usage && typeof usage.whatsappLimit === "number" && usage.whatsappLimit > 0
      ? Math.round((usage.whatsappUsed / usage.whatsappLimit) * 100)
      : 0;

  return (
    <Page
      title="Billing"
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

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <Text as="h2" variant="headingLg">
                    Current plan
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {usage?.month || "Current month"}
                  </Text>
                </BlockStack>
                <Badge
                  tone={
                    planName === "premium"
                      ? "success"
                      : planName === "pro"
                        ? "attention"
                        : "info"
                  }
                  size="large"
                >
                  {planName.toUpperCase()}
                </Badge>
              </InlineStack>

              <Divider />

              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">
                  Plan features
                </Text>
                {planName === "free" && (
                  <List>
                    <List.Item>50 email alerts per month</List.Item>
                    <List.Item>Basic low stock monitoring</List.Item>
                    <List.Item>Email notifications only</List.Item>
                  </List>
                )}
                {planName === "pro" && (
                  <List>
                    <List.Item>500 email alerts per month</List.Item>
                    <List.Item>Advanced threshold settings</List.Item>
                    <List.Item>Alert batching / digest mode</List.Item>
                    <List.Item>Email notifications</List.Item>
                  </List>
                )}
                {planName === "premium" && (
                  <List>
                    <List.Item>Unlimited email alerts</List.Item>
                    <List.Item>WhatsApp notifications</List.Item>
                    <List.Item>Advanced threshold settings</List.Item>
                    <List.Item>Alert batching / digest mode</List.Item>
                    <List.Item>Priority support</List.Item>
                  </List>
                )}
              </BlockStack>

              <Text as="p" variant="bodySm" tone="subdued">
                To change your plan, visit the app listing in your Shopify admin
                under Apps.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        {usage && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack gap="200" blockAlign="center">
                  <Icon source={ChartVerticalFilledIcon} tone="base" />
                  <Text as="h2" variant="headingLg">
                    Usage this month
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
                      used
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

                {(planName === "premium") && (
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
                        used
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
      </Layout>
    </Page>
  );
}
