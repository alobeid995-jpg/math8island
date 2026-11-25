// Classwork for the teacher: make a worksheet, send it to classes, collect and export the answers.
// Worksheets live in <base>/work, the answer key in <base>/workkey (students never read it),
// and each student's submission in <base>/subs/<worksheet>_<student>.
import { getDocs, setDoc, updateDoc, deleteDoc, getDoc, bcol, bdoc, query, where } from "./fb.js?v=1123s";
import { SCR, COLORS, layer, rt, token } from "./screenpen.js?v=1123s";
import { autoMail, sendTo } from "./mailer.js?v=1123s";
import { LIVE_WS, isLive, setUploaded } from "./liveworks.js?v=1123s";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = s => String(s ?? "").trim().toLowerCase().replace(/\s+/g, "").replace(/×/g, "x").replace(/−/g, "-");
const same = (a, b) => { const x = norm(a), y = norm(b); if (!x || !y) return false; if (x === y) return true; const n = Number(x), m = Number(y); return x !== "" && !isNaN(n) && !isNaN(m) && Math.abs(n - m) < 1e-9; };
const when = t => t ? new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

let works = [], subs = [], keys = new Map(), view = "list", cur = null, draft = null, gmode = false;

async function load() {
  const [w, s, k] = await Promise.all([getDocs(bcol("work")), getDocs(bcol("subs")), getDocs(bcol("workkey"))]);
  works = w.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => x.kind !== "material" && x.kind !== "announcement" && x.kind !== "funpark" && x.kind !== "liveopen" && x.kind !== "remind" && x.kind !== "mylessons" && x.kind !== "htmlws").sort((a, b) => (b.created || 0) - (a.created || 0));
  setUploaded(w.docs.map(d => ({ id: d.id, ...d.data() })));
  subs = s.docs.map(d => ({ id: d.id, ...d.data() }));
  keys = new Map(k.docs.map(d => [d.id, d.data().answers || []]));
  try { const rd = w.docs.find(d => d.id === "remind"); remindAt = (rd && rd.data().at) || {}; } catch { remindAt = {}; }
  try { const lo = w.docs.find(d => d.id === "liveopen"); liveOpen = (lo && lo.data().open) || {}; } catch { liveOpen = {}; }
  try { plays = (await getDocs(bcol("plays"))).docs.map(d => d.data()).filter(p => p.s === "ag" || p.s === "el"); } catch { plays = []; }
}
/* Live worksheets are classwork too: each one counts as a classwork for every class it was started for. */
let liveOpen = {}, plays = [], remindAt = {};
/* what a student has not done yet (open worksheets + live worksheets), for the "Missing" reminder */
const missingOf = s => [...works.filter(w => w.open !== false && (w.classes || []).includes(s.cls) && !subOf(w, s.id)).map(w => w.title),
  ...LIVE_WS.filter(lw => isLive(lw, liveOpen, s.cls) && !livePlays(lw, s.id).length).map(lw => lw.title)];
const liveClasses = lw => CLASSES.concat(["8G", "8D"]).filter((c, i, a) => a.indexOf(c) === i).filter(c => isLive(lw, liveOpen, c));
const liveWsId = lw => lw.noWs ? lw.id + "-examples" : lw.id + "-ws";
const livePlays = (lw, sid) => plays.filter(p => p.sid === sid && p.g === liveWsId(lw));
const liveStudents = lw => { const cl = liveClasses(lw).map(x => x.toUpperCase()); return students.filter(s => cl.includes(String(s.cls || "").toUpperCase())).sort((a, b) => a.cls.localeCompare(b.cls) || a.name.localeCompare(b.name)); };
const liveStart = (lw, c) => { const o = liveOpen[lw.id]; return o && o[Object.keys(o).find(k => k.toUpperCase() === c.toUpperCase())] || 0; };
const stuOf = w => students.filter(s => (w.classes || []).includes(s.cls)).sort((a, b) => a.cls.localeCompare(b.cls) || a.name.localeCompare(b.name));
const subOf = (w, sid) => subs.find(x => x.wid === w.id && x.sid === sid);
/* A test hands in its proctoring record as the last "answer": "@@test {json}" (w = warnings, l = log, s = seconds used, r = why it ended). */
const tinfo = sub => { const a = (sub && sub.answers) || [], m = a[a.length - 1]; if (typeof m === "string" && m.startsWith("@@test ")) { try { return JSON.parse(m.slice(7)); } catch {} } return null; };
const tKind = { tab: "left the tab", fs: "left full screen", blur: "left the window", reload: "reloaded the page" };
const tText = t => t ? `${t.w} warning${t.w === 1 ? "" : "s"}${t.r === "locked" ? " · locked" : t.r === "time" ? " · time ended" : ""} · ${Math.round((t.s || 0) / 60 * 10) / 10} min` : "";
const tTitle = t => t ? (t.l || []).map(x => `${Math.floor(x.t / 60)}:${String(x.t % 60).padStart(2, "0")} ${tKind[x.k] || x.k}`).join("\n") : "";
function score(w, sub) {
  const key = keys.get(w.id) || [], marked = key.map((k, i) => k ? same(sub.answers[i], k) : null);
  const n = marked.filter(x => x !== null).length;
  return { marked, right: marked.filter(x => x === true).length, n };
}

