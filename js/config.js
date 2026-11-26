/*
 * config.js
 * Every tunable number in the game lives here, so balancing the game
 * never means hunting through logic code. Values are first drafts and get
 * tuned by playing.
 */

// Day 1 is this date (player's local midnight). Day N plays word N.
export const LAUNCH_DATE = "2026-11-26";

// ---------- The clock ----------
// Times are minutes after midnight on the game's own clock. Time only moves
// when you act: asking for a hint or typing a wrong code.
export const CLASS_START = 13 * 60; // 1:00 PM, the real Tue/Thu slot
export const ALARM_TIME = 13 * 60 + 4; // you oversleep
export const QUIZ_OPENS = 13 * 60 + 5; // the game starts here; lateness counts from here
export const CLASS_END = 14 * 60 + 20; // 2:20 PM: the quiz closes

// Waiting for a friend to reply between slides.
export const HINT_WAIT_MINUTES = 7;
// Each wrong code costs a minute: no typing every word you know.
export const WRONG_GUESS_MINUTES = 1;
// A near miss ("oka" for "oak") is free: the laptop just says check spelling.
export const CLOSE_GUESS_MINUTES = 0;

// ---------- Scoring ----------
// The quiz is worth 2 points, like the real start-of-class quizzes.
export const QUIZ_POINTS = 2;
// The syllabus charges 0.25% per hour late. In here class is a race, so it's
// 1.25% per game minute (300× faster). At 2:20 the quiz closes: 0 points.
export const LATE_PERCENT_PER_MINUTE = 1.25;
// The calendar drops your lowest three days, like the syllabus drops the
// lowest three quiz grades.
export const DROP_LOWEST = 3;

// ---------- Hints ----------
// The order friends send hints in. A word skips any it has no data for.
// "category" arrives free with the intro.
export const HINT_ORDER = [
  "category",
  "slide",
  "sentence",
  "related",
  "letters",
  "rhyme",
  "photo",
  "voice",
];

// How long the "typing…" bubble shows before a reply (real milliseconds).
export const TYPING_MS = [1100, 2000];
// How long the room takes to jump forward in time.
export const TIME_JUMP_MS = 1700;
// Pause between messages in the intro chat.
export const INTRO_MESSAGE_MS = 900;

// The projector photo: how small it's drawn before being scaled back up.
// Smaller = blurrier. Each later hint the player asks for sharpens it a step.
export const SLIDE_BLUR_WIDTH = 22;

// ---------- Places ----------
// St. Louis (campus), for the weather outside and the friend's photo.
export const HOME = { lat: 38.6488, lng: -90.3108, name: "St. Louis" };
export const INAT_RADIUS_KM = 80;

// How long to wait for any API before using the stored fallback.
export const API_TIMEOUT_MS = 6000;

// ---------- The group chat ----------
export const FRIENDS = [
  { id: "maya", name: "Maya", color: "#e86a92" },
  { id: "jordan", name: "Jordan", color: "#4f8fd8" },
  { id: "theo", name: "Theo", color: "#3fa77a" },
  { id: "priya", name: "Priya", color: "#d6922b" },
];
export const GROUP_NAME = "2004 back row";
