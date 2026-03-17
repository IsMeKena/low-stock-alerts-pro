import { useState } from "react";
import "./Onboarding.css";

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
    <div className="onboarding-container">
      <div className="onboarding-card">
        {/* Progress Bar */}
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>

        {/* Step Indicators */}
        <div className="step-indicators">
          {steps.map((s) => (
            <div
              key={s.step}
              className={`step-indicator ${
                currentStep === s.step
                  ? "active"
                  : currentStep > s.step
                    ? "completed"
                    : ""
              }`}
              onClick={() => currentStep > s.step && setCurrentStep(s.step)}
            >
              {currentStep > s.step ? "✓" : s.step}
            </div>
          ))}
        </div>

        {/* Current Step Content */}
        <div className="step-content">
          {error && <div className="error-message">{error}</div>}

          {/* Step 1: Plan Selection */}
          {currentStep === 1 && (
            <div>
              <h2>Choose Your Plan</h2>
              <p className="step-description">
                Select the plan that best fits your needs.
              </p>

              <div className="plan-options">
                <div
                  className={`plan-card ${data.plan === "free" ? "selected" : ""}`}
                  onClick={() => updateData({ plan: "free" })}
                >
                  <h3>Free</h3>
                  <p className="price">$0/month</p>
                  <ul>
                    <li>✓ 10 alerts/month</li>
                    <li>✓ Email only</li>
                    <li>✓ Basic support</li>
                  </ul>
                </div>

                <div
                  className={`plan-card ${data.plan === "pro" ? "selected" : ""}`}
                  onClick={() => updateData({ plan: "pro" })}
                >
                  <h3>Pro</h3>
                  <p className="price">$5/month</p>
                  <ul>
                    <li>✓ 500 email alerts/month</li>
                    <li>✓ No WhatsApp</li>
                    <li>✓ Priority support</li>
                  </ul>
                </div>

                <div
                  className={`plan-card ${data.plan === "premium" ? "selected" : ""}`}
                  onClick={() => updateData({ plan: "premium" })}
                >
                  <h3>Premium</h3>
                  <p className="price">$12/month</p>
                  <ul>
                    <li>✓ Unlimited emails</li>
                    <li>✓ 500 WhatsApp/month</li>
                    <li>✓ Premium support</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Thresholds */}
          {currentStep === 2 && (
            <div>
              <h2>Configure Alert Thresholds</h2>
              <p className="step-description">
                Set how you want to be alerted about low stock.
              </p>

              <div className="form-group">
                <label>Threshold Type</label>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      name="thresholdType"
                      value="quantity"
                      checked={data.thresholdType === "quantity"}
                      onChange={() =>
                        updateData({ thresholdType: "quantity" })
                      }
                    />
                    Quantity (Alert when below X units)
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="thresholdType"
                      value="percentage"
                      checked={data.thresholdType === "percentage"}
                      onChange={() =>
                        updateData({ thresholdType: "percentage" })
                      }
                    />
                    Percentage (Alert when below X% of safety stock)
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>
                  {data.thresholdType === "quantity"
                    ? "Alert when quantity falls below:"
                    : "Alert when at less than:"}
                </label>
                <input
                  type="number"
                  value={data.thresholdValue}
                  onChange={(e) =>
                    updateData({ thresholdValue: parseInt(e.target.value) })
                  }
                  min="1"
                  max={data.thresholdType === "percentage" ? "100" : "1000"}
                />
                {data.thresholdType === "percentage" && <span>%</span>}
                {data.thresholdType === "percentage" && (
                  <div>
                    <label style={{ marginTop: "15px" }}>
                      Safety Stock Level (for percentage calculation):
                    </label>
                    <input
                      type="number"
                      value={data.safetyStock}
                      onChange={(e) =>
                        updateData({ safetyStock: parseInt(e.target.value) })
                      }
                      min="1"
                    />
                    <small>
                      Alert will trigger when stock is below {data.thresholdValue}% of {data.safetyStock} = {Math.floor((data.thresholdValue / 100) * data.safetyStock)} units
                    </small>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Notification Method */}
          {currentStep === 3 && (
            <div>
              <h2>Choose Notification Method</h2>
              <p className="step-description">
                How do you want to receive low stock alerts?
              </p>

              <div className="form-group">
                <label>Notification Channels</label>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      name="notificationMethod"
                      value="email"
                      checked={data.notificationMethod === "email"}
                      onChange={() =>
                        updateData({ notificationMethod: "email" })
                      }
                    />
                    📧 Email
                  </label>
                  {data.plan !== "pro" && (
                    <label>
                      <input
                        type="radio"
                        name="notificationMethod"
                        value="whatsapp"
                        checked={data.notificationMethod === "whatsapp"}
                        onChange={() =>
                          updateData({ notificationMethod: "whatsapp" })
                        }
                      />
                      💬 WhatsApp
                    </label>
                  )}
                  {data.plan !== "pro" && (
                    <label>
                      <input
                        type="radio"
                        name="notificationMethod"
                        value="both"
                        checked={data.notificationMethod === "both"}
                        onChange={() =>
                          updateData({ notificationMethod: "both" })
                        }
                      />
                      📧 Email + 💬 WhatsApp
                    </label>
                  )}
                </div>
                {data.plan === "pro" && (
                  <p className="info-message">
                    WhatsApp is available on Pro and Premium plans only.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Phone Verification */}
          {currentStep === 4 && (
            <div>
              <h2>Verify WhatsApp Number</h2>
              <p className="step-description">
                {data.notificationMethod === "email"
                  ? "Skipping WhatsApp setup (email only selected)"
                  : "Enter your WhatsApp number for alerts"}
              </p>

              {data.notificationMethod !== "email" && (
                <div className="form-group">
                  <label>WhatsApp Number</label>
                  <input
                    type="tel"
                    placeholder="+1234567890"
                    value={data.whatsappNumber}
                    onChange={(e) =>
                      updateData({ whatsappNumber: e.target.value })
                    }
                  />
                  <small>Format: +1 followed by country code and number</small>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Batching */}
          {currentStep === 5 && (
            <div>
              <h2>Configure Alert Batching</h2>
              <p className="step-description">
                Batch multiple alerts to reduce notification fatigue.
              </p>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={data.batchingEnabled}
                    onChange={(e) =>
                      updateData({ batchingEnabled: e.target.checked })
                    }
                  />
                  Enable alert batching (digest mode)
                </label>
              </div>

              {data.batchingEnabled && (
                <div className="form-group">
                  <label>Batching Interval</label>
                  <div className="radio-group">
                    <label>
                      <input
                        type="radio"
                        name="batchingInterval"
                        value="hourly"
                        checked={data.batchingInterval === "hourly"}
                        onChange={() =>
                          updateData({ batchingInterval: "hourly" })
                        }
                      />
                      Hourly digest
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="batchingInterval"
                        value="daily"
                        checked={data.batchingInterval === "daily"}
                        onChange={() =>
                          updateData({ batchingInterval: "daily" })
                        }
                      />
                      Daily digest
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="batchingInterval"
                        value="weekly"
                        checked={data.batchingInterval === "weekly"}
                        onChange={() =>
                          updateData({ batchingInterval: "weekly" })
                        }
                      />
                      Weekly digest
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 6: Complete */}
          {currentStep === 6 && (
            <div>
              <h2>🎉 All Set!</h2>
              <p className="step-description">
                Your Low Stock Alerts app is ready to go.
              </p>

              <div className="summary">
                <h3>Your Configuration:</h3>
                <ul>
                  <li>
                    <strong>Plan:</strong> {data.plan.toUpperCase()}
                  </li>
                  <li>
                    <strong>Alert Type:</strong>{" "}
                    {data.thresholdType === "quantity"
                      ? `Alert when below ${data.thresholdValue} units`
                      : `Alert when below ${data.thresholdValue}% of ${data.safetyStock} units`}
                  </li>
                  <li>
                    <strong>Notifications:</strong>{" "}
                    {data.notificationMethod.toUpperCase()}
                  </li>
                  {data.notificationMethod !== "email" && (
                    <li>
                      <strong>WhatsApp:</strong> {data.whatsappNumber}
                    </li>
                  )}
                  <li>
                    <strong>Batching:</strong>{" "}
                    {data.batchingEnabled
                      ? `${data.batchingInterval.toUpperCase()} digest`
                      : "Disabled"}
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="button-group">
          <button
            onClick={handlePrev}
            disabled={currentStep === 1}
            className="button secondary"
          >
            ← Previous
          </button>

          {currentStep < 6 ? (
            <button onClick={handleNext} className="button primary">
              Next →
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={loading}
              className="button primary"
            >
              {loading ? "Saving..." : "Complete Setup"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
