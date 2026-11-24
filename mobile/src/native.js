import {Capacitor} from "@capacitor/core";

export const isNative = Capacitor.isNativePlatform();
const TIMER_NOTIFICATION = 4242;

let notificationsMod = null;
async function notifications() {
  if (!isNative) return null;
  notificationsMod ??= (await import("@capacitor/local-notifications")).LocalNotifications;
  return notificationsMod;
}

/** Schedules the "block finished" alert so it fires even with the app in the background. */
export async function scheduleTimerAlert(at, title, body) {
  const LN = await notifications();
  if (!LN) return;
  try {
    let perm = await LN.checkPermissions();
    if (perm.display !== "granted") perm = await LN.requestPermissions();
    if (perm.display !== "granted") return;
    await LN.cancel({notifications: [{id: TIMER_NOTIFICATION}]});
    await LN.schedule({notifications: [{id: TIMER_NOTIFICATION, title, body, schedule: {at: new Date(at), allowWhileIdle: true}}]});
  } catch { /* notifications are a nice-to-have */ }
}

export async function cancelTimerAlert() {
  const LN = await notifications();
  if (!LN) return;
  try { await LN.cancel({notifications: [{id: TIMER_NOTIFICATION}]}); } catch { /* ignore */ }
}

/** Native share sheet on Android; clipboard in a browser. Returns what happened. */
export async function shareText(title, text) {
  if (isNative) {
    try {
      const {Share} = await import("@capacitor/share");
      await Share.share({title, text, dialogTitle: title});
      return "shared";
    } catch { /* fall through to clipboard */ }
  }
  try { await navigator.clipboard.writeText(text); return "copied"; } catch { return "failed"; }
}

export const buzz = (pattern = [80, 60, 80]) => { try { navigator.vibrate?.(pattern); } catch { /* ignore */ } };
