import { useEffect, useState } from "react";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const [shop, setShop] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [page, setPage] = useState<"install" | "authorize" | "onboard" | "dashboard">("install");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shopParam = params.get("shop");
    const hostParam = params.get("host");

    if (shopParam) {
      setShop(shopParam);
      
      // In embedded app context (has host param), trust Shopify's authentication
      // authenticatedFetch being available indicates we're in an embedded context
      if (hostParam) {
        console.log(`[app] Embedded app context detected, trusting Shopify session`);
        setAuthenticated(true);
        checkOnboardingStatus(shopParam);
        return;
      }

      // Non-embedded context: check if app is installed
      if (!hostParam) {
        checkInstalled(shopParam);
      }
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
        checkOnboardingStatus(shopDomain);
      } else {
        console.log(`[app] App not installed for ${shopDomain}, needs OAuth`);
        setAuthenticated(false);
        setPage("authorize");
        setLoading(false);
      }
    } catch (error) {
      console.error("[app] Installation check failed:", error);
      setError("Failed to check installation status");
      setAuthenticated(false);
      setPage("authorize");
      setLoading(false);
    }
  };

  const checkOnboardingStatus = async (shopDomain: string) => {
    try {
      const response = await fetch(`/api/onboarding/status?shop=${shopDomain}`);
      const data = await response.json();

      if (data.isOnboarded) {
        console.log(`[app] Onboarding complete for ${shopDomain}`);
        setIsOnboarded(true);
        setPage("dashboard");
      } else {
        console.log(`[app] Onboarding required for ${shopDomain}`);
        setIsOnboarded(false);
        setPage("onboard");
      }
    } catch (error) {
      console.error("[app] Onboarding check failed:", error);
      // If check fails, go to onboarding
      setPage("onboard");
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = () => {
    const shopInput = (document.getElementById("shopInput") as HTMLInputElement)?.value;
    if (shopInput) {
      const params = new URLSearchParams(window.location.search);
      const host = params.get("host");
      const hostParam = host ? `&host=${host}` : "";
      window.location.href = `/api/auth?shop=${shopInput}${hostParam}`;
    }
  };

  const handleAuthorize = () => {
    if (!shop) return;
    const params = new URLSearchParams(window.location.search);
    const host = params.get("host");
    const hostParam = host ? `&host=${host}` : "";
    window.location.href = `/api/auth?shop=${shop}${hostParam}`;
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

  if (page === "install") {
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

  if (page === "authorize") {
    return (
      <div className="container">
        <div className="card">
          <h2>Installing Low Stock Alerts...</h2>
          <p>Please complete the authentication process.</p>
          <p className="small">You will be redirected to Shopify to authorize the app.</p>
          <button
            onClick={handleAuthorize}
            className="button"
          >
            Authorize with Shopify
          </button>
        </div>
      </div>
    );
  }

  if (page === "onboard") {
    return <Onboarding />;
  }

  if (page === "dashboard") {
    return <Dashboard shop={shop} />;
  }

  return null;
}
