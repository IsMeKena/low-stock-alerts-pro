import { useEffect, useState } from "react";

export default function App() {
  const [shop, setShop] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shopParam = params.get("shop");

    if (shopParam) {
      setShop(shopParam);
      checkInstalled(shopParam);
    } else {
      setLoading(false);
    }
  }, []);

  const checkInstalled = async (shopDomain: string) => {
    try {
      const response = await fetch(`/api/auth/installed?shop=${shopDomain}`);
      const data = await response.json();

      if (data.installed) {
        console.log(`[app] App is installed for ${shopDomain}`);
        setAuthenticated(true);
      } else {
        console.log(`[app] App not installed for ${shopDomain}, needs OAuth`);
        setAuthenticated(false);
      }
    } catch (error) {
      console.error("[app] Installation check failed:", error);
      setError("Failed to check installation status");
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = () => {
    const shopInput = (document.getElementById("shopInput") as HTMLInputElement)?.value;
    if (shopInput) {
      window.location.href = `/api/auth?shop=${shopInput}`;
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <h2>Loading...</h2>
          <p>Checking app installation status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="card error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="container">
        <div className="card">
          <h1>Low Stock Alerts</h1>
          <p>Enter your Shopify store domain to install the app</p>
          <input
            id="shopInput"
            type="text"
            placeholder="your-store.myshopify.com"
            className="input"
          />
          <button onClick={handleInstall} className="button">
            Install App
          </button>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="container">
        <div className="card">
          <h2>Installing Low Stock Alerts...</h2>
          <p>Please complete the authentication process.</p>
          <p className="small">You will be redirected to Shopify to authorize the app.</p>
          <button
            onClick={() => {
              window.location.href = `/api/auth?shop=${shop}`;
            }}
            className="button"
          >
            Authorize with Shopify
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Welcome to Low Stock Alerts! 🎉</h2>
        <p>Store: <strong>{shop}</strong></p>
        <p style={{ marginTop: "20px", color: "#666" }}>
          Dashboard and inventory monitoring coming soon...
        </p>
      </div>
    </div>
  );
}
