/*
 * wikidata.js — DATA API: Wikidata (wbgetentities)
 * https://www.wikidata.org/w/api.php
 *
 * Looks up what today's thing is made of, has, makes or is used for
 * (properties P527, P186, P366, P1056, P2283, P361) for the "related
 * things" hint. Needs origin=* for CORS.
 */

import { fetchJson } from "./net.js";

const API = "https://www.wikidata.org/w/api.php";
const PROPS = ["P527", "P186", "P366", "P1056", "P2283", "P361"];

function query(params) {
  const search = new URLSearchParams({ format: "json", origin: "*", ...params });
  return fetchJson(`${API}?${search}`);
}

export async function getRelated(qid) {
  const entity = await query({ action: "wbgetentities", ids: qid, props: "claims" });
  const claims = entity?.entities?.[qid]?.claims;
  if (!claims) return null;
  const ids = [];
  for (const prop of PROPS) {
    for (const claim of (claims[prop] ?? []).slice(0, 4)) {
      const id = claim.mainsnak?.datavalue?.value?.id;
      if (id && !ids.includes(id)) ids.push(id);
    }
  }
  if (!ids.length) return [];
  const labels = await query({
    action: "wbgetentities",
    ids: ids.slice(0, 30).join("|"),
    props: "labels",
    languages: "en",
  });
  if (!labels) return null;
  return ids
    .map((id) => labels.entities?.[id]?.labels?.en?.value)
    .filter((label) => label && label.length < 30 && !/\d|wiki|list of/i.test(label));
}
