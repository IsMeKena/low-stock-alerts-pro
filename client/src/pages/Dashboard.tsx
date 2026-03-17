import { useEffect, useState } from "react";
import "./Dashboard.css";

interface DashboardProps {
  shop: string | null;
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

export default function Dashboard({ shop }: DashboardProps) {
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (shop) {
      fetchBillingInfo();
    }
  }, [shop]);

  const fetchBillingInfo = async () => {
    try {
      const response = await fetch(`/api/billing/plan?shop=${shop}`);
      if (!response.ok) throw new Error("Failed to fetch billing info");

      const data = await response.json();
      setBilling(data.usage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-card">
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-card error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>📊 Low Stock Alerts Dashboard</h1>
        <p className="store-name">{shop}</p>
      </div>

      {/* Billing & Usage Section */}
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>📋 Current Plan</h3>
          <div className="plan-badge">{billing?.plan?.toUpperCase()}</div>
        </div>

        <div className="dashboard-card">
          <h3>📧 Email Usage</h3>
          <div className="usage-bar">
            <div
              className="usage-fill"
              style={{
                width:
                  typeof billing?.emailLimit === "string"
                    ? "100%"
                    : `${(billing!.emailUsed / (billing!.emailLimit as number)) * 100}%`,
              }}
            />
          </div>
          <p className="usage-text">
            {billing?.emailUsed} / {billing?.emailLimit}
          </p>
        </div>

        <div className="dashboard-card">
          <h3>💬 WhatsApp Usage</h3>
          <div className="usage-bar">
            <div
              className="usage-fill"
              style={{
                width:
                  typeof billing?.whatsappLimit === "string" ||
                  billing?.whatsappLimit === 0
                    ? "0%"
                    : `${(billing!.whatsappUsed / (billing!.whatsappLimit as number)) * 100}%`,
              }}
            />
          </div>
          <p className="usage-text">
            {billing?.whatsappUsed} / {billing?.whatsappLimit}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dashboard-section">
        <h3>⚙️ Quick Actions</h3>
        <div className="action-buttons">
          <button className="action-btn">Edit Thresholds</button>
          <button className="action-btn">Manage Notifications</button>
          <button className="action-btn">View Products</button>
          <button className="action-btn">Upgrade Plan</button>
        </div>
      </div>

      {/* Status Info */}
      <div className="dashboard-section">
        <h3>ℹ️ Information</h3>
        <p className="info-text">
          All systems operational. Alerts are being monitored for your products.
        </p>
      </div>
    </div>
  );
}
