import { useEffect, useState } from "react";
import {
  Card,
  Layout,
  Button,
  Text,
  Box,
  BlockStack,
  Banner,
  TextField,
} from "@shopify/polaris";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const [shop, setShop] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
        checkOnboardingStatus(shopDomain);
      } else {
        console.log(`[app] App not installed for ${shopDomain}, needs OAuth`);
        setPage("authorize");
        setLoading(false);
      }
    } catch (error) {
      console.error("[app] Installation check failed:", error);
      setError("Failed to check installation status");
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
        setPage("dashboard");
      } else {
        console.log(`[app] Onboarding required for ${shopDomain}`);
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
      <Box paddingBlockStart="400" paddingBlockEnd="400">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingLg">
                  Loading...
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Checking app installation status...
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Box>
    );
  }

  if (error) {
    return (
      <Box paddingBlockStart="400" paddingBlockEnd="400">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Banner tone="critical">
                  <Text as="p">{error}</Text>
                </Banner>
                <Button onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Box>
    );
  }

  if (page === "install") {
    return (
      <Box paddingBlockStart="400" paddingBlockEnd="400">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <Text as="h1" variant="headingLg">
                    Low Stock Alerts
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Enter your Shopify store domain to install the app
                  </Text>
                </BlockStack>

                <TextField
                  id="shopInput"
                  label="Store Domain"
                  placeholder="your-store.myshopify.com"
                  type="text"
                  autoComplete="off"
                />

                <Button
                  onClick={handleInstall}
                  variant="primary"
                  fullWidth
                >
                  Install App
                </Button>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Box>
    );
  }

  if (page === "authorize") {
    return (
      <Box paddingBlockStart="400" paddingBlockEnd="400">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingLg">
                    Installing Low Stock Alerts...
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Please complete the authentication process. You will be redirected to Shopify to authorize the app.
                  </Text>
                </BlockStack>

                <Button
                  onClick={handleAuthorize}
                  variant="primary"
                  fullWidth
                >
                  Authorize with Shopify
                </Button>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Box>
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
