// School students (owner only): the one list of all Middle School boys that every teacher will share.
// Stage 1: upload the school list (Excel/CSV: Student ID, Name, Class, Program), see how it matches your own students, then save.
// The list lives in "pupils" (one document per student, id = school ID). Your own students are matched by ID (or by name, after you confirm).
import { fs, collection, getDocs } from "./fb.js?v=1123u";
import { setMany } from "./sbdata.js?v=1123u";
import { readFile } from "./live.js?v=1123u";

const $ = id => document.getElementById(id);
const E = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const tc = s => String(s || "").toLowerCase().replace(/(^|[\s\-'.])(\p{L})/gu, (x, a, c) => a + c.toUpperCase()).replace(/\s+/g, " ").trim();
const VAR = { abdullah: "abdulla", abdalla: "abdulla", abdallah: "abdulla", mohammed: "mohamed", muhammad: "mohamed", mohammad: "mohamed", mohamad: "mohamed", muhammed: "mohamed", ahmad: "ahmed", yusuf: "yousef", yousif: "yousef", yusif: "yousef", youssef: "yousef", hassan: "hasan", ibrahim: "ebrahim", hussain: "hussein", husain: "hussein", hosain: "hussein", khaled: "khalid", saud: "saud", eisa: "isa", essa: "isa", faisal: "faisal", rashid: "rashed", majid: "majed", sultan: "sultan", jasim: "jassim", jasem: "jassim", hamad: "hamad", nasser: "naser", nasir: "naser" };
const toks = n => { const t = String(n || "").toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean); const o = []; for (let i = 0; i < t.length; i++) { let w = t[i]; if ((w === "al" || w === "el" || w === "bin" || w === "bu") && t[i + 1]) { w = w + t[++i]; } o.push(VAR[w] || w); } return o; };
const progOf = p => { p = String(p || "").replace(/\s+/g, " ").trim(); return /^esu$/i.test(p) ? "ESU" : /arabic\s*esu/i.test(p) ? "Arabic ESU" : ""; };

let box = null, pupils = [], plan = null, msg = "", q = "";
const mine = () => (typeof students !== "undefined" ? students : []);

function css() {
  if ($("schCss")) return;
  const s = document.createElement("style"); s.id = "schCss";
  s.textContent = `#schModal .sheet{width:min(860px,100%);max-height:94vh;overflow:auto}
#schModal .sch-sum{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}#schModal .sch-sum span{background:var(--accent-soft,#eaf2ff);border-radius:99px;padding:4px 12px;font-weight:700;font-size:13px}
#schModal .sch-box{border:1px solid var(--line,#d6e2f6);border-radius:14px;padding:12px 14px;margin:10px 0}#schModal .sch-box h4{margin:0 0 8px}
#schModal .sch-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:5px 0;border-bottom:1px solid var(--line,#eef3fb);font-size:14px}#schModal .sch-row:last-child{border-bottom:0}
#schModal .sch-row small{color:var(--muted,#5a6b8a)}#schModal .esu{font-size:11px;font-weight:800;border-radius:99px;padding:1px 8px;background:#fff1c9;color:#6b4a00}#schModal .esu.ar{background:#e3f2fd;color:#0d47a1}
#schModal .sch-cls{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
#schModal .sch-msg{min-height:1.3em;font-weight:700;margin:8px 0}#schModal .sch-msg.bad{color:#b3261e}#schModal .sch-msg.ok{color:#0b7a5a}
#schModal input[type=search]{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid var(--line,#d6e2f6);border-radius:12px;font:inherit}`;
  document.head.appendChild(s);
}
const tag = p => p ? `<span class="esu${p === "Arabic ESU" ? " ar" : ""}">${E(p)}</span>` : "";

async function load() { try { const s = await getDocs(collection(fs, "pupils")); pupils = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => String(a.cls).localeCompare(String(b.cls)) || String(a.name).localeCompare(String(b.name))); } catch (e) { pupils = []; msg = "Could not read the school list (" + (e.code || e.message) + ")."; } }

/* read the uploaded sheet: columns Student ID, Name, Class, Program (any order; a header row is needed) */
function parse(text) {
  const rows = []; let row = [], cur = "", qt = false; text = String(text || "").replace(/\r/g, "");
  const d = (text.split("\n")[0] || "").includes("\t") ? "\t" : ",";
  for (let i = 0; i < text.length; i++) { const ch = text[i];
    if (qt) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else qt = false; } else cur += ch; }
    else if (ch === '"' && cur === "") qt = true; else if (ch === d) { row.push(cur); cur = ""; } else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; } else cur += ch; }
  row.push(cur); rows.push(row);
  const R = rows.map(r => r.map(c => c.trim())).filter(r => r.some(Boolean)); if (!R.length) return [];
  const h = R[0].map(c => c.toLowerCase()), f = re => h.findIndex(c => re.test(c));
  const ix = { id: f(/id|number|no\b|enrol/), name: f(/name/), cls: f(/class|section|group/), prog: f(/program|programme|stream|esu/) };
  if (ix.id < 0 || ix.name < 0 || ix.cls < 0) return null;
  return R.slice(1).map(r => ({ id: String(r[ix.id] || "").trim(), name: tc(r[ix.name]), cls: String(r[ix.cls] || "").trim().toUpperCase(), prog: progOf(ix.prog >= 0 ? r[ix.prog] : "") })).filter(x => /^[\w-]{3,}$/.test(x.id) && x.name && x.cls);
}

/* how the list matches the teacher's own students */
function makePlan(list) {
  const byId = new Map(list.map(p => [p.id, p])), used = new Set(), ownCls = new Set(list.map(p => p.cls));
  const own = mine().filter(s => ownCls.has(s.cls));
  const idMatch = [], nameMatch = [], noMatch = [], moved = [];
  own.forEach(s => { const id = String(s.enrollment || "").trim(); const p = id && byId.get(id);
    if (p) { idMatch.push({ s, p }); used.add(p.id); if (p.cls !== s.cls) moved.push({ s, p }); } });
  own.filter(s => !idMatch.some(m => m.s === s)).forEach(s => {
    const a = toks(s.name); if (!a.length) { noMatch.push(s); return; }
    const cand = list.filter(p => !used.has(p.id) && p.cls === s.cls).map(p => { const b = toks(p.name); const first = b[0] === a[0], last = a.length > 1 && b.includes(a[a.length - 1]), all = a.every(w => b.includes(w)); return { p, sc: (first ? 2 : 0) + (last ? 2 : 0) + (all ? 1 : 0) }; }).filter(x => x.sc >= 2).sort((x, y) => y.sc - x.sc);
    if (cand.length && (cand.length === 1 || cand[0].sc > cand[1].sc)) { nameMatch.push({ s, p: cand[0].p, ok: cand[0].sc >= 4 }); used.add(cand[0].p.id); } else noMatch.push(s);
  });
  // students of the school list who are in one of my classes but not yet in my list (ESU students are not added: they do not come to Maths)
  const myCls = new Set(typeof CLASSES !== "undefined" ? CLASSES : []);
  const missing = list.filter(p => myCls.has(p.cls) && !used.has(p.id) && p.prog !== "ESU");
  return { list, idMatch, nameMatch, noMatch, moved, missing, addMissing: true };
}

