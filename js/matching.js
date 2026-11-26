/*
 * matching.js
 * Decides whether a typed code is the answer: ignores case, spaces,
 * accents, "a/an/the" and plurals. Also spots near misses (one typo).
 * No DOM, no API.
 */

export function normalize(text) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .replace(/-/g, " ")
    .replace(/^\s*(a|an|the)\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Every plural we accept for a word (mirrors plural_forms in lab/words/build.py).
export function pluralForms(word) {
  const w = word.toLowerCase();
  const forms = new Set([w]);
  if (/[^aeiou]y$/.test(w)) forms.add(w.slice(0, -1) + "ies");
  else if (/(s|x|z|ch|sh)$/.test(w)) forms.add(w + "es");
  else forms.add(w + "s");
  if (w.endsWith("f")) forms.add(w.slice(0, -1) + "ves");
  if (w.endsWith("fe")) forms.add(w.slice(0, -2) + "ves");
  if (w.endsWith("o")) forms.add(w + "es");
  if (w.endsWith("ouse")) forms.add(w.slice(0, -4) + "ice");
  if (w.endsWith("an")) forms.add(w.slice(0, -2) + "en");
  return [...forms];
}

// All accepted spellings: each accepted name plus plurals of its last word.
export function acceptedForms(accept) {
  const out = new Set();
  for (const name of accept) {
    const n = normalize(name);
    const words = n.split(" ");
    const last = words.pop();
    for (const p of pluralForms(last)) out.add([...words, p].join(" "));
  }
  return out;
}

export function isMatch(guess, accept) {
  return acceptedForms(accept).has(normalize(guess));
}

function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = temp;
    }
  }
  return row[b.length];
}

// One typo for 4+ letters, two for 8+.
export function isClose(guess, accept) {
  const g = normalize(guess);
  if (g.length < 4) return false;
  const allowed = g.length >= 8 ? 2 : 1;
  for (const form of acceptedForms(accept)) {
    if (distance(g, form) <= allowed) return true;
  }
  return false;
}
