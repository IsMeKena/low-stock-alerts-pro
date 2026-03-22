import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Page,
  Layout,
  Card,
  TextField,
  Select,
  Checkbox,
  Text,
  BlockStack,
  InlineStack,
  Banner,
  FormLayout,
  ContextualSaveBar,
  Toast,
  Frame,
  SkeletonPage,
  SkeletonBodyText,
  SkeletonDisplayText,
  Icon,
  Badge,
  Button,
  Box,
} from "@shopify/polaris";
import {
  NotificationIcon,
  SettingsIcon,
  ClockIcon,
  AlertCircleIcon,
} from "@shopify/polaris-icons";
import { useNavigate } from "react-router-dom";
import { authenticatedFetch } from "../utils/fetch";

interface SettingsProps {
  shop: string | null;
}

interface SettingsData {
  plan: "free" | "pro" | "premium";
  thresholdType: "quantity" | "percentage";
  thresholdValue: number;
  safetyStock: number;
  notificationMethod: "email" | "whatsapp" | "both";
  whatsappNumber: string;
  batchingEnabled: boolean;
  batchingInterval: "hourly" | "daily" | "weekly";
}

export default function Settings({ shop }: SettingsProps) {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [savedSettings, setSavedSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toastActive, setToastActive] = useState(false);
  const [toastContent, setToastContent] = useState("");
  const [toastError, setToastError] = useState(false);
  const navigate = useNavigate();

  const fetchSettings = useCallback(async () => {
    if (!shop) return;
    try {
      const response = await authenticatedFetch(`/api/settings?shop=${shop}`);
      if (!response.ok) throw new Error("Failed to fetch settings");
      const data = await response.json();
      setSettings(data.settings);
      setSavedSettings(data.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [shop]);

  useEffect(() => {
    if (shop) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [shop, fetchSettings]);

  const isDirty = useMemo(() => {
    if (!settings || !savedSettings) return false;
    return JSON.stringify(settings) !== JSON.stringify(savedSettings);
  }, [settings, savedSettings]);

  const updateSetting = (key: keyof SettingsData, value: any) => {
    if (settings) {
      setSettings({ ...settings, [key]: value });
    }
  };

  const handleSave = async () => {
    if (!settings || !shop) return;
    setSaving(true);
    setError(null);

    try {
      const response = await authenticatedFetch("/api/settings/update", {
        method: "POST",
        body: JSON.stringify({ shop, ...settings }),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      setSavedSettings({ ...settings });
      setToastContent("Settings saved");
      setToastError(false);
      setToastActive(true);
    } catch (err) {
      setToastContent(err instanceof Error ? err.message : "Failed to save");
      setToastError(true);
      setToastActive(true);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (savedSettings) {
      setSettings({ ...savedSettings });
    }
  };

  if (loading) {
    return (
      <SkeletonPage title="Settings" backAction>
        <Layout>
          <Layout.AnnotatedSection title="Alert thresholds">
            <Card>
              <SkeletonDisplayText size="small" />
              <SkeletonBodyText lines={4} />
            </Card>
          </Layout.AnnotatedSection>
          <Layout.AnnotatedSection title="Notifications">
            <Card>
              <SkeletonDisplayText size="small" />
              <SkeletonBodyText lines={3} />
            </Card>
          </Layout.AnnotatedSection>
        </Layout>
      </SkeletonPage>
    );
  }

  if (!settings) {
    return (
      <Page
        title="Settings"
        backAction={{ content: "Dashboard", onAction: () => navigate("/") }}
      >
        <Layout>
          <Layout.Section>
            <Banner
              title="Settings not found"
              tone="warning"
              action={{
                content: "Complete onboarding",
                onAction: () => navigate("/onboarding"),
              }}
            >
              <p>Please complete onboarding to configure your settings.</p>
            </Banner>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const toastMarkup = toastActive ? (
    <Toast
      content={toastContent}
      error={toastError}
      onDismiss={() => setToastActive(false)}
    />
  ) : null;

  const contextualSaveBarMarkup = isDirty ? (
    <ContextualSaveBar
      message="Unsaved changes"
      saveAction={{
        onAction: handleSave,
        loading: saving,
        disabled: saving,
      }}
      discardAction={{
        onAction: handleDiscard,
      }}
    />
  ) : null;

  return (
    <>
      {contextualSaveBarMarkup}

      <Page
        title="Settings"
        backAction={{ content: "Dashboard", onAction: () => navigate("/") }}
      >
        <Layout>
          {error && (
            <Layout.Section>
              <Banner
                title="Error"
                tone="critical"
                onDismiss={() => setError(null)}
              >
                <p>{error}</p>
              </Banner>
            </Layout.Section>
          )}

          <Layout.AnnotatedSection
            title="Current plan"
            description="Your plan determines how many alerts you can send each month."
          >
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h3" variant="headingMd">
                    {settings.plan.charAt(0).toUpperCase() +
                      settings.plan.slice(1)}{" "}
                    plan
                  </Text>
                  <Badge
                    tone={
                      settings.plan === "premium"
                        ? "success"
                        : settings.plan === "pro"
                          ? "attention"
                          : "info"
                    }
                  >
                    {settings.plan.toUpperCase()}
                  </Badge>
                </InlineStack>
                {settings.plan !== "premium" && (
                  <Text as="p" variant="bodySm" tone="subdued">
                    Upgrade to unlock more alerts, WhatsApp notifications, and
                    priority support.
                  </Text>
                )}
                <InlineStack gap="300">
                  <Button onClick={() => navigate("/billing")}>
                    {settings.plan === "premium" ? "View plan details" : "View plans & upgrade"}
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.AnnotatedSection>

          <Layout.AnnotatedSection
            title="Alert thresholds"
            description="Configure when low stock alerts should trigger for your products."
          >
            <Card>
              <BlockStack gap="400">
                <InlineStack gap="200" blockAlign="center">
                  <Icon source={AlertCircleIcon} tone="base" />
                  <Text as="h3" variant="headingMd">
                    Threshold configuration
                  </Text>
                </InlineStack>
                <FormLayout>
                  <Select
                    label="Threshold type"
                    options={[
                      { label: "Quantity (units)", value: "quantity" },
                      { label: "Percentage (%)", value: "percentage" },
                    ]}
                    value={settings.thresholdType}
                    onChange={(value) =>
                      updateSetting(
                        "thresholdType",
                        value as "quantity" | "percentage"
                      )
                    }
                  />

                  <TextField
                    label={
                      settings.thresholdType === "quantity"
                        ? "Alert when quantity falls below"
                        : "Alert when at less than (%)"
                    }
                    type="number"
                    value={String(settings.thresholdValue)}
                    onChange={(val) =>
                      updateSetting("thresholdValue", parseInt(val))
                    }
                    autoComplete="off"
                    suffix={
                      settings.thresholdType === "quantity" ? "units" : "%"
                    }
                  />

                  {settings.thresholdType === "percentage" && (
                    <TextField
                      label="Safety stock level"
                      type="number"
                      value={String(settings.safetyStock)}
                      onChange={(val) =>
                        updateSetting("safetyStock", parseInt(val))
                      }
                      autoComplete="off"
                      suffix="units"
                      helpText={`Alert triggers when stock drops below ${settings.thresholdValue}% of ${settings.safetyStock} = ${Math.floor((settings.thresholdValue / 100) * settings.safetyStock)} units`}
                    />
                  )}
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.AnnotatedSection>

          <Layout.AnnotatedSection
            title="Notifications"
            description="Choose how and where you receive low stock alerts."
          >
            <Card>
              <BlockStack gap="400">
                <InlineStack gap="200" blockAlign="center">
                  <Icon source={NotificationIcon} tone="base" />
                  <Text as="h3" variant="headingMd">
                    Notification channels
                  </Text>
                </InlineStack>
                <FormLayout>
                  <Select
                    label="Notification method"
                    options={[
                      { label: "Email", value: "email" },
                      ...(settings.plan === "premium"
                        ? [
                            { label: "WhatsApp", value: "whatsapp" },
                            { label: "Email + WhatsApp", value: "both" },
                          ]
                        : []),
                    ]}
                    value={settings.notificationMethod}
                    onChange={(value) =>
                      updateSetting(
                        "notificationMethod",
                        value as "email" | "whatsapp" | "both"
                      )
                    }
                  />

                  {settings.plan !== "premium" && (
                    <Banner
                      tone="info"
                      action={{
                        content: "Upgrade to Premium",
                        onAction: () => navigate("/billing"),
                      }}
                    >
                      <p>
                        WhatsApp notifications are available on the Premium plan.
                        Upgrade to receive instant alerts on WhatsApp.
                      </p>
                    </Banner>
                  )}

                  {settings.notificationMethod !== "email" && (
                    <TextField
                      label="WhatsApp number"
                      type="tel"
                      placeholder="+1234567890"
                      value={settings.whatsappNumber}
                      onChange={(val) => updateSetting("whatsappNumber", val)}
                      autoComplete="tel"
                      helpText="Format: +[country code][number]"
                    />
                  )}
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.AnnotatedSection>

          <Layout.AnnotatedSection
            title="Alert batching"
            description="Combine multiple alerts into periodic digest messages instead of sending them individually."
          >
            <Card>
              <BlockStack gap="400">
                <InlineStack gap="200" blockAlign="center">
                  <Icon source={ClockIcon} tone="base" />
                  <Text as="h3" variant="headingMd">
                    Digest settings
                  </Text>
                </InlineStack>
                <FormLayout>
                  <Checkbox
                    label="Enable alert batching (digest mode)"
                    checked={settings.batchingEnabled}
                    onChange={(checked) =>
                      updateSetting("batchingEnabled", checked)
                    }
                    helpText="Combine multiple alerts into periodic digests instead of individual messages"
                  />

                  {settings.batchingEnabled && (
                    <Select
                      label="Batching interval"
                      options={[
                        { label: "Hourly", value: "hourly" },
                        { label: "Daily", value: "daily" },
                        { label: "Weekly", value: "weekly" },
                      ]}
                      value={settings.batchingInterval}
                      onChange={(value) =>
                        updateSetting(
                          "batchingInterval",
                          value as "hourly" | "daily" | "weekly"
                        )
                      }
                    />
                  )}
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.AnnotatedSection>

          <Layout.Section>
            <Box paddingBlockEnd="800" />
          </Layout.Section>
        </Layout>
      </Page>

      {toastMarkup}
    </>
  );
}
