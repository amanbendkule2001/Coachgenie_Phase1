import { useAuthStore } from "@/lib/stores/auth.store";



const BASE = "/api/proxy";

function getHeaders(): HeadersInit {
  return { "Content-Type": "application/json" };
}

const fetchOpts = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: getHeaders(),
  credentials: "include",
  ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
});

// Ensures concurrent 401s trigger exactly one refresh call, not one per request.
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// function redirectToLogin() {
//   const next = encodeURIComponent(window.location.pathname);
//   window.location.href = `/login?next=${next}&reason=session_expired`;
// }
function redirectToLogin() {
  // Clear persisted auth state
  useAuthStore.getState().clear();

  const next = encodeURIComponent(window.location.pathname);

  window.location.replace(
    `/login?next=${next}&reason=session_expired`
  );
}

async function request<T>(
  path: string,
  opts: RequestInit,
  isRetry = false
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, opts);

  if (res.status === 401) {
    if (!isRetry) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return request<T>(path, opts, true);
      }
    }
    redirectToLogin();
    throw new Error("Session expired. Redirecting to login.");
  }

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      message?: string;
      detail?: string | any[];
    };
    const detail = Array.isArray(err.detail)
      ? err.detail.map((e: any) => e?.msg ?? e?.message ?? JSON.stringify(e)).join(", ")
      : err.detail;
    throw new Error(err.message ?? detail ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get:    <T>(path: string) => request<T>(path, fetchOpts("GET")),
  post:   <T>(path: string, body?: unknown) => request<T>(path, fetchOpts("POST", body)),
  patch:  <T>(path: string, body?: unknown) => request<T>(path, fetchOpts("PATCH", body)),
  delete: <T>(path: string) => request<T>(path, fetchOpts("DELETE")),
};