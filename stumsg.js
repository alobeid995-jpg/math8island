// Student side: announcements from the teacher (top of the page) and a message box to write to the teacher.
// Announcements are documents in <base>/work (kind "announcement"). Messages are documents in <base>/msgs.
import { fs, doc, setDoc, collection, getDocs, query, where } from "./fb.js?v=1113g";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const br = s => esc(s).replace(/\n/g, "<br>");
const when = t => t ? new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
const ls = { get: k => { try { return Number(localStorage.getItem(k)) || 0; } catch { return 0; } }, set: (k, v) => { try { localStorage.setItem(k, String(v)); } catch {} } };
let P = null, base = [], me = null, anns = [], msgs = [], canMsg = true, note = "", sending = false, lastSend = 0, openBox = false;
{ const st = document.createElement("style"); st.textContent = "#stuNews{order:1;display:grid;gap:10px}#stuNews:empty{display:none}#stuMsg{order:3}.sn-card{border:3px solid var(--edge,#151412);border-radius:14px;background:color-mix(in srgb,var(--sun,#f3b31b) 16%,var(--card,#fff));color:var(--ink);padding:12px 16px;box-shadow:4px 4px 0 var(--edge,#151412)}.sn-card h4{margin:0 0 4px;font-size:17px}.sn-card small{opacity:.7;display:block;margin-top:6px}.sn-new{background:#d8402b;color:#fff;border-radius:99px;font-size:12px;padding:1px 8px;margin-left:6px;font-weight:800;vertical-align:middle}.sn-msgbar{border:3px solid var(--sea-700,#1f5bbd);border-radius:14px;background:color-mix(in srgb,var(--accent,#1f5bbd) 12%,var(--card,#fff));color:var(--ink);padding:10px 16px;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}.sm-th{display:grid;gap:8px;margin:10px 0;max-height:42vh;overflow:auto}.sm-b{max-width:84%;padding:8px 12px;border-radius:14px;background:color-mix(in srgb,var(--accent,#1f5bbd) 9%,var(--card,#fff));color:var(--ink);justify-self:start;overflow-wrap:anywhere}.sm-b.me{background:var(--sea-700,#1f5bbd);color:#fff;justify-self:end}.sm-b small{display:block;opacity:.7;font-size:11px;margin-top:2px}.sm-ta{width:100%;box-sizing:border-box;min-height:70px;font:inherit;padding:10px;border-radius:10px;border:2px solid var(--line,#cfd6e6);background:var(--card,#fff);color:var(--ink)}.sm-note{min-height:1.2em;margin:6px 0 0;color:var(--bad,#b3261e);font-weight:600}#stuMsg summary{cursor:pointer;font-size:19px;font-weight:800;display:flex;gap:8px;align-items:center;flex-wrap:wrap}"; document.head.appendChild(st); }

const newsBox = document.createElement("div"); newsBox.id = "stuNews";
const msgBox = document.createElement("section"); msgBox.id = "stuMsg"; msgBox.className = "card"; msgBox.hidden = true;
{ const wrap = document.querySelector(".wrap"), bar = wrap && wrap.querySelector(".topbar"); if (wrap) { bar ? bar.after(newsBox) : wrap.prepend(newsBox); wrap.appendChild(msgBox); } }

const key = k => k + "_" + (P ? P.sid : "");
const unreadT = () => msgs.filter(x => x.from === "teacher" && x.at > ls.get(key("mi_msg_seen"))).length;
async function load() {
  try {
    const w = await getDocs(query(collection(fs, ...base, "work"), where("classes", "array-contains", me.cls)));
    const lim = Date.now() - 21 * 864e5;
    anns = w.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => x.kind === "announcement" && (x.created || 0) > lim).sort((a, b) => (b.created || 0) - (a.created || 0)).slice(0, 4);
  } catch { anns = []; }
  msgs = []; canMsg = false;   // messages moved to the chat panel (chat.js)
}
function draw() {
  const seen = ls.get(key("mi_news_seen")), un = unreadT();
  newsBox.innerHTML = anns.map(a => `<div class="sn-card"><h4>📢 ${esc(a.title || "Announcement from your teacher")}${(a.created || 0) > seen ? '<span class="sn-new">New</span>' : ""}</h4><div>${br(a.text)}</div><small>${esc(when(a.created))}</small></div>`).join("")
    + (un ? `<div class="sn-msgbar"><b>✉ You have ${un} new message${un === 1 ? "" : "s"} from your teacher</b><button class="primary small" type="button" data-smact="read">Read</button></div>` : "");
  const keep = $("smText") ? $("smText").value : "";
  msgBox.hidden = !canMsg && !msgs.length;
  msgBox.innerHTML = `<details id="smDet"${openBox ? " open" : ""}><summary>Messages with my teacher${un ? `<span class="sn-new">${un} new</span>` : ""}</summary>
    <div class="sm-th" id="smTh">${msgs.length ? msgs.map(x => `<div class="sm-b${x.from === "student" ? " me" : ""}">${br(x.text)}<small>${x.from === "student" ? "You" : "Teacher"} · ${esc(when(x.at))}</small></div>`).join("") : `<p>No messages yet. You can write to your teacher here.</p>`}</div>
    <textarea class="sm-ta" id="smText" maxlength="500" placeholder="Write a message to your teacher">${esc(keep)}</textarea>
    <p class="sm-note" id="smNote">${esc(note)}</p>
    <button class="primary" type="button" data-smact="send"${sending ? " disabled" : ""}>Send</button></details>`;
  const th = $("smTh"); if (th) th.scrollTop = th.scrollHeight;
}
function markSeen() { const t = Date.now(); ls.set(key("mi_msg_seen"), t); }
document.addEventListener("toggle", e => { if (e.target.id === "smDet") { openBox = e.target.open; if (openBox && unreadT()) { markSeen(); setTimeout(draw, 1500); } } }, true);
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-smact]"); if (!b) return;
  if (b.dataset.smact === "read") { openBox = true; markSeen(); draw(); msgBox.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  if (b.dataset.smact === "send") {
    const text = ($("smText").value || "").trim(); if (!text || sending) return;
    if (Date.now() - lastSend < 8000) { note = "Wait a few seconds before sending another message."; draw(); return; }
    sending = true; note = ""; const t = Date.now();
    const d = { sid: P.sid, name: me.name, cls: me.cls, from: "student", text: text.slice(0, 500), at: t };
    try { await setDoc(doc(fs, ...base, "msgs", `${P.sid}_${t}`), d); msgs.push({ id: `${P.sid}_${t}`, ...d }); lastSend = t; openBox = true; $("smText").value = ""; note = "Sent. Your teacher will read it."; }
    catch (er) { note = er && er.code === "permission-denied" ? "Messages are not switched on yet. Ask your teacher." : "Could not send. Check your internet and try again."; }
    sending = false; draw();
  }
});
async function tick() { if (document.hidden || !me) return; const had = unreadT(); await load(); if (!($("smText") && document.activeElement === $("smText") && $("smText").value)) draw(); else if (unreadT() !== had) draw(); }

export async function initMsgs(profile, getMe) {
  P = profile; base = profile.tid ? ["teachers", profile.tid] : [];
  for (let i = 0; i < 50 && !(me = getMe()); i++) await new Promise(r => setTimeout(r, 200));
  if (!me) return;
  await load(); draw();
  setTimeout(() => { ls.set(key("mi_news_seen"), Date.now()); }, 6000);   // the "New" tags go away after he has seen the page
  setInterval(tick, 60000); document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });
}
