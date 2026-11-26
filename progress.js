// Students progress inside the teacher page: pick a class, then a lesson, then see each student's games and every mistake.
import { getDocs, bcol, bdoc, updateDoc, onSnapshot, query, where } from "./fb.js?v=1123x";
import { LIVE_WS, isLive } from "./liveworks.js?v=1123x";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pct = (r, w) => (r + w) ? Math.round(100 * r / (r + w)) : null;
const day = t => t ? new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
{ const st = document.createElement("style"); st.textContent = ".pg-pick{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;margin:10px 0}.pg-opt{display:grid;gap:4px;text-align:left;padding:14px;border:2px solid var(--line,#ccc);border-radius:12px;background:var(--card,#fff);color:inherit;font:inherit;cursor:pointer}.pg-opt b{font-size:18px}.pg-opt small{color:var(--muted,#666);font-size:13px}.pg-opt:hover{border-color:var(--accent,#1f5bbd)}.pg-lesson{margin:4px 0 10px}.pg-choose{border:2px solid var(--line,#ccc);border-radius:10px;padding:8px 12px;margin:8px 0}.pg-choose summary{cursor:pointer;font-weight:700}.pg-chk{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px}.pg-chk label{display:flex;gap:8px;align-items:center;padding:4px 0}"; document.head.appendChild(st); }
let wk = { works: [], subs: [], keys: new Map(), sess: [], lp: [], open: {} }, stuSid = "";
let titles = null, secOf = {}, secs = [], plays = [], openSid = "", selCls = "", selLes = "", pick = new Set(), solo = "", chooseOpen = false;

