import Queue from "bull";
import { processProductCreate, processProductUpdate, processInventoryUpdate } from "./webhook-processors";

/**
 * Initialize webhook queue with graceful fallback
 * Uses Bull + Redis if available; falls back to synchronous processing
 */
let webhookQueue: Queue.Queue<any> | null = null;
let queueReady = false;

const initializeQueue = async () => {
  try {
    webhookQueue = new Queue("webhooks", {
      redis: process.env.REDIS_URL || { host: "127.0.0.1", port: 6379 },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: true,
      },
    });

    // Test connection
    await webhookQueue.client.ping();
    queueReady = true;
    console.log("[webhook-queue] ✅ Connected to Redis, queue ready");

    // Set up event handlers
    webhookQueue.on("completed", (job) => {
      console.log(`[webhook-queue] Job ${job.id} completed successfully`);
    });

    webhookQueue.on("failed", (job, err) => {
      console.error(`[webhook-queue] Job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);
    });

    webhookQueue.on("error", (error) => {
      console.error("[webhook-queue] Queue connection error:", error);
      // Don't switch to fallback yet - let the job retry mechanism handle it
    });

    webhookQueue.process(async (job) => {
      await processWebhook(job.data.topic, job.data.shop, job.data.payload, job.id);
    });
  } catch (error: any) {
    console.warn(`[webhook-queue] ⚠️  Redis unavailable (${error.code}), using synchronous fallback`);
    webhookQueue = null;
  }
};

/**
 * Process a webhook (shared logic for both queue and fallback)
 */
async function processWebhook(topic: string, shop: string, payload: any, jobId: string | number = "sync") {
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
    throw error;
  }
}

/**
 * Add webhook to queue (or process synchronously if Redis unavailable)
 * Returns immediately without waiting for processing
 */
export async function enqueueWebhook(
  topic: string,
  shop: string,
  payload: any
): Promise<boolean> {
  try {
    // If Redis is available, use the queue
    if (queueReady && webhookQueue) {
      const job = await webhookQueue.add(
        { topic, shop, payload },
        {
          jobId: `${topic}__${shop}__${Date.now()}`,
        }
      );
      console.log(`[webhook-queue] Enqueued ${topic} for ${shop} (job ${job.id})`);
      return true;
    }

    // Fallback: Process synchronously in background
    console.log(`[webhook-queue] (fallback mode) Processing ${topic} for ${shop} synchronously`);
    setImmediate(() => {
      processWebhook(topic, shop, payload, "sync").catch((error) => {
        console.error(`[webhook-queue] Fallback processing failed:`, error);
      });
    });

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
  if (!queueReady || !webhookQueue) {
    return { pending: 0, active: 0, completed: 0, failed: 0, mode: "fallback" };
  }

  try {
    const [pending, active, completed, failed] = await Promise.all([
      webhookQueue.getWaitingCount(),
      webhookQueue.getActiveCount(),
      webhookQueue.getCompletedCount(),
      webhookQueue.getFailedCount(),
    ]);

    return { pending, active, completed, failed, mode: "redis" };
  } catch (error) {
    console.error("[webhook-queue] Error getting queue stats:", error);
    return { pending: 0, active: 0, completed: 0, failed: 0, mode: "error" };
  }
}

/**
 * Gracefully close the queue (call on server shutdown)
 */
export async function closeWebhookQueue() {
  if (!webhookQueue) {
    console.log("[webhook-queue] No queue to close (fallback mode)");
    return;
  }

  try {
    await webhookQueue.close();
    console.log("[webhook-queue] Queue closed successfully");
  } catch (error) {
    console.error("[webhook-queue] Error closing queue:", error);
  }
}

// Initialize queue on module load
initializeQueue();

export { webhookQueue };
