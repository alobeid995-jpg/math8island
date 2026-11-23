import { liveScope } from "./liveworks.js?v=1123m";
import { onSnapshot, changeEmail, auth, fs, firebaseConfig, doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection, query, where, writeBatch, setBase, bcol, bdoc, signOut, whenUser, profileOf, emailFor, pinKey,
  initializeApp, getAuth, createUserWithEmailAndPassword } from "./fb.js?v=1123m";
import { db } from "./fbdb.js?v=1123m";
import { peopleSet, peopleDel, peopleGet, peopleCls } from "./sbdata.js?v=1123m";
import { downloadBackup } from "./backupxl.js?v=1123m";
import { openMail, sendRaw } from "./mailer.js?v=1123m";
import { startUsage } from "./usage.js?v=1123m";
import { liveLesson, mountTeacherTT, todayLessons } from "./timetable.js?v=1123m";
import { openWork, gradeData } from "./teacherwork.js?v=1123m";
import "./lessonxp.js?v=1123m";
import { openProgress } from "./progress.js?v=1123m";
import { openMaterial } from "./material.js?v=1123m";
import { openLiveWs } from "./liveteacher.js?v=1123m";
import { openFunpark } from "./fpteacher.js?v=1123m";
import { openCoconut } from "./coconut.js?v=1123m";
import { hasFeature, hideCss } from "./features.js?v=1123m";
import { xpAllowed } from "./ownerpin.js?v=1123m";
window.xpGate = n => xpAllowed(n); window.wkGradeData = gradeData; window.mailSend = sendRaw;
import { initChat } from "./chat.js?v=1123m";
import { openLive } from "./live.js?v=1123m";
import { openInbox } from "./inbox.js?v=1123m";

const $ = id => document.getElementById(id);
const esc2 = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const u = await whenUser();
const p = u && await profileOf(u.uid);
if (!p || p.role !== "teacher") { location.href = "index.html"; throw new Error("not a teacher"); }

// The owner sees the original top-level data. Every other teacher gets a private folder of his own.
const ADMIN = p.admin === true;
startUsage(u, p);
setBase(ADMIN ? [] : ["teachers", u.uid]);
// Supabase keeps a small list of who is who (role, teacher, class) for its security rules. Moving a student to another class updates it right away;
// the check below also repairs it, at most once every 6 hours per device.
window.__peopleCls = (sid, cls) => peopleCls(String(sid), ADMIN ? "" : u.uid, String(cls));
(async () => { try {
  const k = "si_roster_" + u.uid; if (Date.now() - (Number(localStorage.getItem(k)) || 0) < 6 * 3600e3) return;
  const mine = await peopleGet(ADMIN ? "" : u.uid); if (!mine || !mine.length) return;
  const st = new Map((await getDocs(bcol("students"))).docs.map(d => [d.id, String(d.data().cls || "")]));
  for (const p of mine) { const c = st.get(p.sid); if (c && c !== p.cls) await peopleCls(p.sid, ADMIN ? "" : u.uid, c); }
  localStorage.setItem(k, String(Date.now()));
} catch {} })();
// The name printed on certificates and parent emails: the owner is Mr. Khalid O; every other teacher types her own once and it is kept.
if (!ADMIN) TNAME = "";
try { const ts = await getDoc(bdoc("settings", "profile")); if (ts.exists() && typeof ts.data().name === "string") TNAME = ts.data().name.slice(0, 40); } catch {}
window.__saveTName = n => setDoc(bdoc("settings", "profile"), { name: String(n || "").slice(0, 40) });
// Another teacher must never see the owner's four default classes while her own load: show her last-known classes (or none) at once.
const CKEY = "mi_classes_" + u.uid;
if (!ADMIN) {
  let last = []; try { last = JSON.parse(localStorage.getItem(CKEY) || "[]"); } catch {}
  CLASSES.splice(0, CLASSES.length, ...(Array.isArray(last) ? last.filter(x => typeof x === "string") : []));
  cls = CLASSES.includes(cls) ? cls : (CLASSES[0] || "");
  try { render(); } catch {}
}

/* ---------- this teacher's classes ---------- */
// The owner starts with his four Grade 8 classes. Every other teacher starts empty and adds his own.
const DEFAULT_CLASSES = ["8B", "8Y", "8M", "8S"];
{
  let list = [];
  // meta, students and prices are fetched together instead of one after another
  const [mS, sS, pS] = await Promise.all([getDoc(bdoc("meta", "classes")).catch(() => null), getDocs(bcol("students")).catch(() => null), getDoc(doc(fs, "shop", "prices")).catch(() => null)]);
  if (mS && mS.exists()) list = (mS.data().list || []).slice(); else if (ADMIN) list = DEFAULT_CLASSES.slice();
  if (sS) sS.docs.forEach(d => { const c = d.data().cls; if (c && !list.includes(c)) list.push(c); });   // never hide a class that has students
  window.__pricesSnap = pS;
  CLASSES.splice(0, CLASSES.length, ...list);
  cls = CLASSES.includes(cls) ? cls : (CLASSES[0] || "");
  try { localStorage.setItem(CKEY, JSON.stringify(CLASSES)); } catch {}
}
const saveClasses = () => setDoc(bdoc("meta", "classes"), { list: CLASSES.slice() });
const clMsg = t => { $("clMsg").textContent = t; };
function clDraw() {
  $("clList").innerHTML = CLASSES.length ? CLASSES.map(c => { const n = students.filter(s => s.cls === c).length;
    return `<div class="cl-row"><span><b>${esc2(c)}</b> · ${n} student${n === 1 ? "" : "s"}</span>${n ? "" : `<button class="ghost small" data-rmcls="${esc2(c)}" type="button">Remove</button>`}</div>`; }).join("")
    : '<p class="none">No classes yet. Add your first one above.</p>';
}
window.mathknClasses = { open() { $("classModal").hidden = false; clMsg(""); $("clName").value = ""; clDraw(); setTimeout(() => $("clName").focus(), 50); } };
$("clClose").onclick = () => { $("classModal").hidden = true; };
$("clAdd").onclick = async () => {
  const name = $("clName").value.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9-]{0,7}$/.test(name)) { clMsg("Use letters, numbers and a dash only, up to 8 characters."); return; }
  if (CLASSES.includes(name)) { clMsg(name + " is already in your list."); return; }
  CLASSES.push(name); cls = name;
  try { localStorage.setItem("xp_class", cls); } catch {}
  try { await saveClasses(); } catch (e) { CLASSES.pop(); clMsg("Could not save: " + (e.code || e.message)); return; }
  $("clName").value = ""; clMsg(name + " added."); clDraw(); render();
};
$("clName").onkeydown = e => { if (e.key === "Enter") $("clAdd").click(); };
document.addEventListener("click", async ev => {
  const b = ev.target.closest("[data-rmcls]"); if (!b) return;
  const c = b.dataset.rmcls;
  if (students.some(s => s.cls === c)) { clMsg(c + " still has students."); return; }
  if (!confirm("Remove the empty class " + c + "?")) return;
  const i = CLASSES.indexOf(c); CLASSES.splice(i, 1);
  if (cls === c) cls = CLASSES[0] || "";
  try { await saveClasses(); } catch (e) { CLASSES.splice(i, 0, c); clMsg("Could not save: " + (e.code || e.message)); return; }
  clDraw(); render();
});

