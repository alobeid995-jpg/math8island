// Chat, shared by the teacher and the student page. A small "Chat" tab sits at the side of the screen with the number of unread messages;
// it opens a Facebook-style panel: people and groups with avatars, the last message and an unread mark, then the conversation.
// 1:1 messages: <base>/msgs (sid, name, cls, from, text, at, tread).  Groups (made by the teacher only): <base>/groups {name, members[], created}
// and <base>/gmsgs {gid, to[] (members), sid, name, cls, from, text, at, a, e}. Everything is live (onSnapshot).
import { fs, collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, bcol, bdoc } from "./fb.js?v=1112z";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const br = s => esc(s).replace(/\n/g, "<br>");
const when = t => { if (!t) return ""; const d = new Date(t), n = new Date(); return d.toDateString() === n.toDateString() ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); };
const ls = { get: k => { try { return Number(localStorage.getItem(k)) || 0; } catch { return 0; } }, set: (k, v) => { try { localStorage.setItem(k, String(v)); } catch {} } };

let role = "", P = null, base = [], me = null, getMe = () => null;
let msgs = [], groups = [], gmsgs = [], view = "list", sel = "", cls = "", pick = new Set(), gname = "", open = false, info = "", first = { m: true, g: true, c: true }, sending = 0, lastSend = 0;
let dock = null, panel = null;
const col = n => role === "teacher" ? bcol(n) : collection(fs, ...base, n);
const stuList = () => (typeof students !== "undefined" ? students : []);
const stu = sid => stuList().find(s => s.id === sid);
const seenKey = id => "mi_chat_" + role + "_" + (P ? P.sid || P.uid || "t" : "") + "_" + id;
const av = (st, sz) => { try { return st ? avatarHTML(st, sz || "sm") : ""; } catch { return ""; } };
const tAv = `<span class="ch-t" title="Teacher">T</span>`;
const letter = n => `<span class="ch-t" style="background:#6b7a99">${esc(String(n || "?").trim().charAt(0).toUpperCase())}</span>`;

{ const st = document.createElement("style"); st.textContent = `
#chDock{position:fixed;right:0;bottom:84px;z-index:2700;border:3px solid #151412;border-right:0;border-radius:14px 0 0 14px;background:#2f6fe0;color:#fff;font:inherit;font-weight:800;padding:12px 14px 12px 16px;box-shadow:-3px 4px 0 #151412;cursor:pointer;display:flex;gap:8px;align-items:center}
#chDock b{background:#e0443e;border-radius:999px;min-width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:13px;padding:0 6px}#chDock b:empty,#chDock b[hidden]{display:none}
html:not(.app) #chDock{bottom:24px}
#chPanel{position:fixed;right:10px;bottom:10px;z-index:2750;width:min(380px,calc(100vw - 20px));height:min(560px,calc(100vh - 20px));background:#fff;color:#151412;border:3px solid #151412;border-radius:16px;box-shadow:0 10px 0 rgba(0,0,0,.25);display:flex;flex-direction:column;overflow:hidden}
#chPanel[hidden]{display:none}
@media (max-width:640px){#chPanel{right:0;left:0;bottom:0;top:0;width:auto;height:auto;border-radius:0;border-width:0}}
#chPanel .ch-h{display:flex;align-items:center;gap:8px;background:#2f6fe0;color:#fff;padding:10px 12px;font-weight:800}
#chPanel .ch-h span.t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#chPanel .ch-h button{background:rgba(255,255,255,.2);color:#fff;border:0;border-radius:9px;padding:6px 10px;font:inherit;font-weight:700;cursor:pointer}
#chPanel .ch-body{flex:1;overflow:auto;padding:6px;background:#f4f6fb}
#chPanel .ch-row{display:flex;gap:10px;align-items:center;width:100%;text-align:left;border:0;background:#fff;border-radius:12px;padding:8px 10px;margin:5px 0;font:inherit;color:inherit;cursor:pointer}
#chPanel .ch-row.un{background:#eaf1ff}#chPanel .ch-row.un b{color:#1f3d8f}
#chPanel .ch-mid{flex:1;min-width:0}#chPanel .ch-mid b{display:block}#chPanel .ch-mid small{display:block;color:#5a6477;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#chPanel .ch-badge{background:#e0443e;color:#fff;border-radius:999px;min-width:20px;height:20px;font-size:12px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;padding:0 5px}
#chPanel .ch-t{width:38px;height:38px;border-radius:50%;background:#2f6fe0;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:800;flex:none}
#chPanel .ch-grp{width:38px;height:38px;border-radius:50%;background:#1f9d55;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:19px;flex:none}
#chPanel .ch-av{flex:none;display:inline-flex}
#chPanel .ch-msg{display:flex;gap:6px;align-items:flex-end;margin:6px 0}#chPanel .ch-msg.me{flex-direction:row-reverse}
#chPanel .ch-bub{max-width:76%;padding:8px 11px;border-radius:14px;background:#fff;border:1px solid #dde3ef;line-height:1.35;word-break:break-word}
#chPanel .ch-msg.me .ch-bub{background:#2f6fe0;color:#fff;border-color:#2f6fe0}
#chPanel .ch-bub small{display:block;opacity:.65;font-size:11px;margin-top:2px}#chPanel .ch-bub em{display:block;font-style:normal;font-weight:800;font-size:12px;opacity:.8}
#chPanel .ch-f{display:flex;gap:6px;padding:8px;border-top:1px solid #dde3ef;background:#fff}
#chPanel .ch-f textarea{flex:1;resize:none;height:44px;border:1.5px solid #cdd5e3;border-radius:10px;padding:8px;font:inherit}
#chPanel .ch-f button,#chPanel .ch-act{background:#2f6fe0;color:#fff;border:0;border-radius:10px;padding:8px 14px;font:inherit;font-weight:800;cursor:pointer}
#chPanel .ch-act.g{background:#1f9d55}#chPanel .ch-act.o{background:#e8ecf5;color:#151412}
#chPanel .ch-info{padding:4px 12px;color:#b3261e;font-weight:600;min-height:1.2em;font-size:13px;background:#fff}
#chPanel .ch-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(86px,1fr));gap:8px;margin:8px 0}
#chPanel .ch-pick{border:2px solid transparent;border-radius:12px;background:#fff;padding:6px 4px;text-align:center;font:inherit;font-size:12px;cursor:pointer;color:inherit}#chPanel .ch-pick.on{border-color:#1f9d55;background:#e4f7ec}
#chPanel .ch-pick span.ch-av{display:flex;justify-content:center;margin-bottom:3px}
#chPanel select,#chPanel input.ch-in{width:100%;box-sizing:border-box;padding:9px;border:1.5px solid #cdd5e3;border-radius:10px;font:inherit;margin:4px 0}
#chPanel .ch-none{color:#5a6477;text-align:center;padding:24px 10px}
`; document.head.appendChild(st); }

