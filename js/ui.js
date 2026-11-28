/*
 * ui.js
 * Everything that touches the page: the clock's LED digits, the light in
 * the dark room, the scrap of paper with tried codes, the group chat, the
 * laptop's quiz card, the wall calendar, and the record and past days below
 * the room. It shows what game.js decided; it never decides scores or time.
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
  calendarNote: $("calendar-note"),
  window: $("window"),
  barDay: $("bar-day"),
  bar: $("bar"),
  main: $("main"),
  stats: $("stats"),
  recordNote: $("record-note"),
  recordMonth: $("record-month"),
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

// Small weather icons for the phone's status bar, drawn in one stroke style.
const CLOUD = '<path d="M5.5 10.5h9a3.2 3.2 0 0 0 .3-6.4A4.6 4.6 0 0 0 6 4.6a3 3 0 0 0-.5 5.9z" fill="currentColor"/>';
const WEATHER_ICONS = {
  clear: '<circle cx="10" cy="8" r="3.4" fill="currentColor"/><path d="M10 1.5v1.8M10 12.7v1.8M3.5 8h1.8M14.7 8h1.8M5.4 3.4l1.3 1.3M13.3 11.3l1.3 1.3M5.4 12.6l1.3-1.3M13.3 4.7l1.3-1.3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',
  cloudy: CLOUD,
  rain: `${CLOUD}<path d="M7 12.5l-1 2.2M10.5 12.5l-1 2.2M14 12.5l-1 2.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`,
  snow: `${CLOUD}<circle cx="6.5" cy="13.6" r="1" fill="currentColor"/><circle cx="10" cy="14.4" r="1" fill="currentColor"/><circle cx="13.5" cy="13.6" r="1" fill="currentColor"/>`,
};
const WEATHER_WORDS = { clear: "Clear", cloudy: "Cloudy", rain: "Rain", snow: "Snow" };

export function setWeather(weather) {
  if (!weather) {
    els.phoneWeather.textContent = "St. Louis";
    els.window.setAttribute("aria-label", "Closed window blinds");
    return;
  }
  const kind = weather.snow ? "snow" : weather.rain ? "rain" : weather.cloudy ? "cloudy" : "clear";
  els.scene.dataset.weather = kind;
  const words = `${WEATHER_WORDS[kind]} · ${weather.temp}°F`;
  els.phoneWeather.innerHTML = `<svg viewBox="0 0 20 16" aria-hidden="true">${WEATHER_ICONS[kind]}</svg><span></span>`;
  els.phoneWeather.querySelector("span").textContent = words;
  els.phoneWeather.setAttribute("title", `St. Louis right now: ${words}`);
  els.window.setAttribute("aria-label", `Closed window blinds. Outside in St. Louis: ${words}.`);
}

// ---------- The laptop ----------

export function renderQuizHeader(day, makeUp, date) {
  els.quizTitle.textContent = makeUp ? `Make-up quiz · Day ${day}` : `Quiz · Day ${day}`;
  els.urlDay.textContent = `day-${day}`;
  document.title = `Day ${day} · Skipped`;
  const when = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  els.barDay.textContent = `Day ${day}`;
  const dateTag = document.createElement("span");
  dateTag.className = "bar-date";
  dateTag.textContent = ` · ${when}`;
  els.barDay.append(dateTag);
  if (makeUp) {
    const tag = document.createElement("span");
    tag.className = "is-makeup";
    tag.textContent = " · make-up";
    els.barDay.append(tag);
  }
  if (makeUp) {
    els.siteFooter.innerHTML = `Make-up quiz: practice only, it won't count. <a href="./">Back to today's quiz</a>`;
    els.siteFooter.classList.add("is-makeup");
  }
}

const LOCK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="3.5" y="7" width="9" height="7" rx="1.5" fill="currentColor"/></svg>';

export function renderMeta(worth, late) {
  els.metaWorth.textContent = `${worth.toFixed(2)} / ${QUIZ_POINTS}`;
  els.metaLate.textContent = late > 0 ? `−${late.toFixed(2).replace(/\.?0+$/, "")}%` : "0%";
  els.metaLate.classList.toggle("is-late", late > 0);
  // Locked until you type the code. The lock is drawn, not an emoji.
  if (!els.quizBadge.querySelector("svg")) {
    els.quizBadge.innerHTML = `${LOCK}Locked`;
    els.quizBadge.className = "badge is-locked";
  }
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
  els.scene.classList.add("is-buzz");
  clearTimeout(buzzPhone.timer);
  buzzPhone.timer = setTimeout(() => els.scene.classList.remove("is-buzz"), 1100);
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

// ---------- Wall calendar and the record below the room ----------

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Draws the month twice: on the paper calendar on the wall, and as the
 * table in "Your record".
 * @param {Date} date  the date being played (sets the month shown)
 * @param {(d: Date) => number} dayOf  date -> game day number
 * @param {object} results  saved results by day
 * @param {number} today
 * @param {number} streak
 */
