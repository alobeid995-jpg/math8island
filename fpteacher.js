// Teacher side: Fun Park. The teacher opens or closes it for each of her classes (work/funpark, kind "funpark").
// The button only exists for a teacher the owner has given Fun Park to (developer page -> Teachers -> Features; stored in shop/features).
import { fs, doc, getDoc, setDoc, bdoc } from "./fb.js?v=1111n";
import { GAMES } from "./fpgames.js?v=1111n";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let modal = null, openCls = [], msg = "";

export async function hasFunpark(admin, uid, key = "funpark") {
  if (admin) return true;
  try { const s = await getDoc(doc(fs, "shop", "features")); const f = s.exists() && s.data()[key]; return !!f && (f.all === true || (Array.isArray(f.uids) && f.uids.includes(uid))); } catch { return false; }
}
function ui() {
  if (modal) return;
  modal = document.createElement("div"); modal.className = "modal"; modal.id = "fpModal"; modal.hidden = true;
  modal.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-label="Fun Park" style="width:min(640px,100%);max-height:94vh;overflow:auto"><div id="fpBody"></div></div>';
  document.body.appendChild(modal);
  modal.addEventListener("click", async e => {
    if (e.target === modal) { modal.hidden = true; return; }
    const b = e.target.closest("[data-fp]"); if (!b) return;
    const a = b.dataset.fp, cl = typeof CLASSES !== "undefined" ? CLASSES : [];
    if (a === "close") { modal.hidden = true; return; }
    if (a === "tog") { const c = b.dataset.c; openCls = openCls.includes(c) ? openCls.filter(x => x !== c) : [...openCls, c]; }
    if (a === "all") openCls = [...cl];
    if (a === "none") openCls = [];
    msg = "";
    try { await setDoc(bdoc("work", "funpark"), { kind: "funpark", classes: openCls, created: Date.now() }); msg = openCls.length ? "Saved. Open for: " + openCls.join(", ") : "Saved. Fun Park is closed for everyone."; }
    catch { msg = "Could not save. Check your connection and try again."; }
    paint();
  });
}
function paint() {
  const cl = typeof CLASSES !== "undefined" ? CLASSES : [];
  $b().innerHTML = `<h3 style="margin:0 0 4px">🎮 Fun Park</h3><p class="rep-note">Games the students can play after they finish their work. Tap a class to open or close it. Students see a Fun Park button only while their class is open. Nothing here gives XP.</p>
  <div class="sbtns" style="justify-content:flex-start;margin:10px 0">${cl.map(c => `<button type="button" class="${openCls.includes(c) ? "primary" : "ghost"}" data-fp="tog" data-c="${esc(c)}" aria-pressed="${openCls.includes(c)}">${esc(c)}: ${openCls.includes(c) ? "Open" : "Closed"}</button>`).join("") || '<span class="rep-note">Add a class first.</span>'}</div>
  <div class="sbtns" style="justify-content:flex-start"><button type="button" class="primary" data-fp="all">Open for all my classes</button><button type="button" class="ghost" data-fp="none">Close for everyone</button></div>
  <p class="lv-msg" style="min-height:1.3em;font-weight:600">${esc(msg)}</p>
  <p class="rep-note">${GAMES.length} games: ${GAMES.map(g => esc(g.title)).join(", ")}.</p>
  <div class="sbtns" style="justify-content:flex-end"><button type="button" class="ghost" data-fp="close">Done</button></div>`;
}
const $b = () => document.getElementById("fpBody");
export async function openFunpark() {
  ui(); msg = ""; openCls = [];
  try { const s = await getDoc(bdoc("work", "funpark")); if (s.exists()) openCls = (s.data().classes || []).filter(c => typeof c === "string"); } catch {}
  paint(); modal.hidden = false;
}
