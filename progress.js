// Games progress (9S Island) inside the teacher page: per student, per game, and every mistake.
import { getDocs, bcol } from "./fb.js";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pct = (r, w) => (r + w) ? Math.round(100 * r / (r + w)) : null;
const day = t => t ? new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
let titles = null, plays = [], openSid = "";

async function gameTitles() {
  if (titles) return titles;
  titles = { "ag34-examples": "8G 3.4 · Examples", "ag34-tap": "8G 3.4 · Tap the numbers", "ag34-bound": "8G 3.4 · Bound builder", "ag34-ineq": "8G 3.4 · Inequality match", "ag34-ws": "8G 3.4 · Worksheet (multiple choice)", "el42-examples": "Elimination · Examples", "el42-addsub": "Elimination · Add or subtract?", "el42-solve": "Elimination · Solve it", "el42-spot": "Elimination · Spot the mistake", "el42-ws": "Elimination · Worksheet (multiple choice)" };
  try {   // game names come from the games page itself, so new lessons appear here without changes
    const t = await (await fetch("island9s.html", { cache: "no-cache" })).text();
    for (const m of t.matchAll(/id: '([\w-]+)', sec: '[\w-]+', title: '([^']+)'/g)) titles[m[1]] = m[2];
  } catch {}
  return titles;
}
const title = g => (titles && titles[g]) || g;
const kids = () => students.filter(s => /^(9S|8G|8B|8Y|8S|8M)$/i.test(s.cls)).sort((a, b) => a.name.localeCompare(b.name));

function statsOf(sid) {
  const by = {};
  plays.filter(p => p.sid === sid).forEach(p => {
    const a = by[p.g] || (by[p.g] = { r: 0, w: 0, n: 0, last: 0, lv: {} });
    a.r += +p.r || 0; a.w += +p.w || 0; a.n++; a.last = Math.max(a.last, p.u || p.t || 0);
    const L = a.lv[p.l] || (a.lv[p.l] = { r: 0, w: 0 }); L.r += +p.r || 0; L.w += +p.w || 0;
  });
  return by;
}
function render() {
  const b = $("pgBody"), list = kids();
  b.innerHTML = `<h3>Games progress</h3>
    <p class="noprint">Every time a boy plays a level in his games, it is saved here: how many he got right, and each mistake with the question.</p>
    <div class="lg-bar noprint"><button class="primary" type="button" data-pg="csv">Download Excel file</button><button class="ghost" type="button" data-pg="print">Print / save PDF</button><button class="ghost" type="button" data-pg="refresh">Refresh</button><button class="ghost" type="button" data-pg="close">Close</button></div>
    ${list.length ? list.map(s => {
      const by = statsOf(s.id), ids = Object.keys(by).sort((x, y) => by[y].last - by[x].last);
      const R = ids.reduce((a, k) => a + by[k].r, 0), W = ids.reduce((a, k) => a + by[k].w, 0), P = pct(R, W);
      const mist = plays.filter(p => p.sid === s.id).flatMap(p => (p.m || []).map(x => ({ ...x, g: p.g, l: p.l }))).sort((a, b) => b.at - a.at);
      return `<article class="pg-card">
        <div class="pg-head"><div><b>${esc(s.name)}</b><small>${esc(s.enrollment || "")}</small></div>
          <div class="pg-sum">${P === null ? "No games played yet" : `<span class="pg-pc ${P >= 80 ? "hi" : P >= 50 ? "mid" : "lo"}">${P}%</span> right · ${R} of ${R + W} answers · ${mist.length} mistake${mist.length === 1 ? "" : "s"}`}</div></div>
        ${ids.length ? `<table class="lg-tbl"><thead><tr><th>Game</th><th>Right</th><th>Answers</th><th>Levels played</th><th>Plays</th><th>Last</th></tr></thead><tbody>${ids.map(g => { const a = by[g], p = pct(a.r, a.w);
          return `<tr><td>${esc(title(g))}</td><td><b class="pg-pc ${p >= 80 ? "hi" : p >= 50 ? "mid" : "lo"}">${p}%</b></td><td>${a.r} / ${a.r + a.w}</td><td>${Object.keys(a.lv).sort((x, y) => x - y).map(l => `L${l} ${pct(a.lv[l].r, a.lv[l].w)}%`).join(" · ")}</td><td>${a.n}</td><td>${day(a.last)}</td></tr>`; }).join("")}</tbody></table>` : ""}
        ${mist.length ? `<details class="pg-mist" ${openSid === s.id ? "open" : ""} data-sid="${esc(s.id)}"><summary>Mistakes (${mist.length})</summary><table class="lg-tbl"><thead><tr><th>When</th><th>Game</th><th>Question</th><th>What he was told</th></tr></thead><tbody>${mist.map(x => `<tr><td>${day(x.at)}</td><td>${esc(title(x.g))}<br><small>Level ${x.l}</small></td><td>${esc(x.q)}</td><td>${esc(x.a)}</td></tr>`).join("")}</tbody></table></details>` : ""}
      </article>`;
    }).join("") : `<p class="none">No students in these classes yet.</p>`}`;
}
function csv() {
  const cell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [["Student", "Student ID", "Game", "Level", "Right", "Wrong", "Percent right", "Started", "Last answer", "Mistakes (question -> what he was told)"]];
  const byId = new Map(kids().map(s => [s.id, s]));
  plays.filter(p => byId.has(p.sid)).sort((a, b) => (a.t || 0) - (b.t || 0)).forEach(p => {
    const s = byId.get(p.sid);
    rows.push([s.name, s.enrollment || "", title(p.g), p.l, p.r, p.w, pct(+p.r || 0, +p.w || 0) ?? "", p.t ? new Date(p.t).toLocaleString("en-GB") : "", p.u ? new Date(p.u).toLocaleString("en-GB") : "", (p.m || []).map(x => x.q + " -> " + x.a).join(" | ")]);
  });
  const blob = new Blob(["﻿" + rows.map(r => r.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "Games progress.csv";
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
async function load() { await gameTitles(); plays = (await getDocs(bcol("plays"))).docs.map(d => ({ id: d.id, ...d.data() })); }

document.addEventListener("toggle", e => { const d = e.target; if (d.classList && d.classList.contains("pg-mist")) openSid = d.open ? d.dataset.sid : ""; }, true);
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-pg]"); if (!b) return;
  const a = b.dataset.pg;
  if (a === "close") $("progressModal").hidden = true;
  if (a === "refresh") { b.disabled = true; await load(); render(); }
  if (a === "csv") csv();
  if (a === "print") { document.querySelectorAll(".pg-mist").forEach(d => d.open = true); document.body.classList.add("pg-printing"); window.print(); setTimeout(() => document.body.classList.remove("pg-printing"), 500); }
});
export async function openProgress() {
  $("progressModal").hidden = false; $("pgBody").innerHTML = "<p>Loading…</p>";
  try { await load(); } catch (e) { $("pgBody").innerHTML = `<p class="lg-msg">Could not load (${esc(e.code || e.message)}).</p><button class="ghost" data-pg="close">Close</button>`; return; }
  render();
}
