// Teachers joining (stage 2).
// - The owner sees the requests (Settings > Teacher requests), can change the classes, then approves or declines.
// - An approved teacher, on his first visit, gets his classes and their students from the school list (pupils).
//   ESU students are hidden for the subjects they do not attend; any teacher can hide or bring back any student, in his own list only.
import { fs, collection, getDocs, doc, getDoc, setDoc, updateDoc, bdoc, bcol } from "./fb.js?v=1123w";
import { setMany, shareXp, sharedInfo } from "./sbdata.js?v=1123w";

const $ = id => document.getElementById(id);
const E = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ALL = ["6B", "6M", "6S", "6Y", "7B", "7M", "7S", "7Y", "8B", "8M", "8S", "8Y"];
const CORE = ["Mathematics", "Science", "English"];

// Which students a subject does not see at first: ESU boys go to separate core lessons; Arabic ESU boys to separate Arabic lessons.
export function hiddenFor(subject, prog) {
  if (prog === "ESU") return CORE.includes(subject) || subject === "Arabic";
  if (prog === "Arabic ESU") return subject === "Arabic";
  return false;
}
const sidOf = id => "p" + String(id).replace(/[^A-Za-z0-9]/g, "");

// ---------- an approved teacher's classes (checked on every visit) ----------
// A class is filled from the school list when it is new for this teacher, or still has no students
// (for example the owner ticked it after approval, or the school list was uploaded later).
// A class that already has students is never refilled, so a student the teacher removed does not come back.
export async function firstSetup(uid, p) {
  if (!Array.isArray(p.classes) || !p.classes.length) return false;
  const want = new Set(p.classes), subject = String(p.subject || "");
  const [pupS, mineS, metaS] = await Promise.all([getDocs(collection(fs, "pupils")), getDocs(bcol("students")), getDoc(bdoc("meta", "classes")).catch(() => null)]);
  const mine = mineS.docs.map(d => ({ id: d.id, cls: (d.data() || {}).cls }));
  const have = new Set(mine.map(x => x.id)), full = new Set(mine.map(x => x.cls));
  const pupils = pupS.docs.map(d => d.data() || {}).filter(x => want.has(x.cls) && !full.has(x.cls) && !have.has(sidOf(x.id)));
  const now = Date.now();
  if (pupils.length) await setMany(pupils.map(x => ({ path: "teachers/" + uid + "/students/" + sidOf(x.id), data: {
    name: x.name, cls: x.cls, enrollment: x.id, prog: x.prog || "", hidden: hiddenFor(subject, x.prog || ""), xp: 0, log: [], hist: [], createdAt: now, bonusWeek: typeof weekKey === "function" ? weekKey() : "" } })), true);
  const cur = metaS && metaS.exists() && Array.isArray(metaS.data().list) ? metaS.data().list : [];
  const list = [...cur, ...ALL.filter(c => want.has(c) && !cur.includes(c))];
  if (list.length !== cur.length || !metaS || !metaS.exists()) await setDoc(bdoc("meta", "classes"), { list });
  try { const pr = await getDoc(bdoc("settings", "profile")); if (!pr.exists() || !pr.data().name) await setDoc(bdoc("settings", "profile"), { name: String(p.name || "").slice(0, 40) }); } catch (e) {}
  if (pupils.length) await setDoc(bdoc("settings", "setup"), { done: now, subject, classes: list, students: mine.length + pupils.length });
  return pupils.length > 0;
}

