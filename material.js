// "My material": each teacher keeps lists of lessons (one per quarter or term) and adds a link as each lesson is taught.
// A list is one document, <base>/work/material-<id> (the folder students already read for classwork, so no new database rules).
// Students see every lesson of every list; a lesson with links is "Available", the others are greyed as "Coming soon".
import { getDocs, setDoc, deleteDoc, bcol, bdoc } from "./fb.js?v=1111i";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- turn pasted text (from Excel, Word or plain lines) into units and lessons ---------- */
export function parseTable(text) {
  const rows = []; let row = [], cell = "", q = false;
  const t = String(text || "").replace(/\r\n?/g, "\n");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"' && cell === "") q = true;
    else if (c === "\t") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  row.push(cell); rows.push(row);
  const units = []; let cur = null, seq = 0;
  const isLesson = s => /^\d+(\.\d+)*[\s.:)\-–]/.test(s + " ") && !/^unit\b/i.test(s);
  const addUnit = title => { cur = units.find(u => u.title === title) || (units.push({ id: "u" + Date.now().toString(36) + "_" + (seq++), title, lessons: [] }), units[units.length - 1]); };
  const addLesson = s => {
    if (!cur) addUnit("Lessons");
    const m = s.match(/^(\d+(?:\.\d+)*)[\s.:)\-–]*(.*)$/); const code = m ? m[1] : "", title = (m ? m[2] : s).trim() || s;
    cur.lessons.push({ id: "l" + Date.now().toString(36) + "_" + (seq++), code, title, links: [], date: 0 });
  };
  for (const r of rows) {
    const cells = r.map(x => x.replace(/\s+/g, " ").trim()).filter(Boolean);
    if (!cells.length) continue;
    if (cells.length === 1) { isLesson(cells[0]) ? addLesson(cells[0]) : addUnit(cells[0]); }
    else { if (!isLesson(cells[0])) { addUnit(cells[0]); cells.slice(1).forEach(addLesson); } else cells.forEach(addLesson); }
  }
  return units.filter(u => u.lessons.length);
}
const mergeUnits = (base, add) => { add.forEach(u => { const m = base.find(x => x.title === u.title); if (m) m.lessons.push(...u.lessons); else base.push(u); }); return base; };

let lists = [], cur = "", adding = "", addUnit = "", msg = "", draft = { name: "", text: "", classes: null };
const modal = document.createElement("div");
modal.className = "modal"; modal.id = "matModal"; modal.hidden = true;
modal.innerHTML = '<div class="sheet wk-sheet" role="dialog" aria-modal="true" aria-label="My material"><div id="matBody"></div></div>';
document.body.appendChild(modal);
{ const st = document.createElement("style"); st.textContent = ".mt-unit{margin:16px 0 6px;font-size:17px}.mt-row{display:grid;gap:6px;padding:10px 12px;border:1px solid var(--line,#dde);border-radius:12px;margin:8px 0;background:var(--card,#fff)}.mt-row.soon{opacity:.8}.mt-h{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}.mt-code{font-weight:800;min-width:2.4em}.mt-chip{font-size:12px;padding:2px 9px;border-radius:99px;background:#e8eefc;color:#27418a;font-weight:700}.mt-chip.ok{background:#dcf5e5;color:#13683a}.mt-links{display:flex;gap:8px;flex-wrap:wrap}.mt-link{display:inline-flex;gap:6px;align-items:center;padding:4px 10px;border:1px solid var(--line,#dde);border-radius:99px;font-size:13px}.mt-link a{color:inherit;font-weight:700}.mt-x{border:0;background:none;cursor:pointer;font-size:15px;padding:0 2px;color:#a33}.mt-form{display:flex;gap:8px;flex-wrap:wrap}.mt-form input{flex:1 1 150px;min-width:0}.mt-cls{display:flex;gap:12px;flex-wrap:wrap;margin:8px 0}.mt-cls label{display:flex;gap:6px;align-items:center}.mt-ta{width:100%;min-height:130px;box-sizing:border-box;font:inherit;padding:10px;border-radius:10px;border:1px solid var(--line,#ccd)}.mt-card{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:12px 14px;border:1px solid var(--line,#dde);border-radius:12px;margin:8px 0;background:var(--card,#fff)}"; document.head.appendChild(st); }

