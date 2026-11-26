/*
 * net.js — BROWSER API: Fetch + AbortController
 * Shared JSON fetch with a timeout. Every API file uses it, and every
 * caller has a fallback when it returns null.
 */

import { API_TIMEOUT_MS } from "./config.js";

export async function fetchJson(url, timeout = API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    // Offline, blocked, rate-limited (Wikimedia's 429 has no CORS header) or too slow.
    return null;
  } finally {
    clearTimeout(timer);
  }
}
