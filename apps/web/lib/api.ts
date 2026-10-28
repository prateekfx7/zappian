/**
 * Centralized API configuration for ReelBrain frontend.
 * - In browser on HTTPS (e.g. Vercel deployment): uses same-origin relative URLs ("")
 *   so requests route through Vercel's top-level rewrite rules to the api service.
 * - In browser on localhost: uses NEXT_PUBLIC_API_URL or defaults to http://localhost:8001.
 * - Server-side: uses INTERNAL_API_URL (Vercel service binding) or NEXT_PUBLIC_API_URL.
 */

export const getApiBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    // 1. If running on HTTPS (production Vercel domain or custom domain)
    if (window.location.protocol === "https:") {
      // If user explicitly configured an external HTTPS API url, use it
      if (
        process.env.NEXT_PUBLIC_API_URL &&
        process.env.NEXT_PUBLIC_API_URL.startsWith("https://")
      ) {
        return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
      }
      // Otherwise, use same-origin relative path so Vercel rewrites forward to the api service
      return "";
    }

    // 2. If running on localhost / HTTP
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "0.0.0.0";

    if (isLocalhost) {
      if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
      }
      return "http://localhost:8001";
    }

    return "";
  }

  // 3. Server-side (Node.js runtime / SSR / Vercel Functions)
  if (process.env.INTERNAL_API_URL) {
    return process.env.INTERNAL_API_URL.replace(/\/+$/, "");
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
  }
  return "http://localhost:8001";
};

// Dynamic stringifier so `${API_BASE_URL}/v1/...` evaluates dynamically at runtime in the browser
export const API_BASE_URL = {
  toString: () => getApiBaseUrl(),
  valueOf: () => getApiBaseUrl(),
} as unknown as string;

export const getApiUrl = (path: string): string => {
  const base = getApiBaseUrl();
  const cleanPath = path.replace(/^\/+/, "");
  if (!base) {
    return `/${cleanPath}`;
  }
  return `${base}/${cleanPath}`;
};
