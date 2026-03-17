import { useEffect, useState } from "react";
import {
  Card,
  Layout,
  Button,
  TextField,
  Select,
  Checkbox,
  Text,
  Box,
  BlockStack,
  InlineStack,
  Banner,
  Form,
  FormLayout,
} from "@shopify/polaris";

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

export default function Settings() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const shop = params.get("shop");

      const response = await fetch(`/api/settings?shop=${shop}`);
      if (!response.ok) throw new Error("Failed to fetch settings");

      const data = await response.json();
      setSettings(data.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: keyof SettingsData, value: any) => {
    if (settings) {
      setSettings({ ...settings, [key]: value });
      setSuccess(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const params = new URLSearchParams(window.location.search);
      const shop = params.get("shop");

      const response = await fetch("/api/settings/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          ...settings,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
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
    );
  }

  if (!settings) {
    return (
      <Box paddingBlockStart="400" paddingBlockEnd="400">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingLg" tone="critical">
                  Settings Not Found
                </Text>
                <Text as="p" variant="bodyMd">
                  Please complete onboarding first.
                </Text>
                <Button onClick={() => (window.location.href = "/")}>
                  Back to App
                </Button>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Box>
    );
  }

  return (
    <Box paddingBlockStart="400" paddingBlockEnd="400">
      <Layout>
        {/* Header */}
        <Layout.Section>
          <Card>
            <BlockStack gap="100">
              <Text as="h1" variant="headingLg">
                ⚙️ Settings
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Manage your Low Stock Alerts configuration
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Alerts */}
        {error && (
          <Layout.Section>
            <Banner tone="critical">
              <Text as="p">{error}</Text>
            </Banner>
          </Layout.Section>
        )}

        {success && (
          <Layout.Section>
            <Banner tone="success">
              <Text as="p">✓ Settings saved successfully!</Text>
            </Banner>
          </Layout.Section>
        )}

        {/* Settings Form */}
        <Layout.Section>
          <Form onSubmit={handleSave}>
            <BlockStack gap="600">
              {/* Plan Section */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    📋 Plan
                  </Text>
                  <FormLayout>
                    <Select
                      label="Current Plan"
                      options={[
                        { label: "Free - $0/month", value: "free" },
                        { label: "Pro - $5/month", value: "pro" },
                        { label: "Premium - $12/month", value: "premium" },
                      ]}
                      value={settings.plan}
                      onChange={(value) => updateSetting("plan", value)}
                    />
                    <Text as="p" variant="bodySm" tone="subdued">
                      Upgrade or downgrade your plan anytime. Changes take effect at the next billing cycle.
                    </Text>
                  </FormLayout>
                </BlockStack>
              </Card>

              {/* Threshold Settings */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    🎯 Alert Thresholds
                  </Text>
                  <FormLayout>
                    <Select
                      label="Threshold Type"
                      options={[
                        { label: "Quantity (units)", value: "quantity" },
                        { label: "Percentage (%)", value: "percentage" },
                      ]}
                      value={settings.thresholdType}
                      onChange={(value) => updateSetting("thresholdType", value as "quantity" | "percentage")}
                    />

                    <TextField
                      label={
                        settings.thresholdType === "quantity"
                          ? "Alert when quantity falls below:"
                          : "Alert when at less than (%):"
                      }
                      type="number"
                      value={String(settings.thresholdValue)}
                      onChange={(val) => updateSetting("thresholdValue", parseInt(val))}
                      autoComplete="off"
                    />

                    {settings.thresholdType === "percentage" && (
                      <TextField
                        label="Safety Stock Level"
                        type="number"
                        value={String(settings.safetyStock)}
                        onChange={(val) => updateSetting("safetyStock", parseInt(val))}
                        autoComplete="off"
                        helpText={`Alert triggers when stock < ${settings.thresholdValue}% of ${settings.safetyStock} = ${Math.floor((settings.thresholdValue / 100) * settings.safetyStock)} units`}
                      />
                    )}
                  </FormLayout>
                </BlockStack>
              </Card>

              {/* Notification Settings */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    📬 Notifications
                  </Text>
                  <FormLayout>
                    <Select
                      label="Notification Method"
                      options={[
                        { label: "Email", value: "email" },
                        ...(settings.plan !== "pro"
                          ? [
                              { label: "WhatsApp", value: "whatsapp" },
                              { label: "Email + WhatsApp", value: "both" },
                            ]
                          : []),
                      ]}
                      value={settings.notificationMethod}
                      onChange={(value) => updateSetting("notificationMethod", value as "email" | "whatsapp" | "both")}
                    />

                    {settings.plan === "pro" && (
                      <Banner tone="info">
                        <Text as="p">WhatsApp is available on Premium plan only. Upgrade to enable WhatsApp notifications.</Text>
                      </Banner>
                    )}

                    {settings.notificationMethod !== "email" && (
                      <TextField
                        label="WhatsApp Number"
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

              {/* Batching Settings */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    📦 Alert Batching
                  </Text>
                  <FormLayout>
                    <Checkbox
                      label="Enable alert batching (digest mode)"
                      checked={settings.batchingEnabled}
                      onChange={(checked) => updateSetting("batchingEnabled", checked)}
                      helpText="Combine multiple alerts into periodic digests instead of individual messages"
                    />

                    {settings.batchingEnabled && (
                      <Select
                        label="Batching Interval"
                        options={[
                          { label: "Hourly", value: "hourly" },
                          { label: "Daily", value: "daily" },
                          { label: "Weekly", value: "weekly" },
                        ]}
                        value={settings.batchingInterval}
                        onChange={(value) => updateSetting("batchingInterval", value as "hourly" | "daily" | "weekly")}
                      />
                    )}
                  </FormLayout>
                </BlockStack>
              </Card>

              {/* Save Button */}
              <InlineStack gap="200" align="end">
                <Button
                  onClick={() => window.history.back()}
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  variant="primary"
                  loading={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </InlineStack>
            </BlockStack>
          </Form>
        </Layout.Section>
      </Layout>
    </Box>
  );
}
