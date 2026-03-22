import { useState } from "react";
import {
  Page,
  Card,
  Layout,
  Button,
  TextField,
  Text,
  Banner,
  BlockStack,
  InlineStack,
  Icon,
  Box,
  Divider,
} from "@shopify/polaris";
import {
  CheckCircleIcon,
  AlertCircleIcon,
  EmailIcon,
  InventoryIcon,
} from "@shopify/polaris-icons";
import { authenticatedFetch } from "../utils/fetch";

interface OnboardingProps {
  shop: string | null;
  onComplete: () => void;
}

const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export default function Onboarding({ shop, onComplete }: OnboardingProps) {
  const [threshold, setThreshold] = useState("5");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thresholdDone, setThresholdDone] = useState(false);
  const [emailDone, setEmailDone] = useState(false);

  const handleConfirmThreshold = () => {
    const val = parseInt(threshold);
    if (!val || val < 1) {
      setError("Enter a threshold of at least 1 unit");
      return;
    }
    setError(null);
    setThresholdDone(true);
  };

  const handleConfirmEmail = () => {
    if (!email || !isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }
    setError(null);
    setEmailDone(true);
  };

  const handleComplete = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await authenticatedFetch("/api/onboarding/complete", {
        method: "POST",
        body: JSON.stringify({
          shop,
          plan: "free",
          thresholdType: "quantity",
          thresholdValue: parseInt(threshold) || 5,
          safetyStock: 10,
          notificationMethod: "email",
          notificationEmail: email,
          whatsappNumber: "",
          batchingEnabled: false,
          batchingInterval: "daily",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const allDone = thresholdDone && emailDone;

  return (
    <Page title="Welcome to Low Stock Alerts" narrowWidth>
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Text as="p" variant="bodyMd" tone="subdued">
              Get set up in under a minute. Just two quick steps and you're
              ready to go.
            </Text>

            {error && (
              <Banner tone="critical" onDismiss={() => setError(null)}>
                <p>{error}</p>
              </Banner>
            )}

            <Card>
              <BlockStack gap="400">
                <InlineStack gap="300" blockAlign="center">
                  <Box>
                    <Icon
                      source={thresholdDone ? CheckCircleIcon : InventoryIcon}
                      tone={thresholdDone ? "success" : "base"}
                    />
                  </Box>
                  <BlockStack gap="100">
                    <Text as="h2" variant="headingMd">
                      Set your stock threshold
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      We'll alert you when any product drops below this level.
                    </Text>
                  </BlockStack>
                </InlineStack>

                {!thresholdDone ? (
                  <BlockStack gap="300">
                    <TextField
                      label="Alert when stock falls below"
                      type="number"
                      value={threshold}
                      onChange={setThreshold}
                      suffix="units"
                      autoComplete="off"
                    />
                    <InlineStack align="end">
                      <Button onClick={handleConfirmThreshold}>Confirm</Button>
                    </InlineStack>
                  </BlockStack>
                ) : (
                  <Text as="p" variant="bodyMd">
                    Alert when below {threshold} units
                  </Text>
                )}
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <InlineStack gap="300" blockAlign="center">
                  <Box>
                    <Icon
                      source={emailDone ? CheckCircleIcon : EmailIcon}
                      tone={emailDone ? "success" : "base"}
                    />
                  </Box>
                  <BlockStack gap="100">
                    <Text as="h2" variant="headingMd">
                      Add your notification email
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Where should we send low stock alerts?
                    </Text>
                  </BlockStack>
                </InlineStack>

                {!emailDone ? (
                  <BlockStack gap="300">
                    <TextField
                      label="Email address"
                      type="email"
                      value={email}
                      onChange={setEmail}
                      placeholder="alerts@yourstore.com"
                      autoComplete="email"
                    />
                    <InlineStack align="end">
                      <Button
                        onClick={handleConfirmEmail}
                        disabled={!thresholdDone}
                      >
                        Confirm
                      </Button>
                    </InlineStack>
                  </BlockStack>
                ) : (
                  <Text as="p" variant="bodyMd">
                    Alerts will be sent to {email}
                  </Text>
                )}
              </BlockStack>
            </Card>

            {allDone && (
              <Card>
                <BlockStack gap="400">
                  <InlineStack gap="300" blockAlign="center">
                    <Box>
                      <Icon source={AlertCircleIcon} tone="info" />
                    </Box>
                    <BlockStack gap="100">
                      <Text as="h2" variant="headingMd">
                        You're all set
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        You can always adjust thresholds, add WhatsApp alerts,
                        or upgrade your plan from Settings.
                      </Text>
                    </BlockStack>
                  </InlineStack>

                  <Divider />

                  <Button
                    variant="primary"
                    onClick={handleComplete}
                    loading={loading}
                    fullWidth
                  >
                    Go to Dashboard
                  </Button>
                </BlockStack>
              </Card>
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