/* ---------- views ---------- */
function render() {
  const b = $("wkBody");
  if (view !== "watch" && view !== "watch1") scrStop();
  if (view === "watch") return watchList(b);
  if (view === "watch1") return watchOne(b);
  if (view === "list") {
    if (gmode) { const gw = works.filter(x => x.graded), thead = `<thead><tr><th>Worksheet</th><th>Classes</th><th>Handed in</th><th></th></tr></thead>`;
      b.innerHTML = `<h3>Graded worksheets</h3>
      <p class="noprint">The marked assessments, once or twice a quarter. Every mistake loses marks: the mark is the number right out of the number of questions, scaled to 10, and it goes in Grades /10 as <b>Graded worksheet</b>. (Classwork and live worksheets are different: finishing them gives the full mark.)</p>
      <div class="lg-bar"><button class="primary" type="button" data-wk="newg">+ New graded worksheet</button><button class="ghost" type="button" data-wk="close">Close</button></div>
      ${gw.length ? `<table class="lg-tbl wk-list">${thead}<tbody>${gw.map(x => { const all = stuOf(x), done = all.filter(s => subOf(x, s.id)).length, hasKey = (keys.get(x.id) || []).some(Boolean);
        return `<tr><td><b>${esc(x.title)}</b><br><small>${(x.questions || []).length} questions · ${esc(when(x.created))}${x.open === false ? " · <b>closed</b>" : ""}${hasKey ? "" : ' · <b style="color:#b3261e">no answer key: add correct answers or it cannot be marked</b>'}</small></td><td>${esc((x.classes || []).join(", "))}</td><td>${done} / ${all.length}</td>
          <td class="wk-acts"><button class="primary small" type="button" data-wk="res" data-id="${x.id}">Marks</button><button class="ghost small" type="button" data-wk="toggle" data-id="${x.id}">${x.open === false ? "Open again" : "Close it"}</button><button class="ghost small" type="button" data-wk="graded" data-id="${x.id}">Move to classwork</button><button class="ghost small" type="button" data-wk="del" data-id="${x.id}">Delete</button></td></tr>`; }).join("")}</tbody></table>` : `<p class="none">No graded worksheets yet. Tap "New graded worksheet".</p>`}`;
      return; }
    b.innerHTML = `<h3>Classwork</h3>
      <p class="noprint">Make a worksheet, send it to one class or all of them. Students find it when they log in. Finishing it gives the full classwork mark, even with mistakes. Their answers and the time they handed in stay here as evidence.</p>
      <div class="lg-bar"><button class="primary" type="button" data-wk="new">+ New worksheet</button><button class="ghost" type="button" data-wk="watch">👀 Watch &amp; help students</button><button class="ghost" type="button" data-wk="close">Close</button></div>
      ${(() => { const cl = CLASSES.concat(["8G", "8D"]).filter((c, i, x) => x.indexOf(c) === i).map(c => ({ c, n: students.filter(s => String(s.cls).toUpperCase() === c.toUpperCase() && missingOf(s).length).length, on: Object.keys(remindAt).some(k => remindAt[k] && k.toUpperCase() === c.toUpperCase()) })).filter(x => x.n || x.on);
        return cl.length ? `<div class="wk-miss-bar noprint"><b>Missing work</b> <small>Students see a reminder only after you press it.</small><div class="lg-bar">${cl.map(x => `<button class="${x.on ? "primary" : "ghost"} small" type="button" data-wk="remind" data-c="${esc(x.c)}">${x.on ? "✓ Reminding " + esc(x.c) + " (tap to stop)" : "📣 Show missing to " + esc(x.c) + " (" + x.n + " student" + (x.n === 1 ? "" : "s") + ")"}</button>${x.n ? `<button class="ghost small" type="button" data-wk="remindmail" data-c="${esc(x.c)}" title="Show the reminder on the site and also email each student what he is missing">✉ Remind + email ${esc(x.c)}</button>` : ""}`).join("")}</div></div>` : ""; })()}
      ${(() => {
        const liveRow = lw => { const all = liveStudents(lw), done = all.filter(s => livePlays(lw, s.id).length).length, t = Math.max(0, ...liveClasses(lw).map(c => liveStart(lw, c)));
          return { t, html: `<tr><td><b>${esc(lw.title)}</b><br><small>Live worksheet${t ? " · " + esc(when(t)) : ""}</small></td><td>${esc(liveClasses(lw).join(", "))}</td><td>${done} / ${all.length}</td><td class="wk-acts"><button class="primary small" type="button" data-wk="lres" data-lid="${esc(lw.id)}">Results</button></td></tr>` }; };
        const workRow = w => { const all = stuOf(w), done = all.filter(s => subOf(w, s.id)).length;
          return `<tr><td><b>${esc(w.title)}</b><br><small>${(w.questions || []).length} questions · ${esc(when(w.created))}${w.open === false ? " · <b>closed</b>" : ""}</small></td><td>${esc((w.classes || []).join(", "))}</td><td>${done} / ${all.length}</td>
          <td class="wk-acts"><button class="primary small" type="button" data-wk="res" data-id="${w.id}">Answers</button><button class="${w.graded ? "primary" : "ghost"} small" type="button" data-wk="graded" data-id="${w.id}" title="${w.graded ? "Move it back to Classwork" : "Move it to Graded classwork: its mark goes in the Grades sheet as Graded worksheet, not as classwork"}">${w.graded ? "Back to classwork" : "Make graded"}</button><button class="ghost small" type="button" data-wk="toggle" data-id="${w.id}">${w.open === false ? "Open again" : "Close it"}</button><button class="ghost small" type="button" data-wk="del" data-id="${w.id}">Delete</button></td></tr>`; };
        const thead = `<thead><tr><th>Worksheet</th><th>Classes</th><th>Handed in</th><th></th></tr></thead>`;
        const cw = works.filter(w => !w.graded).map(w => ({ t: w.created || 0, html: workRow(w) })).concat(LIVE_WS.filter(lw => liveClasses(lw).length).map(liveRow)).sort((x, y) => y.t - x.t);
        const gw = works.filter(w => w.graded);
        return `<h4 style="margin:14px 0 4px">Classwork <small>(live worksheets and normal worksheets together; all count in the Classwork mark)</small></h4>`
          + (cw.length ? `<table class="lg-tbl wk-list">${thead}<tbody>${cw.map(x => x.html).join("")}</tbody></table>` : `<p class="none">No worksheets yet. Tap "New worksheet" to make the first one.</p>`)
          + (gw.length ? `<p class="rep-note" style="margin-top:12px">${gw.length} graded worksheet${gw.length === 1 ? " is" : "s are"} in <b>Tools › Graded worksheets</b>.</p>` : "");
      })()}`;
  } else if (view === "edit") {
    const d = draft;
    b.innerHTML = `<h3>${d.graded ? "New graded worksheet" : "New worksheet"}</h3>${d.graded ? `<p class="rep-note">Marked: each question needs its correct answer. The mark = right answers out of all questions.</p>` : ""}
      <label class="wk-f">Title<input id="wkTitle" maxlength="80" value="${esc(d.title)}" placeholder="e.g. Simultaneous equations · practice 1"></label>
      <div class="wk-f">Send to <div class="wk-cls">${CLASSES.map(c => `<label><input type="checkbox" data-wkcls="${esc(c)}" ${d.classes.includes(c) ? "checked" : ""}> ${esc(c)}</label>`).join("")}
        <button class="ghost small" type="button" data-wk="allcls">All my classes</button></div></div>
      <div class="wk-f" style="border:2px solid var(--line,#cdd5e3);border-radius:12px;padding:10px 12px"><label><input type="checkbox" id="wkTest" data-wk="testtog" ${d.test ? "checked" : ""}> <b>Test mode</b> <small>(full screen, timer, shuffled questions, warnings when the student leaves the page)</small></label>
        ${d.test ? `<div class="wk-row" style="margin-top:8px"><label>Time <input id="wkTMin" type="number" min="1" max="180" value="${d.tMin}" style="width:70px"> minutes</label><label>Warnings allowed <input id="wkTWarn" type="number" min="0" max="20" value="${d.tWarn}" style="width:70px"></label></div><small>After the last warning the test is handed in by itself. Use a laptop or computer: full screen does not work on most phones.</small>` : ""}</div>
      <ol class="wk-qs">${d.questions.map((q, i) => `<li>
        <textarea data-wkq="${i}" data-k="q" rows="2" maxlength="600" placeholder="Question ${i + 1}">${esc(q.q)}</textarea>
        <div class="wk-row"><select data-wkq="${i}" data-k="type"><option value="text" ${q.type === "text" ? "selected" : ""}>Answer box</option><option value="mc" ${q.type === "mc" ? "selected" : ""}>Multiple choice</option></select>
          ${q.type === "mc" ? `<input data-wkq="${i}" data-k="opts" value="${esc(q.opts)}" placeholder="Choices, separated by commas: 3, 5, 7, 9">` : ""}
          <input data-wkq="${i}" data-k="key" value="${esc(q.key)}" placeholder="Correct answer (optional, for automatic marking)">
          <button class="ghost small" type="button" data-wk="delq" data-i="${i}" aria-label="Remove question ${i + 1}">Remove</button></div></li>`).join("")}</ol>
      <div class="lg-bar"><button class="ghost" type="button" data-wk="addq">+ Add question</button></div>
      <div class="wk-f" style="border:2px dashed var(--line,#cdd5e3);border-radius:12px;padding:10px 12px"><b>Import from Excel or CSV</b> <small>One row per question: Type (MC or Blank), Question, A, B, C, D, Answer. The questions are added here so you can check them before you send.</small>
        <div class="lg-bar" style="margin-top:8px"><button class="primary small" type="button" data-wk="imp">Upload Excel / CSV</button><button class="ghost small" type="button" data-wk="tpl">Download the template</button><input type="file" id="wkImpFile" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden></div></div>
      <div class="lg-msg" id="wkMsg"></div>
      <div class="acts"><button class="primary" type="button" data-wk="save">Send to students</button><button class="ghost" type="button" data-wk="back">Cancel</button></div>`;
  } else if (view === "lres") {
    const lw = LIVE_WS.find(x => x.id === cur); if (!lw) { view = "list"; return render(); }
    const all = liveStudents(lw), rows = all.map(s => { const pl = livePlays(lw, s.id).sort((x, y) => (y.u || y.t || 0) - (x.u || x.t || 0)), p = pl[0]; return { s, p }; }), done = rows.filter(r => r.p);
    b.innerHTML = `<h3>${esc(lw.title)}</h3><p>${esc(liveClasses(lw).join(", "))} · ${done.length} of ${all.length} finished. This is classwork: finishing it counts in the Classwork mark.</p>
      <div class="lg-bar noprint"><button class="ghost" type="button" data-wk="back">Back</button></div>
      <div class="wk-res"><table class="lg-tbl"><thead><tr><th>Name</th><th>Class</th><th>Finished</th><th>Mistakes</th><th>Perfect</th></tr></thead><tbody>${rows.map(({ s, p }) => p ? `<tr><td>${esc(s.name)}</td><td>${esc(s.cls)}</td><td>${esc(when(p.u || p.t))}</td><td>${+p.w || 0}</td><td>${(+p.w || 0) === 0 && (lw.noWs || p.v === 2) ? "⭐" : ""}</td></tr>` : `<tr class="wk-miss"><td>${esc(s.name)}</td><td>${esc(s.cls)}</td><td><b style="color:#b3261e">MISSING</b></td><td></td><td></td></tr>`).join("")}</tbody></table></div>`;
  } else if (view === "res") {
    const w = works.find(x => x.id === cur); if (!w) { view = "list"; return render(); }
    const all = stuOf(w), qs = w.questions || [], hasKey = (keys.get(w.id) || []).some(Boolean), anyT = subs.some(x => x.wid === w.id && tinfo(x));
    const rows = all.map(s => ({ s, sub: subOf(w, s.id) })), done = rows.filter(r => r.sub);
    b.innerHTML = `<h3>${esc(w.title)}</h3>
      <p>${esc((w.classes || []).join(", "))} · ${done.length} of ${all.length} handed in · made ${esc(when(w.created))}</p>
      <div class="lg-bar noprint"><button class="primary" type="button" data-wk="csv">Download Excel file</button><button class="ghost" type="button" data-wk="print">Print / save PDF</button><button class="ghost" type="button" data-wk="back">Back</button></div>
      <div class="wk-res"><table class="lg-tbl"><thead><tr><th>Name</th><th>Class</th><th>Handed in</th>${hasKey ? "<th>Mark</th>" : ""}${anyT ? "<th>Test</th>" : ""}${qs.map((q, i) => `<th title="${esc(q.q)}">Q${i + 1}</th>`).join("")}</tr></thead><tbody>
        ${rows.map(({ s, sub }) => { if (!sub) return `<tr class="wk-miss"><td>${esc(s.name)}</td><td>${esc(s.cls)}</td><td><b style="color:#b3261e">MISSING</b></td>${hasKey ? "<td></td>" : ""}${anyT ? "<td></td>" : ""}${qs.map(() => "<td></td>").join("")}</tr>`;
          const sc = score(w, sub);
          return `<tr><td>${esc(s.name)}</td><td>${esc(s.cls)}</td><td>${esc(when(sub.at))}</td>${hasKey ? `<td><b>${sc.right}/${sc.n}</b></td>` : ""}${anyT ? (() => { const t = tinfo(sub); return `<td title="${esc(tTitle(t))}" style="${t && t.w ? "background:#ffe0dc;font-weight:800" : ""}">${esc(tText(t))}</td>`; })() : ""}${qs.map((q, i) => `<td class="${sc.marked[i] === true ? "wk-ok" : sc.marked[i] === false ? "wk-no" : ""}">${esc(sub.answers[i] || "")}</td>`).join("")}</tr>`; }).join("")}
      </tbody></table></div>
      <details class="wk-q"><summary>Questions${hasKey ? " and correct answers" : ""}</summary><ol>${qs.map((q, i) => `<li>${esc(q.q)}${q.opts && q.opts.length ? ` <small>(${esc(q.opts.join(" · "))})</small>` : ""}${(keys.get(w.id) || [])[i] ? ` → <b>${esc(keys.get(w.id)[i])}</b>` : ""}</li>`).join("")}</ol></details>`;
  }
}

