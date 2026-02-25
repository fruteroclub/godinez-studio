const API_URL = import.meta.env.VITE_API_URL || "";

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, ...fetchOptions } = options;

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

  const res = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || "Request failed");
  }

  return res.json();
}
