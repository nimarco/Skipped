/*
 * ui.js
 * Everything that touches the page: the clock's LED digits, the light in
 * the room, the scrap of paper with tried codes, the group chat, the laptop's quiz card, the wall
 * calendar and dialogs. It shows what game.js decided; it never decides
 * scores or time itself.
 */

import { CLASS_END, FRIENDS, QUIZ_POINTS } from "./config.js";
import { dayProgress, formatTime } from "./game.js";
import { renderSlide } from "./slide.js";

const $ = (id) => document.getElementById(id);

export const els = {
  scene: $("scene"),
  clock: $("clock"),
  clockDigits: $("clock-digits"),
  notes: $("notes"),
  scrap: $("scrap"),
  chat: $("chat"),
  phone: $("phone"),
  phoneTime: $("phone-time"),
  phoneWeather: $("phone-weather"),
  hintButton: $("hint-button"),
  hintCost: $("hint-cost"),
  bell: $("bell"),
  codeForm: $("code-form"),
  codeInput: $("code-input"),
  codeFeedback: $("code-feedback"),
  quizTitle: $("quiz-title"),
  quizBadge: $("quiz-badge"),
  quizLocked: $("quiz-locked"),
  quizDone: $("quiz-done"),
  metaWorth: $("meta-worth"),
  metaLate: $("meta-late"),
  giveUp: $("give-up"),
  urlDay: $("url-day"),
  siteFooter: $("site-footer"),
  resultPoints: $("result-points"),
  resultLine: $("result-line"),
  resultCode: $("result-code"),
  resultEnding: $("result-ending"),
  shareButton: $("share-button"),
  shareFeedback: $("share-feedback"),
  shareFallback: $("share-fallback"),
  statsButton: $("stats-button"),
  calendar: $("calendar"),
  calendarMonth: $("calendar-month"),
  calendarGrid: $("calendar-grid"),
  statsDialog: $("stats-dialog"),
  stats: $("stats"),
  makeups: $("makeups"),
  photoDialog: $("photo-dialog"),
  photoFrame: $("photo-frame"),
  intro: $("intro"),
  introTime: $("intro-time"),
  wakeButton: $("wake-button"),
  mute: $("mute"),
};

// ---------- The LED clock ----------

// Segments a–g of a seven-segment digit, drawn in a 12×20 box.
const SEGMENTS = {
  a: [2, 0.5, 8, 1.7],
  b: [9.8, 2, 1.7, 7.3],
  c: [9.8, 10.7, 1.7, 7.3],
  d: [2, 17.8, 8, 1.7],
  e: [0.5, 10.7, 1.7, 7.3],
  f: [0.5, 2, 1.7, 7.3],
  g: [2, 9.15, 8, 1.7],
};
const DIGITS = ["abcdef", "bc", "abged", "abgcd", "fgbc", "afgcd", "afgedc", "abc", "abcdefg", "abfgcd"];

function digitSvg(char) {
  const lit = char === " " ? "" : DIGITS[Number(char)];
  const rects = Object.entries(SEGMENTS)
    .map(([name, [x, y, w, h]]) => `<rect class="seg${lit.includes(name) ? " on" : ""}" x="${x}" y="${y}" width="${w}" height="${h}" rx="0.7"/>`)
    .join("");
  return `<svg viewBox="0 0 12 20">${rects}</svg>`;
}

const COLON = '<svg viewBox="0 0 4 20" class="colon-svg"><circle class="colon" cx="2" cy="6.5" r="1.1"/><circle class="colon" cx="2" cy="13.5" r="1.1"/></svg>';

export function renderClock(minute) {
  const [h, m] = formatTime(minute).split(":");
  const hh = h.padStart(2, " ");
  els.clockDigits.innerHTML = digitSvg(hh[0]) + digitSvg(hh[1]) + COLON + digitSvg(m[0]) + digitSvg(m[1]);
  els.clock.setAttribute("aria-label", `Alarm clock: ${formatTime(minute)} PM. Class ends at ${formatTime(CLASS_END)}.`);
  els.phoneTime.textContent = formatTime(minute);
}