async function gameTitles() {
  if (titles) return titles;
  titles = { "ineq43-examples": "Inequalities 4.3 · Example", "ineq43-ws": "Inequalities 4.3 · Worksheet", "ineq43d2-examples": "4.3 Inequalities Day 2 · Example", "ineq43d2-ws": "4.3 Inequalities Day 2 · Worksheet", "sb42-examples": "Substitution practice · Examples", "sb42-ws": "Substitution practice · Worksheet", "eq41-examples": "8G 4.1 · Examples", "eq41-ws": "8G 4.1 · Worksheet", "ag34-examples": "8G 3.4 · Examples", "ag34-tap": "8G 3.4 · Tap the numbers", "ag34-bound": "8G 3.4 · Bound builder", "ag34-ineq": "8G 3.4 · Inequality match", "ag34-ws": "8G 3.4 · Worksheet (multiple choice)", "el42-examples": "Elimination · Examples", "el42-addsub": "Elimination · Add or subtract?", "el42-solve": "Elimination · Solve it", "el42-spot": "Elimination · Spot the mistake", "el42-ws": "Elimination · Worksheet (multiple choice)", "su42-examples": "Substitution · Worked examples", "su42-ws": "Substitution · Worksheet (multiple choice)" };
  try {   // game names come from the games page itself, so new lessons appear here without changes
    const t = await (await fetch("island9s.html", { cache: "no-cache" })).text();
    for (const m of t.matchAll(/id: '([\w-]+)', sec: '([\w-]+)', title: '([^']+)'/g)) { titles[m[1]] = m[3]; secOf[m[1]] = m[2]; }
    secs = [...t.matchAll(/\{ id: '([\w-]+)', group: '(\w+)', title: '([^']+)', date: '([^']+)'/g)].map(m => ({ id: m[1], group: m[2], title: m[3], date: m[4] }));
  } catch {}
  return titles;
}
const title = g => { if (titles && titles[g]) return titles[g]; const m = String(g).match(/^(\w+?)-(.+)$/), lw = m && LIVE_WS.find(x => x.id === m[1]); return lw ? lw.title + " · " + (m[2] === "ws" ? "Worksheet" : m[2] === "examples" ? "Examples" : (((lw.games || []).find(x => x[0] === m[2]) || [])[1] || m[2])) : g; };
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
function baseLessons(c) {
  if (/^8G$/i.test(c)) return [{ id: "eq41", title: "Exercise 4.1: solving equations (easy)", date: "", games: Object.keys(titles).filter(g => g.startsWith("eq41-")) }, { id: "ag34", title: "Unit 3.4: examples, games and worksheet", date: "", games: Object.keys(titles).filter(g => g.startsWith("ag34-")) }];
  if (/^8[BYSM]$/i.test(c)) return [...(/^8[YSM]$/i.test(c) ? [{ id: "sb42", title: "Substitution method: extra practice (Exercise 4.2)", date: "", games: ["sb42-examples", "sb42-ws"] }] : []), { id: "su42", title: "Simultaneous equations: substitution (Exercise 4.2, Day 2)", date: "", games: Object.keys(titles).filter(g => g.startsWith("su42-")) }, { id: "el42", title: "Simultaneous equations: elimination (Exercise 4.2, Day 1)", date: "", games: Object.keys(titles).filter(g => g.startsWith("el42-")) }];
  if (/^9S$/i.test(c)) return secs.map(x => ({ id: x.id, title: x.title, date: x.date, tag: x.group === "g2" ? "Level 1–2" : "Level 5", games: Object.keys(secOf).filter(g => secOf[g] === x.id) }));
  return [];
}
/* Every live worksheet started for this class (or already played) is a lesson here too, newest first, so nothing assigned is missing. */
function liveLessons(c) {
  const U = String(c).toUpperCase(), ids = new Set(kids().filter(k => k.cls.toUpperCase() === U).map(k => k.id));
  return LIVE_WS.filter(lw => isLive(lw, wk.open, c) || plays.some(p => ids.has(p.sid) && String(p.g).startsWith(lw.id + "-") && !/-cw$/.test(p.g))).map(lw => {
    const o = wk.open[lw.id] || {}, st = +o[Object.keys(o).find(k => k.toUpperCase() === U)] || 0;
    const gs = new Set([lw.id + "-examples", lw.id + "-ws", ...(lw.games || []).map(g => lw.id + "-" + g[0])]);
    plays.forEach(p => { if (ids.has(p.sid) && String(p.g).startsWith(lw.id + "-") && !/-cw$/.test(p.g)) gs.add(p.g); });
    return { id: lw.id, title: lw.title + (lw.sub ? " (" + lw.sub + ")" : ""), date: "", games: [...gs], st };
  }).sort((a, b) => b.st - a.st);
}
function lessonsFor(c) {
  const b = baseLessons(c); if (/^9S$/i.test(c)) return b;
  const have = new Set(b.map(x => x.id)), extra = liveLessons(c).filter(x => !have.has(x.id));
  return [...extra, ...b];
}
const lesObj = () => lessonsFor(selCls).find(l => l.id === selLes);
const pc = p => p === null ? "" : p >= 80 ? "hi" : p >= 50 ? "mid" : "lo";
function crumbs() {
  const l = selLes && lesObj();
  return `<div class="lg-bar noprint" style="margin:0 0 8px"><button class="ghost small" type="button" data-pg="home">Classes</button>${selCls ? `<span>›</span><button class="ghost small" type="button" data-pg="cls" data-c="${esc(selCls)}">${esc(selCls)}</button>` : ""}${l ? `<span>›</span><b>${esc(l.title)}</b>` : ""}</div>`;
}
function render() {
  if (liveCls) return liveView();
  if (workId) return workView();
  if (stuSid) return stuView();
  const b = $("pgBody");
  const head = `<h3>Students progress</h3>`;
  if (!selCls) {
    const cl = clsList();
    b.innerHTML = head + `<p class="noprint">Choose a class to follow its progress.</p>` + (cl.length ? `<div class="pg-pick">${cl.map(c => `<button type="button" class="pg-opt" data-pg="cls" data-c="${esc(c)}"><b>${esc(c)}</b><small>${inCls(c).length} student${inCls(c).length === 1 ? "" : "s"}</small></button>`).join("")}</div>` : `<p class="none">No students in these classes yet.</p>`) + `<div class="lg-bar noprint"><button class="ghost" type="button" data-pg="refresh">Refresh</button><button class="ghost" type="button" data-pg="close">Close</button></div>` + (cl.length ? xlBar("all") : "");
    return;
  }
  if (!selLes) {
    const L = lessonsFor(selCls), kidsC = inCls(selCls);
    b.innerHTML = head + crumbs() + `<p class="noprint">Choose the lesson you want to see.</p>` + (L.length ? `<div class="pg-pick">${L.map(l => {
      const gs = new Set(l.games), pl = plays.filter(p => gs.has(p.g) && kidsC.some(k => k.id === p.sid)), who = new Set(pl.map(p => p.sid)).size;
      return `<button type="button" class="pg-opt" data-pg="les" data-l="${esc(l.id)}"><b>${esc(l.title)}</b><small>${l.tag ? esc(l.tag) + " · " : ""}${l.date ? esc(l.date) + " · " : ""}${who} of ${kidsC.length} started</small></button>`; }).join("")}</div>` : `<p class="none">There are no games or lessons to follow for ${esc(selCls)} yet.</p>`) + `<div class="lg-bar noprint"><button class="ghost" type="button" data-pg="close">Close</button></div>`;
    b.insertAdjacentHTML("beforeend", workList() + stuPicker() + xlBar("cls"));
    return;
  }
  const les = lesObj(), gs = new Set(les.games), everyone = inCls(selCls), list = everyone.filter(s => solo ? s.id === solo : pick.has(s.id));
  const mine = sid => plays.filter(p => p.sid === sid && gs.has(p.g));
  const started = list.filter(s => mine(s.id).length).length, allP = list.flatMap(s => mine(s.id)), CR = allP.reduce((a, p) => a + (+p.r || 0), 0), CW = allP.reduce((a, p) => a + (+p.w || 0), 0), CP = pct(CR, CW);
  b.innerHTML = head + crumbs() + `<p class="pg-lesson"><b>${esc(les.title)}</b> · ${esc(selCls)} · ${started} of ${list.length} student${list.length === 1 ? "" : "s"} started${CP === null ? "" : ` · class average <span class="pg-pc ${pc(CP)}">${CP}%</span>`}</p>
    ${xlBar("cls")}
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
async function load() {
  await gameTitles();
  const safe = p => p.then(x => x.docs, () => []);
  const [pl, w, sb, ky, lv, lp] = await Promise.all([safe(getDocs(bcol("plays"))), safe(getDocs(bcol("work"))), safe(getDocs(bcol("subs"))), safe(getDocs(bcol("workkey"))), safe(getDocs(bcol("live"))), safe(getDocs(bcol("liveplayers")))]);
  plays = pl.map(d => ({ id: d.id, ...d.data() }));
  const all = w.map(d => ({ id: d.id, ...d.data() }));
  wk = { works: all.filter(x => !["material", "announcement", "funpark", "liveopen", "remind", "mylessons"].includes(x.kind)).sort((a, b) => (b.created || 0) - (a.created || 0)),
    subs: sb.map(d => ({ id: d.id, ...d.data() })), keys: new Map(ky.map(d => [d.id, d.data().answers || []])),
    sess: lv.map(d => ({ id: d.id, ...d.data() })).filter(x => x.kind === "session" && Array.isArray(x.qs)).sort((a, b) => (b.created || 0) - (a.created || 0)),
    lp: lp.map(d => d.data()), open: (all.find(x => x.id === "liveopen") || {}).open || {} };
}
const norm = v => String(v ?? "").trim().toLowerCase().replace(/\s+/g, "").replace(/×/g, "x").replace(/−/g, "-");
const same = (a, b) => { const x = norm(a), y = norm(b); if (!x || !y) return false; if (x === y) return true; const n = Number(x), m = Number(y); return !isNaN(n) && !isNaN(m) && Math.abs(n - m) < 1e-9; };
const when = t => t ? new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
const lwWs = lw => lw.noWs ? lw.id + "-examples" : lw.id + "-ws";


/* ---------- Live now: who is answering what, right or wrong, as it happens (only today's plays are listened to, so it stays cheap) ---------- */
let liveCls = "", liveOff = null, liveTick = 0, livePl = new Map(), liveFeed = new Map(), liveReady = false;
function stopLive() { if (liveOff) { try { liveOff(); } catch {} } liveOff = null; clearInterval(liveTick); liveTick = 0; liveCls = ""; livePl = new Map(); liveFeed = new Map(); liveReady = false; }
function startLive(c) {
  stopLive(); liveCls = c;
  const since = new Date(Date.now()); since.setHours(0, 0, 0, 0);
  liveOff = onSnapshot(query(bcol("plays"), where("u", ">", since.getTime())), snap => {
    if ($("progressModal").hidden) return stopLive();
    const first = !liveReady; liveReady = true;
    snap.docChanges().forEach(ch => {
      const d = ch.doc.data(), id = ch.doc.id;
      if (ch.type === "removed") { livePl.delete(id); return; }
      const old = livePl.get(id) || { r: 0, w: 0 }; livePl.set(id, { ...d });
      if (first || /-cw$/.test(d.g)) return;
      const a = liveFeed.get(d.sid) || []; const wrongs = (d.m || []).slice().sort((x, y) => (y.at || 0) - (x.at || 0));
      for (let i = 0; i < (+d.r || 0) - old.r; i++) a.unshift({ ok: true, g: d.g, at: Date.now() });
      for (let i = 0; i < (+d.w || 0) - old.w; i++) a.unshift({ ok: false, g: d.g, at: Date.now(), q: (wrongs[i] || {}).q, t: (wrongs[i] || {}).a });
      liveFeed.set(d.sid, a.slice(0, 14));
    });
    if (liveCls) render();
  }, () => { if (liveCls) { const b = $("pgBody"); if (b) b.insertAdjacentHTML("afterbegin", `<p class="lg-msg">Live updates stopped. Check the connection, then open Live now again.</p>`); } });
  liveTick = setInterval(() => { if ($("progressModal").hidden) return stopLive(); if (liveCls && !document.hidden) render(); }, 20000);
}
const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? "just now" : m < 60 ? m + " min ago" : Math.round(m / 60) + " h ago"; };
function liveView() {
  const b = $("pgBody"), list = inCls(liveCls), now = Date.now();
  const rows = list.map(s => {
    const ps = [...livePl.values()].filter(p => p.sid === s.id && !/-cw$/.test(p.g)).sort((x, y) => (y.u || 0) - (x.u || 0)), last = ps[0];
    const r = ps.reduce((a, p) => a + (+p.r || 0), 0), w = ps.reduce((a, p) => a + (+p.w || 0), 0), act = last && now - (last.u || 0) < 120000;
    const feed = liveFeed.get(s.id) || [], wrong = feed.filter(x => !x.ok && x.q).slice(0, 3);
    return { s, last, r, w, act, feed, wrong, pcv: pct(r, w) };
  }).sort((x, y) => (y.act - x.act) || ((y.last ? y.last.u : 0) - (x.last ? x.last.u : 0)) || x.s.name.localeCompare(y.s.name));
  const on = rows.filter(x => x.act).length;
  b.innerHTML = `<h3>Live now · ${esc(liveCls)}</h3><div class="lg-bar noprint" style="margin:0 0 8px"><button class="ghost small" type="button" data-pg="liveback">‹ ${esc(liveCls)}</button></div>
    <p class="noprint"><b>${on}</b> of ${list.length} working now. It updates by itself a moment after each answer. Right and wrong are counted for today.</p>
    <table class="lg-tbl"><thead><tr><th>Student</th><th>Now</th><th>Right</th><th>Wrong</th><th>%</th><th>Last answers (newest first)</th></tr></thead><tbody>${rows.map(x => `<tr>
      <td><b>${esc(x.s.name)}</b></td>
      <td>${x.last ? `<span style="color:${x.act ? "var(--ok)" : "var(--muted)"}">●</span> ${esc(title(x.last.g))}<br><small>${x.act ? "working now" : ago(x.last.u || 0)}</small>` : "<small>not started today</small>"}</td>
      <td>${x.r}</td><td>${x.w}</td><td>${x.pcv === null ? "" : `<b class="pg-pc ${pc(x.pcv)}">${x.pcv}%</b>`}</td>
      <td>${x.feed.length ? x.feed.map(f => `<b style="color:${f.ok ? "var(--ok)" : "var(--bad)"}">${f.ok ? "✓" : "✗"}</b>`).join(" ") : ""}${x.wrong.map(f => `<br><small>✗ ${esc(f.q)}${f.t ? " → " + esc(f.t) : ""}</small>`).join("")}</td></tr>`).join("")}</tbody></table>`;
}

/* Everything one student did, in one place: classwork and worksheets, live worksheets, live quizzes, games. */
function stuData(s) {
  const U = String(s.cls || "").toUpperCase(), out = { work: [], live: [], quiz: [], games: [] };
  wk.works.filter(w => (w.classes || []).some(c => String(c).toUpperCase() === U)).forEach(w => {
    const sub = wk.subs.find(x => x.wid === w.id && x.sid === s.id), key = wk.keys.get(w.id) || [];
    let right = null, n = 0; if (sub && sub.answers && key.length) { const m = key.map((k, i) => k ? same(sub.answers[i], k) : null); n = m.filter(x => x !== null).length; right = m.filter(x => x === true).length; }
    out.work.push({ title: w.title || "Worksheet", type: w.graded ? "Graded worksheet" : "Classwork", at: sub ? sub.at : 0, done: !!sub, right: n ? right : null, n, made: w.created || 0 });
  });
  LIVE_WS.forEach(lw => {
    const mine = id => plays.filter(p => p.sid === s.id && p.g === id).sort((a, b) => (b.u || b.t || 0) - (a.u || a.t || 0));
    const ws = mine(lwWs(lw)), ex = mine(lw.id + "-examples"), cw = mine(lw.id + "-cw");
    if (!ws.length && !ex.length && !cw.length && !isLive(lw, wk.open, s.cls)) return;
    const last = ws[0], p = last ? pct(+last.r || 0, +last.w || 0) : null;
    out.live.push({ title: lw.title, ex: ex.length > 0, ws: ws.length > 0, pct: p, tries: ws.length, at: Math.max(0, ...[ws[0], ex[0], cw[0]].filter(Boolean).map(x => x.u || x.t || 0)),
      cw: cw.some(x => x.sub) ? "Submitted" : cw.length ? "Saved, not submitted" : "" });
  });
  wk.sess.forEach(se => {
    const lp = wk.lp.find(x => x.sess === se.id && x.sid === s.id); if (!lp) return;
    const a = lp.ans || {}, ks = Object.keys(a); let right = 0, ms = 0; ks.forEach(k => { const q = se.qs[+k]; if (q && a[k].c === q.c) right++; ms += Number(a[k].ms) || 0; });
    out.quiz.push({ title: se.title || "Live quiz", at: se.created || 0, total: se.qs.length, answered: ks.length, right, avg: ks.length ? Math.round(ms / ks.length / 100) / 10 : null });
  });
  const by = statsOf(s.id); out.games = Object.keys(by).filter(g => !/-cw$/.test(g)).sort((x, y) => by[y].last - by[x].last).map(g => ({ g, ...by[g] }));
  return out;
}
const markOf = (w, sub) => { const key = wk.keys.get(w.id) || []; if (!sub || !sub.answers || !key.length) return null; const m = key.map((k, i) => k ? same(sub.answers[i], k) : null), n = m.filter(x => x !== null).length; return n ? { right: m.filter(x => x === true).length, n } : null; };
let workId = "";
const workList = () => {
  const U = String(selCls).toUpperCase(), ws = wk.works.filter(w => (w.classes || []).some(c => String(c).toUpperCase() === U)), kidsC = inCls(selCls);
  if (!ws.length) return `<h4 style="margin:18px 0 6px">Classwork and worksheets</h4><p class="none">Nothing was sent to ${esc(selCls)} yet.</p>`;
  return `<h4 style="margin:18px 0 6px">Classwork and worksheets</h4><div class="pg-pick">${ws.map(w => { const n = kidsC.filter(k => wk.subs.some(x => x.wid === w.id && x.sid === k.id)).length;
    return `<button type="button" class="pg-opt" data-pg="work" data-w="${esc(w.id)}"><b>${esc(w.title || "Worksheet")}</b><small>${w.graded ? "Graded worksheet · " : "Classwork · "}${n} of ${kidsC.length} handed in · ${esc(when(w.created))}</small></button>`; }).join("")}</div>`;
};
function workView() {
  const w = wk.works.find(x => x.id === workId); if (!w) { workId = ""; return render(); }
  const rows = inCls(selCls).map(k => { const sub = wk.subs.find(x => x.wid === w.id && x.sid === k.id); return { k, sub, mk: markOf(w, sub) }; }), done = rows.filter(r => r.sub).length, ms = rows.filter(r => r.mk);
  const avg = ms.length ? Math.round(100 * ms.reduce((a, r) => a + r.mk.right / r.mk.n, 0) / ms.length) : null;
  $("pgBody").innerHTML = `<h3>Students progress</h3><div class="lg-bar noprint" style="margin:0 0 8px"><button class="ghost small" type="button" data-pg="workback">‹ ${esc(selCls)}</button><button class="ghost small" type="button" data-pg="refresh">Refresh</button></div>
    <p class="pg-lesson"><b>${esc(w.title || "Worksheet")}</b> · ${w.graded ? "Graded worksheet" : "Classwork"} · ${done} of ${rows.length} handed in${avg === null ? "" : ` · class average ${avg}%`}</p>
    <table class="lg-tbl"><thead><tr><th>Student</th><th>Status</th><th>Handed in</th><th>Mark</th></tr></thead><tbody>${rows.sort((a, b) => (!!b.sub - !!a.sub) || a.k.name.localeCompare(b.k.name)).map(r => `<tr><td><b>${esc(r.k.name)}</b></td><td>${r.sub ? "Handed in" : "<b style='color:var(--bad)'>MISSING</b>"}</td><td>${r.sub ? esc(when(r.sub.at)) : ""}</td><td>${r.mk ? `<b class="pg-pc ${pc(Math.round(100 * r.mk.right / r.mk.n))}">${r.mk.right} / ${r.mk.n}</b>` : r.sub ? "Not marked" : ""}</td></tr>`).join("")}</tbody></table>`;
}
const stuPicker = () => `<div class="lg-bar noprint" style="margin:14px 0 0"><button class="primary" type="button" data-pg="live" data-c="${esc(selCls)}">Live now: see answers as they happen</button><button class="primary" type="button" onclick="window.__openWatch && window.__openWatch()">👀 Watch &amp; help: see his screen and draw on it</button></div><h4 style="margin:18px 0 6px">Everything one student did</h4><p class="noprint">Classwork, worksheets, live worksheets, live quizzes and games in one page.</p>
  <div class="pg-chk">${inCls(selCls).map(s => `<button type="button" class="ghost small" data-pg="stu" data-sid="${esc(s.id)}">${esc(s.name)}</button>`).join(" ")}</div>`;
function stuView() {
  const s = students.find(x => x.id === stuSid); if (!s) { stuSid = ""; return render(); }
  const D = stuData(s), b = $("pgBody");
  const missing = D.work.filter(x => !x.done).length, tbl = (h, rows, empty) => rows.length ? `<table class="lg-tbl"><thead><tr>${h.map(x => `<th>${x}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>` : `<p class="none">${empty}</p>`;
  b.innerHTML = `<h3>Students progress</h3><div class="lg-bar noprint" style="margin:0 0 8px"><button class="ghost small" type="button" data-pg="stuback">‹ ${esc(selCls || s.cls)}</button><button class="ghost small" type="button" data-pg="refresh">Refresh</button><button class="primary small" type="button" data-pg="stucsv">Download Excel file</button><button class="ghost small" type="button" data-pg="print">Print / save PDF</button></div>
    <article class="pg-card"><div class="pg-head"><div><b>${esc(s.name)}</b><small>${esc(s.cls)} ${esc(s.enrollment || "")}</small></div></div>
    <h4>Classwork and worksheets${missing ? ` <small style="color:var(--bad)">· ${missing} missing</small>` : ""}</h4>
    ${tbl(["Work", "Type", "Status", "Mark"], D.work.map(x => `<tr><td>${esc(x.title)}</td><td>${x.type}</td><td>${x.done ? "Handed in " + esc(when(x.at)) : "<b style='color:var(--bad)'>MISSING</b>"}</td><td>${x.right === null ? (x.done ? "Not marked" : "") : x.right + " / " + x.n}</td></tr>`), "No classwork was sent to this class yet.")}
    <h4>Live worksheets</h4>
    ${tbl(["Worksheet", "Examples", "Worksheet", "Tries", "Class work", "Last"], D.live.map(x => `<tr><td>${esc(x.title)}</td><td>${x.ex ? "Done" : "-"}</td><td>${x.pct === null ? "-" : `<b class="pg-pc ${pc(x.pct)}">${x.pct}%</b>`}</td><td>${x.tries || "-"}</td><td>${x.cw || "-"}</td><td>${esc(when(x.at))}</td></tr>`), "No live worksheet started for this class yet.")}
    <h4>Live quizzes and Coconut</h4>
    ${tbl(["Quiz", "Date", "Answered", "Right", "Avg. time"], D.quiz.map(x => `<tr><td>${esc(x.title)}</td><td>${esc(when(x.at))}</td><td>${x.answered} / ${x.total}</td><td>${x.right} / ${x.total}</td><td>${x.avg === null ? "-" : x.avg + " s"}</td></tr>`), "He has not joined a live quiz yet.")}
    <h4>Games</h4>
    ${tbl(["Game", "Right", "Answers", "Plays", "Last"], D.games.map(x => { const p = pct(x.r, x.w); return `<tr><td>${esc(title(x.g))}</td><td><b class="pg-pc ${pc(p)}">${p === null ? "-" : p + "%"}</b></td><td>${x.r} / ${x.r + x.w}</td><td>${x.n}</td><td>${esc(when(x.last))}</td></tr>`; }), "No games played yet.")}
    </article>`;
}
function stuCsv() {
  const s = students.find(x => x.id === stuSid); if (!s) return; const D = stuData(s), cell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [["Student", "Class", "Area", "Item", "Status", "Mark / percent", "When"]];
  D.work.forEach(x => rows.push([s.name, s.cls, x.type, x.title, x.done ? "Handed in" : "MISSING", x.right === null ? "" : x.right + "/" + x.n, x.at ? new Date(x.at).toLocaleString("en-GB") : ""]));
  D.live.forEach(x => rows.push([s.name, s.cls, "Live worksheet", x.title, (x.ex ? "Examples done. " : "") + (x.cw ? "Class work " + x.cw : ""), x.pct === null ? "" : x.pct + "%", x.at ? new Date(x.at).toLocaleString("en-GB") : ""]));
  D.quiz.forEach(x => rows.push([s.name, s.cls, "Live quiz", x.title, "Answered " + x.answered + "/" + x.total, x.right + "/" + x.total, x.at ? new Date(x.at).toLocaleString("en-GB") : ""]));
  D.games.forEach(x => rows.push([s.name, s.cls, "Game", title(x.g), x.n + " plays", (pct(x.r, x.w) ?? "") + "%", x.last ? new Date(x.last).toLocaleString("en-GB") : ""]));
  const blob = new Blob(["﻿" + rows.map(r => r.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "Progress " + s.name + ".csv"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}


/* ---------- Excel: every student's progress for one class or all classes, for a whole quarter (or all dates) ---------- */
const QUARTERS = [{ k: "Q1", from: "2026-08-30", to: "2026-10-22" }, { k: "Q2", from: "2026-11-01", to: "2027-01-28" }, { k: "Q3", from: "2027-02-01", to: "2027-03-31" }, { k: "Q4", from: "2027-04-04", to: "2027-06-24" }];
const quarterNow = () => { const t = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10); return QUARTERS.find(q => t >= q.from && t <= q.to) || QUARTERS.find(q => t < q.from) || QUARTERS[3]; };
let xlQ = "";   // "" = current quarter on first use, "ALL" = every date
const xlBar = scope => `<div class="lg-bar noprint" style="margin:14px 0 0;flex-wrap:wrap;gap:8px"><label>Period <select id="pgQ">${QUARTERS.map(q => `<option value="${q.k}" ${(xlQ || quarterNow().k) === q.k ? "selected" : ""}>${q.k} (${q.from.split("-").reverse().join("/")} – ${q.to.split("-").reverse().join("/")})</option>`).join("")}<option value="ALL" ${xlQ === "ALL" ? "selected" : ""}>All dates</option></select></label>
  <button class="primary" type="button" data-pg="xl" data-scope="${scope}">${scope === "all" ? "Download Excel: all classes" : "Download Excel: " + esc(selCls)}</button></div>`;
document.addEventListener("change", e => { if (e.target && e.target.id === "pgQ") xlQ = e.target.value; });
const loadXl = () => window.ExcelJS ? Promise.resolve() : new Promise((res, rej) => { const sc = document.createElement("script"); sc.src = "exceljs.min.js?v=1123x"; sc.onload = res; sc.onerror = () => rej(new Error("Could not load the Excel library")); document.head.appendChild(sc); });
async function xlExport(scope, btn) {
  const q = xlQ === "ALL" ? null : QUARTERS.find(x => x.k === (xlQ || quarterNow().k));
  const t0 = q ? Date.parse(q.from + "T00:00:00+03:00") : 0, t1 = q ? Date.parse(q.to + "T23:59:59.999+03:00") : Infinity, inP = t => !q || (t >= t0 && t <= t1);
  const label = q ? `${q.k} · ${q.from.split("-").reverse().join("/")} to ${q.to.split("-").reverse().join("/")}` : "All dates";
  const old = btn.textContent; btn.disabled = true; btn.textContent = "Preparing…";
  try {
    await loadXl();
    const classes = scope === "all" ? clsList() : [selCls];
    const keepP = plays, keepW = wk;
    plays = plays.filter(p => !/-cw$/.test(p.g) ? inP(p.u || p.t || 0) : inP(p.u || p.t || 0));
    wk = { ...wk, works: wk.works.filter(w => inP(w.created || 0)), sess: wk.sess.filter(x => inP(x.created || 0)) };
    const data = [];
    try {
      classes.forEach(c => inCls(c).forEach(s => {
        const D = stuData(s), mk = D.work.filter(x => x.right !== null), gm = D.work.filter(x => x.type === "Graded worksheet" && x.right !== null), cw = D.work.filter(x => x.type === "Classwork");
        const avg = a => a.length ? Math.round(100 * a.reduce((t, x) => t + x.right / x.n, 0) / a.length) : null;
        const lp = D.live.filter(x => x.pct !== null), qz = D.quiz.filter(x => x.answered), gR = D.games.reduce((t, x) => t + x.r, 0), gW = D.games.reduce((t, x) => t + x.w, 0);
        const last = Math.max(0, ...D.games.map(x => x.last), ...D.live.map(x => x.at), ...D.work.map(x => x.at), ...D.quiz.map(x => x.at));
        data.push({ c, s, D, cwDone: cw.filter(x => x.done).length, cwN: cw.length, cwAvg: avg(cw.filter(x => x.right !== null)), grAvg: avg(gm), grN: D.work.filter(x => x.type === "Graded worksheet").length,
          liveN: D.live.filter(x => x.ws).length, liveAvg: lp.length ? Math.round(lp.reduce((t, x) => t + x.pct, 0) / lp.length) : null,
          qzJoin: qz.length, qzN: D.quiz.length, qzAvg: qz.length ? Math.round(100 * qz.reduce((t, x) => t + x.right / Math.max(1, x.total), 0) / qz.length) : null,
          gAns: gR + gW, gPct: pct(gR, gW), last });
      }));
    } finally { plays = keepP; wk = keepW; }
    const wb = new ExcelJS.Workbook(); wb.creator = "Student Island"; wb.created = new Date();
    const NAVY = "FF1F3A6E", LINE = { style: "thin", color: { argb: "FFB8C2D6" } }, box = { top: LINE, left: LINE, bottom: LINE, right: LINE };
    const fillP = v => ({ type: "pattern", pattern: "solid", fgColor: { argb: v === null || v === "" ? "FFFFFFFF" : v >= 80 ? "FFC6EFCE" : v >= 50 ? "FFFFEB9C" : "FFFFC7CE" } });
    const dt = t => t ? new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
    const sheet = (name, heads, rows, pctCols, widths) => {
      const ws = wb.addWorksheet(name.slice(0, 31), { views: [{ state: "frozen", ySplit: 3, showGridLines: false }], pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 } });
      ws.mergeCells(1, 1, 1, heads.length); ws.getCell(1, 1).value = `${name} · Students progress`; ws.getCell(1, 1).font = { bold: true, size: 15, color: { argb: NAVY } };
      ws.mergeCells(2, 1, 2, heads.length); ws.getCell(2, 1).value = `Period: ${label} · prepared ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`; ws.getCell(2, 1).font = { italic: true, size: 10, color: { argb: "FF55607A" } };
      const h = ws.getRow(3); heads.forEach((x, i) => { const c = h.getCell(i + 1); c.value = x; c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } }; c.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; c.border = box; }); h.height = 34;
      rows.forEach(r => { const row = ws.addRow(r); row.eachCell({ includeEmpty: true }, (c, i) => { c.border = box; c.alignment = { horizontal: i <= 2 ? "left" : "center", vertical: "middle", wrapText: true }; if (pctCols.includes(i)) { const v = c.value; c.fill = fillP(typeof v === "number" ? v : null); if (typeof v === "number") c.numFmt = '0"%"'; } }); });
      widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
      return ws;
    };
    const H = ["#", "Student", "Classwork handed in", "Classwork mark", "Graded worksheet mark", "Live worksheets done", "Live worksheet avg", "Live quizzes joined", "Live quiz right", "Game answers", "Game right", "Last activity"];
    const rowOf = (d, i) => [i + 1, d.s.name, d.cwN ? `${d.cwDone} / ${d.cwN}` : "-", d.cwAvg, d.grN ? (d.grAvg === null ? "Not marked" : d.grAvg) : "-", d.liveN, d.liveAvg, d.qzN ? `${d.qzJoin} / ${d.qzN}` : "-", d.qzAvg, d.gAns, d.gPct, dt(d.last)];
    const W = [5, 26, 14, 12, 14, 12, 12, 12, 12, 11, 11, 20];
    if (scope === "all") {
      const avgOf = (a, k) => { const v = a.map(x => x[k]).filter(x => typeof x === "number"); return v.length ? Math.round(v.reduce((t, x) => t + x, 0) / v.length) : null; };
      sheet("All classes", ["Class", "Students", "Classwork mark", "Graded worksheet mark", "Live worksheet avg", "Live quiz right", "Game right", "Active students"],
        classes.map(c => { const a = data.filter(d => d.c === c); return [c, a.length, avgOf(a, "cwAvg"), avgOf(a, "grAvg"), avgOf(a, "liveAvg"), avgOf(a, "qzAvg"), avgOf(a, "gPct"), a.filter(d => d.last).length + " / " + a.length]; }), [3, 4, 5, 6, 7], [14, 10, 14, 16, 14, 14, 12, 14]);
    }
    classes.forEach(c => { const a = data.filter(d => d.c === c); sheet(c, H, a.map(rowOf), [4, 5, 7, 9, 11], W); });
    const det = [];
    data.forEach(d => { d.D.work.forEach(x => det.push([d.c, d.s.name, x.type, x.title, x.done ? "Handed in" : "MISSING", x.right === null ? "" : `${x.right} / ${x.n}`, dt(x.at)]));
      d.D.live.forEach(x => det.push([d.c, d.s.name, "Live worksheet", x.title, (x.ex ? "Examples done. " : "") + (x.cw ? "Class work " + x.cw : ""), x.pct === null ? "" : x.pct, dt(x.at)]));
      d.D.quiz.forEach(x => det.push([d.c, d.s.name, "Live quiz", x.title, `Answered ${x.answered} / ${x.total}`, `${x.right} / ${x.total}`, dt(x.at)]));
      d.D.games.forEach(x => det.push([d.c, d.s.name, "Game", title(x.g), `${x.n} plays · ${x.r + x.w} answers`, pct(x.r, x.w) ?? "", dt(x.last)])); });
    sheet("Details", ["Class", "Student", "Area", "Item", "Status", "Mark / % right", "When"], det, [], [8, 24, 16, 38, 28, 14, 20]);
    const buf = await wb.xlsx.writeBuffer(), a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    a.download = `Students progress ${scope === "all" ? "all classes" : selCls} ${q ? q.k : "all dates"}.xlsx`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  } catch (err) { alert("Could not make the Excel file: " + (err.message || err)); }
  btn.disabled = false; btn.textContent = old;
}
document.addEventListener("change", e => { const c = e.target.closest && e.target.closest("[data-pgchk]"); if (!c) return; if (c.checked) pick.add(c.dataset.pgchk); else pick.delete(c.dataset.pgchk); chooseOpen = true; render(); });
document.addEventListener("toggle", e => { const d = e.target; if (d.classList && d.classList.contains("pg-choose")) chooseOpen = d.open;
  if (d.classList && d.classList.contains("pg-mist")) openSid = d.open ? d.dataset.sid : ""; }, true);
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-pg]"); if (!b) return;
  const a = b.dataset.pg;
  if (a === "close") { stopLive(); $("progressModal").hidden = true; }
  if (a === "live") { startLive(b.dataset.c); render(); }
  if (a === "liveback") { stopLive(); render(); }
  if (a === "work") { workId = b.dataset.w; render(); }
  if (a === "workback") { workId = ""; render(); }
  if (a === "stu") { stuSid = b.dataset.sid; render(); }
  if (a === "stuback") { stuSid = ""; render(); }
  if (a === "stucsv") stuCsv();
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
  if (a === "xl") xlExport(b.dataset.scope, b);
  if (a === "print") { document.querySelectorAll(".pg-mist").forEach(d => d.open = true); document.body.classList.add("pg-printing"); window.print(); setTimeout(() => document.body.classList.remove("pg-printing"), 500); }
});
export async function openProgress() {
  $("progressModal").hidden = false; $("pgBody").innerHTML = "<p>Loading…</p>"; selCls = ""; selLes = ""; stuSid = ""; workId = ""; stopLive();
  try { await load(); } catch (e) { $("pgBody").innerHTML = `<p class="lg-msg">Could not load (${esc(e.code || e.message)}).</p><button class="ghost" data-pg="close">Close</button>`; return; }
  render();
}
