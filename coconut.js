// Coconut Crack: a team game for the whole class on one screen (the teacher's projector). Teams take turns to crack a coconut.
// A coconut hides a question or a surprise. Questions come from the Live quiz sets (or pasted/imported cells). Nothing is saved to students.
import { getDocs, bcol } from "./fb.js?v=1111z";
import { PRESETS } from "./presets.js?v=1111z";
import { parseQuiz } from "./live.js?v=1111z";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const LET = ["A", "B", "C", "D"];
const TEAMS = [["Parrots", "🦜", "#e0443e"], ["Crabs", "🦀", "#e5a50a"], ["Turtles", "🐢", "#1f9d55"], ["Sharks", "🦈", "#2f6fe0"], ["Toucans", "🦤", "#7b3fe4"], ["Monkeys", "🐒", "#c2410c"]];
const SUR = { bonus: ["🎁", "Treasure!", "+10 points for your team"], bomb: ["💣", "Boom!", "Your team loses 5 points"], steal: ["🏴‍☠️", "Pirate!", "Steal 5 points from a team you choose"], swap: ["🔄", "Swap!", "Swap scores with a team you choose"], gift: ["🎉", "Party!", "Every team gets +3 points"] };

let sets = [], qs = [], tiles = [], teams = [], turn = 0, open = -1, step = "", pts = 10, nT = 4, text = "", note = "", sname = "", reveal = false, over = false;
let ov = null;

{ const st = document.createElement("style"); st.textContent = `
#ccOv.cc-board{overflow:hidden;height:100vh;height:100dvh}
#ccOv{position:fixed;inset:0;z-index:3200;background:linear-gradient(180deg,#0e7490,#14b8a6 55%,#fde68a);color:#10222b;display:flex;flex-direction:column;padding:12px 16px;overflow:auto;font-family:inherit}
#ccOv[hidden]{display:none}
#ccOv .cc-top{display:flex;align-items:center;gap:10px;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap}
#ccOv h2{margin:0;font-size:clamp(24px,4vw,40px);color:#fff;text-shadow:0 3px 0 rgba(0,0,0,.25)}
#ccOv .cc-x{background:rgba(0,0,0,.25);color:#fff;border:0;border-radius:10px;padding:8px 14px;font:inherit;font-weight:800;cursor:pointer}
#ccOv .cc-card{background:#fff;border-radius:18px;padding:16px 18px;box-shadow:0 6px 0 rgba(0,0,0,.2);margin:8px auto;width:min(860px,100%);box-sizing:border-box}
#ccOv .cc-in,#ccOv select,#ccOv textarea{width:100%;box-sizing:border-box;padding:10px;border:2px solid #b6c4cf;border-radius:10px;font:inherit}
#ccOv textarea{min-height:110px;font:13px/1.4 ui-monospace,Menlo,monospace}
#ccOv .cc-btn{background:#f59e0b;color:#10222b;border:3px solid #10222b;border-radius:14px;padding:11px 20px;font:inherit;font-weight:900;font-size:18px;cursor:pointer;box-shadow:0 4px 0 #10222b}
#ccOv .cc-btn.g{background:#22c55e}#ccOv .cc-btn.r{background:#ef4444;color:#fff}#ccOv .cc-btn.o{background:#fff;font-size:15px}
#ccOv .cc-btn:active{transform:translateY(3px);box-shadow:0 1px 0 #10222b}
#ccOv .cc-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:8px 0}
#ccOv .cc-score{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-bottom:10px}
#ccOv .cc-team{min-width:120px;padding:8px 14px;border-radius:16px;background:#fff;border:4px solid transparent;text-align:center;box-shadow:0 4px 0 rgba(0,0,0,.2);font-weight:800}
#ccOv .cc-team.on{border-color:#10222b;transform:scale(1.06);background:#fff7cc}#ccOv .cc-team b{display:block;font-size:clamp(24px,4vw,40px)}
#ccOv .cc-grid{display:grid;gap:10px;justify-content:center;align-content:center;flex:1;min-height:0;width:100%}
#ccOv .cc-nut{width:100%;height:100%;aspect-ratio:1;border-radius:50%;border:4px solid #3f2a14;background:radial-gradient(circle at 35% 30%,#a9783f,#6b431b 70%);color:#fff;font:inherit;font-weight:900;font-size:var(--ns,32px);cursor:pointer;padding:0;box-shadow:0 5px 0 #3f2a14;display:flex;align-items:center;justify-content:center}
#ccOv .cc-nut:active{transform:translateY(4px);box-shadow:0 2px 0 #3f2a14}
#ccOv .cc-nut.done{background:#d9e6ea;border-color:#9bb0b9;color:#6a8793;box-shadow:none;cursor:default;font-size:var(--ns,28px)}
#ccOv .cc-q{font-size:clamp(24px,4.4vw,44px);font-weight:900;line-height:1.2;margin:6px 0 14px}
#ccOv .cc-opts{display:grid;grid-template-columns:1fr 1fr;gap:10px}
#ccOv .cc-opt{padding:14px;border-radius:14px;background:#e8f4f8;border:3px solid #b6d3de;font-weight:800;font-size:clamp(18px,3vw,30px)}#ccOv .cc-opt.ok{background:#bbf7d0;border-color:#16a34a}
#ccOv .cc-big{font-size:clamp(60px,12vw,120px);text-align:center}#ccOv .cc-c{text-align:center}
#ccOv .cc-msg{color:#b3261e;font-weight:700;min-height:1.2em}
#ccOv .cc-pick{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin:12px 0}
@media (max-height:560px){#ccOv{padding:6px 10px}#ccOv h2{font-size:20px}#ccOv .cc-top{margin-bottom:2px}#ccOv .cc-x{padding:5px 10px}#ccOv .cc-team{min-width:70px;padding:3px 8px;border-width:3px}#ccOv .cc-team b{font-size:20px}#ccOv .cc-score{margin-bottom:4px;gap:6px}#ccOv .cc-pr{font-size:15px!important;margin:2px 0!important}}
`; document.head.appendChild(st); }