// The digits race forward minute by minute, easing in and out.
export function animateClock(from, to, ms) {
  return new Promise((resolve) => {
    if (to <= from || ms <= 0) {
      renderClock(to);
      resolve();
      return;
    }
    const start = performance.now();
    let shown = from;
    const frame = (now) => {
      const x = Math.min(1, (now - start) / ms);
      const eased = 0.5 - 0.5 * Math.cos(Math.PI * x);
      const minute = Math.round(from + (to - from) * eased);
      if (minute !== shown) {
        shown = minute;
        renderClock(minute);
      }
      if (x < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}

export function setRinging(on) {
  els.clock.classList.toggle("is-ringing", on);
}

// ---------- Light in the room ----------

export function setTimeOfDay(minute, jumpMs = 0) {
  const scene = els.scene;
  const t = dayProgress(minute).toFixed(3);
  if (jumpMs > 0) {
    scene.style.setProperty("--jump-ms", `${jumpMs}ms`);
    scene.classList.add("is-jumping");
    requestAnimationFrame(() => scene.style.setProperty("--t", t));
    setTimeout(() => scene.classList.remove("is-jumping"), jumpMs + 50);
  } else {
    scene.style.setProperty("--t", t);
  }
}

export function setWeather(weather) {
  if (!weather) {
    els.phoneWeather.textContent = "St. Louis";
    return;
  }
  const kind = weather.snow ? "snow" : weather.rain ? "rain" : weather.cloudy ? "cloudy" : "clear";
  els.scene.dataset.weather = kind;
  const icon = { snow: "❄", rain: "☂", cloudy: "☁", clear: "☀" }[kind];
  els.phoneWeather.textContent = `${icon} ${weather.temp}°`;
  els.phoneWeather.setAttribute("title", `St. Louis right now: ${weather.temp}°F, ${kind}`);
}

// ---------- The laptop ----------

export function renderQuizHeader(day, makeUp) {
  els.quizTitle.textContent = makeUp ? `Make-up quiz · Day ${day}` : `Quiz · Day ${day}`;
  els.urlDay.textContent = `day-${day}`;
  document.title = `Day ${day} · Skipped`;
  if (makeUp) {
    els.siteFooter.innerHTML = `Make-up quiz: practice only, it won't count. <a href="./">Back to today's quiz</a>`;
    els.siteFooter.classList.add("is-makeup");
  }
}

export function renderMeta(worth, late) {
  els.metaWorth.textContent = `${worth.toFixed(2)} / ${QUIZ_POINTS}`;
  els.metaLate.textContent = late > 0 ? `−${late.toFixed(2).replace(/\.?0+$/, "")}%` : "0%";
  els.metaLate.classList.toggle("is-late", late > 0);
  els.quizBadge.textContent = "Open";
  els.quizBadge.className = "badge is-open";
}

export function setFeedback(text, tone = "") {
  els.codeFeedback.textContent = text;
  els.codeFeedback.className = `feedback${tone ? ` is-${tone}` : ""}`;
  els.codeInput.classList.toggle("is-invalid", tone === "error");
  if (tone === "error") {
    // restart the shake animation
    els.codeInput.style.animation = "none";
    void els.codeInput.offsetWidth;
    els.codeInput.style.animation = "";
  }
}

export function showResult({ won, points, line, code, ending }) {
  els.quizLocked.hidden = true;
  els.quizDone.hidden = false;
  els.quizBadge.textContent = won ? "Submitted" : "Closed";
  els.quizBadge.className = `badge ${won ? "is-won" : "is-lost"}`;
  els.resultPoints.textContent = points.toFixed(2);
  els.resultLine.textContent = line;
  els.resultCode.textContent = code;
  els.resultEnding.textContent = ending;
}

// ---------- The torn scrap of paper ----------

export function renderNotes(guesses, animateLast = false) {
  els.scrap.dataset.count = String(guesses.length);
  els.notes.replaceChildren(
    ...guesses.map((guess, i) => {
      const li = document.createElement("li");
      li.textContent = guess;
      // sloppy but stable: each line sits a little crooked, the same way every reload
      const seed = guess.length * 37 + i * 53;
      li.style.setProperty("--tilt", `${(seed % 7) - 3}deg`);
      li.style.setProperty("--nudge", `${(seed % 5) * 0.08}em`);
      li.style.setProperty("--slash", `${-2 - (seed % 6)}deg`);
      if (guess.length > 13) li.classList.add("is-longer");
      else if (guess.length > 8) li.classList.add("is-long");
      if (animateLast && i === guesses.length - 1) li.classList.add("is-new");
      return li;
    }),
  );
}

// ---------- The group chat ----------

let lastFrom = null;

function friendName(id) {
  return FRIENDS.find((f) => f.id === id)?.name ?? id;
}

export function addTimeStamp(text) {
  const li = document.createElement("li");
  li.className = "chat-time";
  li.textContent = text;
  els.chat.append(li);
  lastFrom = null;
  scrollChat();
}

/**
 * Adds one message. Media ("slide", "photo", "voice") gets its own element;
 * onVoice(src, button) plays a voice memo.
 */
export function addMessage(msg, { onVoice } = {}) {
  const li = document.createElement("li");
  const isMe = msg.from === "me";
  li.className = `msg${isMe ? " is-me" : ""}`;
  li.dataset.from = msg.from;
  if (!isMe && msg.from !== lastFrom) {
    const name = document.createElement("span");
    name.className = "msg-name";
    name.textContent = friendName(msg.from);
    li.append(name);
  }
  lastFrom = msg.from;

  if (msg.media?.kind === "voice") {
    li.append(voiceBubble(msg.media.src, onVoice));
  } else if (msg.media) {
    li.append(mediaBubble(msg.media));
  }
  if (msg.text) {
    const bubble = document.createElement("span");
    bubble.className = "msg-bubble";
    bubble.textContent = msg.text;
    li.append(bubble);
  }
  els.chat.append(li);
  scrollChat();
  return li;
}

function mediaBubble(media) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "msg-media";
  const label = media.kind === "slide" ? "Blurry photo of the projector slide" : "A friend's photo of it outside";
  button.setAttribute("aria-label", `${label}. Open bigger.`);

  const broken = (text) => {
    button.classList.add("is-broken");
    button.disabled = true;
    button.textContent = text;
  };

  if (media.kind === "slide") {
    renderSlide(media.src)
      .catch(() => (media.fallback ? renderSlide(media.fallback) : Promise.reject()))
      .then((canvas) => {
        canvas.setAttribute("role", "img");
        canvas.setAttribute("aria-label", label);
        button.append(canvas);
        scrollChat();
      })
      .catch(() => broken("📷 photo didn't send (bad wifi in the lecture hall)"));
  } else {
    const img = new Image();
    img.alt = label;
    img.decoding = "async";
    img.addEventListener("load", scrollChat);
    img.addEventListener("error", () => broken("📷 photo didn't send"));
    img.src = media.src;
    button.append(img);
  }

  button.addEventListener("click", () => openPhoto(button.firstElementChild));
  return button;
}

function voiceBubble(src, onVoice) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "voice";
  button.setAttribute("aria-label", "Play voice memo");
  const bars = Array.from({ length: 22 }, (_, i) => {
    const h = 0.3 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6)) * 1.1;
    return `<i style="height:${h.toFixed(2)}em"></i>`;
  }).join("");
  button.innerHTML = `<span class="voice-play"><svg viewBox="0 0 10 12"><path d="M0 0l10 6-10 6z"/></svg></span><span class="voice-wave">${bars}</span><span class="voice-time">0:03</span>`;
  button.addEventListener("click", () => onVoice?.(src, button));
  return button;
}

