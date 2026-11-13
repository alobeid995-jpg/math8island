// The owner's 6-digit PIN. It is kept (salted and hashed, never in plain text) in ownersec/pin, which only the owner can read.
// Used before adding a lot of XP and before opening the Developer page. It is a screen lock for a signed-in browser.
import { fs, doc, getDoc, setDoc } from "./fb.js?v=1112t";
const ref = () => doc(fs, "ownersec", "pin");
const b64 = u => btoa(String.fromCharCode(...u)), unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function derive(pin, salt, iter) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, k, 256));
}
let cache = null, unlockUntil = 0, fails = 0, lockUntil = 0;
export async function loadPin(force) {
  if (cache && !force) return cache;
  try { const s = await getDoc(ref()); cache = s.exists() ? s.data() : {}; } catch (e) { cache = { err: true }; }
  return cache;
}
export const hasPin = c => !!(c && c.hash && c.salt);
export async function checkPin(pin) {
  const c = await loadPin(); if (!hasPin(c)) return false;
  return b64(await derive(pin, unb64(c.salt), c.iter || 150000)) === c.hash;
}
export async function savePin(pin, settings) {
  const c = await loadPin(), keep = { xpOn: c.xpOn !== false, devOn: c.devOn !== false, xpMin: c.xpMin || 500, ...(settings || {}) };
  if (pin) { const salt = crypto.getRandomValues(new Uint8Array(16)), iter = 150000; Object.assign(keep, { salt: b64(salt), iter, hash: b64(await derive(pin, salt, iter)) }); }
  else Object.assign(keep, { salt: c.salt, iter: c.iter, hash: c.hash });
  keep.updated = Date.now();
  await setDoc(ref(), keep); cache = keep; return keep;
}
export const unlockedNow = () => Date.now() < unlockUntil;
/** Shows a PIN box. Resolves true when the right PIN is typed, false when the owner cancels. */
export function askPin(title, why, opts = {}) {
  return new Promise(res => {
    const o = document.createElement("div");
    o.style.cssText = "position:fixed;inset:0;z-index:2147483000;background:rgba(6,12,28,.82);display:grid;place-items:center;padding:16px;font-family:system-ui,sans-serif";
    o.className = "pin-ov";
    o.innerHTML = `<form style="background:#fff;color:#0f2a57;border-radius:18px;padding:22px;width:min(340px,100%);box-shadow:0 24px 60px rgba(0,0,0,.4);display:grid;gap:12px">
      <b style="font-size:19px">🔒 ${title}</b><span style="font-size:14px;opacity:.8">${why || "Type your 6-digit PIN."}</span>
      <input inputmode="numeric" autocomplete="off" maxlength="6" pattern="[0-9]{6}" type="password" placeholder="••••••" style="font-size:28px;letter-spacing:10px;text-align:center;padding:10px;border:2px solid #c9d6ee;border-radius:12px;width:100%;box-sizing:border-box">
      <small class="pe" style="min-height:1.2em;color:#c4321f;font-weight:700"></small>
      <div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" class="pc" style="padding:10px 14px;border-radius:10px;border:1px solid #c9d6ee;background:#fff;font:inherit;font-weight:700;color:#0f2a57">${opts.cancel || "Cancel"}</button><button type="submit" style="padding:10px 16px;border-radius:10px;border:0;background:#1f5bbd;color:#fff;font:inherit;font-weight:800">Unlock</button></div></form>`;
    document.body.appendChild(o);
    const f = o.querySelector("form"), i = o.querySelector("input"), e = o.querySelector(".pe"); setTimeout(() => i.focus(), 50);
    const done = v => { o.remove(); res(v); };
    o.querySelector(".pc").onclick = () => done(false);
    f.onsubmit = async ev => {
      ev.preventDefault();
      if (Date.now() < lockUntil) { e.textContent = "Too many tries. Wait a minute."; return; }
      if (!/^\d{6}$/.test(i.value)) { e.textContent = "The PIN is 6 digits."; return; }
      let ok = false; try { ok = await checkPin(i.value); } catch {}
      if (ok) { fails = 0; unlockUntil = Date.now() + 5 * 60e3; done(true); return; }
      fails++; i.value = ""; if (fails >= 5) { lockUntil = Date.now() + 60e3; fails = 0; e.textContent = "Wrong PIN. Locked for a minute."; } else e.textContent = "Wrong PIN.";
    };
  });
}
/** For adding XP: true when this amount may go ahead. */
export async function xpAllowed(n) {
  const c = await loadPin(true), min = Number(c.xpMin) || 500;
  if (Math.abs(n) <= min) return true;
  if (c.err) { alert("Could not check your PIN. Check your connection."); return false; }
  if (c.xpOn === false && hasPin(c)) return true;
  if (!hasPin(c)) { alert(`More than ${min} XP needs your PIN. Open Developer > Security and set a 6-digit PIN first.`); return false; }
  if (unlockedNow()) return true;
  return askPin("Your PIN", `You are about to change XP by ${n > 0 ? "+" : ""}${n}. Type your PIN to confirm it is you.`);
}
