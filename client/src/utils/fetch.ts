/**
 * Authenticated fetch utility for Shopify embedded apps.
 *
 * In App Bridge v4, the global fetch is automatically patched inside
 * the Shopify Admin iframe to include the session token. This wrapper
 * adds a manual fallback for contexts where the patch isn't active
 * (e.g., development outside the Admin).
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.method !== "GET") {
    headers.set("Content-Type", "application/json");
  }

  if (window.shopify && !headers.has("Authorization")) {
    try {
      const token = await Promise.race([
        window.shopify.idToken(),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error("idToken timeout")), 3000)
        ),
      ]);
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    } catch {
      // Token retrieval failed or timed out — proceed without it
    }
  }

  return fetch(url, { ...options, headers });
}
