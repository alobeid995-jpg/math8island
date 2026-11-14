// Teachers and the owner report their own reads and writes too, so the owner's usage counter is complete.
// One small record per teacher, written every 10 minutes while the page is open and visible.
import { fs, doc, setDoc, meter } from "./fb.js?v=1113h";

let ref = null, name = "", role = "teacher", last = 0;
async function write() {
  if (!ref) return; last = Date.now();
  try { await setDoc(ref, { name, role, at: Date.now(), ...meter() }); } catch {}
}
export function startUsage(u, p) {
  ref = doc(fs, "usage", u.uid); name = String((p && p.name) || u.email || "Teacher").slice(0, 80); role = p && p.admin === true ? "owner" : "teacher";
  setTimeout(write, 20000);
  setInterval(() => { if (document.visibilityState === "visible") write(); }, 10 * 60 * 1000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && Date.now() - last > 120000) write(); });
}
