import { useState } from "react";
import {
  Page,
  Card,
  Layout,
  Button,
  TextField,
  RadioButton,
  Text,
  Banner,
  BlockStack,
  InlineStack,
  ProgressBar,
  Icon,
  List,
} from "@shopify/polaris";
import {
  AlertCircleIcon,
  NotificationIcon,
  EmailIcon,
  ChatIcon,
  CheckIcon,
} from "@shopify/polaris-icons";
import { authenticatedFetch } from "../utils/fetch";

interface OnboardingProps {
  shop: string | null;
  onComplete: () => void;
}

interface OnboardingData {
  thresholdType: "quantity" | "percentage";
  thresholdValue: number;
  safetyStock: number;
  notificationMethod: "email" | "whatsapp" | "both";
  notificationEmail: string;
  whatsappNumber: string;
  batchingEnabled: boolean;
  batchingInterval: "hourly" | "daily" | "weekly";
}

const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const isValidWhatsApp = (num: string): boolean => {
  const cleaned = num.replace(/\s+/g, "");
  return /^\+\d{1,3}\d{1,14}$/.test(cleaned);
};

const getNextStep = (
  currentStep: number,
  notificationMethod: string
): number => {
  if (currentStep === 3) {
    if (notificationMethod === "email") return 4;
    if (notificationMethod === "whatsapp") return 5;
    if (notificationMethod === "both") return 4;
  }
  if (currentStep === 4 && notificationMethod === "both") return 5;
  return currentStep + 1;
};

const shouldShowStep = (step: number, notificationMethod: string): boolean => {
  if (step === 4)
    return notificationMethod === "email" || notificationMethod === "both";
  if (step === 5)
    return notificationMethod === "whatsapp" || notificationMethod === "both";
  return true;
};

const STEP_LABELS = [
  { step: 1, title: "Welcome" },
  { step: 2, title: "Thresholds" },
  { step: 3, title: "Notifications" },
  { step: 4, title: "Email" },
  { step: 5, title: "WhatsApp" },
  { step: 6, title: "Review" },
];

