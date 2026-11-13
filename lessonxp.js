// Lesson XP: +100 XP when a student finishes a whole lesson (examples, 3 games and the worksheet),
// and another +100 XP when the worksheet is 100% correct. Runs inside the teacher page; each award is saved on the student
// (lx), so nobody is paid twice, even if several screens are open.
import { getDocs, query, where, bcol, bdoc, getDoc } from "./fb.js?v=1112l";

const LES = {
  ag34: { cls: /^8G$/i, name: "Unit 3.4 lesson", parts: ["ag34-examples", "ag34-tap", "ag34-bound", "ag34-ineq", "ag34-ws"], ws: "ag34-ws" },
  eq41: { cls: /^8G$/i, name: "Exercise 4.1 lesson", parts: ["eq41-examples", "eq41-ws"], ws: "eq41-ws" },
  su42: { cls: /^8[BYSM]$/i, name: "substitution lesson", parts: ["su42-examples", "su42-ws"], ws: "su42-ws" },
  sb42: { cls: /^8[YSM]$/i, name: "substitution practice lesson", parts: ["sb42-examples", "sb42-ws"], ws: "sb42-ws" },
  el42: { cls: /^8[BYSM]$/i, name: "elimination lesson", parts: ["el42-examples", "el42-addsub", "el42-solve", "el42-spot", "el42-ws"], ws: "el42-ws" }
};
const DONE_XP = 100, PERFECT_XP = 100;
let running = false;
const busy = new Set();

async function run() {
  if (running) return; running = true;
  try {
    if (typeof students === "undefined" || !students.length || readOnly) return;
    const kinds = new Set(); students.forEach(s => Object.entries(LES).forEach(([k, c]) => { if (c.cls.test(s.cls)) kinds.add(k === "ag34" ? "ag" : "el"); }));
    if (!kinds.size) return;
    const snap = await getDocs(query(bcol("plays"), where("s", "in", [...kinds])));
    const bySid = new Map();
    snap.docs.forEach(d => { const v = d.data(); if (!bySid.has(v.sid)) bySid.set(v.sid, []); bySid.get(v.sid).push(v); });
    for (const st of students) {
      const pl = bySid.get(st.id); if (!pl) continue;
      for (const [key, c] of Object.entries(LES)) {
        if (!c.cls.test(st.cls)) continue;
        const have = new Set(pl.map(p => p.g)), rec = (st.lx || {})[key] || {};
        const finished = c.parts.every(g => have.has(g));
        const perfect = finished && pl.some(p => p.g === c.ws && (+p.w || 0) === 0 && (+p.r || 0) > 0);
        const wantDone = finished && !rec.done, wantPerfect = perfect && !rec.perfect;
        if (!wantDone && !wantPerfect) continue;
        const tag = st.id + key; if (busy.has(tag)) continue; busy.add(tag);
        try {
          // look again at the saved record right before paying, in case another screen just did it
          const fresh = await getDoc(bdoc("students", st.id)); const fv = fresh.exists() ? fresh.data() : null; if (!fv) continue;
          const frec = ((fv.lx || {})[key]) || {}, now = Date.now(), entries = [], nrec = { ...frec };
          if (finished && !frec.done) { entries.push({ title: "Finished the " + c.name + " work", xp: DONE_XP }); nrec.done = now; }
          if (perfect && !frec.perfect) { entries.push({ title: "100% correct: " + c.name, xp: PERFECT_XP }); nrec.perfect = now; }
          if (!entries.length) continue;
          const cur = students.find(x => x.id === st.id) || st, add = entries.reduce((a, e) => a + e.xp, 0);
          cur.xp += add;
          cur.log = cur.log.concat(entries.map(e => ({ title: e.title, xp: e.xp, kind: "pos", at: new Date().toISOString() })));
          cur.lx = { ...(cur.lx || {}), ...(fv.lx || {}), [key]: nrec };
          localRecent.set(cur.id, cur.log.length);
          render(); save(cur);
          toast(`${cur.name}: +${add} XP for the ${c.name} work`);
        } finally { busy.delete(tag); }
      }
    }
  } catch {} finally { running = false; }
}
setTimeout(run, 20000);
setInterval(run, 3 * 60 * 1000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) setTimeout(run, 2000); });
