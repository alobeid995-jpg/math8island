// Teacher side: announcements (shown to chosen classes) and messages with students.
// Announcements are documents in <base>/work (kind "announcement"), which students already read for their class.
// Messages are documents in <base>/msgs; a student reads and writes only his own thread (see the rules block).
import { getDocs, setDoc, updateDoc, deleteDoc, bcol, bdoc } from "./fb.js?v=1111e";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const br = s => esc(s).replace(/\n/g, "<br>");
const when = t => t ? new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
let tab = "ann", msgs = [], anns = [], sel = "", newOpen = false, newCls = "", msg = "", draft = { title: "", text: "", classes: null }, busy = false;

const modal = document.createElement("div");
modal.className = "modal"; modal.id = "inboxModal"; modal.hidden = true;
modal.innerHTML = '<div class="sheet wk-sheet" role="dialog" aria-modal="true" aria-label="Messages and announcements"><div id="inBody"></div></div>';
document.body.appendChild(modal);
{ const st = document.createElement("style"); st.textContent = ".ib-tabs{display:flex;gap:8px;margin:10px 0}.ib-card{padding:12px 14px;border:1px solid var(--line,#dde);border-radius:12px;margin:8px 0;background:var(--card,#fff)}.ib-card h4{margin:0 0 4px}.ib-card small{opacity:.7}.ib-ta{width:100%;box-sizing:border-box;min-height:90px;font:inherit;padding:10px;border-radius:10px;border:1px solid var(--line,#ccd)}.ib-in{width:100%;box-sizing:border-box;margin-bottom:8px}.ib-cls{display:flex;gap:12px;flex-wrap:wrap;margin:8px 0}.ib-cls label{display:flex;gap:6px;align-items:center}.ib-conv{display:flex;gap:10px;justify-content:space-between;align-items:center;width:100%;text-align:left;padding:10px 12px;border:1px solid var(--line,#dde);border-radius:12px;margin:6px 0;background:var(--card,#fff);cursor:pointer;font:inherit;color:inherit}.ib-conv.un{border-color:#1f5bbd;background:#eef4ff}.ib-dot{background:#d8402b;color:#fff;border-radius:99px;font-size:12px;padding:1px 8px;font-weight:800}.ib-th{display:grid;gap:8px;margin:10px 0;max-height:46vh;overflow:auto}.ib-b{max-width:82%;padding:8px 12px;border-radius:14px;background:#eef1f7;justify-self:start;white-space:normal;overflow-wrap:anywhere}.ib-b.me{background:#1f5bbd;color:#fff;justify-self:end}.ib-b small{display:block;opacity:.7;margin-top:2px;font-size:11px}.ib-row{display:flex;gap:8px;flex-wrap:wrap}"; document.head.appendChild(st); }

const stu = id => (typeof students !== "undefined" ? students : []).find(s => s.id === id);
const nameOf = (sid, m) => (stu(sid) || {}).name || (m && m.name) || sid;
const unreadN = () => msgs.filter(x => x.from === "student" && !x.tread).length;
async function load() {
  const [m, w] = await Promise.all([getDocs(bcol("msgs")), getDocs(bcol("work"))]);
  msgs = m.docs.map(d => ({ id: d.id, ...d.data() }));
  anns = w.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => x.kind === "announcement").sort((a, b) => (b.created || 0) - (a.created || 0));
}
function badge() { const b = $("inboxBtn"); if (b) { const n = unreadN(); b.textContent = "Messages & announcements" + (n ? ` (${n} new)` : ""); } }
const convs = () => { const by = new Map(); msgs.forEach(x => { (by.get(x.sid) || by.set(x.sid, []).get(x.sid)).push(x); }); return [...by.entries()].map(([sid, l]) => { l.sort((a, b) => a.at - b.at); return { sid, l, last: l[l.length - 1], un: l.filter(x => x.from === "student" && !x.tread).length }; }).sort((a, b) => (b.un > 0) - (a.un > 0) || b.last.at - a.last.at); };