function ui() { if (!ov) { ov = document.createElement("div"); ov.id = "ccOv"; ov.hidden = true; document.body.appendChild(ov); ov.addEventListener("click", onClick); ov.addEventListener("input", e => { if (e.target.id === "ccText") text = e.target.value; if (e.target.id === "ccName") sname = e.target.value; }); ov.addEventListener("change", e => { if (e.target.id === "ccSet") pickSet(e.target.value); if (e.target.id === "ccN") nT = +e.target.value; if (e.target.id === "ccPts") pts = +e.target.value; }); } return ov; }
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
function pickSet(id) { const s = id.startsWith("preset:") ? PRESETS[+id.slice(7)] : sets.find(x => x.id === id); if (s) { qs = s.qs.slice(); sname = s.title || ""; note = `${qs.length} question${qs.length === 1 ? "" : "s"} ready.`; } else { qs = []; note = ""; } paint(); }

function build() {
  let q = shuffle(qs).slice(0, 24); if (!q.length) return;
  const sc = Math.max(2, Math.round(q.length * 0.35)), kinds = [];
  const pool = ["bonus", "bomb", "steal", "swap", "gift", "bonus", "bomb", "steal"];
  for (let i = 0; i < sc; i++) kinds.push(pool[i % pool.length]);
  const dbl = new Set(shuffle(q.map((_, i) => i)).slice(0, Math.max(1, Math.round(q.length * 0.15))));
  tiles = shuffle([...q.map((x, i) => ({ k: dbl.has(i) ? "x2" : "q", q: x })), ...kinds.map(k => ({ k }))]).map((t, i) => ({ ...t, n: i + 1, done: false, icon: "" }));
  teams = Array.from({ length: nT }, (_, i) => ({ name: TEAMS[i][0], icon: TEAMS[i][1], c: TEAMS[i][2], s: 0 }));
  turn = 0; open = -1; step = ""; reveal = false; over = false; note = "";
}
const cur = () => teams[turn];
function nextTurn() { turn = (turn + 1) % teams.length; open = -1; step = ""; reveal = false; if (tiles.every(t => t.done)) over = true; paint(); }
function add(t, n) { t.s = Math.max(0, t.s + n); }

