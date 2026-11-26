/*
 * main.js
 * Starts the app and connects the pieces: today's word, the live API data,
 * the game rules, storage, sound and the room. Runs the flow: wake up,
 * the group chat, asking for hints (the room jumps forward in time),
 * typing codes, and the end of class.
 */

import {
  ALARM_TIME,
  CLASS_END,
  HINT_WAIT_MINUTES,
  INTRO_MESSAGE_MS,
  TIME_JUMP_MS,
  TYPING_MS,
  WRONG_GUESS_MINUTES,
} from "./config.js";
import { dateOfDay, dayNumber, requestedDay, wordForDay } from "./daily.js";
import {
  currentWorth,
  formatTime,
  giveUp,
  latePercent,
  minutesLate,
  newGame,
  nextHint,
  submitGuess,
  takeHint,
} from "./game.js";
import { buildHint, endChat, introChat, outOfHints, wrongReactions } from "./clues.js";
import { getSummary } from "./wikipedia.js";
import { getRelated } from "./wikidata.js";
import { getRhymes } from "./datamuse.js";
import { getSighting } from "./inaturalist.js";
import { getWeather } from "./weather.js";
import { playVoiceMemo, preloadVoiceMemo } from "./voicememo.js";
import * as sound from "./sound.js";
import { askForNotifications, notificationsOn, notificationsSupported, notify } from "./notify.js";
import { computeStats, loadGame, loadResults, recordResult, saveGame, storageAvailable } from "./storage.js";
import { buildShareText, copyText } from "./share.js";
import * as ui from "./ui.js";

const { els } = ui;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const between = ([a, b]) => a + Math.random() * (b - a);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const { day, makeUp, today } = requestedDay();
const word = wordForDay(day);
let game = loadGame(day) ?? newGame(day, word);
let busy = false;

// ---------- Live data: fetched once, in the background, each with a fallback ----------

const live = { summary: null, related: null, rhymes: null, sighting: null };
const liveReady = Promise.allSettled([
  getSummary(word.title).then((s) => {
    live.summary = s;
    if (s?.imageLarge) new Image().src = s.imageLarge; // warm the cache for the slide
  }),
  word.qid ? getRelated(word.qid).then((r) => (live.related = r)) : null,
  getRhymes(word.answer).then((r) => (live.rhymes = r)),
  word.inat ? getSighting(word.inat).then((s) => (live.sighting = s)) : null,
]);

getWeather().then(ui.setWeather);

// ---------- Chat helpers ----------

function save() {
  saveGame(game);
}

function onVoice(src, button) {
  sound.unlock();
  button.classList.add("is-playing");
  playVoiceMemo(src)
    .then((seconds) => {
      button.querySelector(".voice-time").textContent = `0:0${Math.ceil(seconds)}`;
      setTimeout(() => button.classList.remove("is-playing"), seconds * 1000);
    })
    .catch(() => {
      button.classList.remove("is-playing");
      ui.markVoiceBroken(button);
    });
}

function show(msg) {
  ui.addMessage(msg, { onVoice });
}

// A friend's message arrives: typing dots, then the buzz.
async function receive(msg, { record = true } = {}) {
  if (msg.from === "me") {
    show(msg);
    sound.send();
  } else {
    const stop = ui.showTyping(msg.from);
    await wait(reducedMotion ? 300 : between(TYPING_MS));
    stop();
    show(msg);
    sound.buzz();
    ui.buzzPhone();
    notify(`${msg.from[0].toUpperCase()}${msg.from.slice(1)} · 2004 back row`, msg.text ?? "sent a photo");
  }
  if (record) {
    game.messages.push(msg);
    save();
  }
}

function stamp(text) {
  ui.addTimeStamp(text);
  game.messages.push({ from: "time", text });
  save();
}

// ---------- Rendering the whole state (on load) ----------

function renderAll() {
  ui.renderQuizHeader(day, makeUp);
  ui.renderClock(game.minute);
  ui.setTimeOfDay(game.minute);
  ui.renderNotes(game.guesses);
  ui.renderMeta(currentWorth(game), latePercent(game));
  for (const msg of game.messages) {
    if (msg.from === "time") ui.addTimeStamp(msg.text);
    else show(msg);
  }
  updateHintButton();
  renderCalendar();
  if (game.status !== "playing") showEnd();
  if (!storageAvailable) {
    ui.setFeedback("Your browser is blocking storage, so today's progress won't be saved.", "warn");
  }
}

function renderCalendar() {
  const results = loadResults();
  ui.renderCalendar(dateOfDay(day), dayNumber, results, today);
}

