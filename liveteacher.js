// Teacher side: "Live worksheets". Each interactive worksheet is hidden until the teacher presses Start for a class.
// State is one document, work/liveopen: { kind:"liveopen", open:{ <worksheet id>:{ "8B": startedAtMs } }, classes:[every class with something open] }.
import { getDoc, getDocs, setDoc, deleteDoc, updateDoc, bcol, bdoc } from "./fb.js?v=1123s";
import { LIVE_WS, isLive, setUploaded, withBridge } from "./liveworks.js?v=1123s";

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
    if (a === "upload") { pickHtml(); return; }
    if (a === "preview") { preview(b.dataset.id); return; }
    if (a === "delup") { const w = LIVE_WS.find(x => x.id === b.dataset.id); if (!w || !confirm('Delete "' + w.title + '"? Students will no longer see it. Their results stay.')) return; busy = true; paint(); try { await deleteDoc(bdoc("work", w.id)); await refresh(); msg = "Deleted."; } catch { msg = "Could not delete."; } busy = false; paint(); return; }
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
      const w0 = LIVE_WS.find(x => x.id === id); if (w0 && w0.up) { const want = [...new Set([...(w0.classes || []), ...Object.keys(o[id] || {})])]; if (want.length !== (w0.classes || []).length) { await updateDoc(bdoc("work", id), { classes: want }); w0.classes = want; } }
      open = o; msg = a === "tog" ? (o[id] && o[id][c] ? `Started for ${c}. They can see it now.` : `Stopped for ${c}. It is hidden again.`) : a === "all" ? "Started for every class." : "Stopped for every class.";
    } catch { msg = "Could not save. Check your connection and try again."; }
    busy = false; paint();
  });
}
function paint() {
  const b = document.getElementById("lwBody"); if (!b) return;
  const classes = cl();
  b.innerHTML = `<h3>Live worksheets</h3><p style="margin:4px 0 8px">Prepare them ahead. Students only see a worksheet after you press <b>Start</b> for their class, and it disappears again when you press <b>Stop</b>.</p>`
    + `<div class="sbtns" style="justify-content:flex-start;margin:4px 0 10px"><button class="primary" type="button" data-lw="create">+ Create live worksheet</button><button class="ghost" type="button" data-lw="upload">Upload HTML worksheet</button><input type="file" id="lwFile" accept=".html,.htm,text/html" hidden></div>`
    + (LIVE_WS.length ? `<div class="lw-list">` + LIVE_WS.map(w => {
      const on = classes.filter(c => isOn(w.id, c)), x = exp === w.id;
      return `<div class="lw-item${x ? " open" : ""}"><button type="button" class="lw-hd" data-lw="exp" data-id="${esc(w.id)}" aria-expanded="${x}">
          <span class="lw-t"><b>${w.up ? "📄 " : ""}${esc(w.title)}</b>${w.sub ? `<small>${esc(w.sub)}</small>` : ""}</span>
          <span class="lw-tags">${on.length ? on.map(c => `<span class="lw-tag">${esc(c)}</span>`).join("") : `<span class="lw-off">Hidden</span>`}</span>
          <svg class="lw-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
        ${x ? `<div class="lw-in"><div class="lw-row">${classes.map(c => `<button type="button" class="lw-btn${isOn(w.id, c) ? " on" : ""}" data-lw="tog" data-id="${esc(w.id)}" data-c="${esc(c)}" ${busy ? "disabled" : ""}>${isOn(w.id, c) ? "● " + esc(c) + " · Stop" : "Start " + esc(c)}</button>`).join("")}</div>
        <div class="lw-row"><button type="button" class="lw-btn" data-lw="all" data-id="${esc(w.id)}" ${busy ? "disabled" : ""}>Start for all</button><button type="button" class="lw-btn" data-lw="none" data-id="${esc(w.id)}" ${busy || !on.length ? "disabled" : ""}>Stop for all</button></div>
        ${w.up ? `<div class="lw-row"><button type="button" class="lw-btn" data-lw="preview" data-id="${esc(w.id)}">Preview</button><button type="button" class="lw-btn" data-lw="delup" data-id="${esc(w.id)}" ${busy ? "disabled" : ""}>Delete</button></div>` : ""}
        <div class="lw-st">${on.length ? "Open now: " + on.map(c => esc(c) + (open[w.id] && open[w.id][c] ? " (since " + when(open[w.id][c]) + ")" : "")).join(", ") : "Hidden from every class."}</div></div>` : ""}</div>`;
    }).join("") + `</div>` : `<p class="none">No interactive worksheets are added yet.</p>`)
    + (msg ? `<p role="status" style="font-weight:700">${esc(msg)}</p>` : "") + `<div class="sbtns"><button class="ghost" type="button" data-lw="close">Close</button></div>`;
}
async function refresh() { try { const s = await getDocs(bcol("work")); const d = s.docs.map(x => ({ id: x.id, ...x.data() })); setUploaded(d); d.filter(x => x.kind === "htmlws").forEach(x => { const w = LIVE_WS.find(y => y.id === x.id); if (w) w.classes = x.classes || []; }); } catch {} }
function pickHtml() {
  const f = document.getElementById("lwFile"); f.value = "";
  f.onchange = async () => {
    const file = f.files[0]; if (!file) return;
    if (file.size > 3e6) { msg = "That file is too big (over 3 MB). Put the pictures in smaller or ask Claude to shrink it."; return paint(); }
    const html = await file.text(), t0 = ((html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || file.name.replace(/\.html?$/i, "")).trim();
    const title = (prompt("Title of the worksheet (students see it):", t0) || "").trim(); if (!title) return;
    const sub = (prompt("Short line under the title (for example: Exercise 4.3 · Day 1). You can leave it empty.", "") || "").trim();
    busy = true; msg = "Uploading…"; paint();
    try { const id = "h" + Date.now().toString(36); await setDoc(bdoc("work", id), { kind: "htmlws", title: title.slice(0, 80), sub: sub.slice(0, 80), html, classes: cl(), created: Date.now() }); await refresh(); exp = id;
      msg = `Uploaded "${title}". Press Start for a class when you want students to see it.` + (/MI\.done\s*\(/.test(html) ? "" : " Note: this file does not report results to the site, so students get an \"I finished\" button instead."); }
    catch (e) { msg = "Could not upload: " + ((e && (e.code || e.message)) || "error"); }
    busy = false; paint();
  };
  f.click();
}
async function preview(id) {
  let html = ""; try { const s = await getDoc(bdoc("work", id)); html = s.exists() ? s.data().html || "" : ""; } catch {}
  if (!html) { msg = "Could not open it."; return paint(); }
  const ov = document.createElement("div"); ov.style.cssText = "position:fixed;inset:0;z-index:99990;background:#000;display:flex;flex-direction:column";
  ov.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#141b2b;color:#fff;font:600 14px system-ui"><span>Preview (nothing is saved)</span><button type="button" style="all:unset;cursor:pointer;padding:8px 14px;border-radius:10px;background:#2c3856">Close</button></div><iframe sandbox="allow-scripts allow-forms allow-modals allow-popups" style="flex:1;border:0;background:#fff" title="Preview"></iframe>';
  ov.querySelector("iframe").srcdoc = withBridge(html); ov.querySelector("button").onclick = () => ov.remove(); document.body.appendChild(ov);
}
export async function openLiveWs() {
  ui(); modal.hidden = false; msg = ""; await refresh();
  try { const s = await getDoc(bdoc("work", "liveopen")); open = (s.exists() && s.data().open) || {}; } catch { open = {}; msg = "Could not read the current state."; }
  paint();
}