function scoreBar() { return `<div class="cc-score">${teams.map((t, i) => `<div class="cc-team${i === turn && !over ? " on" : ""}" style="color:${t.c}">${t.icon} ${esc(t.name)}<b>${t.s}</b></div>`).join("")}</div>`; }
function fit() {
  const g = $("ccGrid"); if (!g || !ov || ov.hidden) return;
  const W = g.clientWidth, H = g.clientHeight, n = tiles.length, gap = 10; if (W < 20) return;
  let best = { s: 0, c: 1, sc: 0 };
  for (let c = 1; c <= n; c++) { const r = Math.ceil(n / c), s = Math.min((W - gap * (c - 1)) / c, (Math.max(H, 60) - gap * (r - 1)) / r); const sc = s * (n % c === 0 ? 1.18 : 1); if (sc > best.sc) best = { s, c, sc }; }
  const s = Math.floor(best.s);
  g.style.gridTemplateColumns = `repeat(${best.c}, ${s}px)`; g.style.gridAutoRows = s + "px";
  g.style.setProperty("--ns", Math.max(18, Math.floor(s * 0.42)) + "px");
}
window.addEventListener("resize", () => fit());
function paint() {
  const o = ui(); o.hidden = false; o.classList.remove("cc-board");
  const top = `<div class="cc-top"><h2>🥥 Coconut Crack</h2><button class="cc-x" type="button" data-cc="x">Close</button></div>`;
  if (!tiles.length) {
    o.innerHTML = top + `<div class="cc-card"><h3 style="margin-top:0">Set up the game</h3>
      <p>Pick a saved question set (from Live quiz), or paste your questions below. Each coconut hides a question or a surprise.</p>
      <select id="ccSet"><option value="">Choose a set…</option>${PRESETS.map((x, i) => `<option value="preset:${i}">⭐ ${esc(x.title)}</option>`).join("")}${sets.map(s => `<option value="${esc(s.id)}">${esc(s.title || "Untitled")} (${(s.qs || []).length})</option>`).join("")}</select>
      <p style="margin:10px 0 4px"><b>Or paste from Excel / Sheets</b> (columns: Question, A, B, C, D, Correct)</p>
      <textarea id="ccText" placeholder="Question\tA\tB\tC\tD\tCorrect">${esc(text)}</textarea>
      <div class="cc-row"><button class="cc-btn o" type="button" data-cc="parse">Use pasted questions</button>
      <label>Teams <select id="ccN" style="width:auto">${[2, 3, 4, 5, 6].map(n => `<option${n === nT ? " selected" : ""}>${n}</option>`).join("")}</select></label>
      <label>Points per question <select id="ccPts" style="width:auto">${[5, 10, 20].map(n => `<option${n === pts ? " selected" : ""}>${n}</option>`).join("")}</select></label></div>
      <p class="cc-msg">${esc(note)}</p><div class="cc-row"><button class="cc-btn" type="button" data-cc="start"${qs.length ? "" : " disabled"}>Start the game 🥥</button></div></div>`;
    return;
  }
  if (over) {
    const rk = teams.slice().sort((a, b) => b.s - a.s), top1 = rk[0].s, win = rk.filter(t => t.s === top1);
    o.innerHTML = top + scoreBar() + `<div class="cc-card cc-c"><div class="cc-big">🏆</div><h2 style="color:#10222b;text-shadow:none">${win.map(t => `${t.icon} ${esc(t.name)}`).join(" & ")} ${win.length > 1 ? "win" : "wins"}!</h2>
      <p>${rk.map((t, i) => `${i + 1}. ${t.icon} ${esc(t.name)}: <b>${t.s}</b>`).join("<br>")}</p><div class="cc-row" style="justify-content:center"><button class="cc-btn" type="button" data-cc="again">Play again</button><button class="cc-btn o" type="button" data-cc="new">New questions</button></div></div>`;
    return;
  }
  if (open < 0) {
    o.classList.add("cc-board");
    o.innerHTML = top + scoreBar() + `<p class="cc-pr" style="text-align:center;color:#fff;font-weight:900;font-size:clamp(18px,3vw,28px);text-shadow:0 2px 0 rgba(0,0,0,.3);margin:6px 0">${cur().icon} ${esc(cur().name)}, pick a coconut!</p>
      <div class="cc-grid" id="ccGrid">${tiles.map((t, i) => `<button class="cc-nut${t.done ? " done" : ""}" type="button" data-cc="nut" data-i="${i}"${t.done ? " disabled" : ""}>${t.done ? t.icon : t.n}</button>`).join("")}</div>`;
    requestAnimationFrame(fit); return;
  }
  const t = tiles[open], tm = cur();
  let body = "";
  if (t.k === "q" || t.k === "x2") {
    const val = t.k === "x2" ? pts * 2 : pts;
    body = `<p style="margin:0;font-weight:800">${tm.icon} ${esc(tm.name)} · <b>${val} points</b>${t.k === "x2" ? " · ⭐ DOUBLE!" : ""}</p><div class="cc-q">${esc(t.q.q)}</div>
      <div class="cc-opts">${t.q.o.map((x, i) => `<div class="cc-opt${reveal && i === t.q.c ? " ok" : ""}">${LET[i]}. ${esc(x)}</div>`).join("")}</div>
      <div class="cc-row" style="margin-top:16px">${reveal ? `<button class="cc-btn g" type="button" data-cc="right">✔ Correct (+${val})</button><button class="cc-btn r" type="button" data-cc="wrong">✘ Wrong</button>` : `<button class="cc-btn" type="button" data-cc="show">Show the answer</button>`}</div>`;
  } else if (step === "pick") {
    const verb = t.k === "steal" ? "Steal 5 points from" : "Swap scores with";
    body = `<div class="cc-big">${SUR[t.k][0]}</div><h3 class="cc-c">${verb} which team?</h3><div class="cc-pick">${teams.map((x, i) => i === turn ? "" : `<button class="cc-btn" type="button" data-cc="target" data-i="${i}" style="background:${x.c};color:#fff">${x.icon} ${esc(x.name)} (${x.s})</button>`).join("")}</div>`;
  } else if (step === "done") {
    body = `<div class="cc-big">${SUR[t.k][0]}</div><h3 class="cc-c">${esc(note)}</h3><div class="cc-row" style="justify-content:center"><button class="cc-btn" type="button" data-cc="next">Next team ➜</button></div>`;
  } else {
    const [ic, ti, de] = SUR[t.k];
    body = `<div class="cc-big">${ic}</div><h2 class="cc-c" style="color:#10222b;text-shadow:none">${ti}</h2><p class="cc-c" style="font-size:22px;font-weight:700">${esc(tm.name)}: ${de}</p><div class="cc-row" style="justify-content:center"><button class="cc-btn" type="button" data-cc="apply">OK</button></div>`;
  }
  o.innerHTML = top + scoreBar() + `<div class="cc-card">${body}</div>`;
}

