import { useEffect, useState, useCallback } from "react";
import { Routes, Route, useNavigate, useSearchParams } from "react-router-dom";
import { Frame, Loading } from "@shopify/polaris";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import { authenticatedFetch } from "./utils/fetch";

export default function App() {
  const [shop, setShop] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const checkOnboardingStatus = useCallback(
    async (shopDomain: string) => {
      try {
        const response = await authenticatedFetch(
          `/api/onboarding/status?shop=${shopDomain}`
        );
        const data = await response.json();

        setIsOnboarded(!!data.isOnboarded);

        if (!data.isOnboarded) {
          navigate("/onboarding");
        }
      } catch (error) {
        console.error("[app] Onboarding check failed:", error);
        navigate("/onboarding");
      } finally {
        setLoading(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    const shopParam = searchParams.get("shop");
    const hostParam = searchParams.get("host");

    if (shopParam) {
      setShop(shopParam);

      if (hostParam) {
        checkOnboardingStatus(shopParam);
        return;
      }

      checkInstalled(shopParam);
    } else {
      setLoading(false);
    }
  }, [searchParams, checkOnboardingStatus]);

  const checkInstalled = async (shopDomain: string) => {
    try {
      const response = await authenticatedFetch(
        `/api/auth/installed?shop=${shopDomain}`
      );
      const data = await response.json();

      if (data.installed) {
        checkOnboardingStatus(shopDomain);
      } else {
        window.location.href = `/api/auth?shop=${shopDomain}`;
      }
    } catch {
      window.location.href = `/api/auth?shop=${shopDomain}`;
    }
  };

  if (loading) {
    return (
      <Frame>
        <Loading />
      </Frame>
    );
  }

  return (
    <Frame>
      <ui-nav-menu>
        <a href="/" rel="home">
          Dashboard
        </a>
        <a href="/settings">Settings</a>
      </ui-nav-menu>

      <Routes>
        <Route
          path="/"
          element={<Dashboard shop={shop} isOnboarded={isOnboarded} />}
        />
        <Route
          path="/settings"
          element={<Settings shop={shop} />}
        />
        <Route
          path="/onboarding"
          element={
            <Onboarding
              shop={shop}
              onComplete={() => {
                setIsOnboarded(true);
                navigate("/");
              }}
            />
          }
        />
      </Routes>
    </Frame>
  );
}
