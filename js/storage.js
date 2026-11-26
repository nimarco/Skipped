/*
 * storage.js — BROWSER API: Web Storage (localStorage)
 * https://developer.mozilla.org/docs/Web/API/Web_Storage_API
 *
 * Saves each day's progress and the results for the wall calendar.
 * Storage can be blocked (private browsing, strict settings), so every
 * read and write is wrapped: the game still works, it just won't remember.
 */

import { DROP_LOWEST, QUIZ_POINTS } from "./config.js";

const KEYS = {
  results: "skipped:results", // { [day]: { score, hints, guesses, won } }
  game: (day) => `skipped:day-${day}`,
  notify: "skipped:notify-asked",
};

function detectStorage() {
  try {
    localStorage.setItem("skipped:test", "1");
    localStorage.removeItem("skipped:test");
    return true;
  } catch {
    return false;
  }
}

export const storageAvailable = detectStorage();

function read(key, fallback) {
  if (!storageAvailable) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  if (!storageAvailable) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Full or blocked mid-session: keep playing without saving.
  }
}

export function loadGame(day) {
  return read(KEYS.game(day), null);
}

export function saveGame(game) {
  write(KEYS.game(game.day), game);
}

export function loadResults() {
  return read(KEYS.results, {});
}

// Only today's quiz counts; make-up quizzes are practice.
export function recordResult(game) {
  const results = loadResults();
  if (results[game.day]) return results;
  results[game.day] = {
    score: game.score,
    hints: game.hints.length,
    guesses: game.guesses.length,
    won: game.status === "won",
  };
  write(KEYS.results, results);
  return results;
}

export function wasNotifyAsked() {
  return read(KEYS.notify, false);
}

export function markNotifyAsked() {
  write(KEYS.notify, true);
}

/**
 * The numbers for the wall calendar.
 * Days you skipped count as 0 once they're over, and the lowest three days
 * (missed ones first) are dropped from the average, like the syllabus.
 */
export function computeStats(results, today) {
  const played = Object.keys(results).map(Number);
  const first = played.length ? Math.min(...played) : today;
  const scores = [];
  for (let d = first; d <= today; d++) {
    if (results[d]) scores.push(results[d].score);
    else if (d < today) scores.push(0);
  }
  const sorted = [...scores].sort((a, b) => a - b);
  const kept = sorted.length > DROP_LOWEST ? sorted.slice(DROP_LOWEST) : sorted;
  const average = kept.length ? kept.reduce((s, x) => s + x, 0) / kept.length : 0;

  let streak = 0;
  for (let d = results[today] ? today : today - 1; results[d]?.won; d--) streak++;
  let best = 0;
  let run = 0;
  for (let d = first; d <= today; d++) {
    run = results[d]?.won ? run + 1 : 0;
    best = Math.max(best, run);
  }

  const wins = played.filter((d) => results[d].won).length;
  return {
    played: played.length,
    wins,
    streak,
    bestStreak: best,
    average: Math.round(average * 100) / 100,
    percent: Math.round((average / QUIZ_POINTS) * 100),
    dropped: Math.min(DROP_LOWEST, Math.max(0, sorted.length - 1)),
  };
}
