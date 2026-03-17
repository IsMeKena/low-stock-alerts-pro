import { useState } from "react";
import {
  Card,
  Layout,
  Button,
  TextField,
  RadioButton,
  Checkbox,
  Text,
  Banner,
  Box,
  BlockStack,
  InlineStack,
} from "@shopify/polaris";

interface OnboardingStep {
  step: number;
  title: string;
  description: string;
}

interface OnboardingData {
  plan: "free" | "pro" | "premium";
  thresholdType: "quantity" | "percentage";
  thresholdValue: number;
  safetyStock: number;
  notificationMethod: "email" | "whatsapp" | "both";
  whatsappNumber: string;
  batchingEnabled: boolean;
  batchingInterval: "hourly" | "daily" | "weekly";
}

const steps: OnboardingStep[] = [
  { step: 1, title: "Welcome", description: "Choose your plan" },
  { step: 2, title: "Thresholds", description: "Configure alert thresholds" },
  {
    step: 3,
    title: "Notifications",
    description: "Choose notification method",
  },
  { step: 4, title: "Verify", description: "Verify phone number" },
  { step: 5, title: "Batching", description: "Configure alert batching" },
  { step: 6, title: "Complete", description: "You're all set!" },
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<OnboardingData>({
    plan: "free",
    thresholdType: "quantity",
    thresholdValue: 5,
    safetyStock: 10,
    notificationMethod: "email",
    whatsappNumber: "",
    batchingEnabled: false,
    batchingInterval: "daily",
  });

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams(window.location.search);
      const shop = params.get("shop");

      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          ...data,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save onboarding data");
      }

      // Redirect to dashboard
      window.location.href = `/dashboard?shop=${shop}`;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  const progressPercent = (currentStep / 6) * 100;

  return (
    <Box paddingBlockStart="400" paddingBlockEnd="400">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              {/* Progress Indicator */}
              <Box>
                <div style={{ 
                  position: "relative", 
                  height: "8px", 
                  background: "#e0e0e0", 
                  borderRadius: "4px", 
                  overflow: "hidden" 
                }}>
                  <div style={{ 
                    height: "100%", 
                    width: `${progressPercent}%`, 
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
                    transition: "width 0.3s" 
                  }} />
                </div>
              </Box>

              {/* Step Indicators */}
              <InlineStack gap="200" align="center" wrap={false}>
                {steps.map((s) => (
                  <div
                    key={s.step}
                    onClick={() => currentStep > s.step && setCurrentStep(s.step)}
                    style={{
                      cursor: currentStep > s.step ? "pointer" : "default",
                      padding: "8px 12px",
                      borderRadius: "50%",
                      background:
                        currentStep === s.step
                          ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                          : currentStep > s.step
                            ? "#667eea"
                            : "#e0e0e0",
                      color: currentStep >= s.step ? "white" : "#999",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "600",
                      minWidth: "40px",
                      minHeight: "40px",
                    }}
                  >
                    {currentStep > s.step ? "✓" : s.step}
                  </div>
                ))}
              </InlineStack>

              {/* Current Step Content */}
              <BlockStack gap="300">
                {error && (
                  <Banner tone="critical">
                    <Text as="p">{error}</Text>
                  </Banner>
                )}

                {/* Step 1: Plan Selection */}
                {currentStep === 1 && (
                  <BlockStack gap="400">
                    <BlockStack gap="100">
                      <Text as="h2" variant="headingLg">
                        Choose Your Plan
                      </Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Select the plan that best fits your needs.
                      </Text>
                    </BlockStack>

                    <BlockStack gap="300">
                      {[
                        {
                          id: "free",
                          label: "Free",
                          price: "$0/month",
                          features: ["✓ 10 alerts/month", "✓ Email only", "✓ Basic support"],
                        },
                        {
                          id: "pro",
                          label: "Pro",
                          price: "$5/month",
                          features: ["✓ 500 email alerts/month", "✓ No WhatsApp", "✓ Priority support"],
                        },
                        {
                          id: "premium",
                          label: "Premium",
                          price: "$12/month",
                          features: ["✓ Unlimited emails", "✓ 500 WhatsApp/month", "✓ Premium support"],
                        },
                      ].map((plan) => (
                        <div
                          key={plan.id}
                          onClick={() => updateData({ plan: plan.id as "free" | "pro" | "premium" })}
                          style={{
                            padding: "20px",
                            border: `2px solid ${data.plan === plan.id ? "#667eea" : "#e0e0e0"}`,
                            borderRadius: "8px",
                            background: data.plan === plan.id ? "#f0f4ff" : "white",
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                        >
                          <BlockStack gap="200">
                            <Text as="h3" variant="headingMd">
                              {plan.label}
                            </Text>
                            <Text as="p" variant="headingXl" tone="success">
                              {plan.price}
                            </Text>
                            <BlockStack gap="100">
                              {plan.features.map((feature, idx) => (
                                <Text key={idx} as="p" variant="bodySm">
                                  {feature}
                                </Text>
                              ))}
                            </BlockStack>
                          </BlockStack>
                        </div>
                      ))}
                    </BlockStack>
                  </BlockStack>
                )}

                {/* Step 2: Thresholds */}
                {currentStep === 2 && (
                  <BlockStack gap="400">
                    <BlockStack gap="100">
                      <Text as="h2" variant="headingLg">
                        Configure Alert Thresholds
                      </Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Set how you want to be alerted about low stock.
                      </Text>
                    </BlockStack>

                    <BlockStack gap="300">
                      <BlockStack gap="200">
                        <Text as="h3" variant="headingMd">
                          Threshold Type
                        </Text>
                        <BlockStack gap="150">
                          <RadioButton
                            label="Quantity (Alert when below X units)"
                            checked={data.thresholdType === "quantity"}
                            onChange={() => updateData({ thresholdType: "quantity" })}
                          />
                          <RadioButton
                            label="Percentage (Alert when below X% of safety stock)"
                            checked={data.thresholdType === "percentage"}
                            onChange={() => updateData({ thresholdType: "percentage" })}
                          />
                        </BlockStack>
                      </BlockStack>

                      <TextField
                        label={
                          data.thresholdType === "quantity"
                            ? "Alert when quantity falls below:"
                            : "Alert when at less than:"
                        }
                        type="number"
                        value={String(data.thresholdValue)}
                        onChange={(val: string) => updateData({ thresholdValue: parseInt(val) })}
                        autoComplete="off"
                      />

                      {data.thresholdType === "percentage" && (
                        <BlockStack gap="200">
                          <TextField
                            label="Safety Stock Level (for percentage calculation):"
                            type="number"
                            value={String(data.safetyStock)}
                            onChange={(val: string) => updateData({ safetyStock: parseInt(val) })}
                            autoComplete="off"
                          />
                          <Text as="p" variant="bodySm" tone="subdued">
                            Alert will trigger when stock is below {data.thresholdValue}% of {data.safetyStock} = {Math.floor((data.thresholdValue / 100) * data.safetyStock)} units
                          </Text>
                        </BlockStack>
                      )}
                    </BlockStack>
                  </BlockStack>
                )}

                {/* Step 3: Notification Method */}
                {currentStep === 3 && (
                  <BlockStack gap="400">
                    <BlockStack gap="100">
                      <Text as="h2" variant="headingLg">
                        Choose Notification Method
                      </Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        How do you want to receive low stock alerts?
                      </Text>
                    </BlockStack>

                    <BlockStack gap="200">
                      <Text as="h3" variant="headingMd">
                        Notification Channels
                      </Text>
                      <BlockStack gap="150">
                        <RadioButton
                          label="📧 Email"
                          checked={data.notificationMethod === "email"}
                          onChange={() => updateData({ notificationMethod: "email" })}
                        />
                        {data.plan !== "pro" && (
                          <>
                            <RadioButton
                              label="💬 WhatsApp"
                              checked={data.notificationMethod === "whatsapp"}
                              onChange={() => updateData({ notificationMethod: "whatsapp" })}
                            />
                            <RadioButton
                              label="📧 Email + 💬 WhatsApp"
                              checked={data.notificationMethod === "both"}
                              onChange={() => updateData({ notificationMethod: "both" })}
                            />
                          </>
                        )}
                      </BlockStack>

                      {data.plan === "pro" && (
                        <Banner tone="info">
                          <Text as="p">WhatsApp is available on Pro and Premium plans only.</Text>
                        </Banner>
                      )}
                    </BlockStack>
                  </BlockStack>
                )}

                {/* Step 4: Phone Verification */}
                {currentStep === 4 && (
                  <BlockStack gap="400">
                    <BlockStack gap="100">
                      <Text as="h2" variant="headingLg">
                        Verify WhatsApp Number
                      </Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        {data.notificationMethod === "email"
                          ? "Skipping WhatsApp setup (email only selected)"
                          : "Enter your WhatsApp number for alerts"}
                      </Text>
                    </BlockStack>

                    {data.notificationMethod !== "email" && (
                      <TextField
                        label="WhatsApp Number"
                        type="tel"
                        placeholder="+1234567890"
                        value={data.whatsappNumber}
                        onChange={(val: string) => updateData({ whatsappNumber: val })}
                        helpText="Format: +1 followed by country code and number"
                        autoComplete="tel"
                      />
                    )}
                  </BlockStack>
                )}

                {/* Step 5: Batching */}
                {currentStep === 5 && (
                  <BlockStack gap="400">
                    <BlockStack gap="100">
                      <Text as="h2" variant="headingLg">
                        Configure Alert Batching
                      </Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Batch multiple alerts to reduce notification fatigue.
                      </Text>
                    </BlockStack>

                    <BlockStack gap="300">
                      <Checkbox
                        label="Enable alert batching (digest mode)"
                        checked={data.batchingEnabled}
                        onChange={(checked) => updateData({ batchingEnabled: checked })}
                      />

                      {data.batchingEnabled && (
                        <BlockStack gap="200">
                          <Text as="h3" variant="headingMd">
                            Batching Interval
                          </Text>
                          <BlockStack gap="150">
                            <RadioButton
                              label="Hourly digest"
                              checked={data.batchingInterval === "hourly"}
                              onChange={() => updateData({ batchingInterval: "hourly" })}
                            />
                            <RadioButton
                              label="Daily digest"
                              checked={data.batchingInterval === "daily"}
                              onChange={() => updateData({ batchingInterval: "daily" })}
                            />
                            <RadioButton
                              label="Weekly digest"
                              checked={data.batchingInterval === "weekly"}
                              onChange={() => updateData({ batchingInterval: "weekly" })}
                            />
                          </BlockStack>
                        </BlockStack>
                      )}
                    </BlockStack>
                  </BlockStack>
                )}

                {/* Step 6: Complete */}
                {currentStep === 6 && (
                  <BlockStack gap="400">
                    <BlockStack gap="100">
                      <Text as="h2" variant="headingLg">
                        🎉 All Set!
                      </Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Your Low Stock Alerts app is ready to go.
                      </Text>
                    </BlockStack>

                    <Card>
                      <BlockStack gap="200">
                        <Text as="h3" variant="headingMd">
                          Your Configuration:
                        </Text>
                        <BlockStack gap="100">
                          <Text as="p" variant="bodySm">
                            <strong>Plan:</strong> {data.plan.toUpperCase()}
                          </Text>
                          <Text as="p" variant="bodySm">
                            <strong>Alert Type:</strong>{" "}
                            {data.thresholdType === "quantity"
                              ? `Alert when below ${data.thresholdValue} units`
                              : `Alert when below ${data.thresholdValue}% of ${data.safetyStock} units`}
                          </Text>
                          <Text as="p" variant="bodySm">
                            <strong>Notifications:</strong>{" "}
                            {data.notificationMethod.toUpperCase()}
                          </Text>
                          {data.notificationMethod !== "email" && (
                            <Text as="p" variant="bodySm">
                              <strong>WhatsApp:</strong> {data.whatsappNumber}
                            </Text>
                          )}
                          <Text as="p" variant="bodySm">
                            <strong>Batching:</strong>{" "}
                            {data.batchingEnabled
                              ? `${data.batchingInterval.toUpperCase()} digest`
                              : "Disabled"}
                          </Text>
                        </BlockStack>
                      </BlockStack>
                    </Card>
                  </BlockStack>
                )}
              </BlockStack>

              {/* Navigation Buttons */}
              <InlineStack gap="200" align="end">
                <Button onClick={handlePrev} disabled={currentStep === 1}>
                  ← Previous
                </Button>

                {currentStep < 6 ? (
                  <Button onClick={handleNext} variant="primary">
                    Next →
                  </Button>
                ) : (
                  <Button
                    onClick={handleComplete}
                    disabled={loading}
                    variant="primary"
                  >
                    {loading ? "Saving..." : "Complete Setup"}
                  </Button>
                )}
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Box>
  );
}
