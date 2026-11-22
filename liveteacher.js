// Teacher side: "Live worksheets". Each interactive worksheet is hidden until the teacher presses Start for a class.
// State is one document, work/liveopen: { kind:"liveopen", open:{ <worksheet id>:{ "8B": startedAtMs } }, classes:[every class with something open] }.
import { getDoc, setDoc, bdoc } from "./fb.js?v=1122l";
import { LIVE_WS, isLive } from "./liveworks.js?v=1122l";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let modal = null, open = {}, msg = "", busy = false, exp = "";
const cl = () => [...new Set([...(typeof CLASSES !== "undefined" ? CLASSES : []), "8G", "8D"])];
const isOn = (id, c) => isLive(LIVE_WS.find(w => w.id === id), open, c);
const when = t => new Date(t).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" });

function ui() {
  if (modal) return;
  modal = document.createElement("div"); modal.className = "modal"; modal.id = "lwModal"; modal.hidden = true;
  modal.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-label="Live worksheets" style="width:min(680px,100%);max-height:94vh;overflow:auto"><div id="lwBody"></div></div>';
  document.body.appendChild(modal);
  const st = document.createElement("style");
  st.textContent = ".lw-card{border:2px solid var(--line,#ccd);border-radius:14px;padding:12px 14px;margin:10px 0;background:var(--card,#fff);color:var(--ink,#13213f)}.lw-card h4{margin:0}.lw-card small{display:block;opacity:.75;margin-top:2px}.lw-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.lw-btn{border:2px solid var(--edge,#13213f);border-radius:999px;padding:7px 14px;font-weight:800;background:var(--card,#fff);color:var(--ink,#13213f);cursor:pointer}.lw-btn.on{background:#1f9d55;border-color:#1f9d55;color:#fff}.lw-btn:disabled{opacity:.6}.lw-st{font-size:.85rem;margin-top:6px}"
    + ".lw-list{display:grid;gap:8px;margin:8px 0}.lw-item{border:1px solid var(--line,#d7deea);border-radius:14px;background:var(--card,#fff);color:var(--ink,#13213f);overflow:hidden}.lw-item.open{border-color:var(--accent,#2f4fd6);box-shadow:0 4px 14px rgba(23,35,59,.08)}"
    + ".lw-hd{all:unset;box-sizing:border-box;width:100%;cursor:pointer;display:grid;grid-template-columns:1fr auto 18px;align-items:center;gap:10px;padding:11px 14px}.lw-hd:focus-visible{outline:2px solid var(--accent,#2f4fd6);outline-offset:-2px}"
    + ".lw-t{min-width:0}.lw-t b{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lw-t small{display:block;font-size:12px;color:var(--muted,#5d6a82)}"
    + ".lw-tags{display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end;max-width:240px}.lw-tag{font-size:11.5px;font-weight:700;padding:2px 8px;border-radius:99px;background:#e1f4ec;color:#11865a}.lw-off{font-size:12px;color:var(--muted,#5d6a82)}"
    + ".lw-chev{width:18px;height:18px;transition:transform .15s;color:var(--muted,#5d6a82)}.lw-item.open .lw-chev{transform:rotate(180deg)}"
    + ".lw-in{padding:2px 14px 14px;border-top:1px solid var(--line,#d7deea)}.lw-in .lw-btn{padding:5px 12px;font-size:13.5px;border-width:1.5px}.lw-in .lw-row{gap:6px}";
  document.head.appendChild(st);
  modal.addEventListener("click", async e => {
    if (e.target === modal) { modal.hidden = true; return; }
    const b = e.target.closest("[data-lw]"); if (!b || busy) return;
    const a = b.dataset.lw; if (a === "close") { modal.hidden = true; return; }
    if (a === "create") { modal.hidden = true; if (window.__newWorksheet) window.__newWorksheet(); return; }
    if (a === "exp") { exp = exp === b.dataset.id ? "" : b.dataset.id; paint(); return; }
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
    + `<div class="sbtns" style="justify-content:flex-start;margin:4px 0 10px"><button class="primary" type="button" data-lw="create">+ Create live worksheet</button></div>`
    + (LIVE_WS.length ? `<div class="lw-list">` + LIVE_WS.map(w => {
      const on = classes.filter(c => isOn(w.id, c)), x = exp === w.id;
      return `<div class="lw-item${x ? " open" : ""}"><button type="button" class="lw-hd" data-lw="exp" data-id="${esc(w.id)}" aria-expanded="${x}">
          <span class="lw-t"><b>${esc(w.title)}</b>${w.sub ? `<small>${esc(w.sub)}</small>` : ""}</span>
          <span class="lw-tags">${on.length ? on.map(c => `<span class="lw-tag">${esc(c)}</span>`).join("") : `<span class="lw-off">Hidden</span>`}</span>
          <svg class="lw-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
        ${x ? `<div class="lw-in"><div class="lw-row">${classes.map(c => `<button type="button" class="lw-btn${isOn(w.id, c) ? " on" : ""}" data-lw="tog" data-id="${esc(w.id)}" data-c="${esc(c)}" ${busy ? "disabled" : ""}>${isOn(w.id, c) ? "● " + esc(c) + " · Stop" : "Start " + esc(c)}</button>`).join("")}</div>
        <div class="lw-row"><button type="button" class="lw-btn" data-lw="all" data-id="${esc(w.id)}" ${busy ? "disabled" : ""}>Start for all</button><button type="button" class="lw-btn" data-lw="none" data-id="${esc(w.id)}" ${busy || !on.length ? "disabled" : ""}>Stop for all</button></div>
        <div class="lw-st">${on.length ? "Open now: " + on.map(c => esc(c) + (open[w.id] && open[w.id][c] ? " (since " + when(open[w.id][c]) + ")" : "")).join(", ") : "Hidden from every class."}</div></div>` : ""}</div>`;
    }).join("") + `</div>` : `<p class="none">No interactive worksheets are added yet.</p>`)
    + (msg ? `<p role="status" style="font-weight:700">${esc(msg)}</p>` : "") + `<div class="sbtns"><button class="ghost" type="button" data-lw="close">Close</button></div>`;
}
export async function openLiveWs() {
  ui(); modal.hidden = false; msg = "";
  try { const s = await getDoc(bdoc("work", "liveopen")); open = (s.exists() && s.data().open) || {}; } catch { open = {}; msg = "Could not read the current state."; }
  paint();
}