function readDraft() {
  if (view !== "edit") return;
  draft.title = ($("wkTitle") || {}).value || "";
  if ($("wkTest")) { draft.test = $("wkTest").checked; draft.tMin = Math.max(1, Math.min(180, +($("wkTMin") || {}).value || 30)); draft.tWarn = Math.max(0, Math.min(20, +($("wkTWarn") || {}).value || 0)); }
  draft.classes = [...document.querySelectorAll("[data-wkcls]")].filter(x => x.checked).map(x => x.dataset.wkcls);
  document.querySelectorAll("[data-wkq]").forEach(el => { draft.questions[+el.dataset.wkq][el.dataset.k] = el.value; });
}

function csv(w) {
  const qs = w.questions || [], key = keys.get(w.id) || [], hasKey = key.some(Boolean);
  const cell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Name", "Student ID", "Class", "Handed in", ...(hasKey ? ["Mark", "Out of"] : []), ...(w.test ? ["Test warnings", "Minutes used", "Ended by", "Warning details"] : []), ...qs.map((q, i) => `Q${i + 1}: ${q.q}`)];
  const lines = [head.map(cell).join(",")];
  stuOf(w).forEach(s => {
    const sub = subOf(w, s.id), sc = sub && score(w, sub);
    lines.push([s.name, s.enrollment || "", s.cls, sub ? new Date(sub.at).toLocaleString("en-GB") : "not handed in", ...(hasKey ? [sc ? sc.right : "", sc ? sc.n : ""] : []), ...(w.test ? (() => { const t = tinfo(sub); return t ? [t.w, Math.round((t.s || 0) / 6) / 10, t.r || "handed in", (t.l || []).map(x => `${Math.floor(x.t / 60)}:${String(x.t % 60).padStart(2, "0")} ${tKind[x.k] || x.k}`).join("; ")] : ["", "", "", ""]; })() : []), ...qs.map((q, i) => sub ? sub.answers[i] || "" : "")].map(cell).join(","));
  });
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = (w.title || "worksheet").replace(/[^\w\- ]+/g, "").trim() + ".csv";
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

async function saveDraft() {
  readDraft();
  const d = draft, say = t => { $("wkMsg").textContent = t; };
  const qs = d.questions.filter(q => q.q.trim());
  if (!d.title.trim()) return say("Give the worksheet a title.");
  if (!d.classes.length) return say("Choose at least one class.");
  if (!qs.length) return say("Add at least one question.");
  for (const [i, q] of qs.entries()) if (q.type === "mc" && q.opts.split(",").map(x => x.trim()).filter(Boolean).length < 2) return say(`Question ${i + 1}: give at least two choices, separated by commas.`);
  const id = "w" + Date.now().toString(36);
  const questions = qs.map(q => ({ q: q.q.trim(), type: q.type, opts: q.type === "mc" ? q.opts.split(",").map(x => x.trim()).filter(Boolean) : [] }));
  try {
    await setDoc(bdoc("workkey", id), { answers: qs.map(q => q.key.trim()) });
    await setDoc(bdoc("work", id), { title: d.title.trim(), classes: d.classes, questions, open: true, created: Date.now(), ...(d.graded ? { graded: true } : {}), ...(d.test ? { test: { on: true, min: d.tMin, warn: d.tWarn } } : {}) });
  } catch (e) { return say("Could not send: " + (e.code || e.message) + ". Check that the new Firebase rules are published."); }
  autoMail("work", d.classes, d.title.trim()).then(r => { if (r) say(`Sent. Emailed ${r.sent} student(s).`); });
  await load(); view = "res"; cur = id; render();
}

document.addEventListener("input", e => { if (e.target.closest && e.target.closest("#wkBody")) readDraft(); });
document.addEventListener("change", e => {
  const t = e.target; if (!t.closest || !t.closest("#wkBody")) return;
  readDraft(); if (t.dataset.k === "type") render();
});
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-wk]"); if (!b) return;
  const a = b.dataset.wk, w = works.find(x => x.id === b.dataset.id);
  if (a === "close") { scrStop(); if (scr.sid && view === "watch1") { scrHelp(false); scrClose(); } $("workModal").hidden = true; return; }
  if (a === "newg") { draft = { title: "", classes: CLASSES.includes(cls) ? [cls] : [], test: false, tMin: 30, tWarn: 3, graded: true, questions: [{ q: "", type: "text", opts: "", key: "" }] }; view = "edit"; return render(); }
  if (a === "new") { draft = { title: "", classes: CLASSES.includes(cls) ? [cls] : [], test: false, tMin: 30, tWarn: 3, questions: [{ q: "", type: "text", opts: "", key: "" }] }; view = "edit"; return render(); }
  if (a === "remind") { const c = b.dataset.c, k = Object.keys(remindAt).find(x => x.toUpperCase() === c.toUpperCase()), at = { ...remindAt };
    if (k && at[k]) delete at[k]; else at[c] = Date.now();
    const classes = Object.keys(at).filter(x => at[x]);
    b.disabled = true; try { await setDoc(bdoc("work", "remind"), { kind: "remind", at, classes, created: Date.now() }); remindAt = at; } catch { alert("Could not save the reminder."); } return render(); }
  if (a === "remindmail") { const c = b.dataset.c, list = students.filter(s => String(s.cls).toUpperCase() === c.toUpperCase() && missingOf(s).length);
    if (!list.length) return alert("Nobody in " + c + " is missing work.");
    if (!confirm("Remind " + c + " on the site and email " + list.length + " student(s) what they are missing?")) return;
    b.disabled = true; const old = b.textContent; b.textContent = "Sending…";
    try {
      const at = { ...remindAt }; if (!Object.keys(at).some(x => at[x] && x.toUpperCase() === c.toUpperCase())) { at[c] = Date.now(); await setDoc(bdoc("work", "remind"), { kind: "remind", at, classes: Object.keys(at).filter(x => at[x]), created: Date.now() }); remindAt = at; }
      const r = await sendTo(list, s => ({ subject: "Missing work in Student Island", text: "Hello " + String(s.name || "").split(/\s+/)[0] + ",\n\nYou have not finished:\n" + missingOf(s).map(t => "- " + t).join("\n") + "\n\nLog in and complete it: https://mathkn.fun" }));
      alert("Reminder is on the site. Emails sent: " + r.sent + (r.skipped.length ? ". Skipped (no valid student ID): " + r.skipped.length : "") + (r.failed.length ? ". Failed: " + r.failed.length + " (" + r.failed[0].error + ")" : "") + ".");
    } catch (e) { alert("The site reminder may be on, but the email was not sent: " + (e.message || e)); }
    return render(); }
  if (a === "lres") { cur = b.dataset.lid; view = "lres"; await load(); return render(); }
  if (a === "back") { view = "list"; await load(); return render(); }
  if (a === "testtog") { readDraft(); return render(); }
  if (a === "allcls") { readDraft(); draft.classes = CLASSES.slice(); return render(); }
  if (a === "imp") { readDraft(); const f = $("wkImpFile"); f.value = ""; f.onchange = () => f.files[0] && importSheet(f.files[0]); f.click(); return; }
  if (a === "tpl") { readDraft(); return downloadTemplate(); }
  if (a === "watch") { view = "watch"; return render(); }
  if (a === "wone") { scr.sid = b.dataset.sid; scr.strokes = []; scrOpen(); view = "watch1"; return render(); }
  if (a === "wback") { await scrHelp(false); scrClose(); view = "watch"; return render(); }
  if (a === "wlist") { view = "list"; return render(); }
  if (a === "wpen") { scr.pen = !scr.pen; document.querySelectorAll("#wkBody .scr-cv").forEach(c => c.classList.toggle("pen", scr.pen)); b.textContent = scr.pen ? "✏️ Pen on" : "✏️ Pen off"; b.classList.toggle("primary", scr.pen); b.classList.toggle("ghost", !scr.pen); return; }
  if (a === "wcol") { scr.color = b.dataset.c; document.querySelectorAll("[data-wk='wcol']").forEach(x => { x.style.outline = x === b ? "3px solid var(--ink,#17233b)" : ""; }); return; }
  if (a === "wundo") { scr.strokes.pop(); scrPaint(); scrSendAll(); return scrHelp(true); }
  if (a === "wclear") { scr.strokes = []; scrPaint(); scrSendAll(); return scrHelp(true); }
  if (a === "addq") { readDraft(); draft.questions.push({ q: "", type: "text", opts: "", key: "" }); render(); const t = document.querySelectorAll("[data-k='q']"); t[t.length - 1].focus(); return; }
  if (a === "delq") { readDraft(); draft.questions.splice(+b.dataset.i, 1); if (!draft.questions.length) draft.questions.push({ q: "", type: "text", opts: "", key: "" }); return render(); }
  if (a === "save") { b.disabled = true; await saveDraft(); b.disabled = false; return; }
  if (a === "res" && w) { cur = w.id; view = "res"; await load(); return render(); }
  if (a === "graded" && w) { await updateDoc(bdoc("work", w.id), { graded: !w.graded }); await load(); return render(); }
  if (a === "toggle" && w) { await updateDoc(bdoc("work", w.id), { open: w.open === false }); await load(); return render(); }
  if (a === "del" && w) {
    const n = subs.filter(x => x.wid === w.id).length;
    if (!confirm(`Delete "${w.title}"${n ? ` and the ${n} answer sheet${n === 1 ? "" : "s"} handed in` : ""}? This cannot be undone.`)) return;
    for (const s of subs.filter(x => x.wid === w.id)) await deleteDoc(bdoc("subs", s.id));
    await deleteDoc(bdoc("work", w.id)); await deleteDoc(bdoc("workkey", w.id)); await load(); return render();
  }
  if (a === "csv") { const w2 = works.find(x => x.id === cur); if (w2) csv(w2); return; }
  if (a === "print") { document.body.classList.add("wk-printing"); window.print(); setTimeout(() => document.body.classList.remove("wk-printing"), 500); }
});