// The page stays hidden until the first class list has loaded, so nothing flashes or jumps.
{ const st = $("syncText"), reveal = () => document.documentElement.classList.remove("wait");
  if (st) { const ok = () => { const t = st.textContent; if (t && !/^(Connecting|Loading)/.test(t)) { reveal(); mo.disconnect(); } }; const mo = new MutationObserver(ok); mo.observe(st, { childList: true, characterData: true, subtree: true }); ok(); } else reveal(); }
// Hand the tracker its database. From here on the tracker page works as before.
window.__resolveClaude({ use: async n => n === "db" ? db : n === "user" ? { can: async () => true, isOwner: () => true, canEdit: () => true } : null });

// Students may only spend what the shop price list allows, so the list lives in the database.
liveScope(ADMIN); window.__owner = ADMIN; if (ADMIN) { mountTeacherTT(); window.__liveLesson = liveLesson; window.__todayTT = todayLessons; }   // only the owner can change prices
{
  const pref = doc(fs, "shop", "prices"); let saved = {};
  try { const s = window.__pricesSnap || await getDoc(pref); if (s && s.exists()) saved = s.data().prices || {}; } catch {}
  applyPrices(saved);   // prices he has set win over the defaults in the code
  const all = () => Object.fromEntries(SHOP.map(i => [i.id, i.price]));
  if (ADMIN) setDoc(pref, { prices: all() }).catch(() => {});   // new items get their default price; his own prices stay
  const sref = doc(fs, "shop", "status");
  window.__shopStatus = null;
  const loadSt = sn => { window.__shopStatus = sn.exists() ? sn.data() : null; try { if (view === "shop") renderShopView(); } catch {} };
  if (ADMIN) { onSnapshot(sref, loadSt, () => {}); window.__saveShopStatus = async v => { await setDoc(sref, v); }; }
  window.__savePrices = async m => { await setDoc(pref, { prices: { ...all(), ...m } }); };
  try { if (view === "shop") renderShopView(); } catch {}
  if (!ADMIN) onSnapshot(pref, sn => { if (sn.exists()) { applyPrices(sn.data().prices || {}); try { if (view === "shop") renderShopView(); } catch {} } }, () => {});   // the owner's price changes reach other teachers live
}

if (CLASSES.some(c => /^(9S|8G|8B|8Y|8S|8M|8D)$/i.test(c))) {   // 9S games: progress of each boy, inside this page
  const ib = document.createElement("button"); ib.className = "ghost small"; ib.id = "islandBtn"; ib.type = "button"; ib.textContent = "Students progress";
  ib.onclick = () => openProgress();
  $("outBtn").before(ib);
}
if (ADMIN) { // the button is only created for the owner; other teachers' pages never contain it
  const dv = document.createElement("button"); dv.className = "ghost small"; dv.id = "devBtn"; dv.type = "button"; dv.textContent = "Developer";
  dv.onclick = () => { location.href = "developer.html"; };
  $("outBtn").before(dv);
}
$("workBtn").onclick = () => openWork();
{ const ib2 = document.createElement("button"); ib2.className = "ghost small"; ib2.id = "inboxBtn"; ib2.type = "button"; ib2.textContent = "Announcements"; ib2.onclick = () => openInbox(); $("outBtn").before(ib2); }
{ const lb = document.createElement("button"); lb.className = "ghost small"; lb.id = "liveBtn"; lb.type = "button"; lb.textContent = "Live quiz"; lb.onclick = () => openLive(); $("outBtn").before(lb); }
{ const ml = document.createElement("button"); ml.className = "ghost small"; ml.id = "mlBtn"; ml.type = "button"; ml.textContent = "My lessons"; ml.onclick = () => window.openMyLessons && window.openMyLessons(); $("outBtn").before(ml); }
{ const lw = document.createElement("button"); lw.className = "ghost small"; lw.id = "lwBtn"; lw.type = "button"; lw.textContent = "Live worksheets"; lw.onclick = () => openLiveWs(); $("outBtn").before(lw); }
{ const fb = document.createElement("button"); fb.className = "ghost small"; fb.id = "funBtn"; fb.type = "button"; fb.textContent = "Fun Park"; fb.onclick = () => openFunpark(); $("outBtn").before(fb); }
{ const cb = document.createElement("button"); cb.className = "ghost small"; cb.id = "ccBtn"; cb.type = "button"; cb.textContent = "Coconut Crack"; cb.onclick = () => openCoconut(); $("outBtn").before(cb); }
{ const mb = document.createElement("button"); mb.className = "ghost small"; mb.id = "matBtn"; mb.type = "button"; mb.textContent = "My material"; mb.onclick = () => openMaterial(); $("outBtn").before(mb); }
/* My lessons: lessons added from a Google Drive / Slides link are saved in the teacher's own folder (work/mylessons) */
window.__mlStore = {
  load: async () => { const sn = await getDoc(bdoc("work", "mylessons")); const d = sn.exists() ? sn.data() : {}; return { items: Array.isArray(d.items) ? d.items : [], hidden: Array.isArray(d.hidden) ? d.hidden : [] }; },
  save: (items, hidden) => setDoc(bdoc("work", "mylessons"), { kind: "mylessons", items, hidden: hidden || [], updated: Date.now() }),
  // uploaded HTML lessons: one document each in the teacher's own "lessons" folder (only teachers can read it)
  putHtml: (id, title, html) => setDoc(bdoc("lessons", id), { kind: "lesson", title, html, created: Date.now() }),
  getHtml: async id => { const sn = await getDoc(bdoc("lessons", id)); return sn.exists() ? sn.data().html || "" : ""; },
  delHtml: id => deleteDoc(bdoc("lessons", id)),
};
/* ---------- features: what the owner has switched on for this teacher (shop/features) ---------- */
{
  const st = document.createElement("style"); st.id = "featCss"; document.head.appendChild(st);
  let fd = {};
  const apply = () => {
    window.__featOn = k => hasFeature(fd, k, u.uid, ADMIN);
    st.textContent = hideCss(fd, u.uid, ADMIN);
    try {   // if the teacher was looking at something that is now off, go back to Students
      const off = { cup: "cup", shop: "shop", board: "dash", hub: "hub" };
      if (off[window.__view && window.__view()] && !window.__featOn(off[window.__view()])) { window.__setView && window.__setView("students"); }
      if (window.__view && window.__view() === "hub") window.render();
    } catch {}
  };
  apply();   // right away: features that are off by default stay hidden while the list loads
  if (!ADMIN) onSnapshot(doc(fs, "shop", "features"), sn => { fd = sn.exists() ? sn.data() : {}; apply(); }, () => {});
}
initChat("teacher", { uid: u.uid, ...p }, null).catch(() => {});
$("outBtn").onclick = async () => { await signOut(auth); location.href = "index.html"; };

