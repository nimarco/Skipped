/*
 * main.js
 * Starts the app and connects the pieces: today's word, the game rules,
 * storage and the room. For now it only marks the page as ready.
 */

import { CLASS_END, CLASS_START } from "./config.js";

const room = document.getElementById("room");
room.dataset.classMinutes = String(CLASS_END - CLASS_START);
