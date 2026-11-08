// Classwork for the student: see the worksheets sent to his class, answer, hand in once.
import { fs, doc, setDoc, collection, getDocs, query, where } from "./fb.js";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let P = null, base = [], works = [], mine = new Map(), openId = "", me = null, toast = () => {};

export async function initWork(profile, getMe, toastFn) {
  P = profile; base = profile.tid ? ["teachers", profile.tid] : []; toast = toastFn || toast;
  for (let i = 0; i < 50 && !(me = getMe()); i++) await new Promise(r => setTimeout(r, 200));   // wait for his record (class)
  if (!me) return;
  await load(); draw();
}
async function load() {
  try {
    const w = await getDocs(query(collection(fs, ...base, "work"), where("classes", "array-contains", me.cls)));
    works = w.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.created || 0) - (a.created || 0));
    const s = await getDocs(query(collection(fs, ...base, "subs"), where("sid", "==", P.sid)));
    mine = new Map(s.docs.map(d => [d.data().wid, d.data()]));
  } catch { works = []; }
}
function draw() {
  const box = $("work"); if (!box) return;
  const list = works.filter(w => w.open !== false || mine.has(w.id));
  if (!list.length) { box.innerHTML = ""; return; }
  const w = list.find(x => x.id === openId);
  if (w && !mine.has(w.id)) {
    box.innerHTML = `<section class="card wk-do"><h3>${esc(w.title)}</h3>
      <form id="wkForm">${(w.questions || []).map((q, i) => `<div class="wk-item"><p><b>${i + 1}.</b> ${esc(q.q).replace(/\n/g, "<br>")}</p>${q.type === "mc"
        ? `<div class="wk-mc">${q.opts.map((o, j) => `<label><input type="radio" name="q${i}" value="${esc(o)}"> ${esc(o)}</label>`).join("")}</div>`
        : `<input name="q${i}" autocomplete="off" maxlength="300" placeholder="Your answer">`}</div>`).join("")}
      <p class="wk-note" id="wkNote"></p>
      <div class="sbtns"><button class="primary" type="submit" id="wkSend">Hand in</button><button class="ghost" type="button" data-wkact="back">Back</button></div></form></section>`;
    $("wkForm").onsubmit = async e => {
      e.preventDefault();
      const f = e.target, answers = (w.questions || []).map((q, i) => { const el = f.elements["q" + i]; return String((el && (el.value ?? "")) || "").trim(); });
      const empty = answers.filter(a => !a).length;
      if (empty && !confirm(`${empty} question${empty === 1 ? " is" : "s are"} still empty. Hand in anyway?`)) return;
      if (!empty && !confirm("Hand in now? You cannot change your answers after this.")) return;
      $("wkSend").disabled = true;
      const sub = { wid: w.id, sid: P.sid, name: me.name, cls: me.cls, answers, at: Date.now() };
      try { await setDoc(doc(fs, ...base, "subs", w.id + "_" + P.sid), sub); mine.set(w.id, sub); openId = ""; toast("Handed in. Well done!"); draw(); }
      catch (er) { $("wkSend").disabled = false; $("wkNote").textContent = er && er.code === "permission-denied" ? "This worksheet is closed or was already handed in." : "Could not hand in. Check your internet and try again."; }
    };
    return;
  }
  box.innerHTML = `<section class="card"><h3>My classwork</h3><div class="wk-list">${list.map(x => {
    const s = mine.get(x.id);
    return `<div class="wk-card${s ? " done" : ""}"><div><b>${esc(x.title)}</b><small>${(x.questions || []).length} questions${s ? ` · handed in ${esc(new Date(s.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }))}` : ""}</small></div>
      ${s ? `<span class="wk-tick">Done ✓</span>` : `<button class="primary small" type="button" data-wkact="open" data-id="${x.id}">Start</button>`}</div>`;
  }).join("")}</div></section>`;
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-wkact]"); if (!b) return;
  if (b.dataset.wkact === "open") { openId = b.dataset.id; draw(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  if (b.dataset.wkact === "back") { openId = ""; draw(); }
});
