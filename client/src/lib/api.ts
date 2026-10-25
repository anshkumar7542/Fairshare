import { demoApi, isDemoModeEnabled } from "../features/demo/demoMode";

const baseUrl = import.meta.env.VITE_API_URL || "";

export class ApiError extends Error {
  details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.details = details;
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (isDemoModeEnabled()) {
    return demoApi<T>(path, options);
  }

  const token = typeof window !== "undefined" ? localStorage.getItem("fairshare_token") : null;
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    credentials: "include",
    headers
  });

  if (response.status === 204) return undefined as T;

  let data: any = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      const text = await response.text();
      data = { error: { message: text || response.statusText } };
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      data?.error?.message || response.statusText || `Request failed with status ${response.status}`,
      data?.error?.details
    );
  }
  return data as T;
}

export function postJson<T>(path: string, body: unknown) {
  return api<T>(path, { method: "POST", body: JSON.stringify(body) });
}
