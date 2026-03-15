import Queue from "bull";
import { processProductCreate, processProductUpdate, processInventoryUpdate } from "./webhook-processors";

/**
 * Initialize webhook queue
 * Using Bull queue for reliable async webhook processing
 */
const webhookQueue = new Queue("webhooks", {
  // Use default connection (will use REDIS_URL env var if available, else defaults to localhost:6379)
  redis: process.env.REDIS_URL || { host: "127.0.0.1", port: 6379 },
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: {
      type: "exponential",
      delay: 2000, // Start with 2 seconds, exponentially increase
    },
    removeOnComplete: true, // Clean up completed jobs
  },
});

/**
 * Process different webhook types
 */
webhookQueue.process(async (job) => {
  const { topic, shop, payload } = job.data;
  const jobId = job.id;

  try {
    console.log(`[webhook-queue] Processing ${topic} for ${shop} (job ${jobId})`);

    switch (topic) {
      case "products/create":
        await processProductCreate(shop, payload);
        break;
      case "products/update":
        await processProductUpdate(shop, payload);
        break;
      case "inventory_levels/update":
        await processInventoryUpdate(shop, payload);
        break;
      default:
        console.warn(`[webhook-queue] Unknown webhook topic: ${topic}`);
    }

    console.log(`[webhook-queue] Successfully processed ${topic} for ${shop} (job ${jobId})`);
  } catch (error) {
    console.error(`[webhook-queue] Error processing ${topic} for ${shop}:`, error);
    // Bull will handle retries automatically based on backoff config
    throw error;
  }
});

/**
 * Handle queue events for logging and monitoring
 */
webhookQueue.on("completed", (job) => {
  console.log(`[webhook-queue] Job ${job.id} completed successfully`);
});

webhookQueue.on("failed", (job, err) => {
  console.error(`[webhook-queue] Job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);
});

webhookQueue.on("error", (error) => {
  console.error("[webhook-queue] Queue error:", error);
});

/**
 * Add webhook to queue
 * Returns immediately without waiting for processing
 * This ensures we respond to Shopify within 5 seconds
 */
export async function enqueueWebhook(
  topic: string,
  shop: string,
  payload: any
): Promise<boolean> {
  try {
    const job = await webhookQueue.add(
      { topic, shop, payload },
      {
        jobId: `${topic}__${shop}__${Date.now()}`, // Unique job ID for idempotency
      }
    );

    console.log(`[webhook-queue] Enqueued ${topic} for ${shop} (job ${job.id})`);
    return true;
  } catch (error) {
    console.error(`[webhook-queue] Failed to enqueue ${topic} for ${shop}:`, error);
    return false;
  }
}

/**
 * Check queue status (for debugging/monitoring)
 */
export async function getQueueStats() {
  try {
    const [pending, active, completed, failed] = await Promise.all([
      webhookQueue.getWaitingCount(),
      webhookQueue.getActiveCount(),
      webhookQueue.getCompletedCount(),
      webhookQueue.getFailedCount(),
    ]);

    return { pending, active, completed, failed };
  } catch (error) {
    console.error("[webhook-queue] Error getting queue stats:", error);
    return { pending: 0, active: 0, completed: 0, failed: 0 };
  }
}

/**
 * Gracefully close the queue (call on server shutdown)
 */
export async function closeWebhookQueue() {
  try {
    await webhookQueue.close();
    console.log("[webhook-queue] Queue closed successfully");
  } catch (error) {
    console.error("[webhook-queue] Error closing queue:", error);
  }
}

export { webhookQueue };
