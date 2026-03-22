/**
 * Twilio WhatsApp Service
 * Note: Twilio SDK can be installed later when credentials are ready
 */

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  whatsappFrom: string; // e.g., whatsapp:+1234567890
}

let twilioClient: any = null;

/**
 * Initialize Twilio client
 */
export function initTwilio(config: TwilioConfig): void {
  try {
    // Lazy load Twilio only when needed
    const twilio = require("twilio");
    twilioClient = twilio(config.accountSid, config.authToken);
    console.log("[twilio] Twilio client initialized");
  } catch (error) {
    console.warn("[twilio] Twilio SDK not installed. WhatsApp alerts will be simulated.");
  }
}

/**
 * Validate WhatsApp phone number format
 * Valid formats: +1234567890, 1234567890
 */
export function validateWhatsAppNumber(phoneNumber: string): boolean {
  // Remove spaces and dashes
  const cleaned = phoneNumber.replace(/[\s\-]/g, "");

  // Must start with + or be 10+ digits
  if (cleaned.startsWith("+")) {
    return /^\+[1-9]\d{1,14}$/.test(cleaned); // E.164 format
  }

  return /^[1-9]\d{9,14}$/.test(cleaned); // At least 10 digits
}

/**
 * Normalize phone number to E.164 format
 */
export function normalizePhoneNumber(phoneNumber: string): string {
  let normalized = phoneNumber.replace(/[\s\-()]/g, "");

  // Add + if not present and assume US if no country code
  if (!normalized.startsWith("+")) {
    if (!normalized.startsWith("1") && normalized.length === 10) {
      normalized = "1" + normalized;
    }
    normalized = "+" + normalized;
  }

  return normalized;
}

/**
 * Send WhatsApp message
 */
export async function sendWhatsAppMessage(
  toPhoneNumber: string,
  message: string,
  maxRetries: number = 3
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!validateWhatsAppNumber(toPhoneNumber)) {
      return {
        success: false,
        error: `Invalid phone number format: ${toPhoneNumber}`,
      };
    }

    const normalizedNumber = normalizePhoneNumber(toPhoneNumber);

    // If Twilio not available, simulate
    if (!twilioClient) {
      console.log(
        `[twilio] SIMULATED WhatsApp to ${normalizedNumber}: ${message.substring(
          0,
          50
        )}...`
      );
      return {
        success: true,
        messageId: `simulated_${Date.now()}`,
      };
    }

    // Validate the FROM number
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM || "";
    if (!fromNumber || !validateWhatsAppNumber(fromNumber)) {
      console.error(`[twilio] TWILIO_WHATSAPP_FROM is not set or invalid: "${fromNumber}"`);
      return {
        success: false,
        error: `TWILIO_WHATSAPP_FROM environment variable is not set or invalid. Current value: "${fromNumber}". Set it to your Twilio WhatsApp-enabled number (e.g., +14155238886).`,
      };
    }

    const normalizedFrom = normalizePhoneNumber(fromNumber);
    console.log(`[twilio] Sending from whatsapp:${normalizedFrom} to whatsapp:${normalizedNumber}`);

    // Send via Twilio with retry logic
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await twilioClient.messages.create({
          from: `whatsapp:${normalizedFrom}`,
          to: `whatsapp:${normalizedNumber}`,
          body: message,
        });

        console.log(
          `[twilio] WhatsApp sent to ${normalizedNumber}: ${response.sid}`
        );

        return {
          success: true,
          messageId: response.sid,
        };
      } catch (error: any) {
        lastError = error;
        console.warn(
          `[twilio] Attempt ${attempt}/${maxRetries} failed: ${error.message}`
        );

        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt - 1) * 1000)
          );
        }
      }
    }

    return {
      success: false,
      error: `Failed to send after ${maxRetries} attempts: ${lastError?.message}`,
    };
  } catch (error: any) {
    console.error("[twilio] Error sending WhatsApp:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Format low stock alert message for WhatsApp
 */
export function formatAlertMessage(
  productName: string,
  currentQuantity: number,
  threshold: number,
  locationName?: string
): string {
  const location = locationName ? ` at ${locationName}` : "";
  return (
    `🚨 Low Stock Alert!\n\n` +
    `Product: ${productName}${location}\n` +
    `Current Stock: ${currentQuantity} units\n` +
    `Alert Threshold: ${threshold} units\n\n` +
    `Please restock as soon as possible.`
  );
}

/**
 * Format batched alerts message for WhatsApp
 */
export function formatBatchedAlertsMessage(
  alerts: Array<{
    productName: string;
    quantity: number;
    threshold: number;
    location?: string;
  }>
): string {
  let message = `📦 Inventory Batch Alert\n\n${alerts.length} products need attention:\n\n`;

  alerts.forEach((alert, index) => {
    const location = alert.location ? ` (${alert.location})` : "";
    message += `${index + 1}. ${alert.productName}${location}\n`;
    message += `   Stock: ${alert.quantity} / ${alert.threshold}\n`;
  });

  message += `\nPlease review your inventory.`;
  return message;
}

/**
 * Check Twilio availability
 */
export function isTwilioAvailable(): boolean {
  return twilioClient !== null;
}
