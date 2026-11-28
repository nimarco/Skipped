/*
 * game.js
 * The rules: the clock, hints, guesses, the late penalty and the score.
 * Pure logic: never touches the page. ui.js shows what this decides.
 */

import {
  CLASS_END,
  CLOSE_GUESS_MINUTES,
  HINT_ORDER,
  HINT_WAIT_MINUTES,
  LATE_PERCENT_PER_MINUTE,
  QUIZ_OPENS,
  QUIZ_POINTS,
  WRONG_GUESS_MINUTES,
} from "./config.js";
import { isClose, isMatch, normalize } from "./matching.js";

// Which hints this word can have, in ladder order.
export function hintLadder(word) {
  return HINT_ORDER.filter((type) => {
    if (type === "related") return word.related.length > 0;
    if (type === "rhyme") return word.rhymes.length > 0;
    if (type === "photo") return Boolean(word.inat);
    if (type === "voice") return Boolean(word.audio);
    // Countries and states only have flags and maps for photos: no slide.
    if (type === "slide") return word.slide !== false;
    return true;
  });
}

export function newGame(day, word) {
  return {
    day,
    minute: QUIZ_OPENS,
    ladder: hintLadder(word),
    hints: [], // hint types received, in order
    messages: [], // chat messages for the phone, saved so a reload restores them
    guesses: [], // wrong codes, newest last
    status: "playing", // "playing" | "won" | "lost"
    score: null,
  };
}

export function minutesLate(game) {
  return Math.max(0, game.minute - QUIZ_OPENS);
}

export function latePercent(game) {
  return Math.min(100, minutesLate(game) * LATE_PERCENT_PER_MINUTE);
}

export function currentWorth(game) {
  return round2(QUIZ_POINTS * (1 - latePercent(game) / 100));
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

export function nextHint(game) {
  return game.ladder[game.hints.length] ?? null;
}

export function hintsLeft(game) {
  return game.ladder.length - game.hints.length;
}

// Moves the clock; closes the quiz if class ends.
function advance(game, minutes) {
  game.minute = Math.min(CLASS_END, game.minute + minutes);
  if (game.minute >= CLASS_END && game.status === "playing") {
    game.status = "lost";
    game.score = 0;
  }
}

// The free first hint at the start costs no time.
export function takeHint(game, { free = false } = {}) {
  const type = nextHint(game);
  if (!type || game.status !== "playing") return null;
  game.hints.push(type);
  if (!free) advance(game, HINT_WAIT_MINUTES);
  return type;
}

// Returns "empty" | "repeat" | "correct" | "close" | "wrong".
export function submitGuess(game, text, word) {
  if (game.status !== "playing") return "over";
  const guess = normalize(text);
  if (!guess) return "empty";
  if (isMatch(guess, word.accept)) {
    game.status = "won";
    game.score = currentWorth(game);
    return "correct";
  }
  if (game.guesses.includes(guess)) return "repeat";
  if (isClose(guess, word.accept)) {
    advance(game, CLOSE_GUESS_MINUTES);
    return "close";
  }
  game.guesses.push(guess);
  advance(game, WRONG_GUESS_MINUTES);
  return "wrong";
}

// Sleeping through it: the quiz closes.
export function giveUp(game) {
  if (game.status !== "playing") return;
  game.minute = CLASS_END;
  game.status = "lost";
  game.score = 0;
}

export function formatTime(minute) {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")}`;
}

// 0 at the quiz opening, 1 when class ends (drives the light in the room).
export function dayProgress(minute) {
  return Math.min(1, Math.max(0, (minute - QUIZ_OPENS) / (CLASS_END - QUIZ_OPENS)));
}
