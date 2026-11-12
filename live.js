// Teacher side: Live quiz (a Kahoot-style game). The teacher builds or imports questions, opens a lobby, students join from their own
// page, then every question is shown to all of them at the same time. After each question: the right answer and the ranking.
// Data: <base>/live/<id>  kind "set" (saved questions) or "session" (a running game);  <base>/liveplayers/<session>_<sid>  one per joined student.
import { getDocs, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, bcol, bdoc } from "./fb.js?v=1111i";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const COL = ["#e0443e", "#2f6fe0", "#e5a50a", "#1f9d55"], SHAPE = ["▲", "◆", "●", "■"], LET = ["A", "B", "C", "D"];
const GRACE = 1300;   // after the time is up, wait a moment so the last answers arrive

let sets = [], sessions = [], view = "home", draft = null, msg = "", S = null, players = [], offPl = null, tick = null, busy = false, endedBy = "", xpGiven = false, xp3 = [30, 20, 10];

const modal = document.createElement("div");
modal.className = "modal"; modal.id = "liveModal"; modal.hidden = true;
modal.innerHTML = '<div class="sheet lv-sheet" role="dialog" aria-modal="true" aria-label="Live quiz"><div id="lvBody"></div></div>';
document.body.appendChild(modal);
{ const st = document.createElement("style"); st.textContent = `
#liveModal .lv-sheet{width:min(1100px,100%);max-height:96vh;overflow:auto}
.lv-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:8px 0}.lv-in{padding:9px 11px;border:1.5px solid var(--line,#cdd5e3);border-radius:10px;font:inherit;background:#fff;color:inherit}
.lv-ta{width:100%;min-height:130px;box-sizing:border-box;padding:10px;border:1.5px solid var(--line,#cdd5e3);border-radius:10px;font:13px/1.4 ui-monospace,Menlo,monospace}
.lv-card{padding:12px 14px;border:1px solid var(--line,#dde);border-radius:12px;margin:8px 0;background:var(--card,#fff)}
.lv-cls{display:flex;flex-wrap:wrap;gap:8px 14px;margin:6px 0}.lv-cls label{display:flex;gap:5px;align-items:center}
.lv-big{font-size:clamp(22px,4.2vw,40px);font-weight:800;line-height:1.2;margin:10px 0}
.lv-opts{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}
.lv-opt{display:flex;align-items:center;gap:10px;padding:16px 14px;border-radius:14px;color:#fff;font-weight:700;font-size:clamp(16px,2.6vw,24px);min-height:64px}
.lv-opt i{font-style:normal;font-size:1.3em}.lv-opt.dim{opacity:.35}.lv-opt b{margin-left:auto;font-size:1.2em}
.lv-timer{height:12px;border-radius:8px;background:#dfe6f4;overflow:hidden}.lv-timer i{display:block;height:100%;background:#2f6fe0;transition:width .25s linear}
.lv-count{font-size:clamp(34px,7vw,72px);font-weight:900;color:#1f3d8f}
.lv-pl{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}.lv-pl span{padding:7px 12px;border-radius:999px;background:#eaf1ff;font-weight:700}
.lv-rank{display:grid;grid-template-columns:2.2em 1fr auto auto;gap:8px;align-items:center;padding:8px 12px;border-radius:12px;background:#f3f6fd;margin:6px 0;font-weight:700}
.lv-rank:nth-child(1){background:#fff1b8}.lv-rank small{font-weight:600;color:#3a8a4f}.lv-rank .no{color:#c0392b}
.lv-msg{min-height:1.3em;color:#b3261e;font-weight:600}.lv-bar{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:12px}
.lv-pod{display:flex;gap:14px;align-items:flex-end;justify-content:center;margin:20px 0 6px;min-height:290px}
.lv-pod>div{width:min(30%,210px);text-align:center}.lv-pod .nm{font-weight:800;font-size:clamp(14px,2.4vw,22px);opacity:0;animation:lvfade .5s forwards}
.lv-pod .bl{border-radius:14px 14px 0 0;color:#fff;font-weight:900;font-size:clamp(30px,6vw,56px);display:flex;align-items:flex-start;justify-content:center;padding-top:10px;transform-origin:bottom;transform:scaleY(0);animation:lvrise .8s cubic-bezier(.2,.9,.3,1.2) forwards}
.lv-pod .sc{font-weight:700;opacity:0;animation:lvfade .5s forwards}
.lv-pod .p3 .bl{height:100px;background:#b3733a;animation-delay:.2s}.lv-pod .p3 .nm,.lv-pod .p3 .sc{animation-delay:.9s}
.lv-pod .p2 .bl{height:150px;background:#8e9aa8;animation-delay:1.5s}.lv-pod .p2 .nm,.lv-pod .p2 .sc{animation-delay:2.2s}
.lv-pod .p1 .bl{height:210px;background:#e5a50a;animation-delay:2.8s}.lv-pod .p1 .nm,.lv-pod .p1 .sc{animation-delay:3.5s}
.lv-conf{position:fixed;inset:0;pointer-events:none;z-index:50;overflow:hidden}.lv-conf i{position:absolute;top:-20px;width:10px;height:16px;opacity:0;animation:lvfall 3.2s ease-in forwards}
@keyframes lvrise{to{transform:scaleY(1)}}@keyframes lvfade{to{opacity:1}}@keyframes lvfall{10%{opacity:1}to{transform:translateY(105vh) rotate(540deg);opacity:1}}
@media(max-width:620px){.lv-opts{grid-template-columns:1fr}}`; document.head.appendChild(st); }

