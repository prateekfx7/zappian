/**
 * Centralized API configuration for ReelBrain frontend.
 * - Server-side (Vercel functions / SSR): reads INTERNAL_API_URL injected by Vercel service binding.
 * - Browser on Vercel: uses same-origin relative URL (empty string) to route through top-level rewrites.
 * - Local development: uses NEXT_PUBLIC_API_URL or defaults to http://localhost:8001.
 */

const resolveBaseUrl = (): string => {
  // 1. Server-side in Vercel: read internal service binding
  if (typeof window === "undefined") {
    if (process.env.INTERNAL_API_URL) {
      return process.env.INTERNAL_API_URL.replace(/\/+$/, "");
    }
  }

  // 2. Explicit public URL if set
  if (process.env.NEXT_PUBLIC_API_URL !== undefined && process.env.NEXT_PUBLIC_API_URL !== "") {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
  }

  // 3. Browser runtime: on Vercel deployment, use relative path (same-origin rewrites)
  if (typeof window !== "undefined") {
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "0.0.0.0";
    if (!isLocalhost) {
      return "";
    }
  }

  // 4. Local development default
  return "http://localhost:8001";
};

export const API_BASE_URL = resolveBaseUrl();

export const getApiUrl = (path: string): string => {
  const base = resolveBaseUrl();
  const cleanPath = path.replace(/^\/+/, "");
  if (!base) {
    return `/${cleanPath}`;
  }
  return `${base}/${cleanPath}`;
};