/* ---------- the header buttons live in Hub > Tools > Manage ---------- */
{
  const holder = document.createElement("div"); holder.hidden = true; document.body.appendChild(holder);
  const bk = document.createElement("button"); bk.className = "ghost small"; bk.id = "backupBtn"; bk.type = "button"; bk.textContent = "Backup (Excel)"; bk.onclick = () => downloadBackup(bk); document.body.appendChild(bk);
  const ml = document.createElement("button"); ml.className = "ghost small"; ml.id = "mailBtn"; ml.type = "button"; ml.textContent = "Email students"; ml.onclick = () => openMail().catch(e => alert("Could not open: " + (e.message || e))); document.body.appendChild(ml);
  const eb = document.createElement("button"); eb.className = "ghost small"; eb.id = "emailBtn"; eb.type = "button"; eb.textContent = "My email & password reset";
  eb.onclick = async () => {
    const em = (prompt("Type your real email address. Firebase will send a link to it, and you can use it later to reset your password.") || "").trim();
    if (!em) return; if (!/^\S+@\S+\.\S+$/.test(em)) { alert("That does not look like an email address."); return; }
    const pw = prompt("Type your current password to confirm it is you.") || ""; if (!pw) return;
    try { await changeEmail(em, pw); alert("Done. A link was sent to " + em + ". Open it to confirm. From then on, log in with that email, and use \"Forgot password?\" on the login page if you ever forget your password."); }
    catch (er) { alert(er && er.code === "auth/invalid-credential" || er && er.code === "auth/wrong-password" ? "The password is not right." : "Could not do it: " + ((er && (er.code || er.message)) || "error")); }
  };
  document.body.appendChild(eb);
  const gb = document.createElement("button"); gb.className = "ghost small"; gb.id = "gwBtn"; gb.type = "button"; gb.textContent = "Graded worksheets"; gb.onclick = () => window.__openGraded && window.__openGraded(); document.body.appendChild(gb);
  const btns = ["workBtn", "gwBtn", "mlBtn", "lwBtn", "liveBtn", "ccBtn", "funBtn", "inboxBtn", "matBtn", "loginsBtn", "impBtn", "islandBtn", "devBtn", "backupBtn", "mailBtn", "emailBtn"].map(id => $(id)).filter(Boolean);
  btns.forEach(b => holder.appendChild(b));
  const MG_ICON = {"star": "<path d=\"m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z\"/>", "doc": "<path d=\"M7 3h7l4 4v14H7z\"/><path d=\"M14 3v4h4M10 12h5M10 16h5\"/>", "book": "<path d=\"M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z\"/><path d=\"M4 19V5\"/>", "bolt": "<path d=\"M13 2 5 14h6l-1 8 8-12h-6z\"/>", "quiz": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5M12 17h.01\"/>", "nut": "<circle cx=\"12\" cy=\"13\" r=\"8\"/><path d=\"M8 9c1.5-1 6.5-1 8 0M12 5V2\"/>", "park": "<path d=\"M3 21h18M5 21V10l7-6 7 6v11\"/><path d=\"M10 21v-6h4v6\"/>", "mega": "<path d=\"M3 10v4h3l7 4V6L6 10z\"/><path d=\"M17 9a4 4 0 0 1 0 6\"/>", "mail": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"m4 7 8 6 8-6\"/>", "folder": "<path d=\"M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"/>", "key": "<circle cx=\"8\" cy=\"15\" r=\"4\"/><path d=\"m11 12 9-9M17 6l3 3\"/>", "chart": "<path d=\"M4 20V10M10 20V4M16 20v-7M22 20H2\"/>", "imp": "<path d=\"M12 3v12M7 10l5 5 5-5\"/><path d=\"M4 21h16\"/>", "save": "<path d=\"M5 3h11l3 3v15H5z\"/><path d=\"M8 3v6h8V3M8 21v-7h8v7\"/>", "code": "<path d=\"m8 8-5 4 5 4M16 8l5 4-5 4M14 4l-4 16\"/>", "user": "<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21a8 8 0 0 1 16 0\"/>"};
  const MG_META = {"workBtn": ["teach", "Classwork", "Worksheets and answers", "doc", ""], "gwBtn": ["teach", "Graded worksheets", "Marked assessments, by score", "star", ""], "mlBtn": ["teach", "My lessons", "Your lesson slides and links", "book", ""], "lwBtn": ["teach", "Live worksheets", "Start interactive worksheets", "bolt", ""], "liveBtn": ["teach", "Live quiz", "Run a quiz on the board", "quiz", ""], "ccBtn": ["teach", "Coconut Crack", "Whole-class game", "nut", ""], "funBtn": ["teach", "Fun Park", "Revision games", "park", ""], "inboxBtn": ["msg", "Announcements", "Post news to your classes", "mega", "c2"], "mailBtn": ["msg", "Email students", "Emails and reminders", "mail", "c2"], "matBtn": ["msg", "My material", "Files and links for students", "folder", "c2"], "loginsBtn": ["data", "Student logins", "Accounts and PINs", "key", "c3"], "islandBtn": ["data", "Students progress", "Games and lesson results", "chart", "c3"], "impBtn": ["data", "Import old data", "Bring in a saved file", "imp", "c3"], "backupBtn": ["data", "Backup (Excel)", "Download all student data", "save", "c3"], "devBtn": ["acct", "Developer", "Usage and settings", "code", "c4"], "emailBtn": ["acct", "My email & password", "Change email, reset password", "user", "c4"]};
  const MG_GROUPS = [["teach", "Teaching"], ["msg", "Messages and material"], ["data", "Students and data"], ["acct", "Account"]];
  const mgSync = h => { h.querySelectorAll(".mtile").forEach(t => { const b = t.querySelector("button"); t.hidden = !b || getComputedStyle(b).display === "none"; });
    h.querySelectorAll(".mg-grp").forEach(g => { g.hidden = ![...g.querySelectorAll(".mtile")].some(t => !t.hidden); }); };
  const place = () => {
    const h = $("hubMgmt"); if (!h) return;
    if (!btns.every(b => h.contains(b))) {
      h.innerHTML = MG_GROUPS.map(([k, l]) => `<div class="mg-grp" data-g="${k}"><h4>${l}</h4><div class="mg-grid"></div></div>`).join("");
      btns.forEach(b => { const m = MG_META[b.id] || ["acct", b.textContent, "", "doc", "c4"], g = h.querySelector(`.mg-grp[data-g="${m[0]}"] .mg-grid`);
        const t = document.createElement("div"); t.className = "mtile " + m[4];
        t.innerHTML = `<span class="mt-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${MG_ICON[m[3]] || ""}</svg></span><span class="mt-d">${m[2]}</span>`;
        if (!b.disabled) b.textContent = m[1];
        t.insertBefore(b, t.children[1]); g.appendChild(t); });
    }
    mgSync(h);
  };
  const r0 = window.render;
  window.render = function () { const out = r0.apply(this, arguments); place(); return out; };
  place();
}

