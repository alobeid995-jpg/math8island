// Classwork for the teacher: make a worksheet, send it to classes, collect and export the answers.
// Worksheets live in <base>/work, the answer key in <base>/workkey (students never read it),
// and each student's submission in <base>/subs/<worksheet>_<student>.
import { getDocs, setDoc, updateDoc, deleteDoc, getDoc, bcol, bdoc } from "./fb.js?v=1111p";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = s => String(s ?? "").trim().toLowerCase().replace(/\s+/g, "").replace(/×/g, "x").replace(/−/g, "-");
const same = (a, b) => { const x = norm(a), y = norm(b); if (!x || !y) return false; if (x === y) return true; const n = Number(x), m = Number(y); return x !== "" && !isNaN(n) && !isNaN(m) && Math.abs(n - m) < 1e-9; };
const when = t => t ? new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

let works = [], subs = [], keys = new Map(), view = "list", cur = null, draft = null;

async function load() {
  const [w, s, k] = await Promise.all([getDocs(bcol("work")), getDocs(bcol("subs")), getDocs(bcol("workkey"))]);
  works = w.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => x.kind !== "material" && x.kind !== "announcement" && x.kind !== "funpark").sort((a, b) => (b.created || 0) - (a.created || 0));
  subs = s.docs.map(d => ({ id: d.id, ...d.data() }));
  keys = new Map(k.docs.map(d => [d.id, d.data().answers || []]));
}
const stuOf = w => students.filter(s => (w.classes || []).includes(s.cls)).sort((a, b) => a.cls.localeCompare(b.cls) || a.name.localeCompare(b.name));
const subOf = (w, sid) => subs.find(x => x.wid === w.id && x.sid === sid);
function score(w, sub) {
  const key = keys.get(w.id) || [], marked = key.map((k, i) => k ? same(sub.answers[i], k) : null);
  const n = marked.filter(x => x !== null).length;
  return { marked, right: marked.filter(x => x === true).length, n };
}

/* ---------- views ---------- */
function render() {
  const b = $("wkBody");
  if (view === "list") {
    b.innerHTML = `<h3>Classwork</h3>
      <p class="noprint">Make a worksheet, send it to one class or all of them. Students find it when they log in. Their answers and the time they handed in stay here as evidence.</p>
      <div class="lg-bar"><button class="primary" type="button" data-wk="new">+ New worksheet</button><button class="ghost" type="button" data-wk="close">Close</button></div>
      ${works.length ? `<table class="lg-tbl wk-list"><thead><tr><th>Worksheet</th><th>Classes</th><th>Handed in</th><th></th></tr></thead><tbody>${works.map(w => {
        const all = stuOf(w), done = all.filter(s => subOf(w, s.id)).length;
        return `<tr><td><b>${esc(w.title)}</b><br><small>${(w.questions || []).length} questions · ${esc(when(w.created))}${w.open === false ? " · <b>closed</b>" : ""}</small></td><td>${esc((w.classes || []).join(", "))}</td><td>${done} / ${all.length}</td>
          <td class="wk-acts"><button class="primary small" type="button" data-wk="res" data-id="${w.id}">Answers</button><button class="ghost small" type="button" data-wk="toggle" data-id="${w.id}">${w.open === false ? "Open again" : "Close it"}</button><button class="ghost small" type="button" data-wk="del" data-id="${w.id}">Delete</button></td></tr>`;
      }).join("")}</tbody></table>` : `<p class="none">No worksheets yet. Tap "New worksheet" to make the first one.</p>`}`;
  } else if (view === "edit") {
    const d = draft;
    b.innerHTML = `<h3>New worksheet</h3>
      <label class="wk-f">Title<input id="wkTitle" maxlength="80" value="${esc(d.title)}" placeholder="e.g. Simultaneous equations · practice 1"></label>
      <div class="wk-f">Send to <div class="wk-cls">${CLASSES.map(c => `<label><input type="checkbox" data-wkcls="${esc(c)}" ${d.classes.includes(c) ? "checked" : ""}> ${esc(c)}</label>`).join("")}
        <button class="ghost small" type="button" data-wk="allcls">All my classes</button></div></div>
      <ol class="wk-qs">${d.questions.map((q, i) => `<li>
        <textarea data-wkq="${i}" data-k="q" rows="2" maxlength="600" placeholder="Question ${i + 1}">${esc(q.q)}</textarea>
        <div class="wk-row"><select data-wkq="${i}" data-k="type"><option value="text" ${q.type === "text" ? "selected" : ""}>Answer box</option><option value="mc" ${q.type === "mc" ? "selected" : ""}>Multiple choice</option></select>
          ${q.type === "mc" ? `<input data-wkq="${i}" data-k="opts" value="${esc(q.opts)}" placeholder="Choices, separated by commas: 3, 5, 7, 9">` : ""}
          <input data-wkq="${i}" data-k="key" value="${esc(q.key)}" placeholder="Correct answer (optional, for automatic marking)">
          <button class="ghost small" type="button" data-wk="delq" data-i="${i}" aria-label="Remove question ${i + 1}">Remove</button></div></li>`).join("")}</ol>
      <div class="lg-bar"><button class="ghost" type="button" data-wk="addq">+ Add question</button></div>
      <div class="lg-msg" id="wkMsg"></div>
      <div class="acts"><button class="primary" type="button" data-wk="save">Send to students</button><button class="ghost" type="button" data-wk="back">Cancel</button></div>`;
  } else if (view === "res") {
    const w = works.find(x => x.id === cur); if (!w) { view = "list"; return render(); }
    const all = stuOf(w), qs = w.questions || [], hasKey = (keys.get(w.id) || []).some(Boolean);
    const rows = all.map(s => ({ s, sub: subOf(w, s.id) })), done = rows.filter(r => r.sub);
    b.innerHTML = `<h3>${esc(w.title)}</h3>
      <p>${esc((w.classes || []).join(", "))} · ${done.length} of ${all.length} handed in · made ${esc(when(w.created))}</p>
      <div class="lg-bar noprint"><button class="primary" type="button" data-wk="csv">Download Excel file</button><button class="ghost" type="button" data-wk="print">Print / save PDF</button><button class="ghost" type="button" data-wk="back">Back</button></div>
      <div class="wk-res"><table class="lg-tbl"><thead><tr><th>Name</th><th>Class</th><th>Handed in</th>${hasKey ? "<th>Mark</th>" : ""}${qs.map((q, i) => `<th title="${esc(q.q)}">Q${i + 1}</th>`).join("")}</tr></thead><tbody>
        ${rows.map(({ s, sub }) => { if (!sub) return `<tr class="wk-miss"><td>${esc(s.name)}</td><td>${esc(s.cls)}</td><td>not yet</td>${hasKey ? "<td></td>" : ""}${qs.map(() => "<td></td>").join("")}</tr>`;
          const sc = score(w, sub);
          return `<tr><td>${esc(s.name)}</td><td>${esc(s.cls)}</td><td>${esc(when(sub.at))}</td>${hasKey ? `<td><b>${sc.right}/${sc.n}</b></td>` : ""}${qs.map((q, i) => `<td class="${sc.marked[i] === true ? "wk-ok" : sc.marked[i] === false ? "wk-no" : ""}">${esc(sub.answers[i] || "")}</td>`).join("")}</tr>`; }).join("")}
      </tbody></table></div>
      <details class="wk-q"><summary>Questions${hasKey ? " and correct answers" : ""}</summary><ol>${qs.map((q, i) => `<li>${esc(q.q)}${q.opts && q.opts.length ? ` <small>(${esc(q.opts.join(" · "))})</small>` : ""}${(keys.get(w.id) || [])[i] ? ` → <b>${esc(keys.get(w.id)[i])}</b>` : ""}</li>`).join("")}</ol></details>`;
  }
}

