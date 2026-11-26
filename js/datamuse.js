/*
 * datamuse.js — DATA API: Datamuse
 * https://www.datamuse.com/api/
 *
 * Words that rhyme with today's word, kept to common ones (frequency tag
 * f: per million words), for the "rhymes with" hint. No key; CORS echoes
 * the page's origin.
 */

import { fetchJson } from "./net.js";

function frequency(entry) {
  const tag = (entry.tags ?? []).find((t) => t.startsWith("f:"));
  return tag ? Number(tag.slice(2)) : 0;
}

export async function getRhymes(word, count = 4) {
  const data = await fetchJson(`https://api.datamuse.com/words?rel_rhy=${encodeURIComponent(word)}&md=f&max=40`);
  if (!Array.isArray(data)) return null;
  return data
    .filter((entry) => frequency(entry) >= 3 && !entry.word.includes(" "))
    .sort((a, b) => frequency(b) - frequency(a))
    .slice(0, count)
    .map((entry) => entry.word);
}
