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

  // In App Bridge v4 embedded context, fetch is already patched.
  // As a safety net, if shopify global is available but the fetch
  // wasn't patched (e.g., pop-out window), manually attach the token.
  if (window.shopify && !headers.has("Authorization")) {
    try {
      const token = await window.shopify.idToken();
      headers.set("Authorization", `Bearer ${token}`);
    } catch {
      // Token retrieval failed — proceed without it;
      // the server will return 401 and App Bridge will handle re-auth.
    }
  }

  return fetch(url, { ...options, headers });
}