export async function openWork(mode) {
  $("workModal").hidden = false; view = "list"; gmode = mode === "graded"; $("wkBody").innerHTML = "<p>Loading…</p>";
  try { await load(); } catch (e) { $("wkBody").innerHTML = `<p class="lg-msg">Could not load classwork (${esc(e.code || e.message)}). Check that the new Firebase rules are published.</p><button class="ghost" data-wk="close">Close</button>`; return; }
  if (mode === "new") { draft = { title: "", classes: CLASSES.includes(cls) ? [cls] : [], test: false, tMin: 30, tWarn: 3, questions: [{ q: "", type: "text", opts: "", key: "" }] }; view = "edit"; }
  render();
}
window.__newWorksheet = () => openWork("new");
window.__openGraded = () => openWork("graded");
window.__openWatch = async () => { const pm = document.getElementById("progressModal"); if (pm) pm.hidden = true; await openWork(); view = "watch"; render(); };

/* data for the Grades sheet in the Teacher Hub */
export async function gradeData() {
  await load();
  const lws = LIVE_WS.filter(lw => liveClasses(lw).length).map(lw => ({ id: "live:" + lw.id, classes: liveClasses(lw), graded: false, created: Math.max(0, ...liveClasses(lw).map(c => liveStart(lw, c))), title: lw.title }));
  const lsubs = []; LIVE_WS.forEach(lw => liveStudents(lw).forEach(s => { if (livePlays(lw, s.id).length) lsubs.push({ wid: "live:" + lw.id, sid: s.id, right: 0, n: 0 }); }));
  return { works: works.map(w => ({ id: w.id, classes: w.classes || [], graded: !!w.graded, created: w.created || 0, title: w.title })).concat(lws),
    subs: lsubs.concat(subs.map(x => { const w = works.find(y => y.id === x.wid); const sc = w && x.answers ? score(w, x) : null; return { wid: x.wid, sid: x.sid, right: sc ? sc.right : 0, n: sc ? sc.n : 0 }; })) };
}

