/*
 * slide.js — BROWSER API: Canvas 2D
 * https://developer.mozilla.org/docs/Web/API/Canvas_API
 *
 * Draws "a photo of the projector slide taken from the back row": the
 * Wikipedia photo is shrunk to a few pixels and scaled back up (a blur
 * that works in every browser), washed out by the projector, keystoned,
 * with a couple of classmates' heads in the way.
 */

import { SLIDE_BLUR_WIDTH } from "./config.js";

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function head(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.82, r, 0, 0, Math.PI * 2); // head
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x, y + r * 2.1, r * 2, r * 1.35, 0, Math.PI, 0); // shoulders
  ctx.fill();
}

/** Resolves with a <canvas>, or rejects if the photo can't load. */
export async function renderSlide(src, width = 480, height = 320) {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // The dark lecture hall.
  const room = ctx.createLinearGradient(0, 0, 0, height);
  room.addColorStop(0, "#1d1d24");
  room.addColorStop(1, "#0d0d11");
  ctx.fillStyle = room;
  ctx.fillRect(0, 0, width, height);

  // The photo, shrunk then stretched back up = blur.
  const small = document.createElement("canvas");
  const ratio = img.height / img.width;
  small.width = SLIDE_BLUR_WIDTH;
  small.height = Math.max(4, Math.round(SLIDE_BLUR_WIDTH * ratio));
  const sctx = small.getContext("2d");
  sctx.drawImage(img, 0, 0, small.width, small.height);

  // The projected slide: a slightly keystoned screen (wider at the bottom).
  const top = 34;
  const bottom = height - 70;
  const inset = 64;
  const sw = width - inset * 2;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(inset + 10, top);
  ctx.lineTo(width - inset - 10, top);
  ctx.lineTo(width - inset + 6, bottom);
  ctx.lineTo(inset - 6, bottom);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "#f3f2ee";
  ctx.fillRect(0, 0, width, height);
  // A slide title bar of unreadable text.
  ctx.fillStyle = "rgba(60,60,70,.35)";
  ctx.fillRect(inset + 24, top + 14, sw * 0.45, 9);
  ctx.fillRect(inset + 24, top + 28, sw * 0.28, 6);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const pw = sw * 0.62;
  const ph = Math.min(bottom - top - 60, pw * ratio);
  ctx.drawImage(small, (width - pw) / 2, top + 46, pw, ph);
  // Projector wash: brighter in the middle, faded at the edges.
  const wash = ctx.createRadialGradient(width / 2, height / 2, 20, width / 2, height / 2, width * 0.6);
  wash.addColorStop(0, "rgba(255,255,240,.28)");
  wash.addColorStop(1, "rgba(120,120,150,.25)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // Heads in the rows in front, catching a little projector light.
  ctx.shadowColor = "rgba(255,255,240,.35)";
  ctx.shadowBlur = 6;
  head(ctx, width * 0.31, height - 74, 30, "#141418");
  head(ctx, width * 0.7, height - 62, 36, "#0e0e12");
  head(ctx, width * 0.5, height - 18, 26, "#18181d");
  ctx.shadowBlur = 0;

  // Phone-camera grain.
  const grain = ctx.getImageData(0, 0, width, height);
  for (let i = 0; i < grain.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 18;
    grain.data[i] += n;
    grain.data[i + 1] += n;
    grain.data[i + 2] += n;
  }
  ctx.putImageData(grain, 0, 0);
  return canvas;
}