/* ---- build the conversation list ---- */
function dmMsgs(sid) { return msgs.filter(x => x.sid === sid).sort((a, b) => a.at - b.at); }
function dmUnread(sid) { const l = dmMsgs(sid); return role === "teacher" ? l.filter(x => x.from === "student" && !x.tread).length : l.filter(x => x.from === "teacher" && x.at > ls.get(seenKey("dm"))).length; }
function gMsgs(gid) { return gmsgs.filter(x => x.gid === gid).sort((a, b) => a.at - b.at); }
function gUnread(gid) { const k = ls.get(seenKey("g_" + gid)); return gMsgs(gid).filter(x => x.at > k && !(x.from === role && (role === "teacher" || x.sid === P.sid))).length; }
function convs() {
  const out = [];
  if (role === "teacher") {
    const by = new Map(); msgs.forEach(x => { if (!by.has(x.sid)) by.set(x.sid, x); });
    [...by.keys()].forEach(sid => { const l = dmMsgs(sid), last = l[l.length - 1], st = stu(sid) || { id: sid, name: last.name, cls: last.cls, avatar: 0, eq: {} };
      out.push({ id: "dm:" + sid, kind: "dm", title: st.name || sid, sub: st.cls || "", av: `<span class="ch-av">${av(st)}</span>`, last, un: dmUnread(sid) }); });
  } else {
    const l = dmMsgs(P.sid), last = l[l.length - 1];
    out.push({ id: "dm:" + P.sid, kind: "dm", title: "My teacher", sub: "", av: tAv, last, un: dmUnread(P.sid) });
  }
  groups.forEach(g => { const l = gMsgs(g.id), last = l[l.length - 1]; out.push({ id: "g:" + g.id, kind: "grp", title: g.name, sub: (g.members || []).length + " people", av: `<span class="ch-grp">👥</span>`, last, un: gUnread(g.id), g }); });
  return out.sort((a, b) => ((b.last && b.last.at) || 0) - ((a.last && a.last.at) || 0) || a.title.localeCompare(b.title));
}
const totalUnread = () => convs().reduce((a, c) => a + c.un, 0);