/* ---------- reading questions from pasted cells, CSV or Excel ---------- */
function cells(text) {
  text = String(text || "").replace(/\r/g, ""); const first = text.split("\n")[0] || ""; const d = first.includes("\t") ? "\t" : ",";
  const out = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"' && cur === "") q = true;
    else if (ch === d) { row.push(cur); cur = ""; }
    else if (ch === "\n") { row.push(cur); out.push(row); row = []; cur = ""; }
    else cur += ch;
  }
  row.push(cur); out.push(row);
  return out.map(r => r.map(c => c.trim())).filter(r => r.some(c => c));
}
export function parseQuiz(text) {
  const R = cells(text), qs = [], errs = [];
  if (!R.length) return { qs, errs };
  let ix = { q: 0, o: [1, 2, 3, 4], c: 5, t: 6 }, from = 0;
  if (/question/i.test(R[0][0] || "") || R[0].some(c => /^correct$/i.test(c))) {
    const h = R[0], f = re => h.findIndex(c => re.test(c)); from = 1;
    const o = LET.map(l => f(new RegExp("^(option\\s*|choice\\s*)?" + l + "$", "i")));
    ix = { q: Math.max(0, f(/^q/i)), o: o.map((x, i) => x < 0 ? i + 1 : x), c: f(/correct|answer|key|right/i), t: f(/time|sec/i) };
    if (ix.c < 0) ix.c = 5;
  }
  R.slice(from).forEach((r, n) => {
    const line = n + 1 + from, text = r[ix.q] || ""; if (!text) return;
    const raw = ix.o.map(i => r[i] || ""), keep = raw.map((v, i) => v ? i : -1).filter(i => i >= 0);
    if (keep.length < 2) { errs.push(`Row ${line}: needs at least two answers.`); return; }
    const cr = String(r[ix.c] || "").trim(); let ci = -1;
    if (/^[A-Da-d]$/.test(cr)) ci = cr.toUpperCase().charCodeAt(0) - 65;
    else if (/^[1-4]$/.test(cr)) ci = Number(cr) - 1;
    else if (cr) ci = raw.findIndex(v => v && v.toLowerCase() === cr.toLowerCase());
    if (ci < 0 || !raw[ci]) { errs.push(`Row ${line}: the Correct column must be A, B, C or D and point to a filled answer.`); return; }
    const t = Number(r[ix.t]); qs.push({ q: text, o: keep.map(i => raw[i]), c: keep.indexOf(ci), t: t >= 5 && t <= 180 ? Math.round(t) : null });
  });
  if (qs.length > 60) { errs.push("Only the first 60 questions are used."); qs.length = 60; }
  return { qs, errs };
}
const TEMPLATE = "Question,A,B,C,D,Correct,Time\n2x + 3 = 11. What is x?,3,4,5,6,B,20\n3(x + 1) = 12. What is x?,2,3,4,5,B,25\nWhat is 7 × 8?,54,56,58,64,B,\n";

