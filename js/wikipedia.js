/*
 * wikipedia.js — DATA API: Wikipedia REST API (page summary)
 * https://en.wikipedia.org/api/rest_v1/
 *
 * Gets the article's intro text and lead photo for today's word: the photo
 * becomes the projector slide, the intro becomes a "fill in the blank" text.
 * CORS: Access-Control-Allow-Origin * (checked 2026-11-25).
 */

import { fetchJson } from "./net.js";

export async function getSummary(title) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replaceAll(" ", "_"))}`;
  const data = await fetchJson(url);
  if (!data || data.type !== "standard") return null;
  return {
    extract: data.extract ?? "",
    image: data.thumbnail?.source ?? null,
    // A bigger version for the projector. Wikimedia only serves some widths
    // (330, 500, 960… but not 640: that's a 400 error), so slide.js falls
    // back to the normal thumbnail if this one fails.
    imageLarge: data.thumbnail?.source?.replace(/\/\d+px-/, "/500px-") ?? null,
  };
}
