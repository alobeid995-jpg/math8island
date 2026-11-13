import { onSnapshot, changeEmail, auth, fs, firebaseConfig, doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection, query, where, writeBatch, setBase, bcol, bdoc, signOut, whenUser, profileOf, emailFor, pinKey,
  initializeApp, getAuth, createUserWithEmailAndPassword } from "./fb.js?v=1112l";
import { db } from "./fbdb.js?v=1112l";
import { startUsage } from "./usage.js?v=1112l";
import { openWork, gradeData } from "./teacherwork.js?v=1112l";
import "./lessonxp.js";
import { openProgress } from "./progress.js?v=1112l";
import { openMaterial } from "./material.js?v=1112l";
import { hasFunpark, openFunpark } from "./fpteacher.js?v=1112l";
import { openCoconut } from "./coconut.js?v=1112l";
import { xpAllowed } from "./ownerpin.js?v=1112l";
window.xpGate = n => xpAllowed(n); window.wkGradeData = gradeData;
import { initChat } from "./chat.js?v=1112l";
import { openLive } from "./live.js?v=1112l";
import { openInbox } from "./inbox.js?v=1112l";

const $ = id => document.getElementById(id);
const esc2 = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const u = await whenUser();
const p = u && await profileOf(u.uid);
if (!p || p.role !== "teacher") { location.href = "index.html"; throw new Error("not a teacher"); }

