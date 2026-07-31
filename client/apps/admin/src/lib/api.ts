

// lib/api.ts

const BASE = "/api/proxy";

function getHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
  };
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
    refreshPromise = fetch("${BASE}/auth/refresh", {
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

// async function handleResponse<T>(
//   res: Response,
//   retryFn: () => Promise<Response>,
//   isRetry = false
// ): Promise<T> {
//   if (res.status === 401) {
//     if (!isRetry) {
//       const refreshed = await refreshAccessToken();
//       if (refreshed) {
//         const retried = await retryFn();
//         return handleResponse<T>(retried, retryFn, true);
//       }
//     }
//     window.location.href = "/login";
//     throw new Error("Unauthorized");
//   }
//   if (!res.ok) {
//     const err = (await res.json().catch(() => ({}))) as { message?: string; detail?: string | any[] };
//     const detail = Array.isArray(err.detail)
//       ? err.detail.map((e: any) => e?.msg ?? e?.message ?? JSON.stringify(e)).join(", ")
//       : err.detail;
//     throw new Error(err.message ?? detail ?? `HTTP ${res.status}`);
//   }
//   if (res.status === 204) return undefined as T;
//   return res.json() as Promise<T>;
// }
async function handleResponse<T>(
  res: Response,
  retryFn: () => Promise<Response>,
  isRetry = false
): Promise<T> {
  if (res.status === 401) {
    if (!isRetry) {
      const refreshed = await refreshAccessToken();

      if (refreshed) {
        const retried = await retryFn();
        return handleResponse<T>(retried, retryFn, true);
      }
    }

    const next = encodeURIComponent(window.location.pathname);

    window.location.replace(
      `/login?next=${next}&reason=session_expired`
    );

    throw new Error("Session expired. Redirecting to login.");
  }

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      message?: string;
      detail?: string | any[];
    };

    const detail = Array.isArray(err.detail)
      ? err.detail
          .map((e: any) => e?.msg ?? e?.message ?? JSON.stringify(e))
          .join(", ")
      : err.detail;

    throw new Error(err.message ?? detail ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}


export const api = {
  get: <T>(path: string) => {
    const doFetch = () => fetch(`${BASE}${path}`, fetchOpts("GET"));
    return doFetch().then((r) => handleResponse<T>(r, doFetch));
  },
  post: <T>(path: string, body?: unknown) => {
    const doFetch = () => fetch(`${BASE}${path}`, fetchOpts("POST", body));
    return doFetch().then((r) => handleResponse<T>(r, doFetch));
  },
  patch: <T>(path: string, body?: unknown) => {
    const doFetch = () => fetch(`${BASE}${path}`, fetchOpts("PATCH", body));
    return doFetch().then((r) => handleResponse<T>(r, doFetch));
  },
  delete: <T>(path: string) => {
    const doFetch = () => fetch(`${BASE}${path}`, fetchOpts("DELETE"));
    return doFetch().then((r) => handleResponse<T>(r, doFetch));
  },
};