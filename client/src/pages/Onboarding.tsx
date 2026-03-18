import { useState } from "react";
import {
  Card,
  Layout,
  Button,
  TextField,
  RadioButton,
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
  thresholdType: "quantity" | "percentage";
  thresholdValue: number;
  safetyStock: number;
  notificationMethod: "email" | "whatsapp" | "both";
  notificationEmail: string;
  whatsappNumber: string;
  batchingEnabled: boolean;
  batchingInterval: "hourly" | "daily" | "weekly";
}

// Step definitions - now 5 steps instead of 6
const steps: OnboardingStep[] = [
  { step: 1, title: "Welcome", description: "Get started with Low Stock Alerts" },
  { step: 2, title: "Alert Threshold", description: "Configure alert thresholds" },
  { step: 3, title: "Notifications", description: "Choose notification method" },
  { step: 4, title: "Email Address", description: "Where to send alerts" },
  { step: 5, title: "WhatsApp Number", description: "WhatsApp alerts" },
  { step: 6, title: "Review", description: "Confirm your settings" },
];

const isValidEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const isValidWhatsApp = (num: string): boolean => {
  const cleaned = num.replace(/\s+/g, '');
  const regex = /^\+\d{1,3}\d{1,14}$/;
  return regex.test(cleaned);
};

// Helper to determine which step to show next based on notification method
const getNextStep = (currentStep: number, notificationMethod: string): number => {
  if (currentStep === 3) {
    // After notification method selection
    if (notificationMethod === "email") {
      return 4; // Go to Email step
    } else if (notificationMethod === "whatsapp") {
      return 5; // Go to WhatsApp step
    } else if (notificationMethod === "both") {
      return 4; // Go to Email step first
    }
  }
  
  if (currentStep === 4 && notificationMethod === "both") {
    return 5; // Go to WhatsApp after Email
  }
  
  // Default: next step
  return currentStep + 1;
};

// Helper to determine if current step should be shown
const shouldShowStep = (step: number, notificationMethod: string): boolean => {
  if (step === 4) {
    // Show email step only if email is selected
    return notificationMethod === "email" || notificationMethod === "both";
  }
  if (step === 5) {
    // Show whatsapp step only if whatsapp is selected
    return notificationMethod === "whatsapp" || notificationMethod === "both";
  }
  return true;
};