function render() {
  const b = $("inBody"); if (!b) return;
  const n = unreadN();
  const head = `<h3>Messages & announcements</h3><div class="ib-tabs"><button class="${tab === "ann" ? "primary" : "ghost"} small" type="button" data-ib="tab" data-t="ann">Announcements</button><button class="${tab === "msg" ? "primary" : "ghost"} small" type="button" data-ib="tab" data-t="msg">Messages${n ? ` (${n} new)` : ""}</button></div>`;
  const foot = `<p class="lg-msg" id="ibMsg">${esc(msg)}</p><div class="lg-bar"><button class="ghost" type="button" data-ib="close">Close</button></div>`;
  if (tab === "ann") {
    if (!draft.classes) draft.classes = [...CLASSES];
    b.innerHTML = head + `<p>Write a notice. It shows at the top of the student page for the classes you choose.</p>
      <input class="ib-in" id="ibTitle" placeholder="Title (optional)" maxlength="80" value="${esc(draft.title)}">
      <textarea class="ib-ta" id="ibText" maxlength="1000" placeholder="Your announcement">${esc(draft.text)}</textarea>
      <div><b>Show to:</b><div class="ib-cls">${CLASSES.map(c => `<label><input type="checkbox" data-ibcls="${esc(c)}"${draft.classes.includes(c) ? " checked" : ""}> ${esc(c)}</label>`).join("")}</div></div>
      <div class="lg-bar"><button class="primary" type="button" data-ib="post"${busy ? " disabled" : ""}>Post announcement</button></div>
      <h4 style="margin:16px 0 4px">Posted</h4>
      ${anns.length ? anns.map(a => `<div class="ib-card"><h4>${esc(a.title || "Announcement")}</h4><div>${br(a.text)}</div><small>${esc(when(a.created))} · ${esc((a.classes || []).join(", "))}</small><div class="ib-row" style="margin-top:6px"><button class="ghost small" type="button" data-ib="delann" data-id="${esc(a.id)}">Delete</button></div></div>`).join("") : `<p class="none">Nothing posted yet.</p>`}` + foot;
    return;
  }
  if (sel) {
    const l = msgs.filter(x => x.sid === sel).sort((a, b) => a.at - b.at), st = stu(sel);
    b.innerHTML = head + `<div class="ib-row"><button class="ghost small" type="button" data-ib="back">← All messages</button></div><h4 style="margin:10px 0 0">${esc(nameOf(sel, l[0]))}${st ? ` <small>· ${esc(st.cls)}</small>` : ""}</h4>
      <div class="ib-th" id="ibTh">${l.length ? l.map(x => `<div class="ib-b${x.from === "teacher" ? " me" : ""}">${br(x.text)}<small>${esc(when(x.at))}</small></div>`).join("") : `<p class="none">No messages yet. Write the first one.</p>`}</div>
      <textarea class="ib-ta" id="ibReply" maxlength="600" placeholder="Write a message to ${esc(nameOf(sel, l[0]))}"></textarea>
      <div class="lg-bar"><button class="primary" type="button" data-ib="send"${busy ? " disabled" : ""}>Send</button></div>` + foot;
    const th = $("ibTh"); if (th) th.scrollTop = th.scrollHeight;
    return;
  }
  const cv = convs(), list = (typeof students !== "undefined" ? students : []).filter(s => s.cls === newCls).sort((a, b) => a.name.localeCompare(b.name));
  b.innerHTML = head + `<div class="lg-bar"><button class="primary small" type="button" data-ib="new">+ New message</button></div>
    ${newOpen ? `<div class="ib-card"><div class="ib-row"><select id="ibNewCls"><option value="">Class…</option>${CLASSES.map(c => `<option${c === newCls ? " selected" : ""}>${esc(c)}</option>`).join("")}</select>
      <select id="ibNewSt"><option value="">Student…</option>${list.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join("")}</select><button class="primary small" type="button" data-ib="newgo">Write</button></div></div>` : ""}
    ${cv.length ? cv.map(c => `<button class="ib-conv${c.un ? " un" : ""}" type="button" data-ib="open" data-sid="${esc(c.sid)}"><span><b>${esc(nameOf(c.sid, c.l[0]))}</b><br><small>${esc((c.last.from === "teacher" ? "You: " : "") + c.last.text.slice(0, 70))}</small></span><span>${c.un ? `<span class="ib-dot">${c.un}</span>` : `<small>${esc(when(c.last.at))}</small>`}</span></button>`).join("") : `<p class="none">No messages yet. Students can write to you from their page.</p>`}` + foot;
}
async function markRead(sid) {
  const un = msgs.filter(x => x.sid === sid && x.from === "student" && !x.tread);
  for (const m of un) { try { await updateDoc(bdoc("msgs", m.id), { tread: true }); m.tread = true; } catch {} }
  badge();
}
document.addEventListener("input", e => { if (e.target.id === "ibTitle") draft.title = e.target.value; if (e.target.id === "ibText") draft.text = e.target.value; });
document.addEventListener("change", e => {
  const c = e.target.closest && e.target.closest("[data-ibcls]");
  if (c) { const k = c.dataset.ibcls; draft.classes = c.checked ? [...new Set([...draft.classes, k])] : draft.classes.filter(y => y !== k); return; }
  if (e.target.id === "ibNewCls") { newCls = e.target.value; render(); }
});
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-ib]"); if (!b || modal.hidden) return;
  const a = b.dataset.ib;
  if (a === "close") { modal.hidden = true; badge(); return; }
  if (a === "tab") { tab = b.dataset.t; sel = ""; msg = ""; render(); return; }
  if (a === "back") { sel = ""; msg = ""; render(); return; }
  if (a === "new") { newOpen = !newOpen; render(); return; }
  if (a === "newgo") { const v = $("ibNewSt").value; if (!v) { msg = "Choose a class and a student."; render(); return; } sel = v; newOpen = false; msg = ""; render(); return; }
  if (a === "open") { sel = b.dataset.sid; msg = ""; render(); await markRead(sel); render(); return; }
  if (a === "post") {
    const text = ($("ibText").value || "").trim(), title = ($("ibTitle").value || "").trim();
    if (!text) { msg = "Write the announcement first."; render(); return; }
    if (!draft.classes.length) { msg = "Choose at least one class."; render(); return; }
    busy = true; msg = "Posting…"; render();
    try { const id = "ann-" + Date.now().toString(36); const d = { kind: "announcement", open: false, title, text, classes: [...draft.classes], created: Date.now() }; await setDoc(bdoc("work", id), d); anns.unshift({ id, ...d }); draft = { title: "", text: "", classes: null }; msg = "Posted. Students see it now."; }
    catch (er) { msg = "Could not post (" + (er.code || er.message) + ")."; }
    busy = false; render(); return;
  }
  if (a === "delann") { if (!confirm("Delete this announcement? Students will no longer see it.")) return; try { await deleteDoc(bdoc("work", b.dataset.id)); anns = anns.filter(x => x.id !== b.dataset.id); msg = "Deleted."; } catch (er) { msg = "Could not delete (" + (er.code || er.message) + ")."; } render(); return; }
  if (a === "send") {
    const text = ($("ibReply").value || "").trim(); if (!text) return;
    const st = stu(sel), t = Date.now(); busy = true; render();
    const d = { sid: sel, name: (st && st.name) || nameOf(sel), cls: (st && st.cls) || "", from: "teacher", text, at: t, tread: true };
    try { await setDoc(bdoc("msgs", `${sel}_${t}`), d); msgs.push({ id: `${sel}_${t}`, ...d }); msg = "Sent."; } catch (er) { msg = "Could not send (" + (er.code || er.message) + ")."; }
    busy = false; render(); return;
  }
});
modal.addEventListener("click", e => { if (e.target === modal) { modal.hidden = true; badge(); } });

export async function openInbox(t) {
  modal.hidden = false; tab = t || (unreadN() ? "msg" : "ann"); sel = ""; newOpen = false; msg = ""; $("inBody").innerHTML = "<p>Loading…</p>";
  try { await load(); } catch (e) { $("inBody").innerHTML = `<p class="lg-msg">Could not load (${esc(e.code || e.message)}).</p><button class="ghost" data-ib="close">Close</button>`; return; }
  if (!t && unreadN()) tab = "msg"; render(); badge();
}
let told = 0;
export async function checkInbox() {
  try { await load(); } catch { return; }
  badge(); const n = unreadN();
  if (n > told && typeof toast === "function" && modal.hidden) toast(`${n} new message${n === 1 ? "" : "s"} from students`);
  told = n;
}
setTimeout(checkInbox, 6000); setInterval(() => { if (!document.hidden) checkInbox(); }, 2 * 60 * 1000);
