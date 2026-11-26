/*
 * share.js — BROWSER API: Clipboard API
 * https://developer.mozilla.org/docs/Web/API/Clipboard_API
 *
 * Builds the spoiler-free result text and copies it. If the clipboard is
 * blocked, copyText returns false and the page shows the text to copy by hand.
 */

import { QUIZ_POINTS } from "./config.js";
import { formatTime } from "./game.js";

export function buildShareText(game, streak) {
  const score = game.status === "won" ? `${game.score.toFixed(2)}/${QUIZ_POINTS}` : `0/${QUIZ_POINTS}`;
  const chat = "💬".repeat(game.hints.length);
  const notes = "🟨".repeat(game.guesses.length);
  const end = game.status === "won" ? `✅ ${formatTime(game.minute)} PM` : "❌ slept through it";
  const streakLine = streak > 1 ? `\n🔥 ${streak}-day streak` : "";
  const url = `${location.origin}${location.pathname}`;
  return `SKIPPED · Day ${game.day} · ${score}\n${chat}${notes ? " " + notes : ""} ${end}${streakLine}\n${url}`;
}

export async function copyText(text) {
  if (!navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
