/*
 * config.js
 * Every tunable number in the game lives here, so balancing the game
 * never means hunting through logic code. Values are first drafts and get
 * tuned by playing.
 */

// Class runs 1:00–2:20 PM (the real Tue/Thu slot). Times are minutes after
// midnight on the game's own clock, not the player's real clock.
export const CLASS_START = 13 * 60;
export const CLASS_END = 14 * 60 + 20;

// The quiz is worth 2 points, like the real start-of-class quizzes.
export const QUIZ_POINTS = 2;