// The owner sees the original top-level data. Every other teacher gets a private folder of his own.
const ADMIN = p.admin === true;
startUsage(u, p);
setBase(ADMIN ? [] : ["teachers", u.uid]);
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
window.__owner = ADMIN;   // only the owner can change prices
{
  const pref = doc(fs, "shop", "prices"); let saved = {};
  try { const s = window.__pricesSnap || await getDoc(pref); if (s && s.exists()) saved = s.data().prices || {}; } catch {}
  applyPrices(saved);   // prices he has set win over the defaults in the code
  const all = () => Object.fromEntries(SHOP.map(i => [i.id, i.price]));
  if (ADMIN) setDoc(pref, { prices: all() }).catch(() => {});   // new items get their default price; his own prices stay
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
{ const fb = document.createElement("button"); fb.className = "ghost small"; fb.id = "funBtn"; fb.type = "button"; fb.textContent = "Fun Park"; fb.style.display = "none"; fb.onclick = () => openFunpark(); $("outBtn").before(fb); hasFunpark(ADMIN, u.uid).then(ok => { if (ok) fb.style.display = ""; }).catch(() => {}); }
{ const cb = document.createElement("button"); cb.className = "ghost small"; cb.id = "ccBtn"; cb.type = "button"; cb.textContent = "Coconut Crack"; cb.style.display = "none"; cb.onclick = () => openCoconut(); $("outBtn").before(cb); hasFunpark(ADMIN, u.uid, "coconut").then(ok => { if (ok) cb.style.display = ""; }).catch(() => {}); }
{ const mb = document.createElement("button"); mb.className = "ghost small"; mb.id = "matBtn"; mb.type = "button"; mb.textContent = "My material"; mb.onclick = () => openMaterial(); $("outBtn").before(mb); }
initChat("teacher", { uid: u.uid, ...p }, null).catch(() => {});
$("outBtn").onclick = async () => { await signOut(auth); location.href = "index.html"; };

/* ---------- the header buttons live in Hub > Tools > Manage ---------- */
{
  const holder = document.createElement("div"); holder.hidden = true; document.body.appendChild(holder);
  const eb = document.createElement("button"); eb.className = "ghost small"; eb.id = "emailBtn"; eb.type = "button"; eb.textContent = "My email & password reset";
  eb.onclick = async () => {
    const em = (prompt("Type your real email address. Firebase will send a link to it, and you can use it later to reset your password.") || "").trim();
    if (!em) return; if (!/^\S+@\S+\.\S+$/.test(em)) { alert("That does not look like an email address."); return; }
    const pw = prompt("Type your current password to confirm it is you.") || ""; if (!pw) return;
    try { await changeEmail(em, pw); alert("Done. A link was sent to " + em + ". Open it to confirm. From then on, log in with that email, and use \"Forgot password?\" on the login page if you ever forget your password."); }
    catch (er) { alert(er && er.code === "auth/invalid-credential" || er && er.code === "auth/wrong-password" ? "The password is not right." : "Could not do it: " + ((er && (er.code || er.message)) || "error")); }
  };
  document.body.appendChild(eb);
  const btns = ["workBtn", "liveBtn", "ccBtn", "funBtn", "inboxBtn", "matBtn", "loginsBtn", "impBtn", "islandBtn", "devBtn", "emailBtn"].map(id => $(id)).filter(Boolean);
  btns.forEach(b => holder.appendChild(b));
  const place = () => { const h = $("hubMgmt"); if (h && !btns.every(b => b.parentNode === h)) btns.forEach(b => h.appendChild(b)); };
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
      `<h4 style="margin:6px 0 2px">Class ${esc2(cl)} · ${rows.length} logins · ${rows.filter(r => r.first === true).length} still on the starting PIN</h4><table class="lg-tbl"><thead><tr><th>Name</th><th>ID</th><th>PIN</th><th>Status</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc2(r.name)}</td><td>${esc2(r.username)}${stale.includes(r) ? ` <small class="lg-old">→ ${esc2(r.want)}</small>` : ""}</td><td class="pin">${esc2(r.pin)}</td><td>${r.first === true ? "Starting PIN · must change at first login" : "Own PIN"}</td></tr>`).join("")}</tbody></table>`
    : `<p class="none">No logins for ${esc2(cl)} yet.</p>`;
  if (stale.length) $("lgFixIds").onclick = () => fixIds(stale);
  const todo = rows.filter(r => r.first === true);
  if (rows.length) {
    const box = document.createElement("div"); box.style.cssText = "margin-top:12px";
    box.innerHTML = `<button class="primary small" id="lgAnn" type="button">Classroom announcement (${todo.length} not signed in)</button><div id="lgAnnBox" hidden><textarea id="lgAnnTx" rows="14" style="width:100%;margin-top:8px;box-sizing:border-box"></textarea><button class="small" id="lgAnnCp" type="button">Copy</button></div>`;
    $("lgList").appendChild(box);
    $("lgAnn").onclick = () => {
      const names = todo.map(r => "• " + r.name).join("\n");
      $("lgAnnTx").value = `Math Island – please sign in\n\nThe students below have not signed in to Math Island yet:\n${names || "(everyone has signed in – well done!)"}\n\nHow to sign in:\n1. Open mathkn.fun on your phone, tablet or computer.\n2. Type your student ID (for example 16-00014).\n3. Type the 6-digit starting PIN that I gave you in class. If you forgot it, ask me.\n4. The first time, the site asks you to choose your own new 6-digit PIN. Type it twice and remember it.\n5. From then on, log in with your ID and your own PIN.\n\nOnce you are in, you will find your classwork, games and XP. Please sign in before our next lesson.\n\nMr. Khalid`.replace("Mr. Khalid", (typeof TNAME === "string" && TNAME) || "Your maths teacher");
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
        const c = await createUserWithEmailAndPassword(sauth, emailFor(username), pin);
        await setDoc(doc(fs, "users", c.user.uid), ADMIN ? { role: "student", sid: d.id } : { role: "student", sid: d.id, tid: u.uid });
        await setDoc(bdoc("logins", d.id), { username, pin, name: String(v.name || ""), cls: cl, first: true });
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
        if (ver) await setDoc(doc(fs, "pinver", pinKey(r.want)), { v: ver, tid: u.uid });
        for (const o of us.filter(x => x.sid === r.sid && x.id !== nu)) await deleteDoc(doc(fs, "users", o.id));
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
async function resetLogins(classes) {
  if (resetting) return;
  const start = $("lgStart").value.trim(), btns = [$("lgReset"), $("lgResetAll"), $("lgMake")];
  if (!/^\d{6}$/.test(start)) { msg("Type the new 6-digit starting PIN first."); $("lgStart").focus(); return; }
  const rows = (await getDocs(bcol("logins"))).docs.filter(d => classes.includes(d.data().cls));
  if (!rows.length) { msg("No logins to reset" + (classes.length === 1 ? " in " + classes[0] : "") + "."); return; }
  if (!confirm(`Reset the PIN of ${rows.length} student${rows.length === 1 ? "" : "s"} in ${classes.join(", ")}?\n\nTheir old PINs stop working. Everyone logs in once with ${start} and then chooses his own PIN.`)) return;
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
      await setDoc(doc(fs, "pinver", pinKey(username)), { v: ver, tid: u.uid });
      for (const o of us.filter(x => x.sid === sid && x.id !== nu)) await deleteDoc(doc(fs, "users", o.id));
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
