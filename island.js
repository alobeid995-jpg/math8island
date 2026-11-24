// Connects the 9S Island games page to Student Island: who is playing, and where the answers go.
import { auth, fs, doc, getDoc, setDoc, collection, getDocs, query, where, whenUser, profileOf, signOut } from "./fb.js?v=1123q";

import { playerOf } from "./islandmap.js?v=1123q";

const u = await whenUser();
const p = u && await profileOf(u.uid);
if (!p) { location.href = "index.html"; throw new Error("not signed in"); }
const api = window.__island;
let mode, base, me = null, P = p;
if (p.role === "teacher") {
  mode = "teacher"; base = p.admin === true ? [] : ["teachers", u.uid];
} else {
  mode = "student"; base = p.tid ? ["teachers", p.tid] : [];
  const s = await getDoc(doc(fs, ...base, "students", p.sid)); me = s.exists() ? s.data() : null;
}
window.MI_MODE = mode;
const db = {
  collection: () => ({
    doc: id => ({ set: async d => { if (mode !== "student") return; await setDoc(doc(fs, ...base, "plays", id), { s: d.s, g: d.g, l: d.l, r: d.r, w: d.w, t: d.t, u: d.u, m: (d.m || []).slice(-20), sid: P.sid, name: (me && me.name) || "" }); } }),
    get: async () => {
      const ref = collection(fs, ...base, "plays");
      const s = await getDocs(mode === "teacher" ? ref : query(ref, where("sid", "==", P.sid)));
      return { docs: s.docs.map(d => ({ id: d.id, data: () => d.data() })) };
    }
  })
};
window.__resolveIsland(n => n === "db" ? db : null);

const game = (location.hash.match(/[#&]g=([\w-]+)/) || [])[1];
if (window.MI_EMBED) document.body.classList.add("mi-embed");
if (mode === "teacher" && /[#&]view\b/.test(location.hash)) { document.body.classList.add("mi-view"); const b = document.getElementById("miBack"); if (b) b.hidden = true; }   // the teacher's Watch & help window fills #screen with the student's screen
else if (mode === "teacher") { if (game && api.setStudent("ali")) api.openGame(game); else api.who(); }   // the teacher can try a game; nothing is saved for him
else {
  const id = playerOf(me);
  document.body.classList.add("mi-student");
  if (!id) api.message("Your games are not ready yet", "Ask your teacher.");
  else if (game) { api.setStudent(id); api.openGame(game); }
  else api.chooseStudent(id);
}
document.getElementById("miBack").onclick = () => { location.href = mode === "teacher" ? "teacher.html" : "student.html"; };

/* ---------- Watch & help: the teacher sees this game screen as it is now and can draw on it ---------- */
if (mode === "student" && P.sid) {
  const { SCR, layer, rt } = await import("./screenpen.js?v=1123q");
  const id = SCR + "_" + P.sid, scr = document.getElementById("screen");
  const host = document.createElement("div"); host.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999"; document.body.appendChild(host);
  const L = layer(host, -1);
  const ban = document.createElement("div"); ban.className = "scr-banner"; ban.style.cssText = "position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:10000;margin:0"; ban.hidden = true; ban.innerHTML = "<i></i><span>Your teacher is looking at your screen now.</span>"; document.body.appendChild(ban);
  let sent = "", on = false, beat = 0, ch = null, chTok = "", rtAt = 0, rtStrokes = [], fastT = 0;
  const snap = () => { const h = scr ? scr.innerHTML : ""; return { h: h.length < 200000 ? h : "", w: innerWidth, vh: innerHeight, y: Math.round(scrollY) }; };
  const fast = () => { if (!ch) return; clearTimeout(fastT); fastT = setTimeout(() => ch && ch.send("s", snap()), 150); };
  const onRt = (ev, p) => { rtAt = Date.now(); if (ev === "d") { rtStrokes = p.strokes || []; L.paint(rtStrokes); } else if (ev === "m") L.paint(rtStrokes, p.s); else if (ev === "hi") fast(); };
  if (scr && window.MutationObserver) new MutationObserver(fast).observe(scr, { subtree: true, childList: true, attributes: true, characterData: true });
  addEventListener("scroll", fast, { passive: true });
  const push = force => {
    const h = scr ? scr.innerHTML : "", k = h.length + ":" + h.slice(-400) + ":" + Math.round(scrollY);
    if (!force && k === sent) return; sent = k;
    setDoc(doc(fs, ...base, "liveplayers", id), { sess: SCR, sid: P.sid, name: String((me && me.name) || "").slice(0, 80), joined: Date.now(), ans: { g: "9s", h: h.slice(0, 250000), w: innerWidth, vh: innerHeight, y: Math.round(scrollY) } }).catch(() => {});
  };
  const poll = async () => {
    try {
      const sn = await getDoc(doc(fs, ...base, "live", id)), d = sn.exists() ? sn.data() : null;
      on = !!(d && d.on && d.wid === "9s" && Date.now() - (d.at || 0) < 90e3);
      ban.hidden = !on; ban.querySelector("span").textContent = on && (d.strokes || []).length ? "Your teacher is showing you something." : "Your teacher is looking at your screen now.";
      const st = on ? (d.strokes || []) : [];
      if (on && d.rt && d.rt !== chTok) { if (ch) ch.close(); chTok = d.rt; rtStrokes = st; ch = rt(d.rt, onRt); setTimeout(fast, 800); }
      if (!on && ch) { ch.close(); ch = null; chTok = ""; }
      if (Date.now() - rtAt > 5000) { rtStrokes = st; L.paint(st); }
    } catch {}
    push(++beat % 30 === 0);
    setTimeout(poll, on ? 1500 : 3000);
  };
  poll();
}
