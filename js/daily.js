/*
 * daily.js
 * Picks today's word. Everyone gets the same word on the same day with no
 * server: Day N (days since launch, at the player's local midnight) plays
 * word N of the frozen list in data/words.js.
 */

import { LAUNCH_DATE } from "./config.js";
import { WORDS } from "../data/words.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function localMidnight(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function launchMidnight() {
  const [y, m, d] = LAUNCH_DATE.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Day number of any date; 0 or below means before launch.
export function dayNumber(date) {
  return Math.round((localMidnight(date) - launchMidnight()) / DAY_MS) + 1;
}

export function todayNumber(now = new Date()) {
  return Math.max(1, dayNumber(now));
}

export function dateOfDay(day) {
  const d = launchMidnight();
  d.setDate(d.getDate() + day - 1);
  return d;
}

// base64 JSON -> word record (UTF-8 safe).
function decode(entry) {
  const bytes = Uint8Array.from(atob(entry), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function wordForDay(day) {
  return decode(WORDS[(day - 1) % WORDS.length]);
}

// Which day to play: today, or a past day for a make-up quiz (?day=N).
export function requestedDay(search = location.search) {
  const today = todayNumber();
  const asked = Number(new URLSearchParams(search).get("day"));
  if (Number.isInteger(asked) && asked >= 1 && asked < today) {
    return { day: asked, makeUp: true, today };
  }
  return { day: today, makeUp: false, today };
}