function updateHintButton() {
  if (game.status !== "playing") {
    ui.setHintButton({ label: "class is over", cost: "—", disabled: true });
  } else if (busy) {
    ui.setHintButton({ label: "waiting for a reply…", cost: "…", disabled: true });
  } else if (!nextHint(game)) {
    ui.setHintButton({ label: "they're out of hints", cost: "0 left", disabled: true });
  } else {
    ui.setHintButton({
      label: game.hints.length <= 1 ? "pls give me another hint 🙏" : "another hint pls 🙏",
      cost: `+${HINT_WAIT_MINUTES} min`,
      disabled: false,
    });
  }
}

function updateLaptop() {
  ui.renderMeta(currentWorth(game), latePercent(game));
}

// ---------- The time jump ----------

async function jumpTo(from, to) {
  const ms = reducedMotion ? 0 : TIME_JUMP_MS;
  if (!reducedMotion) sound.fastForward(ms);
  ui.setTimeOfDay(to, ms);
  await ui.animateClock(from, to, ms);
  updateLaptop();
}

// ---------- Waking up ----------

let awake = false;

async function wakeUp(stopAlarm) {
  if (awake) return;
  awake = true;
  stopAlarm();
  sound.unlock();
  ui.setRinging(false);
  ui.hideIntro();
  preloadVoiceMemo(word.audio);
  busy = true;
  updateHintButton();
  ui.renderClock(game.minute);
  await wait(700);
  stamp(`Today ${formatTime(game.minute)} PM`);
  for (const msg of introChat()) {
    await receive(msg);
    await wait(reducedMotion ? 100 : INTRO_MESSAGE_MS * 0.5);
  }
  const type = takeHint(game, { free: true });
  await liveReady;
  for (const msg of buildHint(type, word, live) ?? []) await receive(msg);
  busy = false;
  updateHintButton();
  save();
  els.codeInput.focus({ preventScroll: true });
}

// ---------- Asking for a hint ----------

async function askForHint() {
  if (busy || game.status !== "playing" || !nextHint(game)) return;
  busy = true;
  updateHintButton();
  sound.unlock();
  const asks = ["another hint pls 🙏", "one more hint?", "pls I'm begging", "need another one", "help 😭"];
  await receive({ from: "me", text: asks[Math.min(game.hints.length - 1, asks.length - 1)] });

  const from = game.minute;
  let type = takeHint(game);
  await jumpTo(from, game.minute);
  stamp(`${formatTime(game.minute)} PM`);

  if (game.status === "lost") {
    await finish();
    return;
  }

  await liveReady;
  let msgs = buildHint(type, word, live);
  // A hint with no data today (photo failed to load…) is skipped for free.
  while (!msgs && type) {
    type = takeHint(game, { free: true });
    msgs = type ? buildHint(type, word, live) : null;
  }
  for (const msg of msgs ?? outOfHints()) await receive(msg);
  busy = false;
  updateHintButton();
  save();
}

// ---------- Typing a code ----------

async function onCode(event) {
  event.preventDefault();
  if (game.status !== "playing") return;
  const text = els.codeInput.value;
  const result = submitGuess(game, text, word);

  if (result === "empty") {
    ui.setFeedback("Type the access code first.", "warn");
    return;
  }
  if (result === "repeat") {
    ui.setFeedback("You already tried that one. It's on a sticky note.", "warn");
    els.codeInput.select();
    return;
  }
  if (result === "correct") {
    sound.correct();
    ui.setFeedback("Access code accepted.", "ok");
    save();
    await finish();
    return;
  }
  if (result === "close") {
    sound.wrong();
    ui.setFeedback("Invalid access code. Really close though: check the spelling?", "warn");
    els.codeInput.select();
    save();
    return;
  }

  // Wrong: it goes on a sticky note and a minute passes.
  sound.wrong();
  ui.setFeedback(`Invalid access code. (+${WRONG_GUESS_MINUTES} min)`, "error");
  ui.renderNotes(game.guesses, true);
  els.codeInput.value = "";
  ui.renderClock(game.minute);
  ui.setTimeOfDay(game.minute, reducedMotion ? 0 : 400);
  updateLaptop();
  save();
  if (game.status === "lost") {
    await finish();
    return;
  }
  if (game.guesses.length % 4 === 3 && !busy) {
    busy = true;
    updateHintButton();
    await receive(wrongReactions());
    busy = false;
    updateHintButton();
  }
}

// ---------- The end of the quiz ----------

const WIN_ENDINGS = [
  "See you Thursday. Actually come this time.",
  "Submitted. Nobody has to know you were in bed.",
  "Your attendance is questionable. Your quiz grade isn't.",
];

