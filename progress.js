// Students progress inside the teacher page: pick a class, then a lesson, then see each student's games and every mistake.
import { getDocs, bcol, bdoc, updateDoc } from "./fb.js?v=1112v";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pct = (r, w) => (r + w) ? Math.round(100 * r / (r + w)) : null;
const day = t => t ? new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
{ const st = document.createElement("style"); st.textContent = ".pg-pick{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;margin:10px 0}.pg-opt{display:grid;gap:4px;text-align:left;padding:14px;border:2px solid var(--line,#ccc);border-radius:12px;background:var(--card,#fff);color:inherit;font:inherit;cursor:pointer}.pg-opt b{font-size:18px}.pg-opt small{color:var(--muted,#666);font-size:13px}.pg-opt:hover{border-color:var(--accent,#1f5bbd)}.pg-lesson{margin:4px 0 10px}.pg-choose{border:2px solid var(--line,#ccc);border-radius:10px;padding:8px 12px;margin:8px 0}.pg-choose summary{cursor:pointer;font-weight:700}.pg-chk{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px}.pg-chk label{display:flex;gap:8px;align-items:center;padding:4px 0}"; document.head.appendChild(st); }
let titles = null, secOf = {}, secs = [], plays = [], openSid = "", selCls = "", selLes = "", pick = new Set(), solo = "", chooseOpen = false;