/* ---- draw ---- */
function bubbles(list, grp) {
  if (!list.length) return `<p class="ch-none">No messages yet. Write the first one.</p>`;
  return list.map(x => {
    const mine = x.from === role && (role === "teacher" || x.sid === P.sid);
    const who = grp && !mine ? (x.from === "teacher" ? tAv : `<span class="ch-av">${av({ id: x.sid, name: x.name || "", avatar: x.a || 0, eq: x.e || {}, cls: x.cls || "" }, "xs") || letter(x.name)}</span>`) : "";
    const nm = grp && !mine ? `<em>${esc(x.from === "teacher" ? "Teacher" : x.name || "")}</em>` : "";
    return `<div class="ch-msg${mine ? " me" : ""}">${who}<div class="ch-bub">${nm}${br(x.text)}<small>${esc(when(x.at))}</small></div></div>`;
  }).join("");
}
function paint() {
  if (!dock) return;
  const n = totalUnread(), b = dock.querySelector("b"); b.textContent = n ? String(n) : ""; b.hidden = !n;
  try { document.title = document.title.replace(/^\(\d+\) /, "") ; if (n) document.title = `(${n}) ` + document.title; } catch {}
  panel.hidden = !open; dock.hidden = open; if (!open) return;
  const keepTa = document.getElementById("chTa") ? document.getElementById("chTa").value : "";
  let h = "", body = "", foot = "";
  if (view === "list") {
    h = `<span class="t">💬 Chat</span>${role === "teacher" ? `<button type="button" data-ch="new">+ Message</button><button type="button" data-ch="newg">+ Group</button>` : ""}<button type="button" data-ch="x">✕</button>`;
    const c = convs();
    body = c.length ? c.map(v => `<button class="ch-row${v.un ? " un" : ""}" type="button" data-ch="open" data-id="${esc(v.id)}">${v.av}<span class="ch-mid"><b>${esc(v.title)}${v.sub ? ` <small style="display:inline">· ${esc(v.sub)}</small>` : ""}</b><small>${v.last ? esc((v.last.from === role && (role === "teacher" || v.last.sid === P.sid) ? "You: " : "") + v.last.text) : "No messages yet"}</small></span>${v.un ? `<span class="ch-badge">${v.un}</span>` : ""}</button>`).join("")
      : `<p class="ch-none">${role === "teacher" ? "No chats yet. Tap “+ Message” to write to a student, or “+ Group” to make a group." : "Nothing here yet."}</p>`;
  } else if (view === "thread") {
    const c = convs().find(v => v.id === sel);
    if (!c) { view = "list"; return paint(); }
    const grp = c.kind === "grp", list = grp ? gMsgs(c.g.id) : dmMsgs(c.id.slice(3));
    h = `<button type="button" data-ch="back">←</button><span class="t">${esc(c.title)}${c.sub ? " · " + esc(c.sub) : ""}</span>${grp && role === "teacher" ? `<button type="button" data-ch="members">People</button><button type="button" data-ch="delg">Delete</button>` : ""}<button type="button" data-ch="x">✕</button>`;
    body = bubbles(list, grp);
    foot = `<div class="ch-info" id="chInfo">${esc(info)}</div><div class="ch-f"><textarea id="chTa" maxlength="500" placeholder="Write a message">${esc(keepTa)}</textarea><button type="button" data-ch="send">Send</button></div>`;
  } else if (view === "new") {
    const list = stuList().filter(s => s.cls === cls).sort((a, b) => a.name.localeCompare(b.name));
    h = `<button type="button" data-ch="back">←</button><span class="t">New message</span><button type="button" data-ch="x">✕</button>`;
    body = `<select id="chCls"><option value="">Choose a class…</option>${(typeof CLASSES !== "undefined" ? CLASSES : []).map(c => `<option${c === cls ? " selected" : ""}>${esc(c)}</option>`).join("")}</select>
      <div class="ch-grid">${list.map(s => `<button class="ch-pick" type="button" data-ch="dm" data-sid="${esc(s.id)}"><span class="ch-av">${av(s, "sm")}</span>${esc(s.name.split(" ")[0])}</button>`).join("")}</div>${cls && !list.length ? `<p class="ch-none">No students in this class.</p>` : ""}`;
  } else if (view === "newg" || view === "editg") {
    const list = stuList().filter(s => s.cls === cls).sort((a, b) => a.name.localeCompare(b.name));
    h = `<button type="button" data-ch="back">←</button><span class="t">${view === "editg" ? "Group people" : "New group"}</span><button type="button" data-ch="x">✕</button>`;
    body = `${view === "newg" ? `<input class="ch-in" id="chGn" maxlength="40" placeholder="Group name (for example: 8S Class Chat)" value="${esc(gname)}">` : ""}
      <select id="chCls"><option value="">Choose a class to pick from…</option>${(typeof CLASSES !== "undefined" ? CLASSES : []).map(c => `<option${c === cls ? " selected" : ""}>${esc(c)}</option>`).join("")}</select>
      ${cls ? `<div style="display:flex;gap:6px;margin:6px 0"><button class="ch-act o" type="button" data-ch="allcls">Add the whole class</button><button class="ch-act o" type="button" data-ch="nonecls">Remove the class</button></div>` : ""}
      <div class="ch-grid">${list.map(s => `<button class="ch-pick${pick.has(s.id) ? " on" : ""}" type="button" data-ch="pk" data-sid="${esc(s.id)}"><span class="ch-av">${av(s, "sm")}</span>${esc(s.name.split(" ")[0])}</button>`).join("")}</div>
      <p class="ch-none" style="padding:6px"><b>${pick.size}</b> student${pick.size === 1 ? "" : "s"} in the group. You can change classes and keep adding.</p>`;
    foot = `<div class="ch-info" id="chInfo">${esc(info)}</div><div class="ch-f"><button type="button" data-ch="${view === "editg" ? "saveg" : "mkg"}" style="flex:1">${view === "editg" ? "Save people" : "Create group"}</button></div>`;
  }
  panel.innerHTML = `<div class="ch-h">${h}</div><div class="ch-body" id="chBody">${body}</div>${foot}`;
  const bd = document.getElementById("chBody"); if (bd && view === "thread") bd.scrollTop = bd.scrollHeight;
}