export function renderCalendar(date, dayOf, results, today, streak) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const monthName = date.toLocaleString("en-US", { month: "long" });
  els.calendarMonth.innerHTML = `${monthName} <span>${year}</span>`;

  const wall = WEEKDAYS.map((w) => `<span class="head">${w}</span>`);
  const firstWeekday = new Date(year, month, 1).getDay();
  for (let i = 0; i < firstWeekday; i++) wall.push('<span class="blank"></span>');

  const rows = [];
  let row = Array.from({ length: firstWeekday }, () => "<td></td>");
  const days = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= days; d++) {
    const n = dayOf(new Date(year, month, d));
    const result = results[n];
    const cls = [];
    if (n < 1) cls.push("is-before");
    if (n === today) cls.push("is-today");
    if (result) cls.push(result.won ? "is-won" : "is-lost");
    wall.push(`<span class="day ${cls.join(" ")}">${d}</span>`);

    let note = "";
    if (result) note = `<span class="month-score">${result.won ? result.score.toFixed(2) : "closed"}</span>`;
    else if (n === today) note = '<span class="month-score">today</span>';
    else if (n >= 1 && n < today) {
      cls.push("is-missed");
      note = '<span class="month-score">missed</span>';
    }
    const current = n === today ? ' aria-current="date"' : "";
    row.push(`<td class="${cls.join(" ")}"${current}>${d}${note}</td>`);
    if (row.length === 7) {
      rows.push(`<tr>${row.join("")}</tr>`);
      row = [];
    }
  }
  if (row.length) rows.push(`<tr>${row.join("")}${"<td></td>".repeat(7 - row.length)}</tr>`);

  els.calendarGrid.innerHTML = wall.join("");
  els.calendarNote.textContent = streak > 0 ? `streak: ${streak}` : "";
  const head = WEEKDAY_NAMES.map((w, i) => `<th scope="col" abbr="${FULL_NAMES[i]}">${w}</th>`).join("");
  els.recordMonth.innerHTML = `<caption>${monthName} ${year}</caption><thead><tr>${head}</tr></thead><tbody>${rows.join("")}</tbody>`;
}

export function renderStats(stats, pastDays) {
  const rows = [
    ["Streak", `${stats.streak} <span>${stats.streak === 1 ? "day" : "days"}</span>`],
    ["Quizzes taken", stats.played],
    ["Average", `${stats.average.toFixed(2)} <span>/ ${QUIZ_POINTS}</span>`],
    ["Best streak", stats.bestStreak],
  ];
  els.stats.innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
  els.recordNote.textContent =
    stats.played > 3
      ? `Your lowest three days are dropped from the average, like the syllabus does. Grade so far: ${stats.percent}%.`
      : "Like the syllabus, your lowest three days get dropped once you've taken four quizzes.";

  if (!pastDays.length) {
    const li = document.createElement("li");
    li.className = "is-empty";
    li.textContent = "Nothing to make up yet. Today is the first quiz.";
    els.makeups.replaceChildren(li);
    return;
  }
  els.makeups.replaceChildren(
    ...pastDays.map(({ day, label, result, practiced }) => {
      const li = document.createElement("li");
      const score = result ? (result.won ? `Got it · ${result.score.toFixed(2)}` : "Closed · 0.00") : practiced ? "Made up (practice)" : "Missed";
      li.innerHTML = `
        <span class="past-day">Day ${day}<span class="past-date">${label}</span></span>
        <span class="past-word" role="img" aria-label="Answer hidden"></span>
        <span class="past-score${result ? "" : " is-missed"}">${score}</span>
        <a class="past-link" href="?day=${day}">${result || practiced ? "Replay" : "Make it up"}</a>`;
      return li;
    }),
  );
}

// ---------- Waking up ----------

// While asleep, only the intro can be used: the room, bar and site wait.
function setAsleep(asleep) {
  els.main.inert = asleep;
  els.bar.inert = asleep;
  document.body.classList.toggle("is-asleep", asleep);
}

export function hideIntro({ instant = false } = {}) {
  els.intro.classList.add("is-gone");
  if (instant) els.intro.hidden = true;
  setAsleep(false);
}

// The alarm is going off: the intro's button now turns it off.
export function ringIntro() {
  els.wakeButton.textContent = "Turn off the alarm";
  els.intro.classList.add("is-ringing");
}

export function showIntro(minute) {
  els.introTime.textContent = `${formatTime(minute)} PM`;
  setAsleep(true);
}
