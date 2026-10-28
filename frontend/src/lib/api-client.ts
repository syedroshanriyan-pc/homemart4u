/**
 * Homemart4u Shared Frontend API Client
 * Connects Vercel Frontend to Render Backend over HTTPS
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.RENDER_BACKEND_URL ||
  "";

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Resolves endpoint to full URL:
 * - If NEXT_PUBLIC_API_BASE_URL is set, uses the Render backend service URL.
 * - If in browser without direct URL, routes via relative path /api/* which is proxied by Next.js rewrites.
 */
function resolveUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  
  let baseUrl = API_BASE_URL;
  if (!baseUrl && typeof window !== "undefined") {
    // Relative URL handled by Next.js rewrites on Vercel
    baseUrl = "";
  } else if (!baseUrl) {
    // Server-side fallback default
    baseUrl = "https://homemart4u-backend.onrender.com";
  }

  const normalizedBase = baseUrl.replace(/\/$/, "");
  let fullUrl = `${normalizedBase}${cleanEndpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      fullUrl += (fullUrl.includes("?") ? "&" : "?") + queryString;
    }
  }

  return fullUrl;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { params, headers = {}, ...customConfig } = options;

  const url = resolveUrl(endpoint, params);

  // Retrieve stored token if in browser for Bearer authorization fallback
  let bearerToken: string | null = null;
  if (typeof window !== "undefined") {
    try {
      bearerToken = localStorage.getItem("fc_token");
    } catch {
      // localStorage may be disabled
    }
  }

  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
    ...(headers as Record<string, string>),
  };

  let signal = customConfig.signal;
  let timeoutId: any = null;
  if (!signal) {
    if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
      signal = AbortSignal.timeout(5000);
    } else {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 5000);
      signal = controller.signal;
    }
  }

  const config: RequestInit = {
    method: "GET",
    headers: reqHeaders,
    credentials: "include", // Forwards httpOnly session cookie
    ...customConfig,
    signal,
  };

  try {
    const response = await fetch(url, config);

    let data: any = null;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMessage =
        (data && typeof data === "object" && (data.error || data.message)) ||
        `Request failed with status ${response.status}`;
      throw new ApiError(errorMessage, response.status, data);
    }

    return data as T;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || "Network connection error", 0);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export const apiClient = {
  get: <T = any>(endpoint: string, options?: FetchOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "GET" }),

  post: <T = any>(endpoint: string, body?: any, options?: FetchOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = any>(endpoint: string, body?: any, options?: FetchOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T = any>(endpoint: string, body?: any, options?: FetchOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: FetchOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "DELETE" }),
};