/* ---------- student logins ---------- */
const msg = t => { $("lgMsg").textContent = t; };
const pinOf = () => String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));

async function listMissing() {
  const cl = $("lgCls").value, box = $("lgMissing");
  const all = (await getDocs(bcol("students"))).docs.filter(d => d.data().cls === cl);
  const no = all.filter(d => !String(d.data().enrollment || "").trim()).sort((a, b) => String(a.data().name).localeCompare(String(b.data().name)));
  box.innerHTML = no.length
    ? `<h4 style="margin:6px 0 2px">${no.length} student${no.length === 1 ? "" : "s"} in ${esc2(cl)} without a student ID</h4>` + no.map(d => `<div class="lg-bar" style="margin:4px 0"><span style="min-width:180px">${esc2(d.data().name)}</span><input data-idfor="${esc2(d.id)}" placeholder="e.g. 19-00047" style="width:140px"><button class="ghost small" data-saveid="${esc2(d.id)}" type="button">Save ID</button></div>`).join("") + `<div style="margin:8px 0"><b>Or paste all IDs at once from Excel</b> (name + ID columns, any order)<br><textarea id="idPaste" rows="5" style="width:100%;max-width:520px" placeholder="ADAM AHMED JANAHI&#9;19-00047"></textarea><br><button class="primary small" id="idPasteGo" type="button">Match and save IDs</button></div>`
    : "";
  const go = $("idPasteGo"); if (go) go.onclick = () => bulkIds(no);
}
const nameKey = n => String(n).toLowerCase().normalize("NFKD").replace(/[^\p{L}\s]/gu, " ").split(/\s+/).filter(Boolean);
async function bulkIds(no) {
  const rows = [];
  for (const line of $("idPaste").value.split(/\r?\n/)) {
    const cells = line.split(/\t|,|;/).map(x => x.trim()).filter(Boolean);
    const id = cells.find(c => /^[\w-]*\d[\w-]*$/.test(c) && !/\s/.test(c)), nm = cells.filter(c => c !== id).join(" ");
    if (id && nm) rows.push({ id, key: nameKey(nm), nm });
  }
  if (!rows.length) { msg("Paste the Excel columns first: each row needs a name and an ID."); return; }
  const used = new Set((await getDocs(bcol("students"))).docs.map(d => String(d.data().enrollment || "").trim().toLowerCase()).filter(Boolean));
  const left = [...no], done = [], bad = [];
  for (const r of rows) {
    const sameSet = d => { const k = nameKey(d.data().name); return k.length === r.key.length && k.every(w => r.key.includes(w)); };
    const sub = d => { const k = nameKey(d.data().name); const [s, l] = k.length < r.key.length ? [k, r.key] : [r.key, k]; return s.length >= 2 && s.every(w => l.includes(w)); };
    let m = left.filter(sameSet); if (m.length !== 1) m = m.length ? m : left.filter(sub);
    if (m.length !== 1 || used.has(r.id.toLowerCase())) { bad.push(r.nm + (m.length > 1 ? " (more than one match)" : used.has(r.id.toLowerCase()) ? " (ID already used)" : " (not found)")); continue; }
    left.splice(left.indexOf(m[0]), 1); used.add(r.id.toLowerCase()); done.push([m[0].id, r.id]);
  }
  if (!done.length) { msg("No names matched. " + bad.slice(0, 5).join(", ")); return; }
  const btn = $("idPasteGo"); btn.disabled = true;
  try {
    for (const [sid, id] of done) await updateDoc(bdoc("students", sid), { enrollment: id });
    msg(`Saved ${done.length} IDs.` + (bad.length ? ` ${bad.length} not matched: ${bad.slice(0, 8).join(", ")}${bad.length > 8 ? "…" : ""}` : "")); await listLogins();
  } catch (e) { msg("Could not save: " + (e.code || e.message)); btn.disabled = false; }
}
document.addEventListener("click", async ev => {
  const b = ev.target.closest("[data-saveid]"); if (!b) return;
  const id = b.dataset.saveid, inp = document.querySelector(`[data-idfor="${CSS.escape(id)}"]`), val = inp.value.trim();
  if (!val) { msg("Type the student ID first."); return; }
  b.disabled = true;
  try {
    const all = (await getDocs(bcol("students"))).docs;
    const clash = all.find(d => d.id !== id && String(d.data().enrollment || "").trim().toLowerCase() === val.toLowerCase());
    if (clash) { msg(`The ID ${val} already belongs to ${clash.data().name}.`); return; }
    await updateDoc(bdoc("students", id), { enrollment: val });
    msg("ID saved."); await listLogins();
  } catch (e) { msg("Could not save: " + (e.code || e.message)); }
  finally { b.disabled = false; }
});