function readDraft() {
  if (view !== "edit") return;
  draft.title = ($("wkTitle") || {}).value || "";
  draft.classes = [...document.querySelectorAll("[data-wkcls]")].filter(x => x.checked).map(x => x.dataset.wkcls);
  document.querySelectorAll("[data-wkq]").forEach(el => { draft.questions[+el.dataset.wkq][el.dataset.k] = el.value; });
}

function csv(w) {
  const qs = w.questions || [], key = keys.get(w.id) || [], hasKey = key.some(Boolean);
  const cell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Name", "Student ID", "Class", "Handed in", ...(hasKey ? ["Mark", "Out of"] : []), ...qs.map((q, i) => `Q${i + 1}: ${q.q}`)];
  const lines = [head.map(cell).join(",")];
  stuOf(w).forEach(s => {
    const sub = subOf(w, s.id), sc = sub && score(w, sub);
    lines.push([s.name, s.enrollment || "", s.cls, sub ? new Date(sub.at).toLocaleString("en-GB") : "not handed in", ...(hasKey ? [sc ? sc.right : "", sc ? sc.n : ""] : []), ...qs.map((q, i) => sub ? sub.answers[i] || "" : "")].map(cell).join(","));
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
    await setDoc(bdoc("work", id), { title: d.title.trim(), classes: d.classes, questions, open: true, created: Date.now() });
  } catch (e) { return say("Could not send: " + (e.code || e.message) + ". Check that the new Firebase rules are published."); }
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
  if (a === "close") { $("workModal").hidden = true; return; }
  if (a === "new") { draft = { title: "", classes: CLASSES.includes(cls) ? [cls] : [], questions: [{ q: "", type: "text", opts: "", key: "" }] }; view = "edit"; return render(); }
  if (a === "back") { view = "list"; await load(); return render(); }
  if (a === "allcls") { readDraft(); draft.classes = CLASSES.slice(); return render(); }
  if (a === "addq") { readDraft(); draft.questions.push({ q: "", type: "text", opts: "", key: "" }); render(); const t = document.querySelectorAll("[data-k='q']"); t[t.length - 1].focus(); return; }
  if (a === "delq") { readDraft(); draft.questions.splice(+b.dataset.i, 1); if (!draft.questions.length) draft.questions.push({ q: "", type: "text", opts: "", key: "" }); return render(); }
  if (a === "save") { b.disabled = true; await saveDraft(); b.disabled = false; return; }
  if (a === "res" && w) { cur = w.id; view = "res"; await load(); return render(); }
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

export async function openWork() {
  $("workModal").hidden = false; view = "list"; $("wkBody").innerHTML = "<p>Loading…</p>";
  try { await load(); } catch (e) { $("wkBody").innerHTML = `<p class="lg-msg">Could not load classwork (${esc(e.code || e.message)}). Check that the new Firebase rules are published.</p><button class="ghost" data-wk="close">Close</button>`; return; }
  render();
}