/* ---------- Watch & help: follow a student's worksheet live and draw on it ---------- */
const scr = { sid: "", strokes: [], pen: true, color: COLORS[0], t: 0, layers: [], live: [], tok: "", ch: null, show: null, mvT: 0 };
function scrStop() { clearTimeout(scr.t); scr.t = 0; }
function scrClose() { if (scr.ch) { scr.ch.close(); scr.ch = null; } scr.tok = ""; scr.show = null; }
function scrOpen() {
  scrClose(); scr.tok = token();
  scr.ch = rt(scr.tok, (ev, p) => { if (ev !== "s") return; const y = scr.live.find(z => z.sid === scr.sid); if (!y) return; y.ans = { ...y.ans, ...p }; y.joined = Date.now(); if (scr.show) scr.show(); });
  setTimeout(() => scr.ch && scr.ch.send("hi", {}), 1500);
}
const scrSendAll = () => { if (scr.ch) scr.ch.send("d", { strokes: scr.strokes.slice(-60) }); };
const scrMove = cur => { if (!scr.ch || scr.mvT) return; scr.mvT = setTimeout(() => { scr.mvT = 0; scr.ch && scr.ch.send("m", { s: cur }); }, 40); };
const ago = t => { const s = Math.max(0, Math.round((Date.now() - (t || 0)) / 1000)); return s < 60 ? s + " s ago" : Math.round(s / 60) + " min ago"; };
async function scrLoad() { try { const s = await getDocs(query(bcol("liveplayers"), where("sess", "==", SCR))), prev = new Map(scr.live.map(x => [x.sid, x]));
  scr.live = s.docs.map(d => d.data()).filter(x => x.ans && Date.now() - (x.joined || 0) < 15 * 60e3).map(x => { const o = prev.get(x.sid); return o && (o.joined || 0) > (x.joined || 0) ? o : x; }); } catch {} }   // keep what came faster over the live channel
