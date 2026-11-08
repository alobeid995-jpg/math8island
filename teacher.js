import { auth, fs, firebaseConfig, doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection, query, where, writeBatch, setBase, bcol, bdoc, signOut, whenUser, profileOf, emailFor, pinKey,
  initializeApp, getAuth, createUserWithEmailAndPassword } from "./fb.js";
import { db } from "./fbdb.js";

const $ = id => document.getElementById(id);
const esc2 = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const u = await whenUser();
const p = u && await profileOf(u.uid);
if (!p || p.role !== "teacher") { location.href = "index.html"; throw new Error("not a teacher"); }

// The owner sees the original top-level data. Every other teacher gets a private folder of his own.
const ADMIN = p.admin === true;
setBase(ADMIN ? [] : ["teachers", u.uid]);

/* ---------- this teacher's classes ---------- */
// The owner starts with his four Grade 8 classes. Every other teacher starts empty and adds his own.
const DEFAULT_CLASSES = ["8B", "8Y", "8M", "8S"];
{
  let list = [];
  try { const s = await getDoc(bdoc("meta", "classes")); if (s.exists()) list = (s.data().list || []).slice(); else if (ADMIN) list = DEFAULT_CLASSES.slice(); } catch {}
  try { (await getDocs(bcol("students"))).docs.forEach(d => { const c = d.data().cls; if (c && !list.includes(c)) list.push(c); }); } catch {}   // never hide a class that has students
  CLASSES.splice(0, CLASSES.length, ...list);
  cls = CLASSES.includes(cls) ? cls : (CLASSES[0] || "");
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

// Hand the tracker its database. From here on the tracker page works as before.
window.__resolveClaude({ use: async n => n === "db" ? db : n === "user" ? { can: async () => true, isOwner: () => true, canEdit: () => true } : null });

// Students may only spend what the shop price list allows, so the list lives in the database.
setDoc(doc(fs, "shop", "prices"), { prices: Object.fromEntries(SHOP.map(i => [i.id, i.price])) }).catch(() => {});

if (ADMIN) { // the button is only created for the owner; other teachers' pages never contain it
  const dv = document.createElement("button"); dv.className = "ghost small"; dv.id = "devBtn"; dv.type = "button"; dv.textContent = "Developer";
  dv.onclick = () => { location.href = "developer.html"; };
  $("outBtn").before(dv);
}
$("outBtn").onclick = async () => { await signOut(auth); location.href = "index.html"; };

/* ---------- student logins ---------- */
const msg = t => { $("lgMsg").textContent = t; };
const pinOf = () => String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));

async function listMissing() {
  const cl = $("lgCls").value, box = $("lgMissing");
  const all = (await getDocs(bcol("students"))).docs.filter(d => d.data().cls === cl);
  const no = all.filter(d => !String(d.data().enrollment || "").trim()).sort((a, b) => String(a.data().name).localeCompare(String(b.data().name)));
  box.innerHTML = no.length
    ? `<h4 style="margin:6px 0 2px">${no.length} student${no.length === 1 ? "" : "s"} in ${esc2(cl)} without a student ID</h4>` + no.map(d => `<div class="lg-bar" style="margin:4px 0"><span style="min-width:180px">${esc2(d.data().name)}</span><input data-idfor="${esc2(d.id)}" placeholder="e.g. 19-00047" style="width:140px"><button class="ghost small" data-saveid="${esc2(d.id)}" type="button">Save ID</button></div>`).join("")
    : "";
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
    msg("ID saved."); await listMissing();
  } catch (e) { msg("Could not save: " + (e.code || e.message)); }
  finally { b.disabled = false; }
});

async function listLogins() {
  listMissing().catch(() => {});
  const cl = $("lgCls").value;
  const snap = await getDocs(bcol("logins"));
  const rows = snap.docs.map(d => d.data()).filter(r => r.cls === cl).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  $("lgList").innerHTML = rows.length
    ? `<h4 style="margin:6px 0 2px">Class ${esc2(cl)} · ${rows.length} logins · ${rows.filter(r => r.first === true).length} still on the starting PIN</h4><table class="lg-tbl"><thead><tr><th>Name</th><th>ID</th><th>PIN</th><th>Status</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc2(r.name)}</td><td>${esc2(r.username)}</td><td class="pin">${esc2(r.pin)}</td><td>${r.first === true ? "Starting PIN · must change at first login" : "Own PIN"}</td></tr>`).join("")}</tbody></table>`
    : `<p class="none">No logins for ${esc2(cl)} yet.</p>`;
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
      counts: {}, owned: [], eq: { frame: "", color: "", title: "", top: "", skin: "" }, reqs: [], buys: 0, lastBuy: "", hist: [], sp: [], avatar: (Math.random() * 4294967295) >>> 0 });
  });
  try { await b.commit(); msg(`Added 8 demo students to ${$("lgCls").value}. Now press "Create logins".`); }
  catch (e) { msg("Could not add: " + (e.code || e.message)); }
}

const fillLg = () => { const sel = $("lgCls"), keep = sel.value; sel.innerHTML = CLASSES.map(c => `<option>${esc2(c)}</option>`).join(""); if (CLASSES.includes(keep)) sel.value = keep; else if (CLASSES.includes(cls)) sel.value = cls; };
/* ---------- reset PINs: every student gets a fresh login with the new starting PIN ----------
   A web page cannot change another person's password, so each student gets a new login (version +1).
   The old login is switched off by removing its profile, so the old PIN stops working. */
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
