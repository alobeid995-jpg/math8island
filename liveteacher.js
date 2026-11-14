// Teacher side: "Live worksheets". Each interactive worksheet is hidden until the teacher presses Start for a class.
// State is one document, work/liveopen: { kind:"liveopen", open:{ <worksheet id>:{ "8B": startedAtMs } }, classes:[every class with something open] }.
import { getDoc, setDoc, bdoc } from "./fb.js?v=1113d";
import { LIVE_WS, isLive } from "./liveworks.js?v=1113d";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let modal = null, open = {}, msg = "", busy = false;
const cl = () => [...new Set([...(typeof CLASSES !== "undefined" ? CLASSES : []), "8G", "8D"])];
const isOn = (id, c) => isLive(LIVE_WS.find(w => w.id === id), open, c);
const when = t => new Date(t).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" });

function ui() {
  if (modal) return;
  modal = document.createElement("div"); modal.className = "modal"; modal.id = "lwModal"; modal.hidden = true;
  modal.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-label="Live worksheets" style="width:min(680px,100%);max-height:94vh;overflow:auto"><div id="lwBody"></div></div>';
  document.body.appendChild(modal);
  const st = document.createElement("style");
  st.textContent = ".lw-card{border:2px solid var(--line,#ccd);border-radius:14px;padding:12px 14px;margin:10px 0;background:var(--card,#fff);color:var(--ink,#13213f)}.lw-card h4{margin:0}.lw-card small{display:block;opacity:.75;margin-top:2px}.lw-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.lw-btn{border:2px solid var(--edge,#13213f);border-radius:999px;padding:7px 14px;font-weight:800;background:var(--card,#fff);color:var(--ink,#13213f);cursor:pointer}.lw-btn.on{background:#1f9d55;border-color:#1f9d55;color:#fff}.lw-btn:disabled{opacity:.6}.lw-st{font-size:.85rem;margin-top:6px}";
  document.head.appendChild(st);
  modal.addEventListener("click", async e => {
    if (e.target === modal) { modal.hidden = true; return; }
    const b = e.target.closest("[data-lw]"); if (!b || busy) return;
    const a = b.dataset.lw; if (a === "close") { modal.hidden = true; return; }
    const id = b.dataset.id, c = b.dataset.c, now = Date.now(), o = {};
    LIVE_WS.forEach(w => { o[w.id] = {}; cl().forEach(k => { if (isOn(w.id, k)) o[w.id][k] = (open[w.id] && open[w.id][k]) || now; }); });
    if (a === "tog") { if (o[id][c]) delete o[id][c]; else o[id][c] = now; }
    if (a === "all") cl().forEach(k => { if (!o[id][k]) o[id][k] = now; });
    if (a === "none") o[id] = {};
    busy = true; msg = ""; paint();
    try {
      const classes = [...new Set(Object.values(o).flatMap(m => Object.keys(m)))];
      await setDoc(bdoc("work", "liveopen"), { kind: "liveopen", open: o, classes, created: now });
      open = o; msg = a === "tog" ? (o[id] && o[id][c] ? `Started for ${c}. They can see it now.` : `Stopped for ${c}. It is hidden again.`) : a === "all" ? "Started for every class." : "Stopped for every class.";
    } catch { msg = "Could not save. Check your connection and try again."; }
    busy = false; paint();
  });
}
function paint() {
  const b = document.getElementById("lwBody"); if (!b) return;
  const classes = cl();
  b.innerHTML = `<h3>Live worksheets</h3><p style="margin:4px 0 8px">Prepare them ahead. Students only see a worksheet after you press <b>Start</b> for their class, and it disappears again when you press <b>Stop</b>.</p>`
    + (LIVE_WS.length ? LIVE_WS.map(w => {
      const on = classes.filter(c => isOn(w.id, c));
      return `<div class="lw-card"><h4>${esc(w.title)}</h4>${w.sub ? `<small>${esc(w.sub)}</small>` : ""}
        <div class="lw-row">${classes.map(c => `<button type="button" class="lw-btn${isOn(w.id, c) ? " on" : ""}" data-lw="tog" data-id="${esc(w.id)}" data-c="${esc(c)}" ${busy ? "disabled" : ""}>${isOn(w.id, c) ? "● " + esc(c) + " · open · Stop" : "Start for " + esc(c)}</button>`).join("")}</div>
        <div class="lw-row"><button type="button" class="lw-btn" data-lw="all" data-id="${esc(w.id)}" ${busy ? "disabled" : ""}>Start for all</button><button type="button" class="lw-btn" data-lw="none" data-id="${esc(w.id)}" ${busy || !on.length ? "disabled" : ""}>Stop for all</button></div>
        <div class="lw-st">${on.length ? "Open now: " + on.map(c => esc(c) + (open[w.id] && open[w.id][c] ? " (since " + when(open[w.id][c]) + ")" : "")).join(", ") : "Hidden from every class."}</div></div>`;
    }).join("") : `<p class="none">No interactive worksheets are added yet.</p>`)
    + (msg ? `<p role="status" style="font-weight:700">${esc(msg)}</p>` : "") + `<div class="sbtns"><button class="ghost" type="button" data-lw="close">Close</button></div>`;
}
export async function openLiveWs() {
  ui(); modal.hidden = false; msg = "";
  try { const s = await getDoc(bdoc("work", "liveopen")); open = (s.exists() && s.data().open) || {}; } catch { open = {}; msg = "Could not read the current state."; }
  paint();
}