async function watchList(b) {
  scrStop(); await scrLoad(); if (view !== "watch") return;
  const rows = scr.live.map(x => { const st = students.find(s => s.id === x.sid) || { name: x.name, cls: "" }, w = works.find(y => y.id === x.ans.wid), a = x.ans.a || [];
    return { x, st, w: w || (x.ans.g === "9s" ? { title: "9S Island game" } : x.ans.g === "lw" ? { title: "Live worksheet: " + (x.ans.t || "") } : null), done: a.filter(v => String(v).trim()).length, n: (w && (w.questions || []).length) || a.length, g9: x.ans.g === "9s" || x.ans.g === "lw" }; }).filter(r => r.w).sort((p, q) => (q.x.joined || 0) - (p.x.joined || 0));
  b.innerHTML = `<h3>Watch &amp; help</h3><p class="noprint">Students who have a worksheet, a live worksheet or a 9S Island game open now (updates every few seconds). Tap one to see his answers as he types and to draw on his worksheet. He sees a note that you are looking.</p>
    <div class="lg-bar"><button class="ghost" type="button" data-wk="wlist">Back</button></div>
    ${rows.length ? `<table class="lg-tbl"><thead><tr><th>Student</th><th>Worksheet</th><th>Answered</th><th>Active</th><th></th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${esc(r.st.name)}</b><br><small>${esc(r.st.cls)}</small></td><td>${esc(r.w.title)}</td><td>${r.g9 ? "–" : r.done + " / " + r.n}</td><td>${Date.now() - (r.x.joined || 0) < 90e3 ? '<b style="color:#1f9d55">● now</b>' : esc(ago(r.x.joined))}</td><td><button class="primary small" type="button" data-wk="wone" data-sid="${esc(r.x.sid)}">Watch</button></td></tr>`).join("")}</tbody></table>`
      : `<p class="none">Nobody has a worksheet open right now. When a student opens one, he appears here.</p>`}`;
  scr.t = setTimeout(() => { if (view === "watch" && !$("workModal").hidden) render(); }, 4000);
}
function scrPaint() { scr.layers.forEach(l => l.paint(scr.strokes)); }
let scrSaveT = 0;
async function scrHelp(on) {
  const x = scr.live.find(y => y.sid === scr.sid), st = students.find(s => s.id === scr.sid); if (!x || !st) return;
  try { await setDoc(bdoc("live", SCR + "_" + scr.sid), { kind: "screen", cls: [st.cls], sid: scr.sid, wid: x.ans.wid || x.ans.g, on, strokes: on ? scr.strokes.slice(-60) : [], at: Date.now(), ...(on && scr.tok ? { rt: scr.tok } : {}) }); } catch {}
}
function watchLw(b, x, st) {
  b.innerHTML = `<h3>${esc((st && st.name) || x.name)} · ${esc(x.ans.t || "Live worksheet")}</h3>
    <div class="lg-bar noprint" style="position:sticky;top:0;z-index:5;background:var(--card,#fff);padding:6px 0;align-items:center"><button class="${scr.pen ? "primary" : "ghost"} small" type="button" data-wk="wpen">${scr.pen ? "✏️ Pen on" : "✏️ Pen off"}</button>${COLORS.map(c => `<button type="button" data-wk="wcol" data-c="${c}" aria-label="Colour" style="width:30px;height:30px;border-radius:50%;border:2px solid #fff;background:${c};cursor:pointer;${c === scr.color ? "outline:3px solid var(--ink,#17233b)" : ""}"></button>`).join("")}<button class="ghost small" type="button" data-wk="wundo">Undo</button><button class="ghost small" type="button" data-wk="wclear">Clear</button><button class="ghost small" type="button" data-wk="wback">Stop helping</button></div>
    <p class="rep-note" id="scrAct">Waiting for his screen…</p>
    <div id="scrWrap" style="position:relative;overflow:hidden;border:2px solid var(--line,#cdd5e3);border-radius:12px;background:#fff;margin:0 auto;width:600px;height:400px"><iframe id="scrFr" sandbox="" title="Student screen" style="border:0;position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none;background:#fff"></iframe></div>`;
  const wrap = $("scrWrap"), fr = $("scrFr");
  scr.layers = [layer(wrap, -1, { draw: true, color: () => scr.color, onMove: scrMove, onStroke: s => { scr.strokes.push(s); if (scr.strokes.length > 60) scr.strokes.shift(); scrSendAll(); clearTimeout(scrSaveT); scrSaveT = setTimeout(() => scrHelp(true), 250); } })];
  wrap.querySelectorAll(".scr-cv").forEach(c => c.classList.toggle("pen", scr.pen));
  let last = "";
  const withBase = h => { const tag = `<base href="${location.origin}/">`; return /<head[^>]*>/i.test(h) ? h.replace(/<head[^>]*>/i, m => m + tag) : tag + h; };
  const show = () => {
    const y = scr.live.find(z => z.sid === scr.sid); if (!y || !y.ans) return; const a = y.ans;
    if (a.h) {
      const W = Math.max(320, +a.w || 800), H = Math.max(400, +a.vh || 1000), D = Math.max(H, +a.dh || H), avail = Math.min(b.clientWidth - 4, 1100), k = Math.min(1, avail / W, (innerHeight * 0.72) / H);
      wrap.style.width = Math.round(W * k) + "px"; wrap.style.height = Math.round(H * k) + "px"; fr.style.width = W + "px"; fr.style.height = D + "px";
      fr.style.transform = `scale(${k}) translate(0, ${-(+a.y || 0)}px)`;
      if (a.h !== last) { fr.srcdoc = withBase(a.h); last = a.h; }
    }
    scrPaint();
    const s = $("scrAct"); if (s) s.textContent = !a.h ? "Waiting for his screen… (it appears in a second or two)" : (Date.now() - (y.joined || 0) < 90e3 ? "● Working now" : "Last active " + ago(y.joined)) + ". This is his worksheet as he sees it. Draw on it: he sees it on his screen.";
  };
  scr.show = show; scrHelp(true); show();
  let n = 0; const tick = async () => { if (view !== "watch1" || $("workModal").hidden) return; await scrLoad(); show(); if (++n % 20 === 0) scrHelp(true); scr.t = setTimeout(tick, 1500); };
  scr.t = setTimeout(tick, 1500);
}
function watch9s(b, x, st) {
  b.innerHTML = `<h3>${esc((st && st.name) || x.name)} · 9S Island</h3>
    <div class="lg-bar noprint" style="position:sticky;top:0;z-index:5;background:var(--card,#fff);padding:6px 0;align-items:center"><button class="${scr.pen ? "primary" : "ghost"} small" type="button" data-wk="wpen">${scr.pen ? "✏️ Pen on" : "✏️ Pen off"}</button>${COLORS.map(c => `<button type="button" data-wk="wcol" data-c="${c}" aria-label="Colour" style="width:30px;height:30px;border-radius:50%;border:2px solid #fff;background:${c};cursor:pointer;${c === scr.color ? "outline:3px solid var(--ink,#17233b)" : ""}"></button>`).join("")}<button class="ghost small" type="button" data-wk="wundo">Undo</button><button class="ghost small" type="button" data-wk="wclear">Clear</button><button class="ghost small" type="button" data-wk="wback">Stop helping</button></div>
    <p class="rep-note" id="scrAct"></p>
    <div id="scrWrap" style="position:relative;overflow:hidden;border:2px solid var(--line,#cdd5e3);border-radius:12px;background:#fff;margin:0 auto"><iframe id="scrFr" src="island9s.html#view" title="Student screen" style="border:0;position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none"></iframe></div>`;
  const wrap = $("scrWrap"), fr = $("scrFr");
  scr.layers = [layer(wrap, -1, { draw: true, color: () => scr.color, onMove: scrMove, onStroke: s => { scr.strokes.push(s); if (scr.strokes.length > 60) scr.strokes.shift(); scrSendAll(); clearTimeout(scrSaveT); scrSaveT = setTimeout(() => scrHelp(true), 250); } })];
  wrap.querySelectorAll(".scr-cv").forEach(c => c.classList.toggle("pen", scr.pen));
  let last = "";
  const fit = a => { const W = Math.max(320, +a.w || 800), H = Math.max(400, +a.vh || 1000), avail = Math.min(b.clientWidth - 4, 1100), k = Math.min(1, avail / W, (innerHeight * 0.72) / H);
    wrap.style.width = Math.round(W * k) + "px"; wrap.style.height = Math.round(H * k) + "px"; fr.style.width = W + "px"; fr.style.height = H + "px"; fr.style.transform = `scale(${k})`; };
  const show = () => {
    const y = scr.live.find(z => z.sid === scr.sid); if (!y || !y.ans) return; const a = y.ans; fit(a);
    try { const d = fr.contentDocument, sc = d && d.getElementById("screen"); if (sc && a.h !== last) { sc.innerHTML = a.h || ""; last = a.h; } if (fr.contentWindow) fr.contentWindow.scrollTo(0, +a.y || 0); } catch {}
    scrPaint();
    const s = $("scrAct"); if (s) s.textContent = (Date.now() - (y.joined || 0) < 90e3 ? "● Playing now" : "Last active " + ago(y.joined)) + ". This is his screen (it refreshes every second or two). Draw on it: he sees it on his tablet.";
  };
  scr.show = show; fr.addEventListener("load", () => { last = ""; show(); });
  scrHelp(true); show();
  let n = 0; const tick = async () => { if (view !== "watch1" || $("workModal").hidden) return; await scrLoad(); show(); if (++n % 20 === 0) scrHelp(true); scr.t = setTimeout(tick, 1500); };
  scr.t = setTimeout(tick, 1500);
}
async function watchOne(b) {
  scrStop(); await scrLoad(); if (view !== "watch1") return;
  const x = scr.live.find(y => y.sid === scr.sid), st = students.find(s => s.id === scr.sid), w = x && works.find(y => y.id === x.ans.wid);
  if (x && x.ans.g === "9s") return watch9s(b, x, st);
  if (x && x.ans.g === "lw") return watchLw(b, x, st);
  if (!x || !w) { b.innerHTML = `<h3>Watch &amp; help</h3><p class="none">This student closed the worksheet.</p><div class="lg-bar"><button class="ghost" type="button" data-wk="wback">Back</button></div>`; return; }
  const key = keys.get(w.id) || [], qs = w.questions || [];
  b.innerHTML = `<h3>${esc((st && st.name) || x.name)} · ${esc(w.title)}</h3>
    <div class="lg-bar noprint" style="position:sticky;top:0;z-index:5;background:var(--card,#fff);padding:6px 0;align-items:center"><button class="${scr.pen ? "primary" : "ghost"} small" type="button" data-wk="wpen">${scr.pen ? "✏️ Pen on" : "✏️ Pen off"}</button>${COLORS.map(c => `<button type="button" data-wk="wcol" data-c="${c}" aria-label="Colour" style="width:30px;height:30px;border-radius:50%;border:2px solid #fff;background:${c};cursor:pointer;${c === scr.color ? "outline:3px solid var(--ink,#17233b)" : ""}"></button>`).join("")}<button class="ghost small" type="button" data-wk="wundo">Undo</button><button class="ghost small" type="button" data-wk="wclear">Clear</button><button class="ghost small" type="button" data-wk="wback">Stop helping</button></div>
    <p class="rep-note" id="scrAct"></p>
    <div class="wk-do">${qs.map((q, i) => `<div class="wk-item" data-i="${i}" style="padding:8px 10px;border-radius:12px;margin:6px 0"><p><b>${i + 1}.</b> ${esc(q.q).replace(/\n/g, "<br>")}${q.opts && q.opts.length ? ` <small>(${esc(q.opts.join(" · "))})</small>` : ""}</p><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="scr-ans" style="min-width:120px;padding:8px 12px;border:2px solid var(--line,#cdd5e3);border-radius:10px;font-weight:700;min-height:22px"></span>${key[i] ? `<small>Correct: <b>${esc(key[i])}</b></small>` : ""}</div></div>`).join("")}</div>`;
  const items = [...b.querySelectorAll(".wk-item")];
  scr.layers = items.map((el, i) => layer(el, i, { draw: true, color: () => scr.color, onMove: scrMove, onStroke: s => { scr.strokes.push(s); if (scr.strokes.length > 60) scr.strokes.shift(); scrSendAll(); clearTimeout(scrSaveT); scrSaveT = setTimeout(() => scrHelp(true), 250); } }));
  b.querySelectorAll(".scr-cv").forEach(c => c.classList.toggle("pen", scr.pen));
  scrPaint(); scrHelp(true);
  const show = () => {
    const y = scr.live.find(z => z.sid === scr.sid); if (!y) return; const a = y.ans.a || [];
    items.forEach((el, i) => { const v = String(a[i] || ""), sp = el.querySelector(".scr-ans"); sp.textContent = v || "…"; const ok = key[i] ? same(v, key[i]) : null;
      sp.style.background = !v ? "" : ok === true ? "#e1f4ec" : ok === false ? "#fbe7e5" : ""; el.style.background = y.ans.f === i ? "var(--accent-soft,#e6ebff)" : ""; });
    const s = $("scrAct"); if (s) s.textContent = (Date.now() - (y.joined || 0) < 90e3 ? "● Working now" : "Last active " + ago(y.joined)) + " · " + a.filter(v => String(v).trim()).length + " of " + qs.length + " answered. The blue box is the question he is on. Draw on any question: he sees it on his screen in a second or two.";
  };
  scr.show = show; show();
  let n = 0; const tick = async () => { if (view !== "watch1" || $("workModal").hidden) return; await scrLoad(); show(); if (++n % 20 === 0) scrHelp(true); scr.t = setTimeout(tick, 1500); };
  scr.t = setTimeout(tick, 1500);
}

/* ---------- Import questions from Excel (.xlsx) or CSV ---------- */
const loadXl = () => window.ExcelJS ? Promise.resolve() : new Promise((res, rej) => { const sc = document.createElement("script"); sc.src = "exceljs.min.js?v=1123s"; sc.onload = res; sc.onerror = () => rej(new Error("Could not load the Excel reader.")); document.head.appendChild(sc); });
function csvRows(t) {
  const rows = []; let row = [], cur = "", q = false;
  t = t.replace(/^\ufeff/, "");
  const sep = (t.split(/\r?\n/)[0].match(/;/g) || []).length > (t.split(/\r?\n/)[0].match(/,/g) || []).length ? ";" : ",";
  for (let i = 0; i < t.length; i++) { const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true; else if (c === sep) { row.push(cur); cur = ""; } else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; } else cur += c; }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
const cellText = v => { if (v == null) return ""; if (typeof v === "object") { if (v.richText) return v.richText.map(x => x.text).join(""); if ("result" in v) return String(v.result ?? ""); if (v.text) return String(v.text); if (v instanceof Date) return v.toLocaleDateString("en-GB"); } return String(v); };
async function importSheet(file) {
  const say = t => { const m = $("wkMsg"); if (m) m.textContent = t; };
  try {
    let rows;
    if (/\.csv$/i.test(file.name) || file.type === "text/csv") rows = csvRows(await file.text());
    else { await loadXl(); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await file.arrayBuffer()); const ws = wb.worksheets[0]; rows = []; ws.eachRow({ includeEmpty: false }, r => { const a = []; for (let i = 1; i <= 8; i++) a.push(cellText(r.getCell(i).value).trim()); rows.push(a); }); }
    rows = rows.map(r => r.map(x => String(x ?? "").trim())).filter(r => r.some(Boolean));
    if (rows.length && /^type$/i.test(rows[0][0])) rows.shift();
    const out = [], bad = [];
    rows.forEach((r, i) => {
      const [type, q, A, B, C, D, ans] = r, kind = (type || "").toLowerCase();
      if (!q) { bad.push(i + 2); return; }
      if (/^(mc|multiple|choice)/.test(kind)) {
        const opts = [A, B, C, D].filter(Boolean).map(x => x.replace(/,/g, " ")); if (opts.length < 2) { bad.push(i + 2); return; }
        const L = (ans || "").trim(), idx = /^[a-d]$/i.test(L) ? "abcd".indexOf(L.toLowerCase()) : -1;
        const key = idx >= 0 ? ([A, B, C, D][idx] || "").replace(/,/g, " ") : (opts.find(o => o.toLowerCase() === L.toLowerCase()) || "");
        out.push({ q, type: "mc", opts: opts.join(", "), key });
      } else out.push({ q, type: "text", opts: "", key: ans || A || "" });
    });
    if (!out.length) return say("No questions found. Check the file follows the template.");
    draft.questions = draft.questions.filter(x => x.q.trim()).concat(out);
    if (!draft.title.trim()) draft.title = file.name.replace(/\.(xlsx|csv)$/i, "").replace(/[_-]+/g, " ").slice(0, 80);
    render(); say(`Added ${out.length} question${out.length === 1 ? "" : "s"} from the file.` + (bad.length ? ` Skipped row${bad.length === 1 ? "" : "s"} ${bad.join(", ")} (no question, or fewer than 2 choices).` : "") + " Check them, choose the classes, then press Send.");
  } catch (e) { say("Could not read the file: " + (e.message || e)); }
}
async function downloadTemplate() {
  try {
    await loadXl(); const wb = new ExcelJS.Workbook(), ws = wb.addWorksheet("Questions");
    ws.columns = [{ header: "Type", width: 9 }, { header: "Question", width: 46 }, { header: "A", width: 12 }, { header: "B", width: 12 }, { header: "C", width: 12 }, { header: "D", width: 12 }, { header: "Answer", width: 12 }];
    [["MC", "3 × 4 = ?", "7", "12", "34", "1", "B"], ["MC", "Which number is prime?", "9", "15", "17", "21", "C"], ["Blank", "5x + 2 = 17. x = ___", "", "", "", "", "3"], ["Blank", "Round 4.67 to 1 decimal place.", "", "", "", "", "4.7"]].forEach(r => ws.addRow(r));
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }; ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2F4FD6" } };
    const n = wb.addWorksheet("How to fill it"); n.getColumn(1).width = 95;
    ["One row per question. Keep the first row (the headings).", "Type: MC = multiple choice, Blank = fill in the blank.", "MC: write 2 to 4 choices in A, B, C, D. Answer = the letter of the right choice (A, B, C or D).", "Blank: leave A to D empty. Answer = the right answer (a number or a word).", "Save it as .xlsx (or .csv) and upload it in Classwork > New worksheet > Upload Excel / CSV."].forEach(t => n.addRow([t]));
    const b = new Blob([await wb.xlsx.writeBuffer()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "Worksheet template.xlsx"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  } catch (e) { const m = $("wkMsg"); if (m) m.textContent = "Could not make the template: " + (e.message || e); }
}
