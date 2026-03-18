import { useState } from "react";
import { Banner, BlockStack, Text } from "@shopify/polaris";

interface UpsellBannerProps {
  userPlan: string;
  selectedWhatsApp: boolean;
  onUpgrade: () => void;
  onDismiss?: () => void;
}

export function UpsellBanner({
  userPlan,
  selectedWhatsApp,
  onUpgrade,
  onDismiss,
}: UpsellBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Only show if: WhatsApp selected AND plan is Free or Pro (NOT Premium)
  if (
    dismissed ||
    !selectedWhatsApp ||
    userPlan === "premium" ||
    userPlan === "Premium"
  ) {
    return null;
  }

  return (
    <Banner
      title="🚀 Unlock WhatsApp Notifications"
      tone="info"
      action={{
        content: "Upgrade to Premium",
        onAction: onUpgrade,
      }}
      onDismiss={() => {
        setDismissed(true);
        localStorage.setItem("dismissedUpsellBanner", "true");
        onDismiss?.();
      }}
    >
      <BlockStack gap="100">
        <Text as="p">
          You selected WhatsApp alerts, but this feature is only available on
          our Premium plan.
        </Text>
        <Text as="p" variant="bodySm">
          Upgrade now to get WhatsApp notifications for all your products.
        </Text>
      </BlockStack>
    </Banner>
  );
}
