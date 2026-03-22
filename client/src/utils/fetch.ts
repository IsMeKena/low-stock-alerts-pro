declare global {
  interface Window {
    __originalFetch: typeof fetch;
    shopify?: {
      idToken: () => Promise<string>;
    };
  }
}

/**
 * Authenticated fetch utility for Shopify embedded apps.
 *
 * Uses the ORIGINAL (unpatched) fetch to avoid App Bridge's patched
 * fetch hanging when sessions are not yet established. Manually
 * attaches the session token via window.shopify.idToken() when
 * available.
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
        new Promise<never>((_, reject) =>
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

  const fetchFn = window.__originalFetch || window.fetch;
  return fetchFn(url, { ...options, headers });
}