/* ---------- loading and small helpers ---------- */
const stuOf = id => (typeof students !== "undefined" ? students : []).find(s => s.id === id);
async function load() {
  const d = await getDocs(bcol("live"));
  const all = d.docs.map(x => ({ id: x.id, ...x.data() }));
  sets = all.filter(x => x.kind === "set").sort((a, b) => (b.created || 0) - (a.created || 0));
  sessions = all.filter(x => x.kind === "session").sort((a, b) => (b.created || 0) - (a.created || 0));
}
const wait = ms => new Promise(r => setTimeout(r, ms));
const durOf = i => (S.qs[i] && S.qs[i].t) || S.dur || 20;

/* ---------- screens ---------- */
function draw() {
  const b = $("lvBody"); if (!b) return;
  const foot = (extra = "") => `<p class="lv-msg" id="lvMsg">${esc(msg)}</p><div class="lv-bar">${extra}<button class="ghost" type="button" data-lv="close">Close</button></div>`;
  if (view === "home") {
    const live = sessions.filter(s => s.status !== "end");
    b.innerHTML = `<h3>Live quiz</h3><p>Students join from their own page. When you press Start, every question appears for all of them at once, and you see who answers first and who is right.</p>
      <div class="lv-row"><button class="primary" type="button" data-lv="new">New quiz</button></div>
      ${live.length ? `<h4>Running now</h4>${live.map(s => `<div class="lv-card lv-row"><b>${esc(s.title)}</b><small>${(s.cls || []).join(", ")}</small><button class="primary small" type="button" data-lv="resume" data-id="${s.id}">Open</button><button class="ghost small" type="button" data-lv="delsess" data-id="${s.id}">Delete</button></div>`).join("")}` : ""}
      <h4>My saved quizzes</h4>${sets.length ? sets.map(s => `<div class="lv-card lv-row"><b>${esc(s.title)}</b><small>${s.qs.length} questions · ${s.dur || 20} s</small><span style="flex:1"></span><button class="primary small" type="button" data-lv="startset" data-id="${s.id}">Start</button><button class="ghost small" type="button" data-lv="delset" data-id="${s.id}">Delete</button></div>`).join("") : `<p class="none">No saved quizzes yet. Press New quiz.</p>`}` + foot();
    return;
  }
  if (view === "build") {
    const pv = draft.parsed;
    b.innerHTML = `<h3>${draft.setId ? "Start this quiz" : "New quiz"}</h3>
      <div class="lv-row"><input class="lv-in" id="lvTitle" placeholder="Quiz name, for example 4.1 Solving equations" maxlength="80" value="${esc(draft.title)}" style="flex:1;min-width:220px"><label>Seconds per question <input class="lv-in" id="lvDur" type="number" min="5" max="180" value="${draft.dur}" style="width:80px"></label></div>
      <div><b>Play with:</b><div class="lv-cls">${(typeof CLASSES !== "undefined" ? CLASSES : []).map(c => `<label><input type="checkbox" data-lvcls="${esc(c)}"${draft.cls.includes(c) ? " checked" : ""}> ${esc(c)}</label>`).join("")}</div></div>
      ${draft.setId ? "" : `<div class="lv-card"><b>Questions</b><p style="margin:4px 0">Columns: <code>Question, A, B, C, D, Correct, Time</code>. Correct is the letter. Time is optional.</p>
        <textarea class="lv-ta" id="lvText" placeholder="Paste the cells from Excel or Google Sheets here">${esc(draft.text)}</textarea>
        <div class="lv-row"><label class="ghost small" style="cursor:pointer;padding:8px 12px;border:1.5px solid var(--line,#cdd5e3);border-radius:10px">Upload Excel or CSV<input id="lvFile" type="file" accept=".csv,.txt,.xlsx,.xls" hidden></label>
        <input class="lv-in" id="lvLink" placeholder="or paste a Google Sheet link" style="flex:1;min-width:200px"><button class="ghost small" type="button" data-lv="link">Load link</button><button class="ghost small" type="button" data-lv="tpl">Download template</button></div></div>`}
      <div id="lvPrev">${prevHtml(pv)}</div>` + foot(`<button class="primary" type="button" data-lv="open"${busy ? " disabled" : ""}>Open the lobby</button>`);
    return;
  }
  if (!S) { view = "home"; return draw(); }
  const n = players.length, qn = S.qs.length;
  if (S.status === "lobby") {
    b.innerHTML = `<h3>${esc(S.title)}</h3><p>Classes: <b>${S.cls.join(", ")}</b>. Ask the students to open their Math Island page. A Live quiz button appears for them.</p>
      <div class="lv-count">${n}</div><p style="margin-top:-8px">joined</p><div class="lv-pl">${players.map(p => `<span>${esc(p.name)}</span>`).join("") || "<small>Waiting for students…</small>"}</div>` + foot(`<button class="ghost" type="button" data-lv="end">Cancel quiz</button><button class="primary" type="button" data-lv="start"${n ? "" : " disabled"}>Start the game</button>`);
    return;
  }
  if (S.status === "q") {
    const q = S.qs[S.qi], ans = players.filter(p => p.ans && p.ans[S.qi]).length;
    b.innerHTML = `<small>Question ${S.qi + 1} of ${qn}</small><div class="lv-big">${esc(q.q)}</div>
      <div class="lv-timer"><i id="lvTb" style="width:100%"></i></div><div class="lv-row"><div class="lv-count" id="lvLeft">${durOf(S.qi)}</div><span style="flex:1"></span><b id="lvAns">${ans} of ${n} answered</b></div>
      <div class="lv-opts">${q.o.map((o, i) => `<div class="lv-opt" style="background:${COL[i]}"><i>${SHAPE[i]}</i>${esc(o)}</div>`).join("")}</div>` + foot(`<button class="primary" type="button" data-lv="skip">Show the answer now</button>`);
    return;
  }
  if (S.status === "result") {
    const q = S.qs[S.qi], last = S.qi >= qn - 1, cn = S.counts || [];
    b.innerHTML = `<small>Question ${S.qi + 1} of ${qn} · ${esc(q.q)}</small>
      <div class="lv-opts">${q.o.map((o, i) => `<div class="lv-opt${i === q.c ? "" : " dim"}" style="background:${COL[i]}"><i>${SHAPE[i]}</i>${esc(o)}${i === q.c ? " ✓" : ""}<b>${cn[i] || 0}</b></div>`).join("")}</div>
      <h4>Ranking</h4>${rankHtml(8)}` + foot(`<button class="primary" type="button" data-lv="next">${last ? "Finish and show the winners" : "Next question"}</button>`);
    return;
  }
  // end: winners
  const top = (S.board || []).slice(0, 3);
  b.innerHTML = `<h3 style="text-align:center">${esc(S.title)}</h3><div class="lv-pod">${[2, 1, 0].map(i => top[i] ? `<div class="p${i + 1}"><div class="nm">${esc(top[i].name)}</div><div class="bl">${i + 1}</div><div class="sc">${top[i].score} points</div></div>` : "").join("")}</div>
    <h4>All players</h4>${rankHtml(40)}
    <div class="lv-card"><b>Give XP to the winners</b><div class="lv-row">${xp3.map((v, i) => `<label>${i + 1}${["st", "nd", "rd"][i]} <input class="lv-in" data-lvxp="${i}" type="number" min="0" max="500" value="${v}" style="width:80px"></label>`).join("")}<button class="primary small" type="button" data-lv="xp"${xpGiven || !top.length ? " disabled" : ""}>${xpGiven ? "XP given ✓" : "Give XP"}</button></div></div>` + foot();
  if (!b.dataset.conf) { b.dataset.conf = "1"; setTimeout(confetti, 3600); }
}
const prevHtml = pv => !pv ? "" : pv.qs.length || pv.errs.length ? `<div class="lv-card"><b>${pv.qs.length} question${pv.qs.length === 1 ? "" : "s"} ready</b>${pv.qs.slice(0, 3).map(q => `<div><small>${esc(q.q)} — answer: ${esc(q.o[q.c])}</small></div>`).join("")}${pv.errs.map(e => `<div class="lv-msg">${esc(e)}</div>`).join("")}</div>` : "";
function rankHtml(max) {
  const bd = S.board || []; if (!bd.length) return "<p class='none'>No answers yet.</p>";
  return bd.slice(0, max).map((r, i) => `<div class="lv-rank"><span>${i + 1}</span><span>${esc(r.name)}</span><small class="${r.gain ? "" : "no"}">${r.gain ? "+" + r.gain : "0"}</small><span>${r.score}</span></div>`).join("");
}
function confetti() {
  const w = document.createElement("div"); w.className = "lv-conf";
  w.innerHTML = Array.from({ length: 60 }, () => `<i style="left:${Math.random() * 100}%;background:${COL[Math.floor(Math.random() * 4)]};animation-delay:${(Math.random() * 1.2).toFixed(2)}s"></i>`).join("");
  document.body.appendChild(w); setTimeout(() => w.remove(), 5200);
}

