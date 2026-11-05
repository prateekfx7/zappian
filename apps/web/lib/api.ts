/**
 * Centralized API configuration for ReelBrain frontend.
 * Supports:
 * - Explicit NEXT_PUBLIC_API_URL (e.g. cloud backend)
 * - Same-origin relative paths when deployed on HTTPS (Vercel microservices / reverse proxy)
 * - Fallback to localhost:8001 for local development
 */

export const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.trim() !== "") {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    // When running in production on HTTPS without explicit API URL,
    // use same-origin relative URLs so Vercel rewrites or reverse proxies route cleanly.
    if (window.location.protocol === "https:") {
      return "";
    }
  }
  return "http://localhost:8001";
};

export const API_BASE_URL = getApiBaseUrl();

export const getApiUrl = (path: string): string => {
  const base = getApiBaseUrl();
  const cleanPath = path.replace(/^\/+/, "");
  if (!base) {
    return `/${cleanPath}`;
  }
  return `${base}/${cleanPath}`;
};