function paint() {
  const b = $("schBody"); if (!b) return;
  const top = `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h3 id="schTitle" style="margin:0">School students · Middle School boys</h3><button class="ghost small" type="button" data-sch="close">Close</button></div>`;
  if (plan) {
    const P = plan, byCls = {}; P.list.forEach(p => { (byCls[p.cls] = byCls[p.cls] || { n: 0, e: 0, a: 0 }); byCls[p.cls].n++; if (p.prog === "ESU") byCls[p.cls].e++; if (p.prog === "Arabic ESU") byCls[p.cls].a++; });
    b.innerHTML = top + `<p>Check this before saving. Nothing changes until you press <b>Save</b>.</p>
      <div class="sch-sum"><span>${P.list.length} students</span>${Object.keys(byCls).sort().map(c => `<span>${E(c)}: ${byCls[c].n}${byCls[c].e ? " · " + byCls[c].e + " ESU" : ""}</span>`).join("")}</div>
      <div class="sch-box"><h4>✓ Matched by student ID (${P.idMatch.length})</h4><small>These of your students keep everything (XP, avatar, shop).</small>
        ${P.moved.length ? `<p><b>Class is different in the school list (${P.moved.length})</b> — they stay in your class for now:</p>${P.moved.map(m => `<div class="sch-row"><b>${E(m.s.name)}</b><small>yours: ${E(m.s.cls)} · school list: ${E(m.p.cls)}</small></div>`).join("")}` : ""}</div>
      ${P.nameMatch.length ? `<div class="sch-box"><h4>? Matched by name (${P.nameMatch.length}) — tick the ones that are right</h4>${P.nameMatch.map((m, i) => `<label class="sch-row"><input type="checkbox" data-schnm="${i}" ${m.ok ? "checked" : ""}><b>${E(m.s.name)}</b> <small>${E(m.s.cls)}</small> → <b>${E(m.p.name)}</b> <small>${E(m.p.id)}</small> ${tag(m.p.prog)}</label>`).join("")}</div>` : ""}
      ${P.noMatch.length ? `<div class="sch-box"><h4>✗ Not found in the school list (${P.noMatch.length})</h4><small>They stay in your list as they are. You can give them their school ID later.</small>${P.noMatch.map(s => `<div class="sch-row"><b>${E(s.name)}</b><small>${E(s.cls)}${s.enrollment ? " · " + E(s.enrollment) : ""}</small></div>`).join("")}</div>` : ""}
      ${P.missing.length ? `<div class="sch-box"><h4>+ In your classes but not in your list (${P.missing.length})</h4><label class="sch-row"><input type="checkbox" data-schadd ${P.addMissing ? "checked" : ""}> <b>Add them to my classes</b> <small>(ESU students are left out: they do not come to Maths)</small></label>${P.missing.map(p => `<div class="sch-row"><b>${E(p.name)}</b><small>${E(p.cls)} · ${E(p.id)}</small> ${tag(p.prog)}</div>`).join("")}</div>` : ""}
      <p class="sch-msg ${msg.startsWith("✓") ? "ok" : msg ? "bad" : ""}" role="status">${E(msg)}</p>
      <div class="acts"><button class="primary" type="button" data-sch="save">Save</button><button class="ghost" type="button" data-sch="cancel">Cancel</button></div>`;
    return;
  }
  const qq = q.trim().toLowerCase(), list = qq ? pupils.filter(p => (p.name + " " + p.id + " " + p.cls).toLowerCase().includes(qq)) : pupils;
  const byCls = {}; list.forEach(p => (byCls[p.cls] = byCls[p.cls] || []).push(p));
  b.innerHTML = top + `<p>One list of every student. Teachers who join will get their classes from here, and a student's XP, wallet and shop will be shared by all his teachers.</p>
    <div class="sbtns" style="justify-content:flex-start"><label class="primary" style="cursor:pointer;display:inline-flex;align-items:center;padding:10px 16px;border-radius:12px">📂 ${pupils.length ? "Upload an updated list" : "Upload the school list (Excel or CSV)"}<input type="file" id="schFile" accept=".xlsx,.xls,.csv,.txt" hidden></label></div>
    <p class="sch-msg ${msg.startsWith("✓") ? "ok" : msg ? "bad" : ""}" role="status">${E(msg)}</p>
    ${pupils.length ? `<div class="sch-sum"><span>${pupils.length} students</span><span>${new Set(pupils.map(p => p.cls)).size} classes</span><span>${pupils.filter(p => p.prog === "ESU").length} ESU</span><span>${pupils.filter(p => p.prog === "Arabic ESU").length} Arabic ESU</span></div>
      <input type="search" id="schQ" placeholder="Find a student, an ID or a class" value="${E(q)}" aria-label="Find a student">
      <div class="sch-cls" style="margin-top:10px">${Object.keys(byCls).sort().map(c => `<div class="sch-box"><h4>${E(c)} <small>· ${byCls[c].length}</small></h4>${byCls[c].map(p => `<div class="sch-row"><span>${E(p.name)}</span><small>${E(p.id)}</small>${tag(p.prog)}</div>`).join("")}</div>`).join("")}</div>`
      : `<p class="none">No school list yet. Upload the Excel file "Middle School boys - student list".</p>`}`;
}

