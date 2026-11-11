// "My classwork" on the student page: worksheets from the teacher, and (for the 9S boys) the lesson games.
import { fs, doc, getDoc, setDoc, collection, getDocs, query, where } from "./fb.js?v=1110n";
import { playerOf, catalog } from "./islandmap.js?v=1110n";
import { logEv } from "./presence.js?v=1110n";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const when = t => new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
let materials = [], lxs = {}, P = null, base = [], works = [], mine = new Map(), openId = "", me = null, toast = () => {};
let player = "", lessons = [], played = new Map(), showAll = false, agPlays = new Set(), isAG = false, isEL = false;

export async function initWork(profile, getMe, toastFn) {
  P = profile; base = profile.tid ? ["teachers", profile.tid] : []; toast = toastFn || toast;
  for (let i = 0; i < 50 && !(me = getMe()); i++) await new Promise(r => setTimeout(r, 200));   // wait for his record (class)
  if (!me) return;
  await load(); draw();
}
async function load() {
  try {
    const w = await getDocs(query(collection(fs, ...base, "work"), where("classes", "array-contains", me.cls)));
    const all = w.docs.map(d => ({ id: d.id, ...d.data() }));
    materials = all.filter(x => x.kind === "material" && Array.isArray(x.units)).sort((a, b) => (b.created || 0) - (a.created || 0));
    works = all.filter(x => x.kind !== "material").sort((a, b) => (b.created || 0) - (a.created || 0));
    const s = await getDocs(query(collection(fs, ...base, "subs"), where("sid", "==", P.sid)));
    mine = new Map(s.docs.map(d => [d.data().wid, d.data()]));
  } catch { works = []; }
  player = playerOf(me);
  isAG = /^8G$/i.test(String(me.cls || "").trim());   // this lesson is only for class 8G
  isEL = /^(8B|8Y|8S|8M)$/i.test(String(me.cls || "").trim());   // elimination lesson: only these four classes
  if (isAG || isEL) { try { const pl = await getDocs(query(collection(fs, ...base, "plays"), where("sid", "==", P.sid))); let rt = {}; try { const sd = await getDoc(doc(fs, ...base, "students", P.sid)); rt = (sd.exists() && sd.data().rt) || {}; lxs = (sd.exists() && sd.data().lx) || {}; } catch {}
      agPlays = new Set(pl.docs.map(d => d.data()).filter(v => (v.u || v.t || 0) > (rt[v.g] || 0)).map(v => v.g)); } catch {} }
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
  const xpNote = k => { const r = lxs[k] || {}; return `<small class="wk-xpnote">${r.perfect ? "⭐ +200 XP earned: all correct!" : r.done ? "✓ +100 XP earned. Get the worksheet 100% right for +100 more." : "Finish everything for +100 XP. Get the worksheet 100% right for +100 more."}</small>`; };
  const agPart = (g, l) => `<span class="wk-tick" style="margin-left:6px;opacity:${agPlays.has(g) ? 1 : .35}">${agPlays.has(g) ? "✓ " : ""}${l}</span>`;
  const agCard = isAG ? `<div class="wk-lesson"><div class="wk-lh"><b>Lesson 3.4: Upper and lower bounds</b><small>Mon 9 Nov 2026</small></div>
      <div class="wk-games"><button class="wk-game${agPlays.has("ag34-ws") ? " done" : ""}" type="button" data-wkact="ag"><b>Examples, games and worksheet</b><small>Do the examples, play the games, then do the multiple choice worksheet.</small>${xpNote("ag34")}
      <span>${agPart("ag34-examples", "Examples")}${agPart("ag34-tap", "Game 1")}${agPart("ag34-bound", "Game 2")}${agPart("ag34-ineq", "Game 3")}${agPart("ag34-ws", "Worksheet")}</span></button></div></div>` : "";
  const elCard = isEL ? `<div class="wk-lesson"><div class="wk-lh"><b>Simultaneous equations: elimination</b><small>Exercise 4.2 · Day 1</small></div>
      <div class="wk-games"><button class="wk-game${agPlays.has("el42-ws") ? " done" : ""}" type="button" data-wkact="el"><b>Examples, games and worksheet</b><small>Do the examples, play the games, then do the multiple choice worksheet.</small>${xpNote("el42")}
      <span>${agPart("el42-examples", "Examples")}${agPart("el42-addsub", "Game 1")}${agPart("el42-solve", "Game 2")}${agPart("el42-spot", "Game 3")}${agPart("el42-ws", "Worksheet")}</span></button></div></div>` : "";
  const matCard = (() => {
    if (!materials.length) return "";
    return `<section class="card wk-box mt-box"><h3>My material</h3>` + materials.map((m, i) => {
      const ls = m.units.flatMap(u => u.lessons || []), have = ls.filter(l => (l.links || []).length).length;
      return `<details class="mt-list"${i === 0 ? " open" : ""}><summary><b>${esc(m.title || "Quarter 2")}</b><small>${have} of ${ls.length} lessons ready</small></summary>
        ${m.units.map(u => `<h4 class="mt-un">${esc(u.title)}</h4>${(u.lessons || []).map(l => { const L = (l.links || []).filter(k => /^https?:\/\//i.test(k.url));
          return `<div class="mt-ls${L.length ? " ok" : ""}"><span class="mt-n">${esc(l.code)}</span><div><b>${esc(l.title)}</b>${L.length ? `<div class="mt-lk">${L.map(k => `<a class="mt-a" href="${esc(k.url)}" target="_blank" rel="noopener">${esc(k.label)}</a>`).join("")}</div>` : `<small>Coming soon</small>`}</div></div>`; }).join("")}`).join("")}</details>`; }).join("") + `</section>`;
  })();
  box.innerHTML = matCard + `<section class="card wk-box"><h3>My classwork</h3>
    ${elCard}${agCard}
    ${sheets ? `<div class="wk-list">${sheets}</div>` : ""}
    ${games}
    ${lessons.length > 3 ? `<button class="ghost small" type="button" data-wkact="more">${showAll ? "Show fewer lessons" : `Show older lessons (${lessons.length - 3})`}</button>` : ""}
    ${!sheets && !games && !agCard && !elCard ? `<p class="none">Nothing to do right now. Your teacher's work will appear here.</p>` : ""}</section>`;
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
function openAG(file = "ag34.html", ttl = "Lesson 3.4") {
  const ov = document.createElement("div"); ov.className = "wk-play"; ov.id = "wkPlay";
  ov.innerHTML = `<button class="wk-x" type="button" data-wkact="closegame" aria-label="Close the lesson">✕ Close</button><iframe src="${file}" title="${ttl}"></iframe>`;
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
  if (a === "el") openAG("elim.html", "Elimination lesson");
  if (a === "closegame") closeGame();
});

{ const st = document.createElement("style"); st.textContent = ".mt-un{margin:14px 0 6px;font-size:16px}.mt-list{margin:8px 0;border-top:1px solid #e3e7f0;padding-top:8px}.mt-list summary{cursor:pointer;display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;font-size:16px}.mt-list summary small{opacity:.7}.mt-ls{display:flex;gap:12px;align-items:flex-start;padding:10px 12px;border-radius:12px;margin:6px 0;background:#eef1f7;color:#6b7690}.mt-ls.ok{background:#e6f6ec;color:inherit}.mt-n{font-weight:800;min-width:2.3em}.mt-ls small{display:block;opacity:.8}.mt-lk{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}.mt-a{display:inline-block;padding:6px 12px;border-radius:99px;background:#1f5bbd;color:#fff;font-weight:700;text-decoration:none}"; document.head.appendChild(st); }
{ const st = document.createElement("style"); st.textContent = "@media(min-width:860px){#work{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;align-items:start}#work>section:only-child{grid-column:1/-1}#work>section{margin:0}}"; document.head.appendChild(st); }
{ const st = document.createElement("style"); st.textContent = "#work .wk-box{padding:14px 16px!important}#work .wk-box h3{margin:0 0 6px!important;font-size:18px!important;line-height:1.2}#work .mt-un{font-size:14px;margin:10px 0 4px}#work .mt-ls{padding:7px 10px;margin:4px 0;font-size:14px;gap:8px}#work .mt-n{min-width:2em}#work .mt-list{margin:6px 0;padding-top:6px}#work .mt-list summary{font-size:15px}#work .mt-a{padding:4px 10px;font-size:13px}#work .wk-lh b{font-size:15px}#work .wk-game{padding:10px 12px}#work .wk-game b{font-size:15px}#work .wk-game small{font-size:12.5px}@media(min-width:860px){#work .mt-box{max-height:560px;overflow:auto}}"; document.head.appendChild(st); }
