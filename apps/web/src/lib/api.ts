const API_URL = import.meta.env.VITE_API_URL || "";
const DEFAULT_TIMEOUT_MS = 30_000;

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null; timeoutMs?: number } = {},
): Promise<T> {
  const { token, timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(fetchOptions.headers || {}).filter(
        ([, v]) => typeof v === "string",
      ),
    ),
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;

  // Don't set Content-Type for FormData (browser sets boundary)
  if (!(fetchOptions.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...fetchOptions,
      headers,
      signal: fetchOptions.signal ?? controller.signal,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(error.error || "Request failed");
    }

    return res.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
