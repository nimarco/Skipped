/*
 * clues.js
 * Turns today's word plus live API data into your friends' texts.
 * Each hint type has a few phrasings so it reads like a real group chat.
 * Live data comes first; the stored data in words.js is the fallback.
 * No DOM.
 */

import { FRIENDS } from "./config.js";
import { pluralForms } from "./matching.js";

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const friend = (id) => FRIENDS.find((f) => f.id === id) ?? pick(FRIENDS);

// ---------- text helpers (mirrored in lab/words/build.py) ----------

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function blankOut(text, accept) {
  const forms = new Set();
  for (const name of accept) {
    for (const f of pluralForms(name)) forms.add(f);
  }
  let out = text;
  for (const f of [...forms].sort((a, b) => b.length - a.length)) {
    out = out.replace(new RegExp(`\\b${escapeRegExp(f)}\\b`, "gi"), "____");
  }
  return out;
}

// Parts of a place name that don't give it away on their own ("New", "South"…).
const GENERIC_PARTS = new Set(["new", "north", "south", "east", "west", "saint", "san", "los", "las", "cape", "great", "united", "city", "lake", "river", "sea", "gulf", "mount", "dead", "red"]);

export function leaks(text, answer) {
  const all = answer.toLowerCase().split(" ");
  const parts = all.filter((p) => !GENERIC_PARTS.has(p));
  const words = (text.match(/[A-Za-z]+/g) ?? []).map((w) => w.toLowerCase());
  return (parts.length ? parts : all).some((a) => {
    const stem = a.length > 4 ? a.slice(0, Math.max(4, a.length - 2)) : a;
    return words.some((w) => w.startsWith(stem));
  });
}

function splitSentences(text) {
  return text
    .split(/(?<=[a-z0-9)\]][.!?])\s+(?=[A-Z])/)
    .filter((s) => s.length >= 40 && s.length <= 260);
}

// The first intro sentence that still makes sense blanked and doesn't leak.
export function blankedSentence(extract, word) {
  for (const s of splitSentences(extract ?? "")) {
    const blanked = blankOut(s, word.accept);
    if (blanked.includes("____") && !leaks(blanked.replaceAll("____", ""), word.answer)) {
      return blanked;
    }
  }
  return word.sentences[0];
}

// "O _ _" or, for two words, "N _ _   _ _ _ _"
export function letterPattern(answer) {
  return answer
    .toUpperCase()
    .split(" ")
    .map((part, w) => part.split("").map((c, i) => (w === 0 && i === 0 ? c : "_")).join(" "))
    .join("   ");
}

export function letterCount(answer) {
  const parts = answer.split(" ");
  const first = answer[0].toUpperCase();
  if (parts.length === 1) return `${answer.length} letters. starts with ${first}`;
  return `${parts.length} words, ${parts.map((p) => p.length).join(" + ")} letters. starts with ${first}`;
}

// ---------- the chat ----------

const msg = (from, text, media = null) => ({ from, text, media });

/**
 * Builds the texts for one hint. Returns an array of messages, or null if
 * this hint can't be given today (e.g. no photo loaded): the caller moves
 * on to the next hint.
 * @param {string} type  hint type from HINT_ORDER
 * @param {object} word  today's word record
 * @param {object} live  results of the API calls (each may be null)
 */
export function buildHint(type, word, live) {
  switch (type) {
    case "category":
      return [
        msg("theo", pick(["can't send it, academic dishonesty 💀", "we can't just tell u, that's literally in the syllabus", "sharing the code = academic dishonesty lol"])),
        msg("maya", pick([`but ok. it's ${word.category}`, `fine. hint: it's ${word.category}`, `it's ${word.category}. that's all ur getting rn`])),
      ];
    case "slide": {
      if (!live.summary?.image) return null;
      return [
        msg("jordan", pick(["pic of the slide", "took a pic of the projector", "here's the slide"]), { kind: "slide", src: live.summary.imageLarge ?? live.summary.image, fallback: live.summary.image }),
        msg("jordan", pick(["sorry about the guy's head", "it's blurry bc I'm hiding my phone", "zoomed in as much as I could"])),
      ];
    }
    case "sentence":
      return [
        msg("priya", pick(["he read this off the slide:", "the slide literally says:", "copied this from the slide"])),
        msg("priya", `"${blankedSentence(live.summary?.extract, word)}"`),
      ];
    case "related": {
      const words = (live.related?.length ? live.related : word.related)
        .filter((r) => !leaks(r, word.answer))
        .slice(0, 4);
      if (!words.length) return null;
      return [msg("theo", pick([`think: ${words.join(", ")}`, `related stuff: ${words.join(", ")}`, `${words.join(" · ")} 🤔`]))];
    }
    case "letters":
      return [
        msg("maya", letterCount(word.answer)),
        msg("maya", letterPattern(word.answer)),
      ];
    case "rhyme": {
      const rhymes = (live.rhymes?.length ? live.rhymes : word.rhymes).slice(0, 3);
      if (!rhymes.length) return null;
      return [msg("jordan", pick([`rhymes with ${rhymes.join(", ")} 🎶`, `sounds like ${rhymes.join(" / ")}`, `it rhymes w ${rhymes.join(" and ")}`]))];
    }
    case "photo": {
      if (!live.sighting) return null;
      const text = live.sighting.nearby
        ? pick(["LOL saw one of these outside the building", "there's one right outside, look", "found one on the walk over"])
        : pick(["found a pic of one", "here's what it looks like irl"]);
      return [msg("priya", text, { kind: "photo", src: live.sighting.photo })];
    }
    case "voice":
      return [
        msg("theo", pick(["ok I'm whispering it. don't tell anyone", "voice memo. he can't hear me I think", "last resort. listen"]), { kind: "voice", src: word.audio }),
      ];
    default:
      return null;
  }
}

export const introChat = () => [
  msg("jordan", pick(["where r u", "are u coming??", "bro where are you"])),
  msg("maya", "quiz code just went up 💀"),
  msg("me", "QUIZ CODE??"),
];

export const outOfHints = () => [msg("maya", pick(["that's everything we've got 😭", "we're out of hints fr", "I literally can't help more without getting caught"]))];

export const wrongReactions = () => msg(pick(["jordan", "maya", "priya"]), pick(["u good? 😭", "how many tries is that", "pls just ask us", "the prof is looking at me, hurry"]));

export function endChat(game, word) {
  if (game.status === "won") {
    return [msg("priya", pick(["YOOO you got it", "LET'S GO", "ok ur in 🙌"])), msg("theo", "see u thursday. actually come this time")];
  }
  return [msg("maya", `it was ${word.answer.toUpperCase()} 💀`), msg("jordan", "nice try. see you thursday")];
}

export { friend };