async function listLogins() {
  listMissing().catch(() => {});
  const cl = $("lgCls").value;
  const snap = await getDocs(bcol("logins"));
  const ids = new Map((await getDocs(bcol("students"))).docs.map(d => [d.id, String(d.data().enrollment || "").trim()]));
  const rows = snap.docs.map(d => ({ ...d.data(), sid: d.id, want: ids.get(d.id) || "" })).filter(r => r.cls === cl).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const stale = rows.filter(r => r.want && r.want.toLowerCase() !== String(r.username || "").toLowerCase());
  $("lgList").innerHTML = rows.length
    ? (stale.length ? `<div class="lg-stale"><b>${stale.length} login${stale.length === 1 ? " uses" : "s use"} an old ID.</b> These students now have a student ID, but their login still uses the old code. <button class="primary small" id="lgFixIds" type="button">Update login ID${stale.length === 1 ? "" : "s"}</button></div>` : "") +
      `<h4 style="margin:6px 0 2px">Class ${esc2(cl)} · ${rows.length} logins · ${rows.filter(r => r.first === true).length} still on the starting PIN</h4><table class="lg-tbl"><thead><tr><th>Name</th><th>ID</th><th>PIN</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc2(r.name)}</td><td>${esc2(r.username)}${stale.includes(r) ? ` <small class="lg-old">→ ${esc2(r.want)}</small>` : ""}</td><td class="pin">${esc2(r.pin)}</td><td>${r.first === true ? "Starting PIN · must change at first login" : "Own PIN"}</td><td><button class="ghost small" type="button" data-rsid="${esc2(r.sid)}">Reset login</button> <button class="ghost small" type="button" data-rmsid="${esc2(r.sid)}">Remove login</button>${ids.has(r.sid) ? "" : ` <button class="primary small" type="button" data-mksid="${esc2(r.sid)}" title="This login has no student record">Re-create student record</button>`}</td></tr>`).join("")}</tbody></table>`
    : `<p class="none">No logins for ${esc2(cl)} yet.</p>`;
  if (stale.length) $("lgFixIds").onclick = () => fixIds(stale);
  $("lgList").querySelectorAll("[data-rmsid]").forEach(x => { x.onclick = async () => {
    const r = rows.find(y => y.sid === x.dataset.rmsid); if (!r) return;
    if (!confirm(`Remove the login of ${r.name}?\n\nHis old ID and PIN stop working. His student record (XP, work) is NOT touched. Then press "Create logins" to make him a brand new login.`)) return;
    x.disabled = true;
    try {
      const us = (ADMIN ? (await getDocs(query(collection(fs, "users"), where("role", "==", "student")))).docs.filter(d => !d.data().tid || d.data().tid === u.uid)
                        : (await getDocs(query(collection(fs, "users"), where("tid", "==", u.uid)))).docs);
      for (const o of us.filter(d => d.data().sid === r.sid)) { await deleteDoc(doc(fs, "users", o.id)); await peopleDel(o.id); }
      await deleteDoc(bdoc("logins", r.sid));
      msg(`Login of ${r.name} removed. Press "Create logins" to make a new one.`); await listLogins();
    } catch (e) { msg("Could not remove: " + (e.code || e.message)); x.disabled = false; }
  }; });
  $("lgList").querySelectorAll("[data-mksid]").forEach(x => { x.onclick = async () => {
    const r = rows.find(y => y.sid === x.dataset.mksid); if (!r) return;
    if (!confirm(`${r.name} has a login but no student record, so the student page says "Your record was not found".\nCreate a new empty record (0 XP) for him?`)) return;
    x.disabled = true;
    try {
      await setDoc(bdoc("students", r.sid), { name: String(r.name || ""), cls: r.cls, enrollment: String(r.username || r.sid), xp: 0, carry: 0, spent: 0, log: [], createdAt: Date.now(), bonusWeek: weekKey(),
        counts: {}, owned: [], eq: { frame: "", color: "", title: "", top: "", skin: "", hat: "" }, reqs: [], buys: 0, lastBuy: "", hist: [], sp: [], avatar: (Math.random() * 4294967295) >>> 0 });
      msg("Student record created. He can open his page now."); await listLogins();
    } catch (e) { msg("Could not create: " + (e.code || e.message)); x.disabled = false; }
  }; });
  $("lgList").querySelectorAll("[data-rsid]").forEach(x => { x.onclick = () => resetLogins([cl], x.dataset.rsid); });
  const todo = rows.filter(r => r.first === true);
  if (rows.length) {
    const box = document.createElement("div"); box.style.cssText = "margin-top:12px";
    box.innerHTML = `<button class="primary small" id="lgAnn" type="button">Classroom announcement (${todo.length} not signed in)</button><div id="lgAnnBox" hidden><textarea id="lgAnnTx" rows="14" style="width:100%;margin-top:8px;box-sizing:border-box"></textarea><button class="small" id="lgAnnCp" type="button">Copy</button></div>`;
    $("lgList").appendChild(box);
    $("lgAnn").onclick = () => {
      const names = todo.map(r => "• " + r.name).join("\n");
      $("lgAnnTx").value = `Student Island – please sign in\n\nThe students below have not signed in to Student Island yet:\n${names || "(everyone has signed in – well done!)"}\n\nHow to sign in:\n1. Open mathkn.fun on your phone, tablet or computer.\n2. Type your student ID (for example 16-00014).\n3. Type the 6-digit starting PIN that I gave you in class. If you forgot it, ask me.\n4. The first time, the site asks you to choose your own new 6-digit PIN. Type it twice and remember it.\n5. From then on, log in with your ID and your own PIN.\n\nOnce you are in, you will find your classwork, games and XP. Please sign in before our next lesson.\n\nMr. Khalid`.replace("Mr. Khalid", (typeof TNAME === "string" && TNAME) || "Your maths teacher");
      $("lgAnnBox").hidden = false;
    };
    $("lgAnnCp").onclick = async () => { const t = $("lgAnnTx"); t.select(); try { await navigator.clipboard.writeText(t.value); msg("Copied. Paste it in Google Classroom."); } catch { document.execCommand("copy"); } };
  }
}

async function makeLogins() {
  const cl = $("lgCls").value, btn = $("lgMake"), start = $("lgStart").value.trim();
  if (!/^\d{6}$/.test(start)) { msg("Type a 6-digit starting PIN for this class first."); $("lgStart").focus(); return; }
  btn.disabled = true;
  try {
    const sSnap = await getDocs(bcol("students"));
    const mine = sSnap.docs.filter(d => d.data().cls === cl);
    const have = new Set((await getDocs(bcol("logins"))).docs.map(d => d.id));
    const todo = mine.filter(d => !have.has(d.id));
    if (!mine.length) { msg(`No students in ${cl} yet. Add them in the Students tab first.`); return; }
    if (!todo.length) { msg("Everyone in this class already has a login."); await listLogins(); return; }
    // A second, temporary sign-in session creates the accounts, so you stay logged in as the teacher.
    const sapp = initializeApp(firebaseConfig, "creator" + Date.now()), sauth = getAuth(sapp);
    let ok = 0; const bad = [];
    for (const d of todo) {
      const v = d.data(), username = String(v.enrollment || d.id), pin = start;
      msg(`Creating ${ok + bad.length + 1} of ${todo.length}…`);
      try {
        // an ID that was used before (a removed login) is already taken in Firebase, so a new version of the address is used
        let ver = 0, c = null;
        for (let k = 0; k < 8 && !c; k++) {
          try { c = await createUserWithEmailAndPassword(sauth, emailFor(username, ver), pin); }
          catch (e) { if (e.code === "auth/email-already-in-use" && k < 7) ver++; else throw e; }
        }
        await setDoc(doc(fs, "users", c.user.uid), ADMIN ? { role: "student", sid: d.id } : { role: "student", sid: d.id, tid: u.uid });
        await peopleSet([{ uid: c.user.uid, role: "student", sid: d.id, tid: ADMIN ? "" : u.uid, cls: cl }]);
        if (ver) await setDoc(doc(fs, "pinver", pinKey(username)), { v: ver, tid: u.uid });
        await setDoc(bdoc("logins", d.id), ver ? { username, pin, name: String(v.name || ""), cls: cl, first: true, ver, uid: c.user.uid } : { username, pin, name: String(v.name || ""), cls: cl, first: true });
        await signOut(sauth); ok++;
      } catch (e) { bad.push(`${v.name || d.id}: ` + (e.code === "auth/email-already-in-use" ? `the ID ${username} already has a login (maybe from another teacher). Check the ID.` : (e.code || e.message))); }
    }
    msg(`Created ${ok} login${ok === 1 ? "" : "s"}.` + (bad.length ? `\nProblems:\n${bad.join("\n")}` : ""));
    await listLogins();
  } catch (e) { msg("Could not finish: " + (e.code || e.message)); }
  finally { btn.disabled = false; }
}

async function addDemo() {
  const names = ["Ali Demo", "Omar Demo", "Hamad Demo", "Yousif Demo", "Khalid Demo", "Faisal Demo", "Salman Demo", "Isa Demo"];
  const b = writeBatch(fs), wk = weekKey();
  names.forEach((n, i) => {
    const id = "demo-" + String(i + 1).padStart(3, "0");
    b.set(bdoc("students", id), { name: n, cls: $("lgCls").value, enrollment: id.toUpperCase() + (ADMIN ? "" : "-" + u.uid.slice(0, 3).toUpperCase()), xp: 200, carry: 300 + i * 100, spent: 0, log: [], createdAt: Date.now(), bonusWeek: wk,
      counts: {}, owned: [], eq: { frame: "", color: "", title: "", top: "", skin: "", hat: "" }, reqs: [], buys: 0, lastBuy: "", hist: [], sp: [], avatar: (Math.random() * 4294967295) >>> 0 });
  });
  try { await b.commit(); msg(`Added 8 demo students to ${$("lgCls").value}. Now press "Create logins".`); }
  catch (e) { msg("Could not add: " + (e.code || e.message)); }
}

const fillLg = () => { const sel = $("lgCls"), keep = sel.value; sel.innerHTML = CLASSES.map(c => `<option>${esc2(c)}</option>`).join(""); if (CLASSES.includes(keep)) sel.value = keep; else if (CLASSES.includes(cls)) sel.value = cls; };
/* ---------- reset PINs: every student gets a fresh login with the new starting PIN ----------
   A web page cannot change another person's password, so each student gets a new login (version +1).
   The old login is switched off by removing its profile, so the old PIN stops working. */
/* A student who got his login before he had a student ID logs in with a code like "s1ab2c".
   Once his real ID is saved, this gives him a login with that ID (same PIN) and switches the old one off. */
async function fixIds(stale) {
  if (resetting) return;
  const btn = $("lgFixIds"); if (btn) btn.disabled = true; resetting = true;
  try {
    const us = (ADMIN ? (await getDocs(query(collection(fs, "users"), where("role", "==", "student")))).docs.filter(d => !d.data().tid || d.data().tid === u.uid)
                      : (await getDocs(query(collection(fs, "users"), where("tid", "==", u.uid)))).docs).map(d => ({ id: d.id, sid: d.data().sid }));
    const sapp = initializeApp(firebaseConfig, "fixid" + Date.now()), sauth = getAuth(sapp);
    let ok = 0; const bad = [];
    for (const r of stale) {
      msg(`Updating ${ok + bad.length + 1} of ${stale.length}…`);
      try {
        const pin = String(r.pin || ""); if (!/^\d{6}$/.test(pin)) throw new Error("no 6-digit PIN on file");
        let ver = 0, c = null;
        for (let k = 0; k < 4 && !c; k++) {
          try { c = await createUserWithEmailAndPassword(sauth, emailFor(r.want, ver), pin); }
          catch (e) { if (e.code === "auth/email-already-in-use") ver++; else throw e; }
        }
        if (!c) throw new Error(`the ID ${r.want} already has a login (maybe from another teacher). Check the ID.`);
        const nu = c.user.uid;
        await setDoc(doc(fs, "users", nu), ADMIN ? { role: "student", sid: r.sid } : { role: "student", sid: r.sid, tid: u.uid });
        await peopleSet([{ uid: nu, role: "student", sid: r.sid, tid: ADMIN ? "" : u.uid, cls: r.cls }]);
        if (ver) await setDoc(doc(fs, "pinver", pinKey(r.want)), { v: ver, tid: u.uid });
        for (const o of us.filter(x => x.sid === r.sid && x.id !== nu)) { await deleteDoc(doc(fs, "users", o.id)); await peopleDel(o.id); }
        const { sid, want, ...keep } = r;
        await setDoc(bdoc("logins", r.sid), { ...keep, username: r.want, ver, uid: nu });
        await signOut(sauth); ok++;
      } catch (e) {
        bad.push(`${r.name}: ` + (e.code === "auth/too-many-requests" ? "Firebase asks to wait. Try again in an hour." : (e.code || e.message)));
        if (e.code === "auth/too-many-requests") break;
      }
    }
    msg(`Updated ${ok} login ID${ok === 1 ? "" : "s"}. They log in with their student ID and the same PIN as before.` + (bad.length ? `\nProblems:\n${bad.join("\n")}` : ""));
  } catch (e) { msg("Could not finish: " + (e.code || e.message)); }
  finally { resetting = false; }
  await listLogins();
}

let resetting = false;
async function resetLogins(classes, onlySid) {
  if (resetting) return;
  const start = $("lgStart").value.trim(), btns = [...document.querySelectorAll("[data-rsid]"), $("lgReset"), $("lgResetAll"), $("lgMake")];
  if (!/^\d{6}$/.test(start)) { msg("Type the new 6-digit starting PIN first."); $("lgStart").focus(); return; }
  const rows = (await getDocs(bcol("logins"))).docs.filter(d => classes.includes(d.data().cls) && (!onlySid || d.id === onlySid));
  if (!rows.length) { msg("No logins to reset" + (classes.length === 1 ? " in " + classes[0] : "") + "."); return; }
  if (!confirm(`Reset the PIN of ${onlySid ? (rows[0].data().name || "this student") : rows.length + " student" + (rows.length === 1 ? "" : "s") + " in " + classes.join(", ")}?\n\nTheir old PINs stop working. Everyone logs in once with ${start} and then chooses his own PIN.`)) return;
  btns.forEach(b => b.disabled = true); resetting = true;
  try {
  // the profiles of my students (to switch off their old logins)
  const us = (ADMIN ? (await getDocs(query(collection(fs, "users"), where("role", "==", "student")))).docs.filter(d => !d.data().tid || d.data().tid === u.uid)
                    : (await getDocs(query(collection(fs, "users"), where("tid", "==", u.uid)))).docs).map(d => ({ id: d.id, sid: d.data().sid }));
  const sapp = initializeApp(firebaseConfig, "reset" + Date.now()), sauth = getAuth(sapp);
  let ok = 0; const bad = [];
  for (const d of rows) {
    const r = d.data(), sid = d.id, username = String(r.username || sid);
    msg(`Resetting ${ok + bad.length + 1} of ${rows.length}…`);
    try {
      let ver = (Number(r.ver) || 0) + 1, c = null;
      for (let k = 0; k < 4 && !c; k++) {
        try { c = await createUserWithEmailAndPassword(sauth, emailFor(username, ver), start); }
        catch (e) { if (e.code === "auth/email-already-in-use") ver++; else throw e; }
      }
      if (!c) throw new Error("could not make a new login");
      const nu = c.user.uid;
      await setDoc(doc(fs, "users", nu), ADMIN ? { role: "student", sid } : { role: "student", sid, tid: u.uid });
      await peopleSet([{ uid: nu, role: "student", sid, tid: ADMIN ? "" : u.uid, cls: r.cls }]);
      await setDoc(doc(fs, "pinver", pinKey(username)), { v: ver, tid: u.uid });
      for (const o of us.filter(x => x.sid === sid && x.id !== nu)) { await deleteDoc(doc(fs, "users", o.id)); await peopleDel(o.id); }
      await setDoc(bdoc("logins", sid), { ...r, pin: start, first: true, ver, uid: nu });
      await signOut(sauth); ok++;
    } catch (e) {
      bad.push(`${r.name || sid}: ` + (e.code === "auth/too-many-requests" ? "Firebase asks to wait (too many new logins in a short time). Try the rest in an hour." : (e.code || e.message)));
      if (e.code === "auth/too-many-requests") break;
    }
  }
  msg(`Reset ${ok} PIN${ok === 1 ? "" : "s"}. New starting PIN: ${start}.` + (bad.length ? `\nProblems:\n${bad.join("\n")}` : ""));
  } catch (e) { msg("Could not finish: " + (e.code || e.message)); }
  finally { btns.forEach(b => b.disabled = false); resetting = false; }
  await listLogins();
}
$("lgReset").onclick = () => resetLogins([$("lgCls").value]);
$("lgNever").onclick = async () => {
  const box = $("lgNeverBox"), btn = $("lgNever"); btn.disabled = true; box.hidden = false; box.innerHTML = "<p>Checking every class…</p>";
  try {
    const lg = (await getDocs(bcol("logins"))).docs.map(d => ({ ...d.data(), sid: d.id })), st = (await getDocs(bcol("students"))).docs.map(d => ({ ...d.data(), sid: d.id }));
    const has = new Set(lg.map(r => r.sid)), byCls = {};
    const add = (c, k, n) => { (byCls[c] = byCls[c] || { never: [], none: [], total: 0 }); byCls[c][k].push(n); };
    lg.forEach(r => { byCls[r.cls] = byCls[r.cls] || { never: [], none: [], total: 0 }; byCls[r.cls].total++; if (r.first === true) add(r.cls, "never", r.name || r.sid); });
    st.filter(x => !has.has(x.sid) && x.cls).forEach(x => { add(x.cls, "none", x.name || x.sid); byCls[x.cls].total++; });
    const order = [...new Set([...CLASSES, ...Object.keys(byCls)])].filter(c => byCls[c]);
    const nm = a => a.sort((x, y) => String(x).localeCompare(String(y)));
    const tot = order.reduce((n, c) => n + byCls[c].never.length, 0);
    box.innerHTML = `<h4 style="margin:10px 0 4px">${tot} student${tot === 1 ? "" : "s"} have never signed in</h4>` + (order.map(c => { const r = byCls[c], n = r.never.length;
      return `<details class="lg-nv" ${n || r.none.length ? "open" : ""} style="margin:6px 0;border:2px solid var(--line,#ccd);border-radius:12px;padding:8px 12px"><summary style="cursor:pointer;font-weight:800">${esc2(c)} · ${n} of ${r.total - r.none.length} never signed in${n || r.none.length ? "" : " ✓"}</summary>`
        + (n ? `<ol style="margin:6px 0 2px 20px">${nm(r.never).map(x => `<li>${esc2(x)}</li>`).join("")}</ol>` : (r.none.length ? "" : `<p style="margin:6px 0">Everyone in this class has signed in.</p>`))
        + (r.none.length ? `<p style="margin:6px 0 2px"><b>No login yet (${r.none.length}):</b> ${nm(r.none).map(esc2).join(", ")}</p>` : "") + `</details>`; }).join("") || "<p>No student logins found.</p>")
      + `<div class="lg-bar" style="margin-top:6px"><button class="ghost small" id="lgNeverCp" type="button">Copy the list</button></div>`;
    $("lgNeverCp").onclick = async () => { const t = order.map(c => c + " (" + byCls[c].never.length + ")\n" + (nm(byCls[c].never).map(x => "• " + x).join("\n") || "• everyone signed in")).join("\n\n"); try { await navigator.clipboard.writeText(t); msg("Copied."); } catch { msg("Could not copy."); } };
  } catch (e) { box.innerHTML = `<p class="lg-msg">Could not load (${esc2(e.code || e.message)}).</p>`; }
  btn.disabled = false;
};
$("lgResetAll").onclick = () => resetLogins(CLASSES.slice());

$("loginsBtn").onclick = () => { fillLg(); $("loginsModal").hidden = false; msg(CLASSES.length ? "" : "Add a class first (the + Class button)."); if (CLASSES.length) listLogins(); };
$("lgClose").onclick = () => { $("loginsModal").hidden = true; };
$("lgCls").onchange = () => { msg(""); listLogins(); };
$("lgMake").onclick = makeLogins;
$("lgDemo").onclick = addDemo;
$("lgPrint").onclick = () => window.print();

/* ---------- import the old tracker's data (from "Export all data") ---------- */
$("impBtn").onclick = () => $("impFile").click();
$("impFile").onchange = async ev => {
  const f = ev.target.files[0]; ev.target.value = "";
  if (!f) return;
  const btn = $("impBtn"), old = btn.textContent; btn.disabled = true;
  const say = t => { btn.textContent = t; };
  try {
    const j = JSON.parse(await f.text());
    if (j.app !== "math8island-export" || !j.data || !j.data.students) throw new Error("This is not an export file from the old tracker.");
    const n = Object.keys(j.data.students).length;
    if (!confirm(`Import ${n} students and their classroom data? Demo students will be removed. Existing students with the same ID are replaced.`)) return;
    // remove demo students and their login rows
    const dsnap = await getDocs(bcol("students"));
    const demo = dsnap.docs.filter(d => d.id.startsWith("demo-")).map(d => d.id);
    let ops = [];
    demo.forEach(id => { ops.push(["del", "students", id]); ops.push(["del", "logins", id]); });
    for (const [c, docs] of Object.entries(j.data)) for (const [id, data] of Object.entries(docs)) ops.push(["set", c, id, data]);
    let done = 0;
    for (let i = 0; i < ops.length; i += 400) {
      const b = writeBatch(fs);
      ops.slice(i, i + 400).forEach(([k, c, id, data]) => k === "set" ? b.set(bdoc(c, id), data) : b.delete(bdoc(c, id)));
      await b.commit(); done = Math.min(ops.length, i + 400); say(`Importing… ${done}/${ops.length}`);
    }
    alert(`Done. ${n} students imported. Now open Student logins, choose each class and tap "Create logins for this class".`);
    location.reload();
  } catch (e) { alert("Import failed: " + (e.code || e.message)); }
  finally { btn.disabled = false; btn.textContent = old; }
};
