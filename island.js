// Connects the 9S Island games page to Math Island: who is playing, and where the answers go.
import { auth, fs, doc, getDoc, setDoc, collection, getDocs, query, where, whenUser, profileOf, signOut } from "./fb.js?v=1111y";

import { playerOf } from "./islandmap.js?v=1111y";

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
if (mode === "teacher") { if (game && api.setStudent("ali")) api.openGame(game); else api.who(); }   // the teacher can try a game; nothing is saved for him
else {
  const id = playerOf(me);
  document.body.classList.add("mi-student");
  if (!id) api.message("Your games are not ready yet", "Ask your teacher.");
  else if (game) { api.setStudent(id); api.openGame(game); }
  else api.chooseStudent(id);
}
document.getElementById("miBack").onclick = () => { location.href = mode === "teacher" ? "teacher.html" : "student.html"; };
