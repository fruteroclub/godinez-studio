const API_URL = import.meta.env.VITE_API_URL || "";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Errors that are safe to retry
const RETRYABLE_ERRORS = [
  "Failed to fetch",
  "NetworkError",
  "Request timed out",
  "ECONNRESET",
  "ETIMEDOUT",
];

function isRetryable(error: Error): boolean {
  return RETRYABLE_ERRORS.some(msg => error.message.includes(msg));
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { 
    token?: string | null; 
    timeoutMs?: number;
    retries?: number;
    retryDelay?: number;
  } = {},
): Promise<T> {
  const { 
    token, 
    timeoutMs = DEFAULT_TIMEOUT_MS, 
    retries = DEFAULT_RETRIES,
    retryDelay = RETRY_DELAY_MS,
    ...fetchOptions 
  } = options;

  const headers: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(fetchOptions.headers || {}).filter(
        ([, v]) => typeof v === "string",
      ),
    ),
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;

  // Do not set Content-Type for FormData (browser sets boundary)
  if (!(fetchOptions.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${API_URL}${path}`, {
        ...fetchOptions,
        headers,
        signal: fetchOptions.signal ?? controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error.error || "Request failed");
      }

      return res.json();
    } catch (err) {
      clearTimeout(timeout);
      
      const error = err instanceof Error ? err : new Error(String(err));
      
      // Convert abort to timeout error
      if (error instanceof DOMException && error.name === "AbortError") {
        lastError = new Error("Request timed out");
      } else {
        lastError = error;
      }
      
      // Only retry on network errors, not on 4xx/5xx
      if (attempt < retries && isRetryable(lastError)) {
        const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
        console.warn(`[API] Retry ${attempt + 1}/${retries} after ${delay}ms:`, lastError.message);
        await sleep(delay);
        continue;
      }
      
      break;
    }
  }

  throw lastError;
}
