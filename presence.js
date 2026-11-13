// Lets the owner see who is on the site. One small record per student: when he came, when he was last here, and his last few actions.
// Written rarely (every 4 minutes while the page is open and visible), so it stays far inside the free plan.
import { fs, doc, getDoc, setDoc, meter } from "./fb.js?v=1112n";

let ref = null, rec = null, ev = [], tmr = null, lastWrite = 0, getMe = () => null;
const HEARTBEAT = 4 * 60 * 1000;

async function write() {
  if (!ref || !rec) return;
  clearTimeout(tmr); tmr = null; lastWrite = Date.now();
  const me = getMe() || {};
  const body = { sid: rec.sid, tid: rec.tid, name: String(me.name || rec.name || "").slice(0, 80), cls: String(me.cls || rec.cls || "").slice(0, 12),
    first: rec.first, last: Date.now(), n: rec.n, ev: ev.slice(-15), use: meter() };
  try { await setDoc(ref, body); } catch {}
}
export function logEv(text) {
  ev.push({ t: Date.now(), a: String(text).slice(0, 90) });
  if (ref && rec && !tmr) tmr = setTimeout(write, 15000);   // actions are sent together, not one by one
}
export async function startPresence(u, p, me) {
  getMe = me || getMe;
  ref = doc(fs, "presence", u.uid);
  let old = null; try { const s = await getDoc(ref); old = s.exists() ? s.data() : null; } catch {}
  rec = { sid: p.sid, tid: p.tid || "", first: (old && old.first) || Date.now(), n: ((old && old.n) || 0) + 1 };
  ev = old && Array.isArray(old.ev) ? old.ev.slice(-10) : [];
  ev.push({ t: Date.now(), a: "Logged in" });
  for (let i = 0; i < 25 && !getMe(); i++) await new Promise(r => setTimeout(r, 200));
  await write();
  setInterval(() => { if (document.visibilityState === "visible") write(); }, HEARTBEAT);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && Date.now() - lastWrite > 60000) write(); });
}