/* ---- actions ---- */
async function markRead(id) {
  if (id.startsWith("g:")) { ls.set(seenKey("g_" + id.slice(2)), Date.now()); return; }
  const sid = id.slice(3);
  if (role === "teacher") { for (const m of dmMsgs(sid).filter(x => x.from === "student" && !x.tread)) { m.tread = true; try { await updateDoc(bdoc("msgs", m.id), { tread: true }); } catch {} } }
  else ls.set(seenKey("dm"), Date.now());
}
async function send(text) {
  text = text.trim().slice(0, 500); if (!text || sending) return;
  if (role === "student" && Date.now() - lastSend < 5000) { info = "Wait a few seconds before sending another message."; return paint(); }
  const t = Date.now(); sending = 1; info = "";
  try {
    if (sel.startsWith("dm:")) {
      const sid = sel.slice(3), st = stu(sid);
      const d = role === "teacher" ? { sid, name: (st && st.name) || sid, cls: (st && st.cls) || "", from: "teacher", text, at: t, tread: true } : { sid: P.sid, name: me.name, cls: me.cls, from: "student", text, at: t };
      await setDoc(role === "teacher" ? bdoc("msgs", `${sid}_${t}`) : doc(fs, ...base, "msgs", `${sid}_${t}`), d); if (!msgs.some(x => x.id === `${sid}_${t}`)) msgs.push({ id: `${sid}_${t}`, ...d });
    } else {
      const g = groups.find(x => x.id === sel.slice(2)); if (!g) throw new Error("gone");
      const d = role === "teacher" ? { gid: g.id, to: g.members, sid: "", name: (typeof TNAME === "string" && TNAME) || "Teacher", cls: "", from: "teacher", text, at: t }
        : { gid: g.id, to: g.members, sid: P.sid, name: me.name, cls: me.cls, from: "student", text, at: t, a: me.avatar || 0, e: me.eq || {} };
      const gid2 = `${g.id}_${t}_${role === "teacher" ? "t" : P.sid}`; await setDoc(role === "teacher" ? bdoc("gmsgs", gid2) : doc(fs, ...base, "gmsgs", gid2), d); if (!gmsgs.some(x => x.id === gid2)) gmsgs.push({ id: gid2, ...d });
    }
    lastSend = t; const ta = document.getElementById("chTa"); if (ta) ta.value = "";
  } catch (er) { info = er && er.code === "permission-denied" ? "Chat is not switched on yet. Tell your teacher." : "Could not send. Check your internet and try again."; }
  sending = 0; paint();
}
async function onClick(e) {
  const b = e.target.closest("[data-ch]"); if (!b) return;
  const a = b.dataset.ch; info = "";
  if (a === "x") { open = false; return paint(); }
  if (a === "back") { view = "list"; sel = ""; return paint(); }
  if (a === "open") { sel = b.dataset.id; view = "thread"; await markRead(sel); return paint(); }
  if (a === "new") { view = "new"; cls = ""; return paint(); }
  if (a === "dm") { sel = "dm:" + b.dataset.sid; view = "thread"; await markRead(sel); return paint(); }
  if (a === "newg") { view = "newg"; cls = ""; pick = new Set(); gname = ""; return paint(); }
  if (a === "pk") { const s = b.dataset.sid; pick.has(s) ? pick.delete(s) : pick.add(s); return paint(); }
  if (a === "allcls") { stuList().filter(s => s.cls === cls).forEach(s => pick.add(s.id)); return paint(); }
  if (a === "nonecls") { stuList().filter(s => s.cls === cls).forEach(s => pick.delete(s.id)); return paint(); }
  if (a === "send") return send(document.getElementById("chTa").value);
  if (a === "mkg") {
    const name = (document.getElementById("chGn").value || "").trim(); gname = name;
    if (!name) { info = "Give the group a name."; return paint(); } if (!pick.size) { info = "Choose at least one student."; return paint(); }
    const id = "g" + Date.now().toString(36);
    try { const gd = { name, members: [...pick], created: Date.now() }; await setDoc(bdoc("groups", id), gd); if (!groups.some(x => x.id === id)) groups.push({ id, ...gd }); sel = "g:" + id; view = "thread"; } catch (er) { info = "Could not create the group (" + (er.code || er.message) + ")."; }
    return paint();
  }
  if (a === "members") { const g = groups.find(x => x.id === sel.slice(2)); if (!g) return; pick = new Set(g.members || []); cls = ""; view = "editg"; return paint(); }
  if (a === "saveg") { if (!pick.size) { info = "A group needs at least one student."; return paint(); } try { await updateDoc(bdoc("groups", sel.slice(2)), { members: [...pick] }); view = "thread"; } catch (er) { info = "Could not save (" + (er.code || er.message) + ")."; } return paint(); }
  if (a === "delg") { if (!confirm("Delete this group for everyone? The messages disappear too.")) return; const gid = sel.slice(2); try { for (const m of gMsgs(gid)) await deleteDoc(bdoc("gmsgs", m.id)); await deleteDoc(bdoc("groups", gid)); } catch {} view = "list"; sel = ""; return paint(); }
}