export function markVoiceBroken(button) {
  button.disabled = true;
  button.querySelector(".voice-time").textContent = "failed";
  button.setAttribute("aria-label", "Voice memo failed to download");
}

export function showTyping(from) {
  const li = document.createElement("li");
  li.className = "msg typing";
  li.dataset.from = from;
  li.setAttribute("aria-label", `${friendName(from)} is typing`);
  if (from !== lastFrom) {
    const name = document.createElement("span");
    name.className = "msg-name";
    name.textContent = friendName(from);
    li.append(name);
  }
  const bubble = document.createElement("span");
  bubble.className = "msg-bubble";
  bubble.innerHTML = "<i></i><i></i><i></i>";
  li.append(bubble);
  els.chat.append(li);
  scrollChat();
  return () => li.remove();
}

function scrollChat() {
  els.chat.scrollTop = els.chat.scrollHeight;
}

export function buzzPhone() {
  els.phone.classList.remove("is-buzzing");
  void els.phone.offsetWidth;
  els.phone.classList.add("is-buzzing");
}

export function setHintButton({ label, cost, disabled }) {
  els.hintButton.querySelector(".hint-label").textContent = label;
  els.hintCost.textContent = cost;
  els.hintButton.disabled = disabled;
}

// ---------- Photos up close ----------

