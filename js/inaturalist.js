/*
 * inaturalist.js — DATA API: iNaturalist
 * https://api.inaturalist.org/v1/docs/
 *
 * For living things: a real, recent, research-grade photo of today's
 * plant or animal taken near St. Louis, sent as "a friend's photo from
 * outside". Falls back to anywhere in the world. CORS: *.
 */

import { HOME, INAT_RADIUS_KM } from "./config.js";
import { fetchJson } from "./net.js";

function search(params) {
  const query = new URLSearchParams({
    quality_grade: "research",
    photos: "true",
    per_page: "10",
    order_by: "votes",
    ...params,
  });
  return fetchJson(`https://api.inaturalist.org/v1/observations?${query}`);
}

export async function getSighting(taxonId) {
  let data = await search({ taxon_id: taxonId, lat: HOME.lat, lng: HOME.lng, radius: INAT_RADIUS_KM });
  let nearby = true;
  if (!data?.results?.length) {
    data = await search({ taxon_id: taxonId });
    nearby = false;
  }
  const obs = data?.results?.find((o) => o.photos?.length);
  if (!obs) return null;
  return {
    photo: obs.photos[0].url.replace("square", "medium"),
    nearby,
    total: data.total_results,
    place: nearby ? HOME.name : null,
  };
}
