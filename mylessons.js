/* "My lessons": interactive lessons that open full screen inside the site, with a slim class panel
   (student names, quick XP, a random picker) so the teacher never has to leave the lesson.
   Classic script: it shares the page's students / cls / giveEntry with teacher.html. */
(function () {
  "use strict";
  // To add a lesson: put its .html file next to this one and add a line here.
  const LESSONS = [
    { id: "l42d1", title: "Lesson 4.2: Solving simultaneous equations graphically", sub: "Day 1", file: "lesson42d1.html" },
  ];
  window.__view = () => view;
  window.__setView = v => { view = v; try { localStorage.setItem("xp_view", v); } catch {} render(); };
  const $$ = id => document.getElementById(id);
  const E = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let ov = null, panel = null, sel = "", openSid = "", note = "", pickBusy = false, current = null, timer = 0, lastAuto = "", rc = "", fw = null, fwOpen = false, fwStage = null;

  function css() {
    if ($$("mlCss")) return;
    const s = document.createElement("style"); s.id = "mlCss";
    s.textContent = `
.ml-ov{position:fixed;inset:0;z-index:99000;background:#000}
.ml-ov iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff}
.ml-fab{position:absolute;z-index:2;width:46px;height:46px;border-radius:50%;border:2px solid #fff;background:rgba(19,33,63,.82);color:#fff;font:800 20px/1 system-ui;cursor:pointer;display:grid;place-items:center;opacity:.72}
.ml-fab:hover,.ml-fab:focus-visible{opacity:1}
.ml-fab.x{top:10px;right:10px}.ml-fab.o{top:10px;right:66px;text-decoration:none}.ml-fab.t{bottom:12px;right:12px}.ml-fab.f{bottom:12px;right:66px}
.ml-pill{position:absolute;z-index:2;left:10px;bottom:12px;padding:6px 12px;border-radius:999px;background:rgba(19,33,63,.82);color:#fff;font:700 14px system-ui;border:2px solid #fff;opacity:.8}
.ml-pill.warn{background:#b91c1c;opacity:1;animation:mlp 1s infinite}
@keyframes mlp{50%{transform:scale(1.06)}}
.ml-p{position:absolute;z-index:3;top:0;right:0;bottom:0;width:min(370px,100%);background:var(--card,#fff);color:var(--ink,#17233b);border-left:3px solid var(--ink,#17233b);display:flex;flex-direction:column;font:15px system-ui,sans-serif}
.ml-p[hidden]{display:none}
.ml-h{display:flex;gap:6px;align-items:center;padding:8px 10px;border-bottom:2px solid var(--line,#d7deea);flex-wrap:wrap}
.ml-h b{font-size:16px;margin-right:auto}
.ml-chips{display:flex;gap:6px;flex-wrap:wrap;padding:8px 10px;border-bottom:1px solid var(--line,#d7deea)}
.ml-c,.ml-t,.ml-b{font:inherit;font-weight:800;border:2px solid var(--ink,#17233b);background:var(--card,#fff);color:var(--ink,#17233b);border-radius:999px;padding:6px 12px;cursor:pointer}
.ml-c[aria-pressed="true"],.ml-t[aria-pressed="true"]{background:var(--ink,#17233b);color:var(--card,#fff)}
.ml-b.g{background:#15803d;border-color:#15803d;color:#fff}.ml-b.r{background:#b91c1c;border-color:#b91c1c;color:#fff}.ml-b.s{padding:4px 9px;font-size:13px}
.ml-body{flex:1;overflow:auto;padding:6px 10px 12px;-webkit-overflow-scrolling:touch}
.ml-r{border-bottom:1px solid var(--line,#d7deea);padding:8px 0}
.ml-rh{display:flex;align-items:center;gap:8px;width:100%;background:none;border:0;font:inherit;color:inherit;text-align:left;cursor:pointer;padding:4px 0;min-height:38px}
.ml-rh b{flex:1;font-weight:700}.ml-rh span{font-weight:800;opacity:.75}
.ml-ex{display:grid;gap:8px;padding:6px 0 4px}
.ml-g{display:flex;flex-wrap:wrap;gap:6px}
.ml-cx{display:flex;gap:6px;align-items:center}.ml-cx input{width:90px;padding:7px;border:2px solid var(--line,#d7deea);border-radius:8px;font:inherit;background:var(--card,#fff);color:inherit}
.ml-note{min-height:1.3em;padding:4px 10px;font-weight:700;font-size:13px}
.ml-big{font:800 34px/1.15 system-ui;text-align:center;margin:18px 0 8px;word-break:break-word}
.ml-q{font-size:60px;text-align:center;opacity:.35;margin:14px 0 0}
.ml-wheel{position:absolute;z-index:4;left:10px;bottom:58px;width:58px;height:58px;border-radius:50%;border:3px solid #fff;background:#13213f;padding:0;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.45);display:grid;place-items:center;touch-action:none}
.ml-wheel svg{width:46px;height:46px;transition:transform .8s cubic-bezier(.2,.8,.2,1)}
.ml-wheel:hover svg,.ml-wheel.spin svg{transform:rotate(300deg)}
.ml-wheel[hidden]{display:none}
.ml-fw{position:absolute;z-index:5;width:min(310px,calc(100% - 20px));background:var(--card,#fff);color:var(--ink,#17233b);border:3px solid var(--ink,#17233b);border-radius:18px;box-shadow:0 10px 34px rgba(0,0,0,.5);font:15px system-ui,sans-serif;display:flex;flex-direction:column;max-height:calc(100% - 20px);overflow:hidden}
.ml-fw[hidden]{display:none}
.ml-fwh{display:flex;align-items:center;gap:6px;padding:7px 8px 7px 12px;background:var(--accent-soft,#e6ebff);cursor:grab;touch-action:none;user-select:none;border-bottom:2px solid var(--line,#d7deea)}
.ml-fwh b{flex:1;font-size:15px}
.ml-fwh select{font:inherit;font-weight:700;border:2px solid var(--ink,#17233b);border-radius:999px;padding:3px 6px;background:var(--card,#fff);color:inherit}
.ml-fwb{padding:8px 12px 12px;display:grid;gap:8px;justify-items:center;text-align:center;overflow:auto}
.ml-fw .pk-stage{min-height:0;padding:4px 0 0;gap:6px;overflow:visible}
.ml-fw .pk-stage .av.xxl{width:120px;height:120px}
.ml-fw .pk-stage .pk-name{font-size:24px}
.ml-fw .pk-stage .pk-q{width:96px;font-size:48px}
.ml-fw .pk-quick{display:flex;gap:6px;justify-content:center;flex-wrap:wrap}
.ml-fw .pk-quick button{font-size:13px;padding:6px 10px}
@media (prefers-reduced-motion:reduce){.ml-pill.warn{animation:none}}`;
    document.head.appendChild(s);
  }

  /* ---------- the list of lessons ---------- */
  /* Turn a Google Drive / Slides / Docs share link into one that can open inside the site. Other web links are used as they are. */
  function embedUrl(u) {
    u = String(u || "").trim(); if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    let x; try { x = new URL(u); } catch { return ""; }
    if (!/^https?:$/.test(x.protocol)) return "";
    const m = x.pathname.match(/\/(presentation|document|spreadsheets)\/d\/([\w-]+)/), f = x.pathname.match(/\/file\/d\/([\w-]+)/), q = x.searchParams.get("id");
    if (/docs\.google\.com$/.test(x.hostname) && m) return `https://docs.google.com/${m[1]}/d/${m[2]}/preview`;
    if (/drive\.google\.com$/.test(x.hostname) && f) return `https://drive.google.com/file/d/${f[1]}/preview`;
    if (/drive\.google\.com$/.test(x.hostname) && q) return `https://drive.google.com/file/d/${q}/preview`;
    return x.href;
  }
  let custom = [], cmsg = "";
  const store = () => window.__mlStore;
  async function loadCustom() { try { custom = store() ? await store().load() : []; } catch { custom = []; cmsg = "Could not load your saved lessons."; } }
  async function saveCustom(ok) { cmsg = "Saving…"; renderList(); try { await store().save(custom); cmsg = ok || "Saved."; } catch { cmsg = "Could not save. Check your connection."; } renderList(); }
  function renderList() {
    const el = $$("mlList"); if (!el) return;
    const row = (l, mine, i) => `<div style="display:flex;gap:6px;align-items:stretch;margin:8px 0"><button type="button" class="ghost" data-ml-open="${E(l.id)}" style="flex:1;text-align:left;padding:12px 14px"><b>${E(l.title)}</b><br><small>${E(l.sub || "")}</small></button>${mine ? `<button type="button" class="ghost small" data-ml-up="${i}" aria-label="Move up">▲</button><button type="button" class="ghost small" data-ml-down="${i}" aria-label="Move down">▼</button><button type="button" class="ghost small" data-ml-del="${i}" aria-label="Remove ${E(l.title)}">Remove</button>` : ""}</div>`;
    el.innerHTML = `<h3>My lessons</h3><p style="margin:4px 0 10px">Tap a lesson to open it full screen. Inside it you get a small class panel (students, XP) and a random picker, so you never have to leave.</p>`
      + (LESSONS.length || custom.length ? LESSONS.map(l => row(l, false)).join("") + custom.map((l, i) => row(l, true, i)).join("") : `<p class="none">No lessons yet. Add one below.</p>`)
      + `<h4 style="margin:16px 0 4px">Add a lesson from a link</h4><p style="margin:0 0 6px"><small>Put your slides on Google Drive or Google Slides and share them as "Anyone with the link can view". Then paste the link here.</small></p>
      <div style="display:grid;gap:6px"><input id="mlNewTitle" maxlength="80" placeholder="Lesson name, for example 4.3 Day 1" autocomplete="off"><input id="mlNewUrl" inputmode="url" placeholder="Paste the Drive or Slides link" autocomplete="off"><div class="sbtns" style="justify-content:flex-start"><button class="primary" type="button" data-ml="add">Add lesson</button></div></div>`
      + `<p role="status" style="min-height:1.3em;font-weight:700">${E(cmsg)}</p><div class="sbtns"><button class="ghost" type="button" data-ml="close">Close</button></div>`;
  }
  window.openMyLessons = async function () {
    css();
    let m = $$("mlModal");
    if (!m) {
      m = document.createElement("div"); m.className = "modal"; m.id = "mlModal"; m.hidden = true;
      m.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-label="My lessons" style="width:min(640px,100%);max-height:94vh;overflow:auto"><div id="mlList"></div></div>';
      document.body.appendChild(m);
      m.addEventListener("click", async e => {
        if (e.target === m || e.target.closest("[data-ml=close]")) { m.hidden = true; return; }
        const b = e.target.closest("[data-ml-open]"); if (b) { const l = LESSONS.concat(custom).find(x => x.id === b.dataset.mlOpen); m.hidden = true; openLesson(l); return; }
        if (e.target.closest("[data-ml=add]")) {
          const title = ($$("mlNewTitle").value || "").trim(), url = embedUrl($$("mlNewUrl").value);
          if (!title) { cmsg = "Type the lesson name."; return renderList(); }
          if (!url) { cmsg = "That does not look like a web link."; return renderList(); }
          custom.push({ id: "c" + Date.now().toString(36), title, sub: "From a link", url, orig: ($$("mlNewUrl").value || "").trim(), added: Date.now() }); await saveCustom("Added. Tap it to open."); return;
        }
        const up = e.target.closest("[data-ml-up]"), dn = e.target.closest("[data-ml-down]"), del = e.target.closest("[data-ml-del]");
        if (up || dn) { const i = +(up || dn).dataset[up ? "mlUp" : "mlDown"], k = up ? i - 1 : i + 1; if (k < 0 || k >= custom.length) return; [custom[i], custom[k]] = [custom[k], custom[i]]; await saveCustom("Moved."); return; }
        if (del) { const i = +del.dataset.mlDel; if (!confirm('Remove "' + custom[i].title + '" from the list? The file on Drive stays where it is.')) return; custom.splice(i, 1); await saveCustom("Removed."); }
      });
    }
    cmsg = ""; renderList(); m.hidden = false; await loadCustom(); renderList();
  };

  /* ---------- helpers on the page's own data ---------- */
  const allStudents = () => (typeof students !== "undefined" ? students : []);
  const classes = () => { const set = new Set(typeof CLASSES !== "undefined" ? CLASSES : []); allStudents().forEach(s => s.cls && set.add(s.cls)); return [...set]; };
  const inClass = c => allStudents().filter(s => s.cls === c).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const auto = () => { try { const r = window.__liveLesson && window.__liveLesson(); return r && r.cls; } catch { return null; } };
  const pickedKey = c => "xp_picked_" + c;
  const getPicked = c => { try { return new Set(JSON.parse(localStorage.getItem(pickedKey(c)) || "[]")); } catch { return new Set(); } };
  const setPicked = (c, set) => { try { localStorage.setItem(pickedKey(c), JSON.stringify([...set])); } catch {} };
  const POS = () => (typeof POSITIVE !== "undefined" ? POSITIVE : []), NEG = () => (typeof NEGATIVE !== "undefined" ? NEGATIVE : []);
  const short = t => t.replace(" During Class", "").replace(" / Book", "").replace("Mathematical ", "Math ");

  function award(st, title, xp) {
    if (typeof readOnly !== "undefined" && readOnly) { note = "View only."; return paint(); }
    try { giveEntry(st, { title, xp }); note = `${st.name}: ${xp > 0 ? "+" : ""}${xp} XP`; } catch (e) { note = "Could not save."; }
    paint();
  }
  function undoLast(st) { try { undo(st.id); note = "Last change removed."; } catch { note = "Could not undo."; } paint(); }

  /* ---------- the overlay ---------- */
  function openLesson(l) {
    if (!l) return; css();
    close(true);
    ov = document.createElement("div"); ov.className = "ml-ov"; ov.id = "mlOv";
    ov.innerHTML = `<iframe src="${E(l.url || l.file)}" title="${E(l.title)}" allow="fullscreen; autoplay" allowfullscreen></iframe>
      ${l.url ? `<a class="ml-fab o" href="${E(/^https?:/i.test(l.orig || "") ? l.orig : l.url)}" target="_blank" rel="noopener" aria-label="Open in a new tab" title="Open in a new tab">↗</a>` : ""}
      <button class="ml-fab x" type="button" data-mlx="close" aria-label="Close the lesson" title="Close the lesson">✕</button>
      <button class="ml-fab f" type="button" data-mlx="full" aria-label="Full screen" title="Full screen">⛶</button>
      <button class="ml-fab t" type="button" data-mlx="panel" aria-label="Class panel" title="Class panel">👥</button>
      <div class="ml-pill" id="mlPill" hidden></div>
      <aside class="ml-p" id="mlPanel" hidden aria-label="Class panel"></aside>`;
    document.body.appendChild(ov); document.body.classList.add("wk-noscroll");
    panel = ov.querySelector("#mlPanel"); sel = auto() || (typeof cls !== "undefined" ? cls : classes()[0]) || ""; lastAuto = auto() || ""; openSid = ""; note = ""; current = null; rc = sel; fNote = ""; fwOpen = false;
    setupFloat(); ov.addEventListener("click", onClick); ov.addEventListener("input", () => {});
    try { (ov.requestFullscreen || ov.webkitRequestFullscreen || (() => Promise.reject())).call(ov).catch(() => {}); } catch {}
    clearInterval(timer); timer = setInterval(tick, 5000); tick();
  }
  function close(silent) {
    clearInterval(timer);
    if (document.fullscreenElement) { try { document.exitFullscreen(); } catch {} }
    if (ov) { ov.remove(); ov = null; panel = null; }
    document.body.classList.remove("wk-noscroll");
  }
  function tick() {
    if (!ov) return;
    const pill = $$("mlPill"), r = (() => { try { return window.__liveLesson && window.__liveLesson(); } catch { return null; } })();
    if (pill) {
      if (r && r.now) { pill.hidden = false; pill.textContent = `${r.cls} · ${r.left} min left`; pill.classList.toggle("warn", r.left <= 5); }
      else if (r) { pill.hidden = false; pill.textContent = `${r.cls} starts in ${r.startsIn} min`; pill.classList.remove("warn"); }
      else pill.hidden = true;
    }
    const a = r && r.cls || "";
    if (a && a !== lastAuto) { lastAuto = a; sel = a; rc = a; current = null; paint(); paintFloat(); }   // the next lesson started: switch to its class
  }
  function onClick(e) {
    const x = e.target.closest("[data-mlx]");
    if (x) {
      const k = x.dataset.mlx;
      if (k === "close") { close(); return; }
      if (k === "full") { if (document.fullscreenElement) document.exitFullscreen(); else { try { (ov.requestFullscreen || ov.webkitRequestFullscreen).call(ov); } catch {} } return; }
      if (k === "panel") { panel.hidden = !panel.hidden; if (!panel.hidden) paint(); return; }
      if (k === "hide") { panel.hidden = true; return; }
    }
    const b = e.target.closest("[data-a]"); if (!b || !panel || !panel.contains(b)) return;
    const a = b.dataset.a;
    if (a === "cls") { sel = b.dataset.c; current = null; openSid = ""; note = ""; paint(); }
    else if (a === "row") { openSid = openSid === b.dataset.id ? "" : b.dataset.id; note = ""; paint(); }
    else if (a === "give") { const st = allStudents().find(s => s.id === b.dataset.id); if (st) award(st, b.dataset.title, +b.dataset.xp); }
    else if (a === "custom") {
      const st = allStudents().find(s => s.id === b.dataset.id), inp = panel.querySelector("#mlCx"), n = Math.round(Number(inp && inp.value));
      if (!st) return; if (!inp.value.trim() || !Number.isFinite(n) || n === 0) { note = "Type an amount like 5 or -5."; return paint(); }
      if (Math.abs(n) > 500) { note = "Up to 500 XP here. Use the main page for more."; return paint(); }
      award(st, n > 0 ? "Bonus XP" : "XP adjustment", n);
    }
    else if (a === "undo") { const st = allStudents().find(s => s.id === b.dataset.id); if (st) undoLast(st); }
  }
  function awardsHTML(st) {
    return `<div class="ml-g">${POS().map(p => `<button class="ml-b g s" type="button" data-a="give" data-id="${E(st.id)}" data-title="${E(p.title)}" data-xp="${p.xp}">${E(short(p.title))} +${p.xp}</button>`).join("")}</div>
      <div class="ml-g">${NEG().map(p => `<button class="ml-b r s" type="button" data-a="give" data-id="${E(st.id)}" data-title="${E(p.title)}" data-xp="${p.xp}">${E(short(p.title))} ${p.xp}</button>`).join("")}</div>
      <div class="ml-cx"><input id="mlCx" type="number" inputmode="numeric" placeholder="XP, e.g. 5 or -5" aria-label="Custom XP"><button class="ml-b s" type="button" data-a="custom" data-id="${E(st.id)}">Add</button><button class="ml-b s" type="button" data-a="undo" data-id="${E(st.id)}">Undo last</button></div>`;
  }
  function paint() {
    if (!panel || panel.hidden) return;
    const list = inClass(sel), keep = panel.querySelector(".ml-body"), top = keep ? keep.scrollTop : 0;
    const body = list.length ? list.map(st => `<div class="ml-r"><button class="ml-rh" type="button" data-a="row" data-id="${E(st.id)}" aria-expanded="${openSid === st.id}"><b>${E(st.name)}</b><span>${st.xp} XP</span></button>${openSid === st.id ? `<div class="ml-ex">${awardsHTML(st)}</div>` : ""}</div>`).join("") : `<p>No students in ${E(sel)}.</p>`;
    panel.innerHTML = `<div class="ml-h"><b>${E(sel)}${auto() === sel ? " · now" : ""}</b><button class="ml-t" type="button" data-mlx="hide" aria-label="Hide the panel">Hide ✕</button></div>
      <div class="ml-chips">${classes().map(c => `<button class="ml-c" type="button" data-a="cls" data-c="${E(c)}" aria-pressed="${c === sel}">${E(c)}</button>`).join("")}</div>
      <div class="ml-note" role="status">${E(note)}</div><div class="ml-body">${body}</div>`;
    const nb = panel.querySelector(".ml-body"); if (nb) nb.scrollTop = top;
  }
  /* ---------- the random picker: a floating window above the lesson, a spin-the-wheel button when minimised ---------- */
  const WHEEL = '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29" fill="#fff"/><g>' + ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"].map((c, k) => { const a0 = k * Math.PI / 3 - Math.PI / 2, a1 = (k + 1) * Math.PI / 3 - Math.PI / 2; return `<path d="M32 32L${(32 + 27 * Math.cos(a0)).toFixed(1)} ${(32 + 27 * Math.sin(a0)).toFixed(1)}A27 27 0 0 1 ${(32 + 27 * Math.cos(a1)).toFixed(1)} ${(32 + 27 * Math.sin(a1)).toFixed(1)}Z" fill="${c}"/>`; }).join("") + '</g><circle cx="32" cy="32" r="6" fill="#fff" stroke="#13213f" stroke-width="3"/><path d="M32 2l-5 9h10z" fill="#13213f" stroke="#fff" stroke-width="1.5"/></svg>';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const fn = n => (typeof firstName === "function" ? firstName(n) : String(n).split(" ")[0]);
  const stageHTML = (st, spinning) => {
    if (!st) return `<div class="pk-stage"><div class="pk-q">?</div><div class="pk-name muted">Tap the button to pick a student</div></div>`;
    let av = "", nm = E(st.name);
    try { av = avatarHTML(st, "xxl"); nm = nameHTML(st); } catch {}
    return `<div class="pk-stage${spinning ? " spinning" : " landed"}">${av}<div class="pk-name">${nm}</div></div>`;
  };
  function setupFloat() {
    fw = document.createElement("section"); fw.className = "ml-fw"; fw.hidden = true; fw.setAttribute("aria-label", "Random picker");
    ov.appendChild(fw);
    const w = document.createElement("button"); w.type = "button"; w.className = "ml-wheel"; w.id = "mlWheel"; w.setAttribute("aria-label", "Open the random picker"); w.title = "Random picker"; w.innerHTML = WHEEL; ov.appendChild(w);
    w.addEventListener("click", () => { fwOpen = true; w.hidden = true; fw.hidden = false; placeFloat(); paintFloat(); });
    fw.addEventListener("click", e => {
      const b = e.target.closest("[data-f]"); if (!b) return; const a = b.dataset.f;
      if (a === "min") { fwOpen = false; fw.hidden = true; w.hidden = false; return; }
      if (a === "spin") spinF();
      if (a === "absent") { if (current) { const set = getPicked(rc); set.add(current.id); setPicked(rc, set); } spinF(); }
      if (a === "reset") { setPicked(rc, new Set()); fNote = "Everyone is back in the hat."; paintFloat(); }
      if (a === "award") { const st = allStudents().find(x => x.id === b.dataset.id); if (st) { try { giveEntry(st, { title: b.dataset.title, xp: +b.dataset.xp }); fNote = `${st.name}: +${b.dataset.xp} XP`; } catch { fNote = "Could not save."; } paintFloat(); } }
    });
    fw.addEventListener("change", e => { if (e.target.id === "mlRc") { rc = e.target.value; current = null; fNote = ""; paintFloat(); } });
    // drag the window by its title bar
    let d = null;
    fw.addEventListener("pointerdown", e => { const h = e.target.closest(".ml-fwh"); if (!h || e.target.closest("button,select")) return; const r = fw.getBoundingClientRect(), o = ov.getBoundingClientRect(); d = { dx: e.clientX - r.left, dy: e.clientY - r.top, ox: o.left, oy: o.top }; h.setPointerCapture(e.pointerId); h.style.cursor = "grabbing"; });
    fw.addEventListener("pointermove", e => { if (!d) return; const o = ov.getBoundingClientRect(), x = Math.min(Math.max(0, e.clientX - o.left - d.dx), o.width - 80), y = Math.min(Math.max(0, e.clientY - o.top - d.dy), o.height - 50); fw.style.left = x + "px"; fw.style.top = y + "px"; fw.style.right = "auto"; });
    const end = () => { if (!d) return; d = null; fw.querySelector(".ml-fwh").style.cursor = ""; try { localStorage.setItem("ml_fw_pos", JSON.stringify({ l: fw.style.left, t: fw.style.top })); } catch {} };
    fw.addEventListener("pointerup", end); fw.addEventListener("pointercancel", end);
  }
  let fNote = "";
  function placeFloat() {
    let pos = null; try { pos = JSON.parse(localStorage.getItem("ml_fw_pos") || "null"); } catch {}
    if (pos && pos.l && pos.t) { fw.style.left = pos.l; fw.style.top = pos.t; fw.style.right = "auto"; } else { fw.style.left = "10px"; fw.style.right = "auto"; fw.style.top = "70px"; }
  }
  function paintFloat(spinning) {
    if (!fw || fw.hidden) return;
    const list = inClass(rc), set = getPicked(rc);
    fw.innerHTML = `<div class="ml-fwh"><b>Pick a student</b><select id="mlRc" aria-label="Class">${classes().map(c => `<option${c === rc ? " selected" : ""}>${E(c)}</option>`).join("")}</select><button class="ml-t" type="button" data-f="min" aria-label="Minimise" title="Minimise">–</button></div>
      <div class="ml-fwb">${stageHTML(current, spinning)}
        ${current && !spinning && !(typeof readOnly !== "undefined" && readOnly) ? `<div class="pk-quick">${[0, 5].filter(i => POS()[i]).map(i => `<button class="plus" type="button" data-f="award" data-id="${E(current.id)}" data-title="${E(POS()[i].title)}" data-xp="${POS()[i].xp}">+${POS()[i].xp} ${E(POS()[i].title)}</button>`).join("")}</div>` : ""}
        <div class="ml-g" style="justify-content:center"><button class="primary" type="button" data-f="spin"${pickBusy ? " disabled" : ""}>${current ? "Pick again" : "Pick a student"}</button>${current && !pickBusy ? `<button class="ghost" type="button" data-f="absent">Absent, pick another</button>` : ""}</div>
        <small>${list.filter(s => set.has(s.id)).length} of ${list.length} have had a turn · <button class="ml-b s" type="button" data-f="reset">Reset turns</button></small><small role="status">${E(fNote)}</small></div>`;
  }
  async function spinF() {
    if (pickBusy) return; const list = inClass(rc); if (!list.length) { fNote = "No students in " + rc + "."; return paintFloat(); }
    const set = getPicked(rc); let pool = list.filter(s => !set.has(s.id) && (!current || list.length < 2 || s.id !== current.id));
    if (!pool.length) { set.clear(); setPicked(rc, set); pool = list.filter(s => !current || list.length < 2 || s.id !== current.id); fNote = "Everyone had a turn. Starting again."; } else fNote = "";
    const win = pool[Math.floor(Math.random() * pool.length)];
    pickBusy = true; const w = $$("mlWheel"); try { if (typeof audio === "function") audio(); } catch {}
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, steps = reduce ? 3 : 20; let prev = null;
    for (let i = 0; i < steps; i++) {
      const last = i === steps - 1; let s2 = last ? win : list[Math.floor(Math.random() * list.length)];
      if (!last && list.length > 1) while (s2 === prev) s2 = list[Math.floor(Math.random() * list.length)];
      prev = s2; current = s2; paintFloat(!last);
      try { if (!last && typeof sndMode !== "undefined" && sndMode !== "off") tone(660 + (i % 2) * 140, 0, 0.045, "square", 0.04); } catch {}
      if (!last) await sleep(reduce ? 220 : 40 + Math.pow(i / steps, 2.6) * 380);
    }
    set.add(win.id); setPicked(rc, set); pickBusy = false;
    try { if (typeof sndMode !== "undefined" && sndMode !== "off") { [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, k) => tone(f, k * 0.07, 0.4, "triangle", 0.22)); if (sndMode === "voice" && typeof speak === "function") setTimeout(() => speak(fn(win.name) + "!"), 450); } } catch {}
    paintFloat(false);
  }
  document.addEventListener("fullscreenchange", () => { /* the overlay stays; the fullscreen button comes back */ });
})();
