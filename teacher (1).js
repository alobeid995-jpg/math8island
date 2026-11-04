import { auth, fs, firebaseConfig, doc, setDoc, getDocs, collection, writeBatch, signOut, whenUser, profileOf, emailFor,
  initializeApp, getAuth, createUserWithEmailAndPassword } from "./fb.js";
import { db } from "./fbdb.js";

const $ = id => document.getElementById(id);
const esc2 = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const u = await whenUser();
const p = u && await profileOf(u.uid);
if (!p || p.role !== "teacher") { location.href = "index.html"; throw new Error("not a teacher"); }

// Hand the tracker its database. From here on the tracker page works as before.
window.__resolveClaude({ use: async n => n === "db" ? db : n === "user" ? { can: async () => true, isOwner: () => true, canEdit: () => true } : null });

// Students may only spend what the shop price list allows, so the list lives in the database.
setDoc(doc(fs, "shop", "prices"), { prices: Object.fromEntries(SHOP.map(i => [i.id, i.price])) }).catch(() => {});

$("outBtn").onclick = async () => { await signOut(auth); location.href = "index.html"; };

/* ---------- student logins ---------- */
const msg = t => { $("lgMsg").textContent = t; };
const pinOf = () => String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));

async function listLogins() {
  const cl = $("lgCls").value;
  const snap = await getDocs(collection(fs, "logins"));
  const rows = snap.docs.map(d => d.data()).filter(r => r.cls === cl).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  $("lgList").innerHTML = rows.length
    ? `<h4 style="margin:6px 0 2px">Class ${esc2(cl)} · ${rows.length} logins</h4><table class="lg-tbl"><thead><tr><th>Name</th><th>ID</th><th>PIN</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc2(r.name)}</td><td>${esc2(r.username)}</td><td class="pin">${esc2(r.pin)}</td></tr>`).join("")}</tbody></table>`
    : `<p class="none">No logins for ${esc2(cl)} yet.</p>`;
}

async function makeLogins() {
  const cl = $("lgCls").value, btn = $("lgMake"); btn.disabled = true;
  try {
    const sSnap = await getDocs(collection(fs, "students"));
    const mine = sSnap.docs.filter(d => d.data().cls === cl);
    const have = new Set((await getDocs(collection(fs, "logins"))).docs.map(d => d.id));
    const todo = mine.filter(d => !have.has(d.id));
    if (!mine.length) { msg(`No students in ${cl} yet. Add them in the Students tab first.`); return; }
    if (!todo.length) { msg("Everyone in this class already has a login."); await listLogins(); return; }
    // A second, temporary sign-in session creates the accounts, so you stay logged in as the teacher.
    const sapp = initializeApp(firebaseConfig, "creator" + Date.now()), sauth = getAuth(sapp);
    let ok = 0; const bad = [];
    for (const d of todo) {
      const v = d.data(), username = String(v.enrollment || d.id), pin = pinOf();
      msg(`Creating ${ok + bad.length + 1} of ${todo.length}…`);
      try {
        const c = await createUserWithEmailAndPassword(sauth, emailFor(username), pin);
        await setDoc(doc(fs, "users", c.user.uid), { role: "student", sid: d.id });
        await setDoc(doc(fs, "logins", d.id), { username, pin, name: String(v.name || ""), cls: cl });
        await signOut(sauth); ok++;
      } catch (e) { bad.push(`${v.name || d.id}: ${e.code || e.message}`); }
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
    b.set(doc(fs, "students", id), { name: n, cls: $("lgCls").value, enrollment: id.toUpperCase(), xp: 200, carry: 300 + i * 100, spent: 0, log: [], createdAt: Date.now(), bonusWeek: wk,
      counts: {}, owned: [], eq: { frame: "", color: "", title: "", top: "", skin: "" }, reqs: [], buys: 0, lastBuy: "", hist: [], sp: [], avatar: (Math.random() * 4294967295) >>> 0 });
  });
  try { await b.commit(); msg(`Added 8 demo students to ${$("lgCls").value}. Now press "Create logins".`); }
  catch (e) { msg("Could not add: " + (e.code || e.message)); }
}

$("loginsBtn").onclick = () => { $("loginsModal").hidden = false; msg(""); listLogins(); };
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
    const dsnap = await getDocs(collection(fs, "students"));
    const demo = dsnap.docs.filter(d => d.id.startsWith("demo-")).map(d => d.id);
    let ops = [];
    demo.forEach(id => { ops.push(["del", "students", id]); ops.push(["del", "logins", id]); });
    for (const [c, docs] of Object.entries(j.data)) for (const [id, data] of Object.entries(docs)) ops.push(["set", c, id, data]);
    let done = 0;
    for (let i = 0; i < ops.length; i += 400) {
      const b = writeBatch(fs);
      ops.slice(i, i + 400).forEach(([k, c, id, data]) => k === "set" ? b.set(doc(fs, c, id), data) : b.delete(doc(fs, c, id)));
      await b.commit(); done = Math.min(ops.length, i + 400); say(`Importing… ${done}/${ops.length}`);
    }
    alert(`Done. ${n} students imported. Now open Student logins, choose each class and tap "Create logins for this class".`);
    location.reload();
  } catch (e) { alert("Import failed: " + (e.code || e.message)); }
  finally { btn.disabled = false; btn.textContent = old; }
};
