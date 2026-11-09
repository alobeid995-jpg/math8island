// "My classwork" on the student page: worksheets from the teacher, and (for the 9S boys) the lesson games.
import { fs, doc, setDoc, collection, getDocs, query, where } from "./fb.js";
import { playerOf, catalog } from "./islandmap.js";
import { logEv } from "./presence.js";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const when = t => new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
let P = null, base = [], works = [], mine = new Map(), openId = "", me = null, toast = () => {};
let player = "", lessons = [], played = new Map(), showAll = false, agPlays = new Set(), isAG = false;

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
  player = playerOf(me);
  isAG = /^AG$/i.test(String(me.cls || "").trim());   // the AG lesson is only for the AG class
  if (isAG) { try { const pl = await getDocs(query(collection(fs, ...base, "plays"), where("sid", "==", P.sid))); agPlays = new Set(pl.docs.map(d => d.data().g)); } catch {} }
  if (player) {
    try {
      const c = await catalog(), grp = (c.players.find(x => x.id === player) || {}).group;
      lessons = c.lessons.filter(l => l.group === grp).map(l => ({ ...l, games: c.games.filter(g => g.sec === l.id) })).filter(l => l.games.length);
      const pl = await getDocs(query(collection(fs, ...base, "plays"), where("sid", "==", P.sid)));
      played = new Map();
      pl.docs.forEach(d => { const v = d.data(), a = played.get(v.g) || { r: 0, w: 0 }; a.r += +v.r || 0; a.w += +v.w || 0; played.set(v.g, a); });
    } catch { lessons = []; }
  }
}
function draw() {
  const box = $("work"); if (!box) return;
  const w = works.find(x => x.id === openId);
  if (w && !mine.has(w.id)) return drawSheet(box, w);
  const list = works.filter(x => x.open !== false || mine.has(x.id));
  const sheets = list.map(x => { const s = mine.get(x.id);
    return `<div class="wk-card${s ? " done" : ""}"><div><b>${esc(x.title)}</b><small>Worksheet · ${(x.questions || []).length} questions${s ? ` · handed in ${esc(when(s.at))}` : ""}</small></div>
      ${s ? `<span class="wk-tick">Done ✓</span>` : `<button class="primary small" type="button" data-wkact="open" data-id="${x.id}">Start</button>`}</div>`; }).join("");
  const shown = showAll ? lessons : lessons.slice(0, 3);
  const games = shown.map((l, i) => `<div class="wk-lesson"><div class="wk-lh"><b>${esc(l.title)}</b><small>${esc(l.date)}</small></div>
      <div class="wk-games">${l.games.map(g => { const a = played.get(g.id), p = a && (a.r + a.w) ? Math.round(100 * a.r / (a.r + a.w)) : null;
        return `<button class="wk-game${a ? " done" : ""}" type="button" data-wkact="game" data-id="${esc(g.id)}"><b>${esc(g.title)}</b><small>${esc(g.desc)}</small>${a ? `<span class="wk-tick">${p}% ✓</span>` : ""}</button>`; }).join("")}</div></div>`).join("");
  const agPart = (g, l) => `<span class="wk-tick" style="margin-left:6px;opacity:${agPlays.has(g) ? 1 : .35}">${agPlays.has(g) ? "✓ " : ""}${l}</span>`;
  const agCard = isAG ? `<div class="wk-lesson"><div class="wk-lh"><b>Lesson 3.4: Upper and lower bounds</b><small>Mon 9 Nov 2026</small></div>
      <div class="wk-games"><button class="wk-game${agPlays.has("ag34-ws") ? " done" : ""}" type="button" data-wkact="ag"><b>Examples, games and worksheet</b><small>Do the examples, play the games, then do the multiple choice worksheet.</small>
      <span>${agPart("ag34-examples", "Examples")}${agPart("ag34-tap", "Game 1")}${agPart("ag34-bound", "Game 2")}${agPart("ag34-ineq", "Game 3")}${agPart("ag34-ws", "Worksheet")}</span></button></div></div>` : "";
  box.innerHTML = `<section class="card wk-box"><h3>My classwork</h3>
    ${agCard}
    ${sheets ? `<div class="wk-list">${sheets}</div>` : ""}
    ${games}
    ${lessons.length > 3 ? `<button class="ghost small" type="button" data-wkact="more">${showAll ? "Show fewer lessons" : `Show older lessons (${lessons.length - 3})`}</button>` : ""}
    ${!sheets && !games && !agCard ? `<p class="none">Nothing to do right now. Your teacher's work will appear here.</p>` : ""}</section>`;
}
function drawSheet(box, w) {
  box.innerHTML = `<section class="card wk-do"><h3>${esc(w.title)}</h3>
    <form id="wkForm">${(w.questions || []).map((q, i) => `<div class="wk-item"><p><b>${i + 1}.</b> ${esc(q.q).replace(/\n/g, "<br>")}</p>${q.type === "mc"
      ? `<div class="wk-mc">${q.opts.map(o => `<label><input type="radio" name="q${i}" value="${esc(o)}"> ${esc(o)}</label>`).join("")}</div>`
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
    try { await setDoc(doc(fs, ...base, "subs", w.id + "_" + P.sid), sub); mine.set(w.id, sub); logEv("Handed in: " + String(w.title || "worksheet").slice(0, 50)); openId = ""; toast("Handed in. Well done!"); draw(); }
    catch (er) { $("wkSend").disabled = false; $("wkNote").textContent = er && er.code === "permission-denied" ? "This worksheet is closed or was already handed in." : "Could not hand in. Check your internet and try again."; }
  };
}
function openAG() {
  const ov = document.createElement("div"); ov.className = "wk-play"; ov.id = "wkPlay";
  ov.innerHTML = `<button class="wk-x" type="button" data-wkact="closegame" aria-label="Close the lesson">✕ Close</button><iframe src="ag34.html" title="Lesson 3.4"></iframe>`;
  document.body.appendChild(ov); document.body.classList.add("wk-noscroll");
}
function openGame(id) {
  const gm = lessons.flatMap(l => l.games).find(g => g.id === id); logEv("Opened game: " + (gm ? gm.title : id));
  const ov = document.createElement("div"); ov.className = "wk-play"; ov.id = "wkPlay";
  ov.innerHTML = `<button class="wk-x" type="button" data-wkact="closegame" aria-label="Close the game">✕ Close</button><iframe src="island9s.html#g=${encodeURIComponent(id)}" title="Game" allow="autoplay"></iframe>`;
  document.body.appendChild(ov); document.body.classList.add("wk-noscroll");
}
async function closeGame() {
  const ov = $("wkPlay"); if (ov) ov.remove(); document.body.classList.remove("wk-noscroll");
  await load(); draw();
}
window.addEventListener("message", e => { if (e.origin === location.origin && e.data === "mi-close") closeGame(); });
document.addEventListener("click", e => {
  const b = e.target.closest("[data-wkact]"); if (!b) return;
  const a = b.dataset.wkact;
  if (a === "open") { openId = b.dataset.id; draw(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  if (a === "back") { openId = ""; draw(); }
  if (a === "more") { showAll = !showAll; draw(); }
  if (a === "game") openGame(b.dataset.id);
  if (a === "ag") openAG();
  if (a === "closegame") closeGame();
});
