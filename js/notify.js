/*
 * notify.js — BROWSER API: Notifications
 * https://developer.mozilla.org/docs/Web/API/Notifications_API
 *
 * If you switch tabs while waiting for a friend's reply, the reply shows
 * up as a system notification, like a real text. Only asked for when the
 * player taps the bell; if it's denied or unsupported, the in-page buzz is
 * all that happens.
 */

export function notificationsSupported() {
  return "Notification" in window;
}

export function notificationsOn() {
  return notificationsSupported() && Notification.permission === "granted";
}

export async function askForNotifications() {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export function notify(title, body) {
  if (!notificationsOn() || !document.hidden) return;
  try {
    const n = new Notification(title, { body, tag: "skipped-chat" });
    n.addEventListener("click", () => {
      window.focus();
      n.close();
    });
  } catch {
    // Some browsers (Android Chrome) only allow notifications from a service worker.
  }
}