/* ---- live data ---- */
let notified = 0;
function note(kind) {
  const n = totalUnread();
  if (n > notified && !open && !first[kind]) { try { if (typeof toast === "function") toast("💬 New chat message"); navigator.vibrate && navigator.vibrate(120); } catch {} }
  first[kind] = false; notified = n; paint();
}
function listen(name, q, apply, kind) {
  onSnapshot(q, s => { apply(s.docs.map(d => ({ id: d.id, ...d.data() }))); note(kind); }, () => {});
}
export async function initChat(r, profile, getMeFn) {
  role = r; P = profile; getMe = getMeFn; base = role === "teacher" ? [] : (profile.tid ? ["teachers", profile.tid] : []);
  if (role === "student") { for (let i = 0; i < 50 && !(me = getMe()); i++) await new Promise(x => setTimeout(x, 200)); if (!me) return; }
  dock = document.createElement("button"); dock.id = "chDock"; dock.type = "button"; dock.innerHTML = `💬 Chat <b hidden></b>`;
  panel = document.createElement("div"); panel.id = "chPanel"; panel.hidden = true; document.body.append(dock, panel);
  dock.onclick = () => { open = true; view = "list"; paint(); };
  panel.addEventListener("click", onClick);
  panel.addEventListener("change", e => { if (e.target.id === "chCls") { cls = e.target.value; paint(); } });
  panel.addEventListener("input", e => { if (e.target.id === "chGn") gname = e.target.value; });
  panel.addEventListener("keydown", e => { if (e.target.id === "chTa" && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e.target.value); } });
  if (role === "teacher") {
    listen("msgs", col("msgs"), l => { msgs = l; }, "m"); listen("groups", col("groups"), l => { groups = l; }, "g"); listen("gmsgs", col("gmsgs"), l => { gmsgs = l; }, "c");
  } else {
    listen("msgs", query(col("msgs"), where("sid", "==", P.sid)), l => { msgs = l; }, "m");
    listen("groups", query(col("groups"), where("members", "array-contains", P.sid)), l => { groups = l; }, "g");
    listen("gmsgs", query(col("gmsgs"), where("to", "array-contains", P.sid)), l => { gmsgs = l; }, "c");
  }
  paint();
}