const cleanUrl = u => { u = String(u || "").trim(); if (u && !/^https?:\/\//i.test(u)) u = "https://" + u; try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ""; } catch { return ""; } };
const saveList = l => setDoc(bdoc("work", l.id), { kind: "material", open: false, title: l.title, classes: l.classes, units: l.units, created: l.created || Date.now(), updated: Date.now() });
const count = l => { const all = l.units.flatMap(u => u.lessons); return [all.filter(x => (x.links || []).length).length, all.length]; };
const L = () => lists.find(l => l.id === cur);

async function load() {
  const s = await getDocs(bcol("work"));
  lists = s.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => x.kind === "material" && Array.isArray(x.units))
    .map(x => ({ ...x, title: x.title || "Quarter 2", classes: x.classes || [], created: x.created || 0 })).sort((a, b) => (b.created || 0) - (a.created || 0));
}
const clsBoxes = (sel, attr) => `<div class="mt-cls">${CLASSES.map(c => `<label><input type="checkbox" ${attr}="${esc(c)}"${sel.includes(c) ? " checked" : ""}> ${esc(c)}</label>`).join("")}</div>`;

function render() {
  const b = $("matBody"); if (!b) return;
  if (!cur) {
    const pv = parseTable(draft.text), nl = pv.reduce((a, u) => a + u.lessons.length, 0);
    if (!draft.classes) draft.classes = [...CLASSES];
    b.innerHTML = `<h3>My material</h3>
      <p>Make a list of lessons for each quarter. Students see every lesson, and a lesson opens for them when you add a link to it. Old quarters stay where they are.</p>
      ${lists.length ? lists.map(l => { const [h, n] = count(l); return `<div class="mt-card"><div><b>${esc(l.title)}</b><br><small>${h} of ${n} lessons have material · shown to ${esc((l.classes || []).join(", ") || "no class")}</small></div><div class="mt-form"><button class="primary small" type="button" data-mt="open" data-id="${esc(l.id)}">Open</button><button class="ghost small" type="button" data-mt="rename" data-id="${esc(l.id)}">Rename</button><button class="ghost small" type="button" data-mt="deletelist" data-id="${esc(l.id)}">Delete</button></div></div>`; }).join("") : `<p class="none">No lists yet. Make your first one below.</p>`}
      <h4 class="mt-unit">New list</h4>
      <input id="mtName" placeholder="Name, for example Quarter 3" maxlength="60" value="${esc(draft.name)}" style="width:100%;box-sizing:border-box;margin-bottom:8px">
      <textarea class="mt-ta" id="mtPaste" placeholder="Copy the units and lessons from your Excel sheet or Word table and paste them here.">${esc(draft.text)}</textarea>
      <p id="mtPrev">${nl ? `<b>${pv.length} unit${pv.length === 1 ? "" : "s"}, ${nl} lesson${nl === 1 ? "" : "s"}</b> found.` : "Nothing found yet. You can also make an empty list and add lessons one by one."}</p>
      <div><b>Shown to:</b>${clsBoxes(draft.classes, "data-mtnew")}</div>
      <div class="lg-bar"><button class="primary" type="button" data-mt="create">Make the list</button><button class="ghost" type="button" data-mt="close">Close</button></div>
      <p class="lg-msg" id="matMsg">${esc(msg)}</p>`;
    return;
  }
  const l = L(); if (!l) { cur = ""; return render(); }
  const [have, all] = count(l);
  b.innerHTML = `<div class="lg-bar"><button class="ghost small" type="button" data-mt="back">← All lists</button></div><h3>${esc(l.title)}</h3>
    <p>A lesson turns green for students, with its links, as soon as you add one. Use a share link from Google Drive (set to "Anyone with the link can view").</p>
    <p><b>${have} of ${all}</b> lessons have material.</p>
    <div><b>Shown to:</b>${clsBoxes(l.classes, "data-mtcls")}</div>
    ${l.units.map(u => `<h4 class="mt-unit">${esc(u.title)}</h4>${u.lessons.map(x => {
      const K = x.links || [];
      return `<div class="mt-row${K.length ? "" : " soon"}"><div class="mt-h"><span class="mt-code">${esc(x.code)}</span><b>${esc(x.title)}</b><span class="mt-chip${K.length ? " ok" : ""}">${K.length ? "Available" : "Coming soon"}</span></div>
        ${K.length ? `<div class="mt-links">${K.map((k, i) => `<span class="mt-link"><a href="${esc(k.url)}" target="_blank" rel="noopener">${esc(k.label)}</a><button class="mt-x" type="button" data-mt="rmlink" data-l="${esc(x.id)}" data-i="${i}" aria-label="Remove link">✕</button></span>`).join("")}</div>` : ""}
        ${adding === x.id ? `<div class="mt-form"><input id="mtLabel" placeholder="Name (Slides, Worksheet…)" maxlength="40"><input id="mtUrl" placeholder="Paste the link" inputmode="url"><button class="primary small" type="button" data-mt="savelink" data-l="${esc(x.id)}">Add</button><button class="ghost small" type="button" data-mt="cancel">Cancel</button></div>`
          : `<div class="mt-form"><button class="ghost small" type="button" data-mt="addlink" data-l="${esc(x.id)}">+ Add link</button><button class="ghost small" type="button" data-mt="rmlesson" data-l="${esc(x.id)}">Remove lesson</button></div>`}</div>`; }).join("")}
      ${addUnit === u.id ? `<div class="mt-form"><input id="mtCode" placeholder="Number (e.g. 4.4)" maxlength="8" style="flex:0 1 120px"><input id="mtTitle" placeholder="Lesson name" maxlength="80"><button class="primary small" type="button" data-mt="savelesson" data-u="${esc(u.id)}">Add lesson</button><button class="ghost small" type="button" data-mt="cancel">Cancel</button></div>` : `<button class="ghost small" type="button" data-mt="addlesson" data-u="${esc(u.id)}">+ Add lesson to this unit</button>`}`).join("")}
    <h4 class="mt-unit">Add more units and lessons</h4>
    <textarea class="mt-ta" id="mtMore" placeholder="Paste more units and lessons here."></textarea>
    <div class="lg-bar"><button class="ghost small" type="button" data-mt="addpaste">Add them to this list</button></div>
    <p class="lg-msg" id="matMsg">${esc(msg)}</p>
    <div class="lg-bar"><button class="ghost" type="button" data-mt="back">← All lists</button><button class="ghost" type="button" data-mt="close">Close</button></div>`;
}
async function commit(l, ok) { msg = "Saving…"; render(); try { await saveList(l); msg = ok || "Saved."; } catch (e) { msg = "Could not save (" + (e.code || e.message) + ")."; } render(); }
const find = id => { const l = L(); if (!l) return []; for (const u of l.units) { const x = u.lessons.find(y => y.id === id); if (x) return [u, x]; } return []; };

document.addEventListener("input", e => {
  if (e.target.id === "mtPaste") { draft.text = e.target.value; const pv = parseTable(draft.text), nl = pv.reduce((a, u) => a + u.lessons.length, 0); $("mtPrev").innerHTML = nl ? `<b>${pv.length} unit${pv.length === 1 ? "" : "s"}, ${nl} lesson${nl === 1 ? "" : "s"}</b> found.` : "Nothing found yet. You can also make an empty list and add lessons one by one."; }
  if (e.target.id === "mtName") draft.name = e.target.value;
});
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-mt]"); if (!b || modal.hidden) return;
  const a = b.dataset.mt, [u, x] = find(b.dataset.l), l = L();
  if (a === "close") { modal.hidden = true; return; }
  if (a === "back") { cur = ""; adding = ""; addUnit = ""; msg = ""; render(); return; }
  if (a === "open") { cur = b.dataset.id; msg = ""; render(); return; }
  if (a === "create") {
    const name = ($("mtName").value || "").trim(); if (!name) { msg = "Type a name for the list, for example Quarter 3."; render(); return; }
    const nl = { id: "material-" + Date.now().toString(36), title: name, classes: [...draft.classes], units: parseTable(draft.text), created: Date.now() };
    if (!nl.units.length) nl.units = [{ id: "u" + Date.now().toString(36), title: "Lessons", lessons: [] }];
    msg = "Saving…"; render();
    try { await saveList(nl); lists.unshift(nl); cur = nl.id; draft = { name: "", text: "", classes: null }; msg = "List made. Students can see it now."; } catch (er) { msg = "Could not save (" + (er.code || er.message) + ")."; }
    render(); return;
  }
  if (a === "rename") { const t = prompt("New name for this list", (lists.find(y => y.id === b.dataset.id) || {}).title || ""); const li = lists.find(y => y.id === b.dataset.id); if (li && t && t.trim()) { li.title = t.trim().slice(0, 60); await commit(li, "Renamed."); } return; }
  if (a === "deletelist") { const li = lists.find(y => y.id === b.dataset.id); if (!li || !confirm('Delete "' + li.title + '" and all its links? Students will no longer see it.')) return; try { await deleteDoc(bdoc("work", li.id)); lists = lists.filter(y => y.id !== li.id); msg = "Deleted."; } catch (er) { msg = "Could not delete (" + (er.code || er.message) + ")."; } render(); return; }
  if (!l) return;
  if (a === "addlink") { adding = b.dataset.l; render(); const i = $("mtLabel"); if (i) i.focus(); return; }
  if (a === "cancel") { adding = ""; addUnit = ""; render(); return; }
  if (a === "savelink" && x) {
    const url = cleanUrl($("mtUrl").value), label = ($("mtLabel").value || "").trim() || "Material";
    if (!url) { msg = "That does not look like a web link."; render(); return; }
    x.links = [...(x.links || []), { label, url }]; if (!x.date) x.date = Date.now(); adding = ""; await commit(l, "Added. Students can open it now."); return;
  }
  if (a === "rmlink" && x) { if (!confirm("Remove this link?")) return; x.links.splice(+b.dataset.i, 1); await commit(l, "Removed."); return; }
  if (a === "rmlesson" && u) { if (!confirm("Remove this lesson from the list?")) return; u.lessons = u.lessons.filter(y => y.id !== x.id); await commit(l, "Removed."); return; }
  if (a === "addlesson") { addUnit = b.dataset.u; render(); const i = $("mtCode"); if (i) i.focus(); return; }
  if (a === "savelesson") {
    const un = l.units.find(y => y.id === b.dataset.u), code = ($("mtCode").value || "").trim(), title = ($("mtTitle").value || "").trim();
    if (!un || !title) { msg = "Type the lesson name."; render(); return; }
    un.lessons.push({ id: "l" + Date.now().toString(36), code, title, links: [], date: 0 }); addUnit = ""; await commit(l, "Lesson added."); return;
  }
  if (a === "addpaste") {
    const add = parseTable($("mtMore").value); if (!add.length) { msg = "Nothing found to add."; render(); return; }
    mergeUnits(l.units, add); await commit(l, "Added."); return;
  }
});
document.addEventListener("change", async e => {
  const n = e.target.closest && e.target.closest("[data-mtnew]"); if (n) { const k = n.dataset.mtnew; draft.classes = n.checked ? [...new Set([...draft.classes, k])] : draft.classes.filter(y => y !== k); return; }
  const c = e.target.closest && e.target.closest("[data-mtcls]"), l = L(); if (!c || !l) return;
  const k = c.dataset.mtcls; l.classes = c.checked ? [...new Set([...l.classes, k])] : l.classes.filter(y => y !== k);
  await commit(l, "Saved.");
});
modal.addEventListener("click", e => { if (e.target === modal) modal.hidden = true; });

export async function openMaterial() {
  modal.hidden = false; $("matBody").innerHTML = "<p>Loading…</p>"; cur = ""; adding = ""; addUnit = ""; msg = "";
  try { await load(); } catch (e) { $("matBody").innerHTML = `<p class="lg-msg">Could not load (${esc(e.code || e.message)}).</p><button class="ghost" data-mt="close">Close</button>`; return; }
  render();
}