/* ---------- running the game ---------- */
function watchPlayers() {
  if (offPl) offPl(); offPl = null; if (!S) return;
  offPl = onSnapshot(query(bcol("liveplayers"), where("sess", "==", S.id)), snap => {
    players = snap.docs.map(d => d.data()).sort((a, b) => (a.joined || 0) - (b.joined || 0));
    if (S.status === "lobby") draw();
    if (S.status === "q") {
      const ans = players.filter(p => p.ans && p.ans[S.qi]).length, el = $("lvAns"); if (el) el.textContent = `${ans} of ${players.length} answered`;
      if (players.length && ans >= players.length && !busy) setTimeout(() => { if (S && S.status === "q") endQ(true); }, 700);
    }
  }, () => {});
}
async function saveS(patch) { Object.assign(S, patch); try { await updateDoc(bdoc("live", S.id), patch); } catch (e) { msg = "Could not save. Check your internet."; } }
async function goQ(i) {
  clearInterval(tick); busy = false;
  await saveS({ status: "q", qi: i, seq: Date.now(), counts: [], endedAt: 0 });
  S.deadline = Date.now() + durOf(i) * 1000; msg = ""; draw();
  tick = setInterval(() => {
    if (!S || S.status !== "q") return clearInterval(tick);
    const left = Math.max(0, (S.deadline - Date.now()) / 1000), el = $("lvLeft"), tb = $("lvTb");
    if (el) el.textContent = Math.ceil(left); if (tb) tb.style.width = (100 * left / durOf(S.qi)) + "%";
    if (left <= 0) { clearInterval(tick); endQ(false); }
  }, 250);
}
async function endQ(early) {
  if (busy || !S || S.status !== "q") return; busy = true; clearInterval(tick);
  if (!early) await wait(GRACE);
  let list = players;
  try { const s = await getDocs(query(bcol("liveplayers"), where("sess", "==", S.id))); list = s.docs.map(d => d.data()); } catch {}
  const q = S.qs[S.qi], total = durOf(S.qi) * 1000, counts = q.o.map(() => 0), prev = new Map((S.board || []).map(r => [r.sid, r]));
  const rows = list.map(p => {
    const a = p.ans && p.ans[S.qi], old = prev.get(p.sid) || { score: 0, right: 0 }; let gain = 0, right = old.right || 0;
    if (a && Number.isInteger(a.c) && a.c >= 0 && a.c < counts.length) {
      counts[a.c]++;
      if (a.c === q.c) { const ms = Math.min(total, Math.max(0, Number(a.ms) || 0)); gain = Math.round(1000 * (1 - (ms / total) / 2)); right++; }
    }
    return { sid: p.sid, name: p.name, score: (old.score || 0) + gain, gain, right };
  }).sort((a, b) => b.score - a.score || b.right - a.right || String(a.name).localeCompare(String(b.name)));
  await saveS({ status: "result", counts, board: rows });
  busy = false; draw();
}
async function finish() {
  clearInterval(tick); await saveS({ status: "end", endedAt: Date.now() }); xpGiven = false; draw();
}
async function giveXp() {
  const top = (S.board || []).slice(0, 3); let n = 0;
  top.forEach((r, i) => {
    const xp = Number(xp3[i]) || 0, st = stuOf(r.sid); if (!xp || !st) return;
    st.xp += xp; st.log = st.log.concat([{ title: `Live quiz: ${i + 1}${["st", "nd", "rd"][i]} place`, xp, kind: "pos", at: new Date().toISOString() }]);
    try { save(st); n++; } catch {}
  });
  try { render(); toast(`XP given to ${n} student${n === 1 ? "" : "s"}.`); } catch {}
  xpGiven = true; draw();
}

