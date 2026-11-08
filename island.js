// Connects the 9S Island games page to Math Island: who is playing, and where the answers go.
import { auth, fs, doc, getDoc, setDoc, collection, getDocs, query, where, whenUser, profileOf, signOut } from "./fb.js";

// Which Math Island student is which island player. Student ID first, first name as a fallback.
const BY_ID = { "18-00058": "ali", "15-00003": "abood", "16-00107": "saud" };
const BY_NAME = { ali: "ali", abdulla: "abood", abdullah: "abood", abood: "abood", saud: "saud" };

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

if (mode === "teacher") { api.who(); }
else {
  const id = me && (BY_ID[String(me.enrollment || "").trim()] || BY_NAME[String(me.name || "").trim().split(/\s+/)[0].toLowerCase()]);
  document.body.classList.add("mi-student");
  if (id) api.chooseStudent(id);
  else api.message("Your games are not ready yet", "Ask your teacher to add you to 9S Island.");
}
document.getElementById("miBack").onclick = () => { location.href = mode === "teacher" ? "teacher.html" : "student.html"; };