// ---------- shared look for the two windows ----------
function css() {
  if ($("tjCss")) return;
  const s = document.createElement("style"); s.id = "tjCss";
  s.textContent = `#tjModal .sheet,#hidModal .sheet{max-width:760px;width:min(760px,94vw);max-height:88vh;overflow:auto}
.tj-card{border:1px solid #d6e2f6;border-radius:16px;padding:14px 16px;margin:10px 0;background:#fff}
.tj-card h3{margin:0;font:700 17px var(--f-body,system-ui);color:#0c2a5e}
.tj-card .who{color:#5a6b8a;font-size:14px;margin:2px 0 10px}
.tj-chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 12px}
.tj-chips label{cursor:pointer}.tj-chips input{position:absolute;opacity:0;width:1px;height:1px}
.tj-chips span{display:inline-block;width:46px;text-align:center;padding:6px 0;border-radius:999px;border:1.5px solid #d6e2f6;font:700 13px var(--f-body,system-ui);color:#0c2a5e;background:#f6f9ff}
.tj-chips input:checked+span{background:#1f5bbd;border-color:#1f5bbd;color:#fff}
.tj-chips input:focus-visible+span{outline:3px solid #f6b91c}
.tj-acts{display:flex;gap:8px;flex-wrap:wrap}
.tj-none{color:#5a6b8a}
.tj-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid #eef3fb}
.tj-row:first-child{border-top:0}
.tj-tag{display:inline-block;margin-left:6px;padding:1px 8px;border-radius:999px;background:#fff1c9;color:#7a5200;font-size:12px;font-weight:700}
.tj-msg{min-height:1.2em;font-weight:600;color:#0b7a55}.tj-msg.bad{color:#b3261e}
.nd-hide{all:unset;box-sizing:border-box;cursor:pointer;display:block;width:100%;margin-top:18px;padding:11px;border-radius:12px;border:1px dashed #b9c9e6;text-align:center;font:700 14px var(--f-body,system-ui);color:#5a6b8a}
.nd-hide:hover{background:#f2f7ff;color:#0c2a5e}.nd-hide:focus-visible{outline:3px solid #f6b91c}`;
  document.head.appendChild(s);
}
function modal(id, title) {
  let m = $(id);
  if (!m) {
    m = document.createElement("div"); m.className = "modal"; m.id = id; m.hidden = true;
    m.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="${id}T"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><h2 id="${id}T" style="margin:0"></h2><button class="ghost small" type="button" data-x="1">Close</button></div><div class="tj-body"></div></div>`;
    m.addEventListener("click", e => { if (e.target === m || e.target.closest("[data-x]")) m.hidden = true; });
    document.body.appendChild(m);
  }
  m.querySelector("h2").textContent = title; m.hidden = false; return m.querySelector(".tj-body");
}

// ---------- owner: requests ----------
let users = [], tjMsg = "", tjBad = false, pupN = null, editUid = "";
async function loadPupN() { try { pupN = {}; (await getDocs(collection(fs, "pupils"))).docs.forEach(d => { const c = (d.data() || {}).cls; if (c) pupN[c] = (pupN[c] || 0) + 1; }); } catch (e) { pupN = null; } }
const chips = sel => `<div class="tj-chips" aria-label="Classes">${ALL.map(c => `<label><input type="checkbox" value="${c}"${(sel || []).includes(c) ? " checked" : ""}><span>${c}${pupN ? `<small style="display:block;font-size:10px;font-weight:600;opacity:.75">${pupN[c] || 0}</small>` : ""}</span></label>`).join("")}</div>`;
async function loadUsers() {
  users = (await getDocs(collection(fs, "users"))).docs.map(d => ({ uid: d.id, ...(d.data() || {}) })).filter(x => x.role === "pending" || x.role === "declined" || (x.role === "teacher" && x.subject) || (x.role === "paused" && x.subject));
  window.__joinN = users.filter(x => x.role === "pending").length;
}
function paintJoin(b) {
  const pend = users.filter(x => x.role === "pending").sort((a, b2) => (a.asked || 0) - (b2.asked || 0));
  const done = users.filter(x => x.role !== "pending").sort((a, b2) => String(a.name).localeCompare(String(b2.name)));
  const when = t => { try { return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" }); } catch (e) { return ""; } };
  b.innerHTML = `<p>Send teachers this link: <b>mathkn.fun/?join</b>. They fill in their name, school email, subject and classes, and the request waits here for you.</p>
    <p class="tj-msg${tjBad ? " bad" : ""}" role="status">${E(tjMsg)}</p>
    <h3 style="margin:14px 0 4px">Waiting for you (${pend.length})</h3>
    ${pend.length ? pend.map(x => `<div class="tj-card" data-uid="${E(x.uid)}"><h3>${E(x.name || "No name")}</h3>
      <p class="who">${E(x.email || "")} · ${E(x.subject || "No subject")} · asked ${E(when(x.asked))}</p>
      ${chips(x.classes)}
      <div class="tj-acts"><button class="primary" type="button" data-tj="ok">Approve</button><button class="ghost" type="button" data-tj="no">Decline</button></div></div>`).join("")
      : '<p class="tj-none">No requests right now.</p>'}
    ${done.length ? `<h3 style="margin:18px 0 4px">Teachers who joined this way</h3><div class="tj-card">${done.map(x => `<div class="tj-row" data-uid="${E(x.uid)}" style="flex-wrap:wrap"><span><b>${E(x.name || "")}</b> · ${E(x.subject || "")}<br><small>${E((x.classes || []).join(", "))}</small></span>
      <span>${x.role === "declined" ? `<span class="tj-tag">Declined</span> <button class="ghost small" type="button" data-tj="re" data-uid="${E(x.uid)}">Approve after all</button>` : (x.role === "paused" ? '<span class="tj-tag">Paused</span>' : '<span class="tj-tag" style="background:#dff3ec;color:#0b5f45">Active</span>') + ` <button class="ghost small" type="button" data-tj="ed" data-uid="${E(x.uid)}">Change classes</button>`}</span>
      ${editUid === x.uid ? `<div style="flex-basis:100%">${chips(x.classes)}<div class="tj-acts"><button class="primary small" type="button" data-tj="cs">Save classes</button><button class="ghost small" type="button" data-tj="cx">Cancel</button></div></div>` : ""}</div>`).join("")}</div>` : ""}
    ${pupN ? '<p class="tj-none" style="font-size:13px">The small number under each class is how many students the school list has for it. A class with 0 needs the school list first (Settings &gt; School students).</p>' : ""}`;
}
export async function openJoin() {
  if (!window.__owner) return;
  css(); const b = modal("tjModal", "Teacher requests"); b.innerHTML = "<p>Loading…</p>"; tjMsg = "";
  if (!b.dataset.on) {
    b.dataset.on = "1";
    b.addEventListener("click", async e => {
      const a = e.target.closest("[data-tj]"); if (!a) return;
      const card = a.closest("[data-uid]"), uid = (card || a).dataset.uid, x = users.find(y => y.uid === uid); if (!x) return;
      let patch;
      if (a.dataset.tj === "ed") { editUid = uid; tjMsg = ""; return paintJoin(b); }
      if (a.dataset.tj === "cx") { editUid = ""; return paintJoin(b); }
      if (a.dataset.tj === "cs") {
        const cl = [...card.querySelectorAll("input:checked")].map(i => i.value);
        if (!cl.length) { tjMsg = "Tick at least one class first."; tjBad = true; return paintJoin(b); }
        patch = { classes: ALL.filter(c => cl.includes(c)) };
        a.disabled = true;
        try { await updateDoc(doc(fs, "users", uid), patch); Object.assign(x, patch); editUid = "";
          tjMsg = "✓ " + (x.name || "Teacher") + " now has " + patch.classes.join(", ") + ". New classes appear the next time she opens the site."; tjBad = false; }
        catch (er) { tjMsg = "Could not save (" + (er.code || er.message) + "). Try again."; tjBad = true; }
        return paintJoin(b);
      }
      if (a.dataset.tj === "no") { if (!confirm("Decline " + (x.name || "this request") + "?")) return; patch = { role: "declined" }; }
      else {
        const cl = a.dataset.tj === "re" ? (x.classes || []) : [...card.querySelectorAll("input:checked")].map(i => i.value);
        if (!cl.length) { tjMsg = "Tick at least one class first."; tjBad = true; return paintJoin(b); }
        patch = { role: "teacher", classes: ALL.filter(c => cl.includes(c)), approved: Date.now() };
      }
      a.disabled = true;
      try { await updateDoc(doc(fs, "users", uid), patch); Object.assign(x, patch); window.__joinN = users.filter(y => y.role === "pending").length;
        tjMsg = patch.role === "teacher" ? "✓ " + (x.name || "Teacher") + " can log in now and will find " + patch.classes.join(", ") + "." : (x.name || "The request") + " was declined."; tjBad = false; }
      catch (er) { tjMsg = "Could not save (" + (er.code || er.message) + "). Try again."; tjBad = true; }
      paintJoin(b); try { window.render(); } catch (er) {}
    });
  }
  try { await Promise.all([loadUsers(), loadPupN()]); } catch (e) { b.innerHTML = "<p>Could not load the requests (" + E(e.code || e.message) + ").</p>"; return; }
  paintJoin(b);
}
window.openJoin = openJoin;
// the menu shows how many requests wait
export function watchJoin() { const tick = () => loadUsers().then(() => { try { window.render(); } catch (e) {} }, () => {}); tick(); setInterval(tick, 5 * 60e3); }

// ---------- every teacher: hidden students ----------
function paintHidden(b, c) {
  const list = (window.__hiddenStu || []).filter(x => !c || x.cls === c).sort((a, b2) => a.name.localeCompare(b2.name));
  b.innerHTML = `<p>These students do not show in your class. Only you see this list; other teachers are not affected.</p>
    <div class="tj-card">${list.length ? list.map(x => `<div class="tj-row"><span><b>${E(x.name)}</b>${x.prog ? `<span class="tj-tag">${E(x.prog)}</span>` : ""}</span><button class="primary" type="button" data-show="${E(x.id)}">Show in my class</button></div>`).join("") : '<p class="tj-none">No hidden students in this class.</p>'}</div>`;
}
export function openHidden(c) {
  css(); const b = modal("hidModal", "Hidden students" + (c ? " · " + c : ""));
  if (!b.dataset.on) {
    b.dataset.on = "1";
    b.addEventListener("click", async e => { const a = e.target.closest("[data-show]"); if (!a) return; a.disabled = true;
      await window.__hideStu(a.dataset.show, false);
      window.__hiddenStu = (window.__hiddenStu || []).filter(x => x.id !== a.dataset.show); paintHidden(b, b.dataset.cls); });
  }
  b.dataset.cls = c || ""; paintHidden(b, c);
}
window.__openHidden = openHidden;
document.addEventListener("click", async e => {
  const h = e.target.closest("[data-ndhide]"); if (!h) return;
  const st = (typeof students !== "undefined" ? students : []).find(x => x.id === h.dataset.ndhide);
  if (!confirm("Hide " + (st ? st.name : "this student") + " from your list? You can bring him back from Hidden students.")) return;
  h.disabled = true; await window.__hideStu(h.dataset.ndhide, true);
});
css();

// ---------- shared XP (stage 3) ----------
// A teacher who joined through the school list keeps his own log (private: only he sees it), and every entry is also
// sent to the student's shared account, where it adds to the XP and the wallet and shows to the student with the subject.
// An entry is marked "sh" once the database has it, so nothing is sent twice; taking an entry back (Undo) takes it back there too.
export function initShare() {
  window.__shareOn = true;
  const busy = new Set(), again = new Set();
  const pending = st => [...(st.hist || []), ...(st.log || [])].filter(e => e && !e.sh && e.at && typeof e.xp === "number" && e.xp !== 0 && !e.reset && !e.bonus && e.title !== "Weekly bonus");
  window.__shareSeen = () => {};
  window.__share = async st => {
    if (!st || !st.enrollment) return;
    if (busy.has(st.id)) { again.add(st.id); return; }
    const adds = pending(st); if (!adds.length) return;
    busy.add(st.id);
    try {
      await shareXp(st.enrollment, adds.map(e => ({ title: String(e.title || ""), xp: e.xp, at: e.at })), []);
      adds.forEach(e => { e.sh = 1; });
      busy.delete(st.id); await window.save(st);
    } catch (e) { console.warn("shared XP not sent yet", e); busy.delete(st.id); setTimeout(() => window.__share(st), 30000); return; }
    if (again.delete(st.id)) window.__share(st);
  };
  window.__shareDel = (st, at) => { if (st && st.enrollment && at) shareXp(st.enrollment, [], [at]).catch(e => console.warn("shared XP undo", e)); };

  // What every teacher sees is the student's shared account: total XP from all subjects, wallet, avatar and shop items.
  // This teacher's own entries that are not sent yet are added on top, so a tap shows at once.
  // (xx = the part of the total that is not this teacher's own XP; saving keeps only his own XP in his folder.)
  const shared = new Map();
  const fix = st => {
    const s = st && shared.get(String(st.enrollment || "")); if (!s) return st;
    const own = (Number(st.xp) || 0) - (Number(st.xx) || 0), wait = pending(st).reduce((a, e) => a + e.xp, 0), shown = s.xp + wait;
    st.xx = shown - own; st.xp = shown; st.spent = s.spent; st.carry = s.carry; st.owned = s.owned.slice();
    st.eq = { ...(st.eq || {}), ...s.eq }; if (typeof s.avatar === "number") st.avatar = s.avatar;
    return st;
  };
  window.__sharedFix = fix;
  const list = () => (typeof students !== "undefined" ? students : []);
  const pull = async () => {
    const ids = [...new Set(list().map(x => String(x.enrollment || "")).filter(Boolean))]; if (!ids.length) return;
    for (let i = 0; i < ids.length; i += 200) {
      const rows = (await sharedInfo(ids.slice(i, i + 200))) || [];
      rows.forEach(r => { const e = r.eq && typeof r.eq === "object" ? r.eq : {};
        shared.set(String(r.sid), { xp: Number(r.xp) || 0, spent: Math.max(0, Number(r.spent) || 0), carry: Math.max(0, Number(r.carry) || 0),
          owned: Array.isArray(r.owned) ? r.owned.filter(x => typeof x === "string") : [], avatar: typeof r.avatar === "number" ? r.avatar : undefined,
          eq: Object.fromEntries(["frame", "color", "title", "top", "skin", "hat", "theme"].map(k => [k, String(e[k] || "")])) }); });
    }
    list().forEach(fix); try { window.render(); } catch (e) {}
  };
  // entries just sent are already in the total: count them there until the next pull, so the number does not dip
  const sent0 = window.__share;
  window.__share = async st => { const before = new Set(pending(st || {}).map(e => e.at)); await sent0(st);
    const s = st && shared.get(String(st.enrollment || "")); if (!s) return;
    const gone = [...before].filter(at => !pending(st).some(e => e.at === at)); if (!gone.length) return;
    s.xp += [...(st.hist || []), ...(st.log || [])].filter(e => e && gone.includes(e.at) && e.sh).reduce((a, e) => a + e.xp, 0); };
  let first = true;
  const tick = () => { if (document.visibilityState === "visible" || first) pull().then(() => { first = false; }, e => console.warn("shared XP view", e)); };
  setTimeout(tick, 1500); setInterval(tick, 60000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") tick(); });
  // students already have their logins (made by Mr. Khalid), so this teacher does not make logins or import old data
  const st = document.createElement("style"); st.textContent = "#loginsBtn,#impBtn{display:none!important}"; document.head.appendChild(st);
}
