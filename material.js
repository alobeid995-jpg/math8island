// "My material": the quarter's lesson list, with the links the teacher adds as he teaches each lesson.
// It is one document, <base>/work/material (the same folder students already read for classwork, so no new database rules).
// Students see every lesson; a lesson with links is "Available", the others are greyed as "Coming soon".
import { getDoc, setDoc, bdoc } from "./fb.js?v=1110n";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const DEFAULT_UNITS = [
  { id: "u4", title: "Unit 4: Equations and Inequalities", lessons: [["4.1", "Constructing and solving equations"], ["4.2", "Simultaneous equations"], ["4.3", "Inequalities"]] },
  { id: "u5", title: "Unit 5: Angles", lessons: [["5.1", "Calculating angles"], ["5.2", "Interior angles of polygons"], ["5.3", "Exterior angles of polygons"], ["5.5", "Pythagoras’ theorem"]] },
  { id: "u7", title: "Unit 7: Shapes and measurements", lessons: [["7.1", "Circumference and area of a circle"], ["7.2", "Areas of compound shapes"]] }
].map(u => ({ id: u.id, title: u.title, lessons: u.lessons.map(([code, title]) => ({ id: "l" + code.replace(".", "_"), code, title, links: [], date: 0 })) }));

let data = null, adding = "", addUnit = "", msg = "";
const modal = document.createElement("div");
modal.className = "modal"; modal.id = "matModal"; modal.hidden = true;
modal.innerHTML = '<div class="sheet wk-sheet" role="dialog" aria-modal="true" aria-label="My material"><div id="matBody"></div></div>';
document.body.appendChild(modal);
{ const st = document.createElement("style"); st.textContent = ".mt-unit{margin:16px 0 6px;font-size:17px}.mt-row{display:grid;gap:6px;padding:10px 12px;border:1px solid var(--line,#dde);border-radius:12px;margin:8px 0;background:var(--card,#fff)}.mt-row.soon{opacity:.8}.mt-h{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}.mt-code{font-weight:800;min-width:2.4em}.mt-chip{font-size:12px;padding:2px 9px;border-radius:99px;background:#e8eefc;color:#27418a;font-weight:700}.mt-chip.ok{background:#dcf5e5;color:#13683a}.mt-links{display:flex;gap:8px;flex-wrap:wrap}.mt-link{display:inline-flex;gap:6px;align-items:center;padding:4px 10px;border:1px solid var(--line,#dde);border-radius:99px;font-size:13px}.mt-link a{color:inherit;font-weight:700}.mt-x{border:0;background:none;cursor:pointer;font-size:15px;padding:0 2px;color:#a33}.mt-form{display:flex;gap:8px;flex-wrap:wrap}.mt-form input{flex:1 1 150px;min-width:0}.mt-cls{display:flex;gap:12px;flex-wrap:wrap;margin:8px 0}.mt-cls label{display:flex;gap:6px;align-items:center}"; document.head.appendChild(st); }