async function gameTitles() {
  if (titles) return titles;
  titles = { "sb42-examples": "Substitution practice · Examples", "sb42-ws": "Substitution practice · Worksheet", "eq41-examples": "8G 4.1 · Examples", "eq41-ws": "8G 4.1 · Worksheet", "ag34-examples": "8G 3.4 · Examples", "ag34-tap": "8G 3.4 · Tap the numbers", "ag34-bound": "8G 3.4 · Bound builder", "ag34-ineq": "8G 3.4 · Inequality match", "ag34-ws": "8G 3.4 · Worksheet (multiple choice)", "el42-examples": "Elimination · Examples", "el42-addsub": "Elimination · Add or subtract?", "el42-solve": "Elimination · Solve it", "el42-spot": "Elimination · Spot the mistake", "el42-ws": "Elimination · Worksheet (multiple choice)", "su42-examples": "Substitution · Worked examples", "su42-ws": "Substitution · Worksheet (multiple choice)" };
  try {   // game names come from the games page itself, so new lessons appear here without changes
    const t = await (await fetch("island9s.html", { cache: "no-cache" })).text();
    for (const m of t.matchAll(/id: '([\w-]+)', sec: '([\w-]+)', title: '([^']+)'/g)) { titles[m[1]] = m[3]; secOf[m[1]] = m[2]; }
    secs = [...t.matchAll(/\{ id: '([\w-]+)', group: '(\w+)', title: '([^']+)', date: '([^']+)'/g)].map(m => ({ id: m[1], group: m[2], title: m[3], date: m[4] }));
  } catch {}
  return titles;
}
const title = g => (titles && titles[g]) || g;
const kids = () => students.filter(s => /^(9S|8G|8B|8Y|8S|8M|8D)$/i.test(s.cls)).sort((a, b) => a.name.localeCompare(b.name));

function statsOf(sid) {
  const by = {};
  plays.filter(p => p.sid === sid).forEach(p => {
    const a = by[p.g] || (by[p.g] = { r: 0, w: 0, n: 0, last: 0, lv: {} });
    a.r += +p.r || 0; a.w += +p.w || 0; a.n++; a.last = Math.max(a.last, p.u || p.t || 0);
    const L = a.lv[p.l] || (a.lv[p.l] = { r: 0, w: 0 }); L.r += +p.r || 0; L.w += +p.w || 0;
  });
  return by;
}
const clsList = () => [...new Set(kids().map(s => s.cls))].sort();
const inCls = c => kids().filter(s => s.cls === c);
function lessonsFor(c) {
  if (/^8G$/i.test(c)) return [{ id: "eq41", title: "Exercise 4.1: solving equations (easy)", date: "", games: Object.keys(titles).filter(g => g.startsWith("eq41-")) }, { id: "ag34", title: "Unit 3.4: examples, games and worksheet", date: "", games: Object.keys(titles).filter(g => g.startsWith("ag34-")) }];
  if (/^8[BYSM]$/i.test(c)) return [...(/^8[YSM]$/i.test(c) ? [{ id: "sb42", title: "Substitution method: extra practice (Exercise 4.2)", date: "", games: ["sb42-examples", "sb42-ws"] }] : []), { id: "su42", title: "Simultaneous equations: substitution (Exercise 4.2, Day 2)", date: "", games: Object.keys(titles).filter(g => g.startsWith("su42-")) }, { id: "el42", title: "Simultaneous equations: elimination (Exercise 4.2, Day 1)", date: "", games: Object.keys(titles).filter(g => g.startsWith("el42-")) }];
  if (/^9S$/i.test(c)) return secs.map(x => ({ id: x.id, title: x.title, date: x.date, tag: x.group === "g2" ? "Level 1–2" : "Level 5", games: Object.keys(secOf).filter(g => secOf[g] === x.id) }));
  return [];
}
const lesObj = () => lessonsFor(selCls).find(l => l.id === selLes);
const pc = p => p === null ? "" : p >= 80 ? "hi" : p >= 50 ? "mid" : "lo";
function crumbs() {
  const l = selLes && lesObj();
  return `<div class="lg-bar noprint" style="margin:0 0 8px"><button class="ghost small" type="button" data-pg="home">Classes</button>${selCls ? `<span>›</span><button class="ghost small" type="button" data-pg="cls" data-c="${esc(selCls)}">${esc(selCls)}</button>` : ""}${l ? `<span>›</span><b>${esc(l.title)}</b>` : ""}</div>`;
}
function render() {
  const b = $("pgBody");
  const head = `<h3>Students progress</h3>`;
  if (!selCls) {
    const cl = clsList();
    b.innerHTML = head + `<p class="noprint">Choose a class to follow its progress.</p>` + (cl.length ? `<div class="pg-pick">${cl.map(c => `<button type="button" class="pg-opt" data-pg="cls" data-c="${esc(c)}"><b>${esc(c)}</b><small>${inCls(c).length} student${inCls(c).length === 1 ? "" : "s"}</small></button>`).join("")}</div>` : `<p class="none">No students in these classes yet.</p>`) + `<div class="lg-bar noprint"><button class="ghost" type="button" data-pg="refresh">Refresh</button><button class="ghost" type="button" data-pg="close">Close</button></div>`;
    return;
  }
  if (!selLes) {
    const L = lessonsFor(selCls), kidsC = inCls(selCls);
    b.innerHTML = head + crumbs() + `<p class="noprint">Choose the lesson you want to see.</p>` + (L.length ? `<div class="pg-pick">${L.map(l => {
      const gs = new Set(l.games), pl = plays.filter(p => gs.has(p.g) && kidsC.some(k => k.id === p.sid)), who = new Set(pl.map(p => p.sid)).size;
      return `<button type="button" class="pg-opt" data-pg="les" data-l="${esc(l.id)}"><b>${esc(l.title)}</b><small>${l.tag ? esc(l.tag) + " · " : ""}${l.date ? esc(l.date) + " · " : ""}${who} of ${kidsC.length} started</small></button>`; }).join("")}</div>` : `<p class="none">There are no games or lessons to follow for ${esc(selCls)} yet.</p>`) + `<div class="lg-bar noprint"><button class="ghost" type="button" data-pg="close">Close</button></div>`;
    return;
  }
  const les = lesObj(), gs = new Set(les.games), everyone = inCls(selCls), list = everyone.filter(s => solo ? s.id === solo : pick.has(s.id));
  const mine = sid => plays.filter(p => p.sid === sid && gs.has(p.g));
  const started = list.filter(s => mine(s.id).length).length, allP = list.flatMap(s => mine(s.id)), CR = allP.reduce((a, p) => a + (+p.r || 0), 0), CW = allP.reduce((a, p) => a + (+p.w || 0), 0), CP = pct(CR, CW);
  b.innerHTML = head + crumbs() + `<p class="pg-lesson"><b>${esc(les.title)}</b> · ${esc(selCls)} · ${started} of ${list.length} student${list.length === 1 ? "" : "s"} started${CP === null ? "" : ` · class average <span class="pg-pc ${pc(CP)}">${CP}%</span>`}</p>
    <details class="pg-choose noprint" ${chooseOpen ? "open" : ""}><summary>Students shown: ${list.length === everyone.length ? "all " + everyone.length : list.length + " of " + everyone.length} (tap to choose)</summary>
      <div class="lg-bar" style="margin:8px 0"><button class="ghost small" type="button" data-pg="all">Select all</button><button class="ghost small" type="button" data-pg="none">Clear</button></div>
      <div class="pg-chk">${everyone.map(s => `<label><input type="checkbox" data-pgchk="${esc(s.id)}" ${pick.has(s.id) ? "checked" : ""}> ${esc(s.name)}</label>`).join("")}</div></details>
    <div class="lg-bar noprint"><button class="primary" type="button" data-pg="csv">Download Excel file</button><button class="ghost" type="button" data-pg="print">Print / save PDF${list.length === everyone.length ? "" : " (selected)"}</button><button class="ghost" type="button" data-pg="refresh">Refresh</button><button class="ghost" type="button" data-pg="close">Close</button></div>
    ${list.length ? "" : `<p class="none">Choose at least one student above.</p>`}
    ${list.map(s => {
      const by = {}; mine(s.id).forEach(p => { const a = by[p.g] || (by[p.g] = { r: 0, w: 0, n: 0, last: 0, lv: {} }); a.r += +p.r || 0; a.w += +p.w || 0; a.n++; a.last = Math.max(a.last, p.u || p.t || 0); const L = a.lv[p.l] || (a.lv[p.l] = { r: 0, w: 0 }); L.r += +p.r || 0; L.w += +p.w || 0; });
      const ids = Object.keys(by).sort((x, y) => by[y].last - by[x].last);
      const R = ids.reduce((a, k) => a + by[k].r, 0), W = ids.reduce((a, k) => a + by[k].w, 0), P = pct(R, W);
      const mist = mine(s.id).flatMap(p => (p.m || []).map(x => ({ ...x, g: p.g, l: p.l }))).sort((a, b) => b.at - a.at);
      return `<article class="pg-card">
        <div class="pg-head"><div><b>${esc(s.name)}</b><small>${esc(s.enrollment || "")}</small></div>
          <div class="pg-sum noprint">${(() => { const wg = les.id + "-ws", last = Math.max(0, ...plays.filter(p => p.sid === s.id && p.g === wg).map(p => p.u || p.t || 0)); return gs.has(wg) && last > ((s.rt || {})[wg] || 0) ? `<button class="primary small" type="button" data-pg="retake" data-sid="${esc(s.id)}" data-g="${wg}">Allow another worksheet attempt</button> ` : (gs.has(wg) && (s.rt || {})[wg] ? `<small>Another attempt allowed</small> ` : ""); })()}<button class="ghost small" type="button" data-pg="one" data-sid="${esc(s.id)}">Print this student</button></div><div class="pg-sum">${P === null ? "Not started" : `<span class="pg-pc ${pc(P)}">${P}%</span> right · ${R} of ${R + W} answers · ${mist.length} mistake${mist.length === 1 ? "" : "s"}`}</div></div>
        ${ids.length ? `<table class="lg-tbl"><thead><tr><th>Game</th><th>Right</th><th>Answers</th><th>Levels played</th><th>Plays</th><th>Last</th></tr></thead><tbody>${ids.map(g => { const a = by[g], p = pct(a.r, a.w);
          return `<tr><td>${esc(title(g))}</td><td><b class="pg-pc ${pc(p)}">${p}%</b></td><td>${a.r} / ${a.r + a.w}</td><td>${Object.keys(a.lv).sort((x, y) => x - y).map(l => `L${l} ${pct(a.lv[l].r, a.lv[l].w)}%`).join(" · ")}</td><td>${a.n}</td><td>${day(a.last)}</td></tr>`; }).join("")}</tbody></table>` : ""}
        ${mist.length ? `<details class="pg-mist" ${openSid === s.id ? "open" : ""} data-sid="${esc(s.id)}"><summary>Mistakes (${mist.length})</summary><table class="lg-tbl"><thead><tr><th>When</th><th>Game</th><th>Question</th><th>What he was told</th></tr></thead><tbody>${mist.map(x => `<tr><td>${day(x.at)}</td><td>${esc(title(x.g))}<br><small>Level ${x.l}</small></td><td>${esc(x.q)}</td><td>${esc(x.a)}</td></tr>`).join("")}</tbody></table></details>` : ""}
      </article>`;
    }).join("")}`;
}
function csv() {
  const cell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [["Student", "Student ID", "Game", "Level", "Right", "Wrong", "Percent right", "Started", "Last answer", "Mistakes (question -> what he was told)"]];
  const byId = new Map(inCls(selCls).filter(s => solo ? s.id === solo : pick.has(s.id)).map(s => [s.id, s])), gs = new Set((lesObj() || { games: [] }).games);
  plays.filter(p => byId.has(p.sid) && gs.has(p.g)).sort((a, b) => (a.t || 0) - (b.t || 0)).forEach(p => {
    const s = byId.get(p.sid);
    rows.push([s.name, s.enrollment || "", title(p.g), p.l, p.r, p.w, pct(+p.r || 0, +p.w || 0) ?? "", p.t ? new Date(p.t).toLocaleString("en-GB") : "", p.u ? new Date(p.u).toLocaleString("en-GB") : "", (p.m || []).map(x => x.q + " -> " + x.a).join(" | ")]);
  });
  const blob = new Blob(["﻿" + rows.map(r => r.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "Students progress " + selCls + " " + ((lesObj() || {}).title || "") + ".csv";
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
async function load() { await gameTitles(); plays = (await getDocs(bcol("plays"))).docs.map(d => ({ id: d.id, ...d.data() })); }

document.addEventListener("change", e => { const c = e.target.closest && e.target.closest("[data-pgchk]"); if (!c) return; if (c.checked) pick.add(c.dataset.pgchk); else pick.delete(c.dataset.pgchk); chooseOpen = true; render(); });
document.addEventListener("toggle", e => { const d = e.target; if (d.classList && d.classList.contains("pg-choose")) chooseOpen = d.open;
  if (d.classList && d.classList.contains("pg-mist")) openSid = d.open ? d.dataset.sid : ""; }, true);
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-pg]"); if (!b) return;
  const a = b.dataset.pg;
  if (a === "close") $("progressModal").hidden = true;
  if (a === "home") { selCls = ""; selLes = ""; render(); }
  if (a === "cls") { selCls = b.dataset.c; selLes = ""; pick = new Set(inCls(selCls).map(s => s.id)); solo = ""; render(); const L = lessonsFor(selCls); if (L.length === 1) { selLes = L[0].id; render(); } }
  if (a === "retake") {
    const st = students.find(x => x.id === b.dataset.sid); if (!st) return;
    if (!confirm("Let " + st.name + " do the worksheet again? His first result stays in the progress list.")) return;
    b.disabled = true;
    try { const rt = { ...(st.rt || {}), [b.dataset.g]: Date.now() }; await updateDoc(bdoc("students", st.id), { rt }); st.rt = rt; render(); }
    catch (err) { b.disabled = false; alert("Could not save: " + (err.code || err.message)); }
  }
  if (a === "all") { pick = new Set(inCls(selCls).map(s => s.id)); chooseOpen = true; render(); }
  if (a === "none") { pick = new Set(); chooseOpen = true; render(); }
  if (a === "one") { solo = b.dataset.sid; render(); document.body.classList.add("pg-printing"); window.print(); setTimeout(() => { document.body.classList.remove("pg-printing"); solo = ""; render(); }, 500); return; }
  if (a === "les") { selLes = b.dataset.l; render(); }
  if (a === "refresh") { b.disabled = true; await load(); render(); }
  if (a === "csv") csv();
  if (a === "print") { document.querySelectorAll(".pg-mist").forEach(d => d.open = true); document.body.classList.add("pg-printing"); window.print(); setTimeout(() => document.body.classList.remove("pg-printing"), 500); }
});
export async function openProgress() {
  $("progressModal").hidden = false; $("pgBody").innerHTML = "<p>Loading…</p>"; selCls = ""; selLes = "";
  try { await load(); } catch (e) { $("pgBody").innerHTML = `<p class="lg-msg">Could not load (${esc(e.code || e.message)}).</p><button class="ghost" data-pg="close">Close</button>`; return; }
  render();
}
