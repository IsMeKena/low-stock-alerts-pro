/**
 * Error handling and retry logic for Shopify API calls
 * Handles 401 (token expired), 429 (rate limited), and 5xx (server errors)
 */

/**
 * Retry configuration with exponential backoff
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Default retry configuration
 * - Max 5 attempts
 * - Start with 1 second, exponential backoff
 * - Max 60 seconds between retries
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  initialDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
};

/**
 * Calculate delay for exponential backoff
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable
 */
export function isRetryableError(statusCode: number | undefined): boolean {
  if (!statusCode) return false;

  // 401: Session token expired - should refresh and retry
  // 429: Rate limited - should back off and retry
  // 5xx: Server errors - should retry
  return statusCode === 401 || statusCode === 429 || statusCode >= 500;
}

/**
 * Extract retry-after header value
 */
export function getRetryAfter(headers: Record<string, string | string[] | undefined>): number {
  const retryAfter = headers["retry-after"];
  if (!retryAfter) return 0;

  // Retry-After can be seconds or HTTP date
  const value = Array.isArray(retryAfter) ? retryAfter[0] : retryAfter;
  const seconds = parseInt(value, 10);

  if (!isNaN(seconds)) {
    return Math.min(seconds * 1000, 300000); // Cap at 5 minutes
  }

  // If it's a date, calculate delay
  const date = new Date(value);
  const now = new Date();
  const delay = date.getTime() - now.getTime();

  return Math.max(0, Math.min(delay, 300000)); // Cap at 5 minutes
}

/**
 * Retry wrapper for API calls
 * Automatically handles exponential backoff and specific error codes
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  context: string,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const statusCode = error.statusCode || error.status;
      lastError = error;

      // If not retryable, throw immediately
      if (!isRetryableError(statusCode)) {
        console.error(`[retry] Non-retryable error in ${context}:`, error.message);
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === config.maxAttempts - 1) {
        console.error(
          `[retry] Max attempts (${config.maxAttempts}) reached for ${context}:`,
          error.message
        );
        throw error;
      }

      // Calculate delay
      let delay: number;

      // Special handling for rate limit (429)
      if (statusCode === 429) {
        const retryAfter = getRetryAfter(error.headers || {});
        delay = retryAfter > 0 ? retryAfter : calculateBackoffDelay(attempt, config);
        console.warn(`[retry] Rate limited in ${context}, waiting ${delay}ms before retry`);
      } else if (statusCode === 401) {
        // 401: Token expired
        delay = calculateBackoffDelay(attempt, config);
        console.warn(`[retry] Session token expired in ${context}, waiting ${delay}ms before retry`);
      } else {
        // 5xx: Server error
        delay = calculateBackoffDelay(attempt, config);
        console.warn(
          `[retry] Server error (${statusCode}) in ${context}, waiting ${delay}ms before retry`
        );
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  // Should not reach here, but just in case
  throw lastError || new Error(`[retry] Failed to complete ${context}`);
}

/**
 * Webhook retry with exponential backoff
 * Specific for webhook processing (1s, 2s, 4s, 8s, 16s, ...)
 */
export const WEBHOOK_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * API call retry with gentler backoff
 * Specific for Shopify API calls
 */
export const API_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 500,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};
