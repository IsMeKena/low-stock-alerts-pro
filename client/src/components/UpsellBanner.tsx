import { useState } from "react";
import { Banner, Text, BlockStack } from "@shopify/polaris";

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

  if (
    dismissed ||
    !selectedWhatsApp ||
    userPlan.toLowerCase() === "premium"
  ) {
    return null;
  }

  return (
    <Banner
      title="Unlock WhatsApp notifications"
      tone="info"
      action={{
        content: "Upgrade to Premium",
        onAction: onUpgrade,
      }}
      onDismiss={() => {
        setDismissed(true);
        onDismiss?.();
      }}
    >
      <BlockStack gap="100">
        <Text as="p">
          You selected WhatsApp alerts, but this feature is only available on
          the Premium plan.
        </Text>
        <Text as="p" variant="bodySm">
          Upgrade now to get WhatsApp notifications for all your products.
        </Text>
      </BlockStack>
    </Banner>
  );
}
