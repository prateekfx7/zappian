/**
 * Centralized API configuration for ReelBrain frontend.
 * Reads NEXT_PUBLIC_API_URL from environment with fallback to http://localhost:8000.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export const getApiUrl = (path: string): string => {
  const cleanBase = API_BASE_URL.replace(/\/+$/, "");
  const cleanPath = path.replace(/^\/+/, "");
  return `${cleanBase}/${cleanPath}`;
};