async function saveAll() {
  const P = plan; msg = "Saving…"; paint();
  try {
    const now = Date.now();
    await setMany(P.list.map(p => ({ path: "pupils/" + p.id, data: { id: p.id, name: p.name, cls: p.cls, grade: parseInt(p.cls, 10) || 0, prog: p.prog, sec: "boys", updated: now } })));
    let linked = 0, added = 0;
    P.nameMatch.forEach((m, i) => { const box1 = document.querySelector(`[data-schnm="${i}"]`); if (box1 && box1.checked) { m.s.enrollment = m.p.id; linked++; try { saveStudent(m.s); } catch (e) {} } });
    if (P.addMissing) P.missing.forEach(p => {
      const st = { id: "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: p.name, cls: p.cls, enrollment: p.id, xp: typeof WEEKLY_BONUS !== "undefined" ? WEEKLY_BONUS : 0, bonusWeek: typeof weekKey === "function" ? weekKey() : "", log: [], createdAt: Date.now() };
      students.push(st); added++; try { saveStudent(st); } catch (e) {}
    });
    try { render(); } catch (e) {}
    plan = null; await load();
    msg = `✓ Saved ${P.list.length} students to the school list.` + (linked ? ` ${linked} of your students got their school ID.` : "") + (added ? ` ${added} students added to your classes.` : "");
  } catch (e) { msg = "Could not save (" + (e.code || e.message || e) + "). Nothing was lost; try again."; }
  paint();
}
// teacher.html's own save(st) writes one student (a global function of the page)
function saveStudent(st) { return window.save(st); }

export async function openSchool() {
  if (!window.__owner) return;
  css();
  if (!box) {
    box = document.createElement("div"); box.className = "modal"; box.id = "schModal"; box.hidden = true;
    box.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="schTitle"><div id="schBody"></div></div>';
    document.body.appendChild(box);
    box.addEventListener("click", e => { const a = e.target.closest("[data-sch]"); if (e.target === box || (a && a.dataset.sch === "close")) { box.hidden = true; return; } if (!a) return;
      if (a.dataset.sch === "cancel") { plan = null; msg = ""; paint(); } if (a.dataset.sch === "save") saveAll(); });
    box.addEventListener("change", async e => {
      if (e.target.dataset && e.target.dataset.schadd !== undefined) { plan.addMissing = e.target.checked; return; }
      if (e.target.id !== "schFile" || !e.target.files[0]) return;
      const f = e.target.files[0]; msg = "Reading…"; paint();
      try { const list = parse(await readFile(f)); if (list === null) { msg = "The first row must name the columns: Student ID, Name, Class (and Program)."; return paint(); } if (!list.length) { msg = "No students found in that file."; return paint(); }
        const seen = new Set(), dup = list.filter(p => seen.has(p.id) || !seen.add(p.id)); plan = makePlan(list.filter((p, i, a) => a.findIndex(x => x.id === p.id) === i)); msg = dup.length ? "Note: " + dup.length + " repeated IDs were counted once." : ""; }
      catch (err) { msg = "Could not read that file. Save it as Excel (.xlsx) or CSV and try again."; }
      paint();
    });
    box.addEventListener("input", e => { if (e.target.id === "schQ") { q = e.target.value; const pos = e.target.selectionStart; paint(); const i = $("schQ"); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (er) {} } } });
  }
  msg = ""; plan = null; box.hidden = false; $("schBody").innerHTML = "<p>Loading…</p>"; await load(); paint();
}
window.openSchool = openSchool;