export default function Onboarding() {
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
    // Validate current step
    switch (currentStep) {
      case 3: // Notification method
        break; // No validation needed
      case 4: // Email address
        if (data.notificationMethod.includes("email") as any) {
          if (!data.notificationEmail || !isValidEmail(data.notificationEmail)) {
            setError("Please enter a valid email address");
            return;
          }
        }
        break;
      case 5: // WhatsApp number
        if (data.notificationMethod.includes("whatsapp") as any) {
          if (!data.whatsappNumber || !isValidWhatsApp(data.whatsappNumber)) {
            setError("Please enter a valid WhatsApp number (format: +1 555 123 4567)");
            return;
          }
        }
        break;
    }

    setError(null);
    const nextStep = getNextStep(currentStep, data.notificationMethod);
    
    // Skip steps that shouldn't be shown
    if (!shouldShowStep(nextStep, data.notificationMethod)) {
      setCurrentStep(nextStep + 1);
    } else {
      setCurrentStep(nextStep);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      let prevStep = currentStep - 1;
      
      // Skip steps that shouldn't be shown
      while (prevStep > 1 && !shouldShowStep(prevStep, data.notificationMethod)) {
        prevStep--;
      }
      
      setCurrentStep(prevStep);
      setError(null);
    }
  };

  const handleComplete = async () => {
    // Final validation
    if (data.notificationMethod.includes("email") as any) {
      if (!data.notificationEmail || !isValidEmail(data.notificationEmail)) {
        setError("Please enter a valid email address");
        return;
      }
    }

    if (data.notificationMethod.includes("whatsapp") as any) {
      if (!data.whatsappNumber || !isValidWhatsApp(data.whatsappNumber)) {
        setError("Please enter a valid WhatsApp number");
        return;
      }
    }

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
          plan: "free", // Auto-assign Free plan
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

  const handleSkip = () => {
    // "Remind me later" - just redirect to dashboard
    const params = new URLSearchParams(window.location.search);
    const shop = params.get("shop");
    window.location.href = `/dashboard?shop=${shop}`;
  };

  // Calculate visible steps for progress bar
  const visibleSteps = steps.filter(s => {
    if (s.step >= 4 && s.step <= 5) {
      return shouldShowStep(s.step, data.notificationMethod);
    }
    return true;
  });

  const progressPercent = (visibleSteps.findIndex(s => s.step === currentStep) + 1) / visibleSteps.length * 100;

  return (
    <Box paddingBlockStart="400" paddingBlockEnd="400">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              {/* Progress Bar */}
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
              <InlineStack gap="200" align="center" wrap={true}>
                {visibleSteps.map((s) => (
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

                {/* Step 1: Welcome & Benefits */}
                {currentStep === 1 && (
                  <BlockStack gap="400">
                    <BlockStack gap="100">
                      <Text as="h2" variant="headingXl">
                        🚀 Welcome to Low Stock Alerts
                      </Text>
                      <Text as="p" variant="bodyMd">
                        Never miss a stockout. Get real-time alerts when your inventory gets low.
                      </Text>
                    </BlockStack>

                    <Card>
                      <BlockStack gap="200">
                        <Text as="h3" variant="headingMd">
                          Why merchants love this app:
                        </Text>
                        <BlockStack gap="100">
                          <Text as="p">✓ Get alerts via email or WhatsApp</Text>
                          <Text as="p">✓ Prevent lost sales from out-of-stock items</Text>
                          <Text as="p">✓ Reduce manual inventory checking</Text>
                          <Text as="p">✓ Works across all your products</Text>
                        </BlockStack>
                      </BlockStack>
                    </Card>
                  </BlockStack>
                )}

                {/* Step 2: Alert Threshold */}
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
                        onChange={(val: string) => updateData({ thresholdValue: parseInt(val) || 0 })}
                        autoComplete="off"
                      />

                      {data.thresholdType === "percentage" && (
                        <BlockStack gap="200">
                          <TextField
                            label="Safety Stock Level (for percentage calculation):"
                            type="number"
                            value={String(data.safetyStock)}
                            onChange={(val: string) => updateData({ safetyStock: parseInt(val) || 0 })}
                            autoComplete="off"
                          />
                          <Text as="p" variant="bodySm" tone="subdued">
                            Alert will trigger when stock is below {data.thresholdValue}% of {data.safetyStock} = {Math.floor((data.thresholdValue / 100) * data.safetyStock)} units
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            You can customize safety stock for individual products in settings later.
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
                        How should we notify you?
                      </Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Choose how you want to receive low stock alerts.
                      </Text>
                    </BlockStack>

                    <BlockStack gap="300">
                      <Text as="h3" variant="headingMd">
                        Notification Channels
                      </Text>
                      <BlockStack gap="200">
                        <RadioButton
                          label="📧 Email only"
                          value="email"
                          checked={data.notificationMethod === "email"}
                          onChange={() => updateData({ notificationMethod: "email" })}
                        />
                        <RadioButton
                          label="💬 WhatsApp only"
                          value="whatsapp"
                          checked={data.notificationMethod === "whatsapp"}
                          onChange={() => updateData({ notificationMethod: "whatsapp" })}
                        />
                        <RadioButton
                          label="📧 Email + 💬 WhatsApp"
                          value="both"
                          checked={data.notificationMethod === "both"}
                          onChange={() => updateData({ notificationMethod: "both" })}
                        />
                      </BlockStack>

                      <Banner tone="info">
                        <Text as="p">
                          All notification methods are available to get started. Plan restrictions apply after onboarding.
                        </Text>
                      </Banner>
                    </BlockStack>
                  </BlockStack>
                )}

                {/* Step 4: Email Address */}
                {currentStep === 4 && shouldShowStep(4, data.notificationMethod) && (
                  <BlockStack gap="400">
                    <BlockStack gap="100">
                      <Text as="h2" variant="headingLg">
                        Where should we send email alerts?
                      </Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        We'll send low stock alerts to this email address.
                      </Text>
                    </BlockStack>

                    <TextField
                      label="Email Address"
                      type="email"
                      value={data.notificationEmail}
                      onChange={(val: string) => updateData({ notificationEmail: val })}
                      placeholder="alerts@yourstore.com"
                      helpText="Change this if you prefer a different email"
                      error={
                        data.notificationEmail && !isValidEmail(data.notificationEmail)
                          ? "Please enter a valid email address"
                          : ""
                      }
                      autoComplete="email"
                    />
                  </BlockStack>
                )}

                {/* Step 5: WhatsApp Number */}
                {currentStep === 5 && shouldShowStep(5, data.notificationMethod) && (
                  <BlockStack gap="400">
                    <BlockStack gap="100">
                      <Text as="h2" variant="headingLg">
                        What's your WhatsApp number?
                      </Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        We'll send low stock alerts to this number.
                      </Text>
                    </BlockStack>

                    <TextField
                      label="WhatsApp Number"
                      type="tel"
                      value={data.whatsappNumber}
                      onChange={(val: string) => updateData({ whatsappNumber: val })}
                      placeholder="+1 (555) 123-4567"
                      helpText="Format: +[country code][number], e.g., +1 (555) 123-4567"
                      error={
                        data.whatsappNumber && !isValidWhatsApp(data.whatsappNumber)
                          ? "Invalid format. Use: +1 (555) 123-4567"
                          : ""
                      }
                      autoComplete="tel"
                    />
                  </BlockStack>
                )}

                {/* Step 6: Review & Complete */}
                {currentStep === 6 && (
                  <BlockStack gap="400">
                    <BlockStack gap="100">
                      <Text as="h2" variant="headingLg">
                        🎉 You're all set!
                      </Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Here's a summary of your Low Stock Alerts configuration.
                      </Text>
                    </BlockStack>

                    <Card>
                      <BlockStack gap="300">
                        <BlockStack gap="200">
                          <BlockStack gap="100">
                            <Text as="h3" variant="headingMd">
                              Your Configuration:
                            </Text>
                            <Text as="p" variant="bodySm">
                              <strong>Plan:</strong> Free
                            </Text>
                            <Text as="p" variant="bodySm">
                              <strong>Alert Type:</strong>{" "}
                              {data.thresholdType === "quantity"
                                ? `Alert when below ${data.thresholdValue} units`
                                : `Alert when below ${data.thresholdValue}% of ${data.safetyStock} units`}
                            </Text>
                            <Text as="p" variant="bodySm">
                              <strong>Notifications:</strong>{" "}
                              {data.notificationMethod === "email"
                                ? "Email only"
                                : data.notificationMethod === "whatsapp"
                                  ? "WhatsApp only"
                                  : "Email + WhatsApp"}
                            </Text>
                            {(data.notificationMethod === "email" || data.notificationMethod === "both") && (
                              <Text as="p" variant="bodySm">
                                <strong>Email:</strong> {data.notificationEmail}
                              </Text>
                            )}
                            {(data.notificationMethod === "whatsapp" || data.notificationMethod === "both") && (
                              <Text as="p" variant="bodySm">
                                <strong>WhatsApp:</strong> {data.whatsappNumber}
                              </Text>
                            )}
                          </BlockStack>
                        </BlockStack>

                        <Banner tone="info">
                          <Text as="p" variant="bodySm">
                            You can customize these settings and set thresholds for individual products in the Settings page.
                          </Text>
                        </Banner>
                      </BlockStack>
                    </Card>
                  </BlockStack>
                )}
              </BlockStack>

              {/* Navigation Buttons */}
              <InlineStack gap="200" align="end">
                {currentStep === 1 ? (
                  <>
                    <Button onClick={handleSkip} variant="plain">
                      Remind me later
                    </Button>
                    <Button onClick={handleNext} variant="primary">
                      Get Started
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={handlePrev} disabled={currentStep === 1}>
                      ← Previous
                    </Button>

                    {currentStep < 6 ? (
                      <Button
                        onClick={handleNext}
                        variant="primary"
                        disabled={
                          (currentStep === 4 && data.notificationMethod.includes("email") as any && !isValidEmail(data.notificationEmail)) ||
                          (currentStep === 5 && data.notificationMethod.includes("whatsapp") as any && !isValidWhatsApp(data.whatsappNumber))
                        }
                      >
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
                  </>
                )}
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Box>
  );
}