function finish(t, icon, msg) { t.icon = icon; t.done = true; note = msg; step = "done"; paint(); }
function onClick(e) {
  const b = e.target.closest("[data-cc]"); if (!b) return; const a = b.dataset.cc;
  if (a === "x") { if (tiles.length && !over && !confirm("Leave the game? The scores will be lost.")) return; ov.hidden = true; tiles = []; qs = []; return; }
  if (a === "parse") { const r = parseQuiz(text); qs = r.qs; note = r.qs.length ? `${r.qs.length} question${r.qs.length === 1 ? "" : "s"} ready.` + (r.errs.length ? " " + r.errs[0] : "") : (r.errs[0] || "Paste at least one question."); return paint(); }
  if (a === "start") { build(); return paint(); }
  if (a === "again") { build(); return paint(); }
  if (a === "new") { tiles = []; qs = []; note = ""; return paint(); }
  if (a === "nut") { open = +b.dataset.i; step = ""; reveal = false; return paint(); }
  const t = tiles[open], tm = cur();
  if (a === "show") { reveal = true; return paint(); }
  if (a === "right") { const v = t.k === "x2" ? pts * 2 : pts; add(tm, v); t.done = true; t.icon = "✔"; return nextTurn(); }
  if (a === "wrong") { t.done = true; t.icon = "✘"; return nextTurn(); }
  if (a === "next") return nextTurn();
  if (a === "apply") {
    if (t.k === "bonus") { add(tm, 10); return finish(t, "🎁", `${tm.name} +10`); }
    if (t.k === "bomb") { add(tm, -5); return finish(t, "💣", `${tm.name} −5`); }
    if (t.k === "gift") { teams.forEach(x => add(x, 3)); return finish(t, "🎉", "Every team +3"); }
    step = "pick"; return paint();
  }
  if (a === "target") {
    const v = teams[+b.dataset.i];
    if (t.k === "steal") { const n = Math.min(5, v.s); v.s -= n; tm.s += n; return finish(t, "🏴‍☠️", `${tm.name} stole ${n} from ${v.name}`); }
    const x = tm.s; tm.s = v.s; v.s = x; return finish(t, "🔄", `${tm.name} and ${v.name} swapped scores`);
  }
}
export async function openCoconut() {
  ui(); note = "Loading…"; paint();
  try { const d = await getDocs(bcol("live")); sets = d.docs.map(x => ({ id: x.id, ...x.data() })).filter(x => x.kind === "set" && Array.isArray(x.qs) && x.qs.length).sort((a, b) => (b.created || 0) - (a.created || 0)); note = ""; }
  catch { sets = []; note = "Could not load saved sets. You can still paste questions."; }
  if (!tiles.length) paint();
}