export default function Onboarding({ shop, onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<OnboardingData>({
    thresholdType: "quantity",
    thresholdValue: 5,
    safetyStock: 10,
    notificationMethod: "email",
    notificationEmail: "",
    whatsappNumber: "",
    batchingEnabled: false,
    batchingInterval: "daily",
  });

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep === 4) {
      if (
        data.notificationMethod.includes("email") &&
        (!data.notificationEmail || !isValidEmail(data.notificationEmail))
      ) {
        setError("Please enter a valid email address");
        return;
      }
    }
    if (currentStep === 5) {
      if (
        data.notificationMethod.includes("whatsapp") &&
        (!data.whatsappNumber || !isValidWhatsApp(data.whatsappNumber))
      ) {
        setError(
          "Please enter a valid WhatsApp number (format: +1 555 123 4567)"
        );
        return;
      }
    }

    setError(null);
    const nextStep = getNextStep(currentStep, data.notificationMethod);
    if (!shouldShowStep(nextStep, data.notificationMethod)) {
      setCurrentStep(nextStep + 1);
    } else {
      setCurrentStep(nextStep);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      let prevStep = currentStep - 1;
      while (prevStep > 1 && !shouldShowStep(prevStep, data.notificationMethod)) {
        prevStep--;
      }
      setCurrentStep(prevStep);
      setError(null);
    }
  };

  const handleComplete = async () => {
    if (
      data.notificationMethod.includes("email") &&
      (!data.notificationEmail || !isValidEmail(data.notificationEmail))
    ) {
      setError("Please enter a valid email address");
      return;
    }

    if (
      data.notificationMethod.includes("whatsapp") &&
      (!data.whatsappNumber || !isValidWhatsApp(data.whatsappNumber))
    ) {
      setError("Please enter a valid WhatsApp number");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authenticatedFetch("/api/onboarding/complete", {
        method: "POST",
        body: JSON.stringify({
          shop,
          plan: "free",
          thresholdType: data.thresholdType,
          thresholdValue: data.thresholdValue,
          safetyStock: data.safetyStock,
          notificationMethod: data.notificationMethod,
          notificationEmail: data.notificationEmail,
          whatsappNumber: data.whatsappNumber,
          batchingEnabled: data.batchingEnabled,
          batchingInterval: data.batchingInterval,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save onboarding data");
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const visibleSteps = STEP_LABELS.filter((s) => {
    if (s.step >= 4 && s.step <= 5) {
      return shouldShowStep(s.step, data.notificationMethod);
    }
    return true;
  });

  const currentStepIndex =
    visibleSteps.findIndex((s) => s.step === currentStep) + 1;
  const totalVisibleSteps = visibleSteps.length;
  const progressPercent = (currentStepIndex / totalVisibleSteps) * 100;

  return (
    <Page title="Set up Low Stock Alerts" narrowWidth>
      <Layout>
        <Layout.Section>
          <BlockStack gap="200">
            <ProgressBar progress={progressPercent} tone="primary" />
            <Text as="p" variant="bodySm" tone="subdued">
              Step {currentStepIndex} of {totalVisibleSteps}
            </Text>
          </BlockStack>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              {error && (
                <Banner tone="critical" onDismiss={() => setError(null)}>
                  <p>{error}</p>
                </Banner>
              )}

              {currentStep === 1 && (
                <BlockStack gap="400">
                  <BlockStack gap="200">
                    <Text as="h1" variant="headingXl">
                      Welcome to Low Stock Alerts
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Never miss a stockout. Get real-time alerts when your
                      inventory gets low.
                    </Text>
                  </BlockStack>

                  <Card>
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingMd">
                        Why merchants love this app
                      </Text>
                      <List>
                        <List.Item>
                          Get alerts via email or WhatsApp
                        </List.Item>
                        <List.Item>
                          Prevent lost sales from out-of-stock items
                        </List.Item>
                        <List.Item>
                          Reduce manual inventory checking
                        </List.Item>
                        <List.Item>
                          Works across all your products and locations
                        </List.Item>
                      </List>
                    </BlockStack>
                  </Card>
                </BlockStack>
              )}

              {currentStep === 2 && (
                <BlockStack gap="400">
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={AlertCircleIcon} tone="base" />
                    <Text as="h1" variant="headingLg">
                      Configure alert thresholds
                    </Text>
                  </InlineStack>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Set when you want to be alerted about low stock.
                  </Text>

                  <BlockStack gap="300">
                    <Text as="h3" variant="headingMd">
                      Threshold type
                    </Text>
                    <BlockStack gap="150">
                      <RadioButton
                        label="Quantity (Alert when below X units)"
                        checked={data.thresholdType === "quantity"}
                        onChange={() =>
                          updateData({ thresholdType: "quantity" })
                        }
                      />
                      <RadioButton
                        label="Percentage (Alert when below X% of safety stock)"
                        checked={data.thresholdType === "percentage"}
                        onChange={() =>
                          updateData({ thresholdType: "percentage" })
                        }
                      />
                    </BlockStack>

                    <TextField
                      label={
                        data.thresholdType === "quantity"
                          ? "Alert when quantity falls below"
                          : "Alert when at less than"
                      }
                      type="number"
                      value={String(data.thresholdValue)}
                      onChange={(val: string) =>
                        updateData({ thresholdValue: parseInt(val) || 0 })
                      }
                      autoComplete="off"
                      suffix={
                        data.thresholdType === "quantity" ? "units" : "%"
                      }
                    />

                    {data.thresholdType === "percentage" && (
                      <BlockStack gap="200">
                        <TextField
                          label="Safety stock level"
                          type="number"
                          value={String(data.safetyStock)}
                          onChange={(val: string) =>
                            updateData({ safetyStock: parseInt(val) || 0 })
                          }
                          autoComplete="off"
                          suffix="units"
                        />
                        <Text as="p" variant="bodySm" tone="subdued">
                          Alert will trigger when stock is below{" "}
                          {data.thresholdValue}% of {data.safetyStock} ={" "}
                          {Math.floor(
                            (data.thresholdValue / 100) * data.safetyStock
                          )}{" "}
                          units
                        </Text>
                      </BlockStack>
                    )}
                  </BlockStack>
                </BlockStack>
              )}

              {currentStep === 3 && (
                <BlockStack gap="400">
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={NotificationIcon} tone="base" />
                    <Text as="h1" variant="headingLg">
                      How should we notify you?
                    </Text>
                  </InlineStack>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Choose how you want to receive low stock alerts.
                  </Text>

                  <BlockStack gap="200">
                    <RadioButton
                      label="Email only"
                      checked={data.notificationMethod === "email"}
                      onChange={() =>
                        updateData({ notificationMethod: "email" })
                      }
                    />
                    <RadioButton
                      label="WhatsApp only"
                      checked={data.notificationMethod === "whatsapp"}
                      onChange={() =>
                        updateData({ notificationMethod: "whatsapp" })
                      }
                    />
                    <RadioButton
                      label="Email + WhatsApp"
                      checked={data.notificationMethod === "both"}
                      onChange={() =>
                        updateData({ notificationMethod: "both" })
                      }
                    />
                  </BlockStack>

                  <Banner tone="info">
                    <p>
                      All notification methods are available to get started.
                      Plan restrictions apply after onboarding.
                    </p>
                  </Banner>
                </BlockStack>
              )}

              {currentStep === 4 &&
                shouldShowStep(4, data.notificationMethod) && (
                  <BlockStack gap="400">
                    <InlineStack gap="200" blockAlign="center">
                      <Icon source={EmailIcon} tone="base" />
                      <Text as="h1" variant="headingLg">
                        Where should we send email alerts?
                      </Text>
                    </InlineStack>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      We'll send low stock alerts to this email address.
                    </Text>
                    <TextField
                      label="Email address"
                      type="email"
                      value={data.notificationEmail}
                      onChange={(val: string) =>
                        updateData({ notificationEmail: val })
                      }
                      placeholder="alerts@yourstore.com"
                      helpText="Change this if you prefer a different email"
                      error={
                        data.notificationEmail &&
                        !isValidEmail(data.notificationEmail)
                          ? "Please enter a valid email address"
                          : undefined
                      }
                      autoComplete="email"
                    />
                  </BlockStack>
                )}

              {currentStep === 5 &&
                shouldShowStep(5, data.notificationMethod) && (
                  <BlockStack gap="400">
                    <InlineStack gap="200" blockAlign="center">
                      <Icon source={ChatIcon} tone="base" />
                      <Text as="h1" variant="headingLg">
                        What's your WhatsApp number?
                      </Text>
                    </InlineStack>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      We'll send low stock alerts to this number.
                    </Text>
                    <TextField
                      label="WhatsApp number"
                      type="tel"
                      value={data.whatsappNumber}
                      onChange={(val: string) =>
                        updateData({ whatsappNumber: val })
                      }
                      placeholder="+1 555 123 4567"
                      helpText="Format: +[country code][number]"
                      error={
                        data.whatsappNumber &&
                        !isValidWhatsApp(data.whatsappNumber)
                          ? "Invalid format. Use: +1 555 123 4567"
                          : undefined
                      }
                      autoComplete="tel"
                    />
                  </BlockStack>
                )}

              {currentStep === 6 && (
                <BlockStack gap="400">
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={CheckIcon} tone="success" />
                    <Text as="h1" variant="headingLg">
                      You're all set!
                    </Text>
                  </InlineStack>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Here's a summary of your Low Stock Alerts configuration.
                  </Text>

                  <Card>
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingMd">
                        Your configuration
                      </Text>
                      <List>
                        <List.Item>
                          <Text as="span" fontWeight="semibold">
                            Plan:
                          </Text>{" "}
                          Free
                        </List.Item>
                        <List.Item>
                          <Text as="span" fontWeight="semibold">
                            Alert type:
                          </Text>{" "}
                          {data.thresholdType === "quantity"
                            ? `Below ${data.thresholdValue} units`
                            : `Below ${data.thresholdValue}% of ${data.safetyStock} units`}
                        </List.Item>
                        <List.Item>
                          <Text as="span" fontWeight="semibold">
                            Notifications:
                          </Text>{" "}
                          {data.notificationMethod === "email"
                            ? "Email only"
                            : data.notificationMethod === "whatsapp"
                              ? "WhatsApp only"
                              : "Email + WhatsApp"}
                        </List.Item>
                        {(data.notificationMethod === "email" ||
                          data.notificationMethod === "both") && (
                          <List.Item>
                            <Text as="span" fontWeight="semibold">
                              Email:
                            </Text>{" "}
                            {data.notificationEmail}
                          </List.Item>
                        )}
                        {(data.notificationMethod === "whatsapp" ||
                          data.notificationMethod === "both") && (
                          <List.Item>
                            <Text as="span" fontWeight="semibold">
                              WhatsApp:
                            </Text>{" "}
                            {data.whatsappNumber}
                          </List.Item>
                        )}
                      </List>

                      <Banner tone="info">
                        <p>
                          You can customize these settings and set thresholds
                          for individual products in the Settings page.
                        </p>
                      </Banner>
                    </BlockStack>
                  </Card>
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <InlineStack gap="300" align="space-between" blockAlign="center">
            {currentStep === 1 ? (
              <>
                <div />
                <Button onClick={handleNext} variant="primary">
                  Get started
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handlePrev} disabled={currentStep === 1}>
                  Previous
                </Button>

                {currentStep < 6 ? (
                  <Button
                    onClick={handleNext}
                    variant="primary"
                    disabled={
                      (currentStep === 4 &&
                        data.notificationMethod.includes("email") &&
                        !isValidEmail(data.notificationEmail)) ||
                      (currentStep === 5 &&
                        data.notificationMethod.includes("whatsapp") &&
                        !isValidWhatsApp(data.whatsappNumber))
                    }
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    onClick={handleComplete}
                    disabled={loading}
                    variant="primary"
                    loading={loading}
                  >
                    Complete setup
                  </Button>
                )}
              </>
            )}
          </InlineStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