function openPhoto(node) {
  if (!node) return;
  let copy;
  if (node instanceof HTMLCanvasElement) {
    copy = document.createElement("canvas");
    copy.width = node.width;
    copy.height = node.height;
    copy.getContext("2d").drawImage(node, 0, 0);
    copy.setAttribute("role", "img");
    copy.setAttribute("aria-label", node.getAttribute("aria-label"));
  } else {
    copy = new Image();
    copy.alt = node.alt;
    copy.src = node.src.replace("/medium.", "/large.");
  }
  els.photoFrame.replaceChildren(copy);
  els.photoDialog.showModal();
}

// ---------- Wall calendar ----------

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * @param {Date} date  the date being played (sets the month shown)
 * @param {(d: Date) => number} dayOf  date -> game day number
 * @param {object} results  saved results by day
 * @param {number} today
 */
export function renderCalendar(date, dayOf, results, today) {
  const year = date.getFullYear();
  const month = date.getMonth();
  els.calendarMonth.textContent = date.toLocaleString("en-US", { month: "long" });
  const cells = WEEKDAYS.map((w) => `<span class="head">${w}</span>`);
  const firstWeekday = new Date(year, month, 1).getDay();
  for (let i = 0; i < firstWeekday; i++) cells.push("<span></span>");
  const days = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= days; d++) {
    const n = dayOf(new Date(year, month, d));
    const result = results[n];
    const cls = ["day"];
    if (n === today) cls.push("is-today");
    if (result) cls.push(result.won ? "is-won" : "is-lost");
    cells.push(`<span class="${cls.join(" ")}">${d}</span>`);
  }
  els.calendarGrid.innerHTML = cells.join("");
}

export function renderStats(stats, makeups) {
  const rows = [
    ["Quizzes taken", stats.played],
    ["Got the code", stats.wins],
    ["Average (3 lowest dropped)", `${stats.average.toFixed(2)} / ${QUIZ_POINTS}`],
    ["Grade", `${stats.percent}%`],
    ["Streak", `${stats.streak} 🔥`],
    ["Best streak", stats.bestStreak],
  ];
  els.stats.innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
  els.makeups.replaceChildren(
    ...(makeups.length
      ? makeups.map(({ day, label, done }) => {
          const li = document.createElement("li");
          const a = document.createElement("a");
          a.href = `?day=${day}`;
          a.innerHTML = `<span>Day ${day}</span><span>${label}${done ? " · done" : ""}</span>`;
          li.append(a);
          return li;
        })
      : [Object.assign(document.createElement("li"), { className: "empty", textContent: "Nothing to make up yet. Perfect attendance so far." })]),
  );
}

export function hideIntro({ instant = false } = {}) {
  els.intro.classList.add("is-gone");
  if (instant) els.intro.hidden = true;
  els.scene.inert = false;
  document.body.classList.remove("is-asleep");
}

// The alarm is going off: the intro's button now turns it off.
export function ringIntro() {
  els.wakeButton.textContent = "Turn off the alarm";
  els.intro.classList.add("is-ringing");
}

export function showIntro(minute) {
  els.introTime.textContent = `${formatTime(minute)} PM`;
  // The room can't be clicked or tabbed into until you wake up.
  els.scene.inert = true;
  document.body.classList.add("is-asleep");
}