/* ---------- opening a session ---------- */
async function createSession(title, qs, dur, cls) {
  const id = "s" + Date.now().toString(36);
  const doc = { kind: "session", title, qs, dur, cls, status: "lobby", qi: -1, board: [], counts: [], seq: Date.now(), created: Date.now(), endedAt: 0 };
  await setDoc(bdoc("live", id), doc);
  S = { id, ...doc }; players = []; xpGiven = false; const b = $("lvBody"); if (b) delete b.dataset.conf;
  watchPlayers(); view = "run"; draw();
}
function openSession(s) {
  S = { ...s }; players = []; xpGiven = false; const b = $("lvBody"); if (b) delete b.dataset.conf; watchPlayers(); view = "run";
  if (S.status === "q") goQ(S.qi); else draw();
}

/* ---------- events ---------- */
const syncDraft = () => {
  if (!draft) return;
  const t = $("lvTitle"), d = $("lvDur"), x = $("lvText");
  if (t) draft.title = t.value; if (d) draft.dur = Math.max(5, Math.min(180, Number(d.value) || 20)); if (x) draft.text = x.value;
};
async function readFile(f) {
  const name = f.name.toLowerCase();
  if (/\.(csv|txt)$/.test(name)) return f.text();
  if (!window.XLSX) await new Promise((ok, no) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  const wb = window.XLSX.read(await f.arrayBuffer()), ws = wb.Sheets[wb.SheetNames[0]];
  return window.XLSX.utils.sheet_to_csv(ws);
}
modal.addEventListener("change", async e => {
  const t = e.target;
  if (t.dataset && t.dataset.lvcls) { const c = t.dataset.lvcls; draft.cls = t.checked ? [...new Set([...draft.cls, c])] : draft.cls.filter(x => x !== c); return; }
  if (t.dataset && t.dataset.lvxp !== undefined) { xp3[Number(t.dataset.lvxp)] = Number(t.value) || 0; return; }
  if (t.id === "lvFile" && t.files[0]) {
    try { draft.text = await readFile(t.files[0]); syncDraftKeep(); } catch { msg = "Could not read that file here. Save it as CSV, or paste the cells."; draw(); }
  }
});
function syncDraftKeep() { draft.parsed = parseQuiz(draft.text); msg = ""; draw(); }
modal.addEventListener("input", e => {
  if (e.target.id === "lvText") { draft.text = e.target.value; draft.parsed = parseQuiz(draft.text); const p = $("lvPrev"); if (p) p.innerHTML = prevHtml(draft.parsed); }
});
modal.addEventListener("click", async e => {
  const b = e.target.closest("[data-lv]"); if (!b) return; const a = b.dataset.lv, id = b.dataset.id;
  if (a === "close") { modal.hidden = true; return; }
  if (a === "new") { draft = { setId: "", title: "", dur: 20, text: "", cls: [], parsed: null }; msg = ""; view = "build"; return draw(); }
  if (a === "startset") { const s = sets.find(x => x.id === id); draft = { setId: id, title: s.title, dur: s.dur || 20, text: "", cls: [], parsed: { qs: s.qs, errs: [] } }; msg = ""; view = "build"; return draw(); }
  if (a === "delset") { if (!confirm("Delete this saved quiz?")) return; await deleteDoc(bdoc("live", id)); await load(); return draw(); }
  if (a === "delsess") { if (!confirm("Delete this running quiz?")) return; await deleteDoc(bdoc("live", id)); await load(); return draw(); }
  if (a === "resume") { const s = sessions.find(x => x.id === id); return openSession(s); }
  if (a === "tpl") { const url = URL.createObjectURL(new Blob([TEMPLATE], { type: "text/csv" })), l = document.createElement("a"); l.href = url; l.download = "live-quiz-template.csv"; document.body.appendChild(l); l.click(); l.remove(); return; }
  if (a === "link") {
    syncDraft(); const v = ($("lvLink") || {}).value || "", m = v.match(/\/d\/([\w-]+)/); if (!m) { msg = "Paste the full Google Sheet link."; return draw(); }
    try { const r = await fetch(`https://docs.google.com/spreadsheets/d/${m[1]}/gviz/tq?tqx=out:csv`); if (!r.ok) throw 0; draft.text = await r.text(); syncDraftKeep(); }
    catch { msg = "Could not read the sheet. Share it as Anyone with the link can view, or paste the cells instead."; draw(); }
    return;
  }
  if (a === "open") {
    syncDraft(); const qs = draft.parsed && draft.parsed.qs || [];
    if (!draft.title.trim()) { msg = "Give the quiz a name."; return draw(); }
    if (!qs.length) { msg = "Add at least one question."; return draw(); }
    if (!draft.cls.length) { msg = "Choose at least one class."; return draw(); }
    busy = true; draw();
    try {
      if (!draft.setId) await setDoc(bdoc("live", "q" + Date.now().toString(36)), { kind: "set", title: draft.title.trim(), qs, dur: draft.dur, cls: [], created: Date.now() });
      await createSession(draft.title.trim(), qs, draft.dur, draft.cls); await load();
    } catch { msg = "Could not open the quiz. Check your internet."; view = "build"; }
    busy = false; return draw();
  }
  if (!S) return;
  if (a === "start") return goQ(0);
  if (a === "skip") return endQ(true);
  if (a === "next") return S.qi >= S.qs.length - 1 ? finish() : goQ(S.qi + 1);
  if (a === "end") { if (!confirm("Cancel this quiz for everyone?")) return; await finish(); await load(); view = "home"; S = null; if (offPl) offPl(); offPl = null; return draw(); }
  if (a === "xp") return giveXp();
});

export async function openLive() {
  modal.hidden = false; msg = ""; view = "home";
  if (S && S.status !== "end") { view = "run"; draw(); return; }
  S = null; $("lvBody").innerHTML = "<p>Loading…</p>";
  try { await load(); } catch { msg = "Could not load. Check your internet."; }
  draw();
}