const cleanUrl = u => { u = String(u || "").trim(); if (u && !/^https?:\/\//i.test(u)) u = "https://" + u; try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ""; } catch { return ""; } };
const save = async () => { await setDoc(bdoc("work", "material"), { kind: "material", open: false, classes: data.classes, units: data.units, updated: Date.now() }); };

async function load() {
  const s = await getDoc(bdoc("work", "material"));
  if (s.exists() && Array.isArray(s.data().units)) data = { classes: s.data().classes || [], units: s.data().units };
  else { data = { classes: CLASSES.filter(c => /^8/i.test(c)), units: DEFAULT_UNITS }; await save(); }   // saved at once, so students see the list straight away
}
function render() {
  const b = $("matBody"); if (!data) return;
  const all = data.units.flatMap(u => u.lessons), have = all.filter(l => (l.links || []).length).length;
  b.innerHTML = `<h3>My material</h3>
    <p>Students see every lesson below. A lesson turns green with its links as soon as you add one. Use a share link from Google Drive (set to "Anyone with the link can view").</p>
    <p><b>${have} of ${all.length}</b> lessons have material.</p>
    <div><b>Shown to:</b><div class="mt-cls">${CLASSES.map(c => `<label><input type="checkbox" data-mtcls="${esc(c)}"${data.classes.includes(c) ? " checked" : ""}> ${esc(c)}</label>`).join("")}</div></div>
    ${data.units.map(u => `<h4 class="mt-unit">${esc(u.title)}</h4>${u.lessons.map(l => {
      const L = l.links || [];
      return `<div class="mt-row${L.length ? "" : " soon"}"><div class="mt-h"><span class="mt-code">${esc(l.code)}</span><b>${esc(l.title)}</b><span class="mt-chip${L.length ? " ok" : ""}">${L.length ? "Available" : "Coming soon"}</span></div>
        ${L.length ? `<div class="mt-links">${L.map((k, i) => `<span class="mt-link"><a href="${esc(k.url)}" target="_blank" rel="noopener">${esc(k.label)}</a><button class="mt-x" type="button" data-mt="rmlink" data-l="${esc(l.id)}" data-i="${i}" aria-label="Remove link">✕</button></span>`).join("")}</div>` : ""}
        ${adding === l.id ? `<div class="mt-form"><input id="mtLabel" placeholder="Name (Slides, Worksheet…)" maxlength="40"><input id="mtUrl" placeholder="Paste the link" inputmode="url"><button class="primary small" type="button" data-mt="savelink" data-l="${esc(l.id)}">Add</button><button class="ghost small" type="button" data-mt="cancel">Cancel</button></div>`
          : `<div class="mt-form"><button class="ghost small" type="button" data-mt="addlink" data-l="${esc(l.id)}">+ Add link</button><button class="ghost small" type="button" data-mt="rmlesson" data-l="${esc(l.id)}">Remove lesson</button></div>`}</div>`; }).join("")}
      ${addUnit === u.id ? `<div class="mt-form"><input id="mtCode" placeholder="Number (e.g. 4.4)" maxlength="8" style="flex:0 1 120px"><input id="mtTitle" placeholder="Lesson name" maxlength="80"><button class="primary small" type="button" data-mt="savelesson" data-u="${esc(u.id)}">Add lesson</button><button class="ghost small" type="button" data-mt="cancel">Cancel</button></div>` : `<button class="ghost small" type="button" data-mt="addlesson" data-u="${esc(u.id)}">+ Add lesson to this unit</button>`}`).join("")}
    <p class="lg-msg" id="matMsg">${esc(msg)}</p>
    <div class="lg-bar"><button class="ghost" type="button" data-mt="close">Close</button></div>`;
}
async function commit(ok) { msg = "Saving…"; render(); try { await save(); msg = ok || "Saved."; } catch (e) { msg = "Could not save (" + (e.code || e.message) + ")."; } render(); }
const find = id => { for (const u of data.units) { const l = u.lessons.find(x => x.id === id); if (l) return [u, l]; } return []; };

document.addEventListener("click", async e => {
  const b = e.target.closest("[data-mt]"); if (!b || !data) return;
  const a = b.dataset.mt, [u, l] = find(b.dataset.l);
  if (a === "close") { modal.hidden = true; return; }
  if (a === "addlink") { adding = b.dataset.l; render(); const i = $("mtLabel"); if (i) i.focus(); return; }
  if (a === "cancel") { adding = ""; addUnit = ""; render(); return; }
  if (a === "savelink" && l) {
    const url = cleanUrl($("mtUrl").value), label = ($("mtLabel").value || "").trim() || "Material";
    if (!url) { msg = "That does not look like a web link."; render(); return; }
    l.links = [...(l.links || []), { label, url }]; if (!l.date) l.date = Date.now(); adding = ""; await commit("Added. Students can open it now."); return;
  }
  if (a === "rmlink" && l) { if (!confirm("Remove this link?")) return; l.links.splice(+b.dataset.i, 1); await commit("Removed."); return; }
  if (a === "rmlesson" && u) { if (!confirm("Remove this lesson from the list?")) return; u.lessons = u.lessons.filter(x => x.id !== l.id); await commit("Removed."); return; }
  if (a === "addlesson") { addUnit = b.dataset.u; render(); const i = $("mtCode"); if (i) i.focus(); return; }
  if (a === "savelesson") {
    const un = data.units.find(x => x.id === b.dataset.u), code = ($("mtCode").value || "").trim(), title = ($("mtTitle").value || "").trim();
    if (!un || !code || !title) { msg = "Type the lesson number and name."; render(); return; }
    un.lessons.push({ id: "l" + Date.now().toString(36), code, title, links: [], date: 0 }); addUnit = ""; await commit("Lesson added."); return;
  }
});
document.addEventListener("change", async e => {
  const c = e.target.closest && e.target.closest("[data-mtcls]"); if (!c || !data) return;
  const k = c.dataset.mtcls; data.classes = c.checked ? [...new Set([...data.classes, k])] : data.classes.filter(x => x !== k);
  await commit("Saved.");
});
modal.addEventListener("click", e => { if (e.target === modal) modal.hidden = true; });

export async function openMaterial() {
  modal.hidden = false; $("matBody").innerHTML = "<p>Loading…</p>"; adding = ""; addUnit = ""; msg = "";
  try { await load(); } catch (e) { $("matBody").innerHTML = `<p class="lg-msg">Could not load (${esc(e.code || e.message)}).</p><button class="ghost" data-mt="close">Close</button>`; return; }
  render();
}
