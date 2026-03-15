import axios from "axios";

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Send email via Mailgun
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const domain = process.env.MAILGUN_DOMAIN;
    const apiKey = process.env.MAILGUN_API_KEY;

    if (!domain || !apiKey) {
      console.log("[email] Mailgun credentials not configured, skipping email");
      return false;
    }

    const from = `Low Stock Alerts <noreply@${domain}>`;

    const response = await axios.post(
      `https://api.mailgun.net/v3/${domain}/messages`,
      {
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html || options.text,
      },
      {
        auth: {
          username: "api",
          password: apiKey,
        },
      }
    );

    console.log(`[email] Email sent to ${options.to}: ${response.data.id}`);
    return true;
  } catch (error) {
    console.error("[email] Error sending email:", error);
    return false;
  }
}

/**
 * Send low stock alert email
 */
export async function sendLowStockAlert(
  shopDomain: string,
  productTitle: string,
  quantity: number,
  threshold: number,
  recipientEmail: string
): Promise<boolean> {
  const subject = `🚨 Low Stock Alert: ${productTitle}`;

  const text = `
    Low Stock Alert

    Product: ${productTitle}
    Current Stock: ${quantity}
    Threshold: ${threshold}
    Shop: ${shopDomain}

    Please restock this item as soon as possible.
  `;

  const html = `
    <h2>🚨 Low Stock Alert</h2>
    <p><strong>Product:</strong> ${productTitle}</p>
    <p><strong>Current Stock:</strong> ${quantity}</p>
    <p><strong>Threshold:</strong> ${threshold}</p>
    <p><strong>Shop:</strong> ${shopDomain}</p>
    <p>Please restock this item as soon as possible.</p>
  `;

  return sendEmail({
    to: recipientEmail,
    subject,
    text,
    html,
  });
}

/**
 * Send daily stock summary email
 */
export async function sendDailyStockSummary(
  shopDomain: string,
  lowStockItems: Array<{
    productTitle: string;
    quantity: number;
    threshold: number;
  }>,
  recipientEmail: string
): Promise<boolean> {
  const itemsList = lowStockItems
    .map((item) => `- ${item.productTitle}: ${item.quantity}/${item.threshold}`)
    .join("\n");

  const subject = `Daily Stock Summary: ${lowStockItems.length} items low`;

  const text = `
    Daily Stock Summary for ${shopDomain}

    Low Stock Items (${lowStockItems.length}):
    ${itemsList}

    Log in to Low Stock Alerts to manage inventory.
  `;

  const html = `
    <h2>Daily Stock Summary</h2>
    <p>Shop: <strong>${shopDomain}</strong></p>
    <h3>Low Stock Items (${lowStockItems.length})</h3>
    <ul>
      ${lowStockItems
        .map(
          (item) =>
            `<li>${item.productTitle}: <strong>${item.quantity}/${item.threshold}</strong></li>`
        )
        .join("")}
    </ul>
    <p>Log in to Low Stock Alerts to manage inventory.</p>
  `;

  return sendEmail({
    to: recipientEmail,
    subject,
    text,
    html,
  });
}