function showEnd() {
  const won = game.status === "won";
  const late = minutesLate(game);
  ui.showResult({
    won,
    points: won ? game.score : 0,
    line: won
      ? `Submitted at ${formatTime(game.minute)} PM · ${late} min late (−${latePercent(game)}%) · ${game.hints.length} hint${game.hints.length === 1 ? "" : "s"}`
      : `Class ended at ${formatTime(CLASS_END)} PM. The quiz is closed.`,
    code: word.answer,
    ending: won ? WIN_ENDINGS[day % WIN_ENDINGS.length] : "Nice try. See you Thursday.",
  });
  updateHintButton();
}

async function finish() {
  busy = true;
  if (game.status === "lost") {
    sound.closed();
    ui.renderClock(CLASS_END);
    ui.setTimeOfDay(CLASS_END, reducedMotion ? 0 : 800);
  }
  if (!makeUp) recordResult(game);
  save();
  showEnd();
  renderCalendar();
  for (const msg of endChat(game, word)) await receive(msg);
  busy = false;
  updateHintButton();
}

// ---------- Sharing, stats, settings ----------

async function share() {
  const stats = computeStats(loadResults(), today);
  const text = buildShareText(game, stats.streak);
  if (await copyText(text)) {
    els.shareFeedback.textContent = "Copied. Paste it in the group chat.";
    els.shareFeedback.className = "feedback is-ok";
    els.shareFallback.hidden = true;
  } else {
    els.shareFeedback.textContent = "Your browser blocked copying. Here it is to copy by hand:";
    els.shareFeedback.className = "feedback is-warn";
    els.shareFallback.hidden = false;
    els.shareFallback.value = text;
    els.shareFallback.select();
  }
}

function openStats() {
  const results = loadResults();
  const stats = computeStats(results, today);
  const makeups = [];
  for (let d = today - 1; d >= 1 && makeups.length < 30; d--) {
    if (results[d]) continue;
    const date = dateOfDay(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    makeups.push({ day: d, label: date, done: loadGame(d)?.status === "won" });
  }
  ui.renderStats(stats, makeups);
  els.statsDialog.showModal();
}

async function toggleBell() {
  if (!notificationsSupported()) {
    ui.setFeedback("This browser can't show notifications. The phone will still buzz.", "warn");
    return;
  }
  const result = await askForNotifications();
  els.bell.setAttribute("aria-pressed", String(result === "granted"));
  if (result === "denied") {
    ui.setFeedback("Notifications are blocked, so you'll only see texts in here.", "warn");
  }
}

function toggleMute() {
  const muted = !sound.isMuted();
  sound.setMuted(muted);
  els.mute.setAttribute("aria-pressed", String(muted));
  els.mute.setAttribute("aria-label", muted ? "Unmute sounds" : "Mute sounds");
}

// ---------- Start ----------

function start() {
  renderAll();
  els.bell.setAttribute("aria-pressed", String(notificationsOn()));

  els.codeForm.addEventListener("submit", onCode);
  els.codeInput.addEventListener("input", () => {
    sound.key();
    if (els.codeFeedback.textContent) ui.setFeedback("");
  });
  els.hintButton.addEventListener("click", askForHint);
  els.giveUp.addEventListener("click", async () => {
    if (busy || game.status !== "playing") return;
    giveUp(game);
    await receive({ from: "me", text: "going back to sleep" });
    await finish();
  });
  els.shareButton.addEventListener("click", share);
  els.statsButton.addEventListener("click", openStats);
  els.calendar.addEventListener("click", openStats);
  els.bell.addEventListener("click", toggleBell);
  els.mute.addEventListener("click", toggleMute);

  // Close a dialog by clicking outside it.
  for (const dialog of [els.statsDialog, els.photoDialog]) {
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
  }

  if (game.messages.length === 0 && game.status === "playing") {
    // A fresh day. Browsers block sound until a click, so the first click
    // starts the alarm ringing and the second turns it off.
    ui.showIntro(ALARM_TIME);
    ui.renderClock(ALARM_TIME);
    let stopAlarm = null;
    els.wakeButton.addEventListener("click", () => {
      if (!stopAlarm) {
        sound.unlock();
        stopAlarm = sound.startAlarm();
        ui.setRinging(true);
        ui.ringIntro();
        return;
      }
      wakeUp(stopAlarm);
    });
  } else {
    ui.hideIntro({ instant: true });
  }
}

// Show the page once the fonts are in, so it never flashes half-styled.
start();
Promise.race([document.fonts.ready, wait(1000)]).then(() => {
  document.documentElement.classList.remove("is-booting");
});

