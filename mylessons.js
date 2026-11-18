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
  let ov = null, panel = null, sel = "", openSid = "", note = "", pickBusy = false, current = null, timer = 0, lastAuto = "", rc = "", wcView = false, wcSel = new Set(), wcB = "p0", wcAmt = "", wcWhy = "", fw = null, fwOpen = false, fwStage = null;

  function css() {
    if ($$("mlCss")) return;
    const s = document.createElement("style"); s.id = "mlCss";
    s.textContent = `
.ml-ov{position:fixed;inset:0;z-index:99000;background:#000}
.ml-ov iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff}
.ml-fab{position:absolute;z-index:6;width:46px;height:46px;border-radius:50%;border:2px solid #fff;background:rgba(19,33,63,.82);color:#fff;font:800 20px/1 system-ui;cursor:pointer;display:grid;place-items:center;opacity:.72}
.ml-fab:hover,.ml-fab:focus-visible{opacity:1}
.ml-fab.x{top:10px;right:10px}.ml-fab.f{top:10px;right:66px}.ml-fab.o{top:10px;right:122px;text-decoration:none}
.ml-stu{position:absolute;z-index:4;right:10px;bottom:96px;width:58px;height:58px;border-radius:50%;border:3px solid #fff;background:linear-gradient(145deg,#2563eb,#7c3aed);padding:0;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.45);display:grid;place-items:center;transition:transform .2s}
.ml-stu:hover,.ml-stu:focus-visible{transform:scale(1.1)}.ml-stu svg{width:36px;height:36px}.ml-stu[hidden]{display:none}
.ml-pill{position:absolute;z-index:2;left:10px;top:10px;padding:6px 12px;border-radius:999px;background:rgba(19,33,63,.82);color:#fff;font:700 14px system-ui;border:2px solid #fff;opacity:.8}
.ml-pill.warn{background:#b91c1c;opacity:1;animation:mlp 1s infinite}
@keyframes mlp{50%{transform:scale(1.06)}}
.ml-p{position:absolute;z-index:3;top:66px;right:0;bottom:0;width:min(370px,100%);background:var(--card,#fff);color:var(--ink,#17233b);border-left:3px solid var(--ink,#17233b);display:flex;flex-direction:column;font:15px system-ui,sans-serif}
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
.ml-wcb{margin:8px 10px 0;width:calc(100% - 20px)}
.ml-chips2{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.ml-chip{font:inherit;font-weight:700;border:2px solid var(--line,#d7deea);background:var(--card,#fff);color:inherit;border-radius:999px;padding:6px 12px;cursor:pointer}
.ml-chip[aria-pressed="true"]{background:#15803d;border-color:#15803d;color:#fff}
.ml-sel{width:100%;font:inherit;padding:8px;border:2px solid var(--ink,#17233b);border-radius:10px;background:var(--card,#fff);color:inherit}
.ml-in{font:inherit;padding:7px;border:2px solid var(--line,#d7deea);border-radius:8px;background:var(--card,#fff);color:inherit;width:100%}
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
      <button class="ml-fab t" type="button" data-mlx="timer" aria-label="Timer" title="Timer">⏱</button>
      <button class="ml-fab p" type="button" data-mlx="pen" aria-label="Pen and eraser" title="Pen and eraser">✎</button>
      <button class="ml-fab f" type="button" data-mlx="full" aria-label="Full screen" title="Full screen">⛶</button>
      <button class="ml-stu" type="button" data-mlx="panel" aria-label="Students" title="Students">${STU}</button>
      <div class="ml-pill" id="mlPill" hidden></div>
      <aside class="ml-p" id="mlPanel" hidden aria-label="Class panel"></aside>`;
    document.body.appendChild(ov); document.body.classList.add("wk-noscroll");
    panel = ov.querySelector("#mlPanel"); sel = auto() || (typeof cls !== "undefined" ? cls : classes()[0]) || ""; lastAuto = auto() || ""; openSid = ""; note = ""; current = null; rc = sel; wcView = false; wcSel = new Set(inClass(sel).map(x => x.id)); fNote = ""; fwOpen = false;
    setupFloat(); setupPen(); setupTimer(); ov.addEventListener("click", onClick); ov.addEventListener("input", e => { if (e.target.id === "mlWcAmt") wcAmt = e.target.value; if (e.target.id === "mlWcWhy") wcWhy = e.target.value; });
    ov.addEventListener("change", e => { if (e.target.id === "mlWcB") { wcB = e.target.value; paint(); } });
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
    if (a === "cls") { sel = b.dataset.c; current = null; openSid = ""; note = ""; wcSel = new Set(inClass(sel).map(x => x.id)); paint(); }
    else if (a === "wc") { wcView = true; wcSel = new Set(inClass(sel).map(x => x.id)); note = ""; paint(); }
    else if (a === "wcback") { wcView = false; note = ""; paint(); }
    else if (a === "wct") { wcSel.has(b.dataset.id) ? wcSel.delete(b.dataset.id) : wcSel.add(b.dataset.id); paint(); }
    else if (a === "wcall") { inClass(sel).forEach(x => wcSel.add(x.id)); paint(); }
    else if (a === "wcnone") { wcSel.clear(); paint(); }
    else if (a === "wcgo") wholeClass();
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
  /* give the same XP to the selected students of one class (same effect as the Whole class button on the main page) */
  async function wholeClass() {
    if (typeof readOnly !== "undefined" && readOnly) { note = "View only."; return paint(); }
    const list = inClass(sel), targets = list.filter(x => wcSel.has(x.id));
    let b;
    if (wcB === "c") { const n = Math.round(Number(wcAmt)); if (!wcAmt.trim() || !Number.isFinite(n) || n === 0) { note = "Type an amount like 5 or -5."; return paint(); } if (Math.abs(n) > 500) { note = "Up to 500 XP here."; return paint(); } b = { title: (wcWhy || "").trim().slice(0, 60) || (n > 0 ? "Bonus XP" : "XP adjustment"), xp: n }; }
    else b = (wcB[0] === "p" ? POS() : NEG())[+wcB.slice(1)];
    if (!b) return;
    if (!targets.length) { note = "Choose at least one student."; return paint(); }
    const batch = "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), all = targets.length === list.length, at = new Date().toISOString(), unlocks = [];
    try { seenBatches.add(batch); } catch {}
    targets.forEach(st => {
      st.xp += b.xp; st.log = st.log.concat({ title: b.title, xp: b.xp, kind: b.xp > 0 ? "pos" : "neg", at, batch, batchN: targets.length, batchAll: all });
      try { if (b.xp > 0 && isPositiveTitle(b.title)) { st.counts = { ...(st.counts || {}) }; st.counts[b.title] = (st.counts[b.title] || 0) + 1; const u = unlockFor(b.title, st.counts[b.title]); if (u) unlocks.push([st, u]); } } catch {}
      try { localRecent.set(st.id, st.log.length); } catch {}
    });
    try { unlocks.forEach(([st, u]) => queueUnlock(st.name, st, u)); } catch {}
    try { render(); announceGroup(sel, b, targets.length, all); } catch {}
    note = `${all ? "Whole class" : targets.length + " students"}: ${b.xp > 0 ? "+" : ""}${b.xp} XP`; wcView = false; paint();
    for (const st of targets) { try { await save(st); } catch {} }
  }
  function awardsHTML(st) {
    return `<div class="ml-g">${POS().map(p => `<button class="ml-b g s" type="button" data-a="give" data-id="${E(st.id)}" data-title="${E(p.title)}" data-xp="${p.xp}">${E(short(p.title))} +${p.xp}</button>`).join("")}</div>
      <div class="ml-g">${NEG().map(p => `<button class="ml-b r s" type="button" data-a="give" data-id="${E(st.id)}" data-title="${E(p.title)}" data-xp="${p.xp}">${E(short(p.title))} ${p.xp}</button>`).join("")}</div>
      <div class="ml-cx"><input id="mlCx" type="number" inputmode="numeric" placeholder="XP, e.g. 5 or -5" aria-label="Custom XP"><button class="ml-b s" type="button" data-a="custom" data-id="${E(st.id)}">Add</button><button class="ml-b s" type="button" data-a="undo" data-id="${E(st.id)}">Undo last</button></div>`;
  }
  /* Same first name in one class: add the father's first letter, then the next name's letter (grandfather or family), until each one is different. */
  const PART = /^(al|el|bin|ben|ibn|abu|bu)$/i;
  function labelsOf(list) {
    const fnm = n => (typeof firstName === "function" ? firstName(n) : String(n).split(" ")[0]);
    const info = list.map(st => { const f = fnm(st.name), rest = String(st.name).replace(/^Sh\.\s*/i, "Sheikh ").split(/\s+/).slice(f.split(/\s+/).length).filter(w => w && !PART.test(w)); return { st, f, rest }; });
    const out = new Map(), groups = {}; info.forEach(x => (groups[x.f.toLowerCase()] = groups[x.f.toLowerCase()] || []).push(x));
    Object.values(groups).forEach(g => {
      if (g.length === 1) { out.set(g[0].st.id, g[0].f); return; }
      const lab = x => k => x.f + (k ? " " + x.rest.slice(0, k).map(w => w[0].toUpperCase() + ".").join(" ") : "");
      for (let k = 1; k <= 4; k++) { const ls = g.map(x => lab(x)(Math.min(k, x.rest.length))); const cnt = {}; ls.forEach(l => { cnt[l] = (cnt[l] || 0) + 1; });
        g.forEach((x, i) => { if (!out.has(x.st.id) && cnt[ls[i]] === 1) out.set(x.st.id, ls[i]); }); }
      g.forEach(x => { if (!out.has(x.st.id)) out.set(x.st.id, String(x.st.name)); });
    });
    return out;
  }
  function paint() {
    if (!panel || panel.hidden) return;
    const list = inClass(sel), LB = labelsOf(list), keep = panel.querySelector(".ml-body"), top = keep ? keep.scrollTop : 0;
    let body;
    if (wcView) {
      const opts = POS().map((p, i) => `<option value="p${i}"${wcB === "p" + i ? " selected" : ""}>+${p.xp}  ${E(p.title)}</option>`).join("") + NEG().map((p, i) => `<option value="n${i}"${wcB === "n" + i ? " selected" : ""}>${p.xp}  ${E(p.title)}</option>`).join("") + `<option value="c"${wcB === "c" ? " selected" : ""}>Custom amount…</option>`;
      body = `<div class="ml-ex"><button class="ml-b s" type="button" data-a="wcback" style="justify-self:start">← Students</button>
        <label>Give to the selected students:<select class="ml-sel" id="mlWcB" aria-label="Behaviour">${opts}</select></label>
        ${wcB === "c" ? `<div class="ml-cx"><input class="ml-in" id="mlWcAmt" type="number" inputmode="numeric" placeholder="XP, e.g. 5 or -5" value="${E(wcAmt)}" aria-label="XP amount"><input class="ml-in" id="mlWcWhy" maxlength="60" placeholder="Reason (optional)" value="${E(wcWhy)}" aria-label="Reason"></div>` : ""}
        <div class="ml-g"><button class="ml-b s" type="button" data-a="wcall">Select all</button><button class="ml-b s" type="button" data-a="wcnone">Clear</button><b style="align-self:center">${list.filter(x => wcSel.has(x.id)).length} of ${list.length} selected</b></div>
        <div class="ml-chips2">${list.map(x => `<button class="ml-chip" type="button" data-a="wct" data-id="${E(x.id)}" aria-pressed="${wcSel.has(x.id)}">${E(LB.get(x.id) || x.name.split(" ")[0])}</button>`).join("")}</div>
        <p style="margin:0;font-size:13px">Tap a name to leave that student out (for example if he is absent).</p>
        <button class="ml-b g" type="button" data-a="wcgo">Give XP</button></div>`;
    } else body = `<button class="ml-b g ml-wcb" type="button" data-a="wc">Whole class XP…</button>` + (list.length ? list.map(st => `<div class="ml-r"><button class="ml-rh" type="button" data-a="row" data-id="${E(st.id)}" aria-expanded="${openSid === st.id}" title="${E(st.name)}"><b>${E(st.name)}</b><span>${st.xp} XP</span></button>${openSid === st.id ? `<div class="ml-ex">${awardsHTML(st)}</div>` : ""}</div>`).join("")               : `<p>No students in ${E(sel)}.</p>`);
    panel.innerHTML = `<div class="ml-h"><b>${E(sel)}${auto() === sel ? " · now" : ""}</b><button class="ml-t" type="button" data-mlx="hide" aria-label="Hide the panel">Hide ✕</button></div>
      <div class="ml-chips">${classes().map(c => `<button class="ml-c" type="button" data-a="cls" data-c="${E(c)}" aria-pressed="${c === sel}">${E(c)}</button>`).join("")}</div>
      <div class="ml-note" role="status">${E(note)}</div><div class="ml-body">${body}</div>`;
    const nb = panel.querySelector(".ml-body"); if (nb) nb.scrollTop = top;
  }
  /* ---------- the random picker: a floating window above the lesson, a spin-the-wheel button when minimised ---------- */
  const WHEEL = '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29" fill="#fff"/><g>' + ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"].map((c, k) => { const a0 = k * Math.PI / 3 - Math.PI / 2, a1 = (k + 1) * Math.PI / 3 - Math.PI / 2; return `<path d="M32 32L${(32 + 27 * Math.cos(a0)).toFixed(1)} ${(32 + 27 * Math.sin(a0)).toFixed(1)}A27 27 0 0 1 ${(32 + 27 * Math.cos(a1)).toFixed(1)} ${(32 + 27 * Math.sin(a1)).toFixed(1)}Z" fill="${c}"/>`; }).join("") + '</g><circle cx="32" cy="32" r="6" fill="#fff" stroke="#13213f" stroke-width="3"/><path d="M32 2l-5 9h10z" fill="#13213f" stroke="#fff" stroke-width="1.5"/></svg>';
  const STU = '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="14" cy="13" r="6" fill="#fff"/><path d="M3 33c0-6.6 4.9-11 11-11s11 4.4 11 11z" fill="#fff"/><circle cx="28" cy="15" r="5" fill="#fde68a"/><path d="M19 33c.6-5.5 4.4-9 9-9s9 3.5 9 9z" fill="#fde68a"/></svg>';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const fn = n => (typeof firstName === "function" ? firstName(n) : String(n).split(" ")[0]);
  const stageHTML = (st, spinning) => {
    if (!st) return `<div class="pk-stage"><div class="pk-q">?</div><div class="pk-name muted">Tap the button to pick a student</div></div>`;
    let av = "", nm = E(st.name);
    try { av = avatarHTML(st, "xxl"); nm = nameHTML(st); } catch {}
    return `<div class="pk-stage${spinning ? " spinning" : " landed"}">${av}<div class="pk-name">${nm}</div></div>`;
  };
  /* Pen, pencil, marker, highlighter and eraser drawn over the lesson (works on any lesson, even a Google Slides link, because it is a transparent layer on top).
     Fast: finished strokes live on a hidden layer, and each frame only the stroke being drawn is added on top, so long lessons never slow down. */
  function setupPen() {
    if (!document.getElementById("mlPenCss")) { const st = document.createElement("style"); st.id = "mlPenCss";
      st.textContent = ".ml-fab.p{top:10px;right:122px}.ml-fab.o{right:178px}.ml-fab.p.on{background:#f59e0b;color:#13213f;opacity:1}.ml-cv{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;touch-action:none}.ml-cv.on{pointer-events:auto;cursor:crosshair}"
        + ".ml-pen{position:absolute;z-index:5;left:50%;bottom:10px;transform:translateX(-50%);display:flex;gap:4px 10px;align-items:flex-end;flex-wrap:wrap;justify-content:center;max-width:calc(100% - 16px);padding:6px 14px 8px;border-radius:22px;background:linear-gradient(#1b2d57,#13213f);border:2px solid #fff;box-shadow:0 8px 28px rgba(0,0,0,.55);user-select:none;-webkit-user-select:none}.ml-pen[hidden]{display:none}"
        + ".ml-tools{display:flex;gap:2px;align-items:flex-end;height:74px;overflow:hidden;padding:0 4px;border-radius:14px 14px 0 0}.ml-tl{position:relative;width:34px;height:74px;border:0;background:none;padding:0;cursor:pointer;transform:translateY(22px);transition:transform .14s ease-out}.ml-tl svg{width:34px;height:74px;display:block;filter:drop-shadow(0 2px 2px rgba(0,0,0,.45))}.ml-tl:hover{transform:translateY(14px)}.ml-tl.sel{transform:translateY(0)}"
        + ".ml-sp{width:2px;align-self:stretch;margin:6px 0;background:rgba(255,255,255,.22);border-radius:2px}.ml-cols{display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:center;padding:8px 0}.ml-pen .sw{width:30px;height:30px;border-radius:50%;border:3px solid #fff;padding:0;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.5)}.ml-pen .sw.sel{outline:3px solid #f59e0b;outline-offset:2px;transform:scale(1.12)}"
        + ".ml-sizes{display:flex;gap:4px;align-items:center;padding:8px 0}.ml-sz{width:36px;height:36px;border-radius:50%;border:2px solid #fff;background:#243a66;display:grid;place-items:center;cursor:pointer;padding:0}.ml-sz i{display:block;border-radius:50%;background:#fff}.ml-sz.sel{background:#f59e0b;border-color:#fff}.ml-sz.sel i{background:#13213f}"
        + ".ml-acts{display:flex;gap:6px;align-items:center;padding:8px 0}.ml-pen .ab{min-width:40px;height:40px;border-radius:12px;border:2px solid #fff;background:#243a66;color:#fff;font:800 17px/1 system-ui;cursor:pointer;padding:0 10px}.ml-pen .ab:active{transform:scale(.95)}.ml-pen .ab.dn{background:#16a34a}.ml-pen .ab:disabled{opacity:.4}"
        + ".ml-ec{position:fixed;z-index:6;pointer-events:none;border:2px solid #111;border-radius:50%;background:rgba(255,255,255,.55);box-shadow:0 0 0 1px #fff;transform:translate(-50%,-50%);display:none}";
      document.head.appendChild(st); }
    const cv = document.createElement("canvas"); cv.className = "ml-cv"; ov.insertBefore(cv, ov.querySelector(".ml-fab"));
    const bar = document.createElement("div"); bar.className = "ml-pen"; bar.hidden = true; bar.setAttribute("aria-label", "Pen tools");
    const COLS = ["#111827", "#ef4444", "#2563eb", "#16a34a", "#f59e0b", "#9333ea", "#ffffff"];
    let col = COLS[1];
    /* the tools, drawn as real pens standing in a tray. The coloured part follows the chosen colour. */
    const ICON = {
      pen: c => `<svg viewBox="0 0 34 74"><path d="M17 1 L22 20 H12 Z" fill="#e5e7eb" stroke="#475569" stroke-width="1.2" stroke-linejoin="round"/><path d="M17 1 L19.4 9 H14.6 Z" fill="${c}"/><rect x="10" y="20" width="14" height="52" rx="3" fill="#f8fafc" stroke="#475569" stroke-width="1.4"/><rect x="10" y="30" width="14" height="9" fill="${c}"/><rect x="21" y="40" width="2.2" height="20" rx="1" fill="#cbd5e1"/></svg>`,
      pencil: c => `<svg viewBox="0 0 34 74"><path d="M17 2 L24 22 H10 Z" fill="#f3d6a4" stroke="#7c5a2a" stroke-width="1.2" stroke-linejoin="round"/><path d="M17 2 L19.7 10 H14.3 Z" fill="${c}"/><rect x="10" y="22" width="14" height="40" fill="#facc15" stroke="#a16207" stroke-width="1.3"/><path d="M14 22 V62 M20 22 V62" stroke="#eab308" stroke-width="1.2"/><rect x="10" y="62" width="14" height="5" fill="#cbd5e1" stroke="#64748b" stroke-width="1"/><rect x="10" y="67" width="14" height="6" rx="2" fill="#f9a8d4" stroke="#be185d" stroke-width="1.1"/></svg>`,
      mk: c => `<svg viewBox="0 0 34 74"><path d="M12 14 L14 3 H20 L22 14 Z" fill="${c}" stroke="#334155" stroke-width="1.2" stroke-linejoin="round"/><rect x="9" y="14" width="16" height="10" rx="2" fill="#334155"/><rect x="8" y="24" width="18" height="48" rx="5" fill="#f8fafc" stroke="#334155" stroke-width="1.4"/><rect x="8" y="34" width="18" height="16" fill="${c}"/><circle cx="17" cy="42" r="3" fill="#fff" opacity=".85"/></svg>`,
      hi: c => `<svg viewBox="0 0 34 74"><path d="M9 16 L13 3 H25 L25 16 Z" fill="${c}" opacity=".9" stroke="#334155" stroke-width="1.2" stroke-linejoin="round"/><rect x="8" y="16" width="18" height="9" fill="#475569"/><rect x="6" y="25" width="22" height="47" rx="4" fill="#fef9c3" stroke="#334155" stroke-width="1.4"/><rect x="6" y="38" width="22" height="14" fill="${c}" opacity=".85"/></svg>`,
      er: () => `<svg viewBox="0 0 34 74"><rect x="4" y="34" width="26" height="38" rx="5" fill="#f9a8d4" stroke="#9d174d" stroke-width="1.5"/><rect x="4" y="52" width="26" height="20" rx="5" fill="#60a5fa" stroke="#1e3a8a" stroke-width="1.5"/><rect x="4" y="52" width="26" height="6" fill="#1d4ed8" opacity=".55"/><path d="M9 40 H25" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".75"/></svg>`
    };
    const TOOLS = [["pen", "Pen"], ["pencil", "Pencil"], ["mk", "Marker"], ["hi", "Highlighter"], ["er", "Eraser"]];
    const SZ = { pen: [2.5, 4.5, 8], pencil: [1.6, 2.8, 5], mk: [8, 14, 24], hi: [18, 28, 44], er: [20, 38, 70] };
    let tool = "pen", wi = 1;
    const toolsHTML = () => TOOLS.map(([k, n]) => `<button type="button" class="ml-tl${tool === k ? " sel" : ""}" data-t="${k}" aria-label="${n}" title="${n}">${ICON[k](col)}</button>`).join("");
    const sizesHTML = () => [0, 1, 2].map(i => `<button type="button" class="ml-sz${wi === i ? " sel" : ""}" data-w="${i}" aria-label="Size ${i + 1}"><i style="width:${[6, 12, 20][i]}px;height:${[6, 12, 20][i]}px"></i></button>`).join("");
    bar.innerHTML = `<div class="ml-tools" id="mlTools"></div><span class="ml-sp"></span><div class="ml-cols">${COLS.map((c, i) => `<button type="button" class="sw${c === col ? " sel" : ""}" data-c="${c}" style="background:${c}" aria-label="Colour ${i + 1}"></button>`).join("")}</div><span class="ml-sp"></span><div class="ml-sizes" id="mlSizes"></div><span class="ml-sp"></span>`
      + `<div class="ml-acts"><button type="button" class="ab" data-a="undo" aria-label="Undo">↶</button><button type="button" class="ab" data-a="redo" aria-label="Redo">↷</button><button type="button" class="ab" data-a="clear">Clear</button><button type="button" class="ab dn" data-a="done">Done</button></div>`;
    ov.appendChild(bar);
    const ec = document.createElement("div"); ec.className = "ml-ec"; ov.appendChild(ec);
    const drawBar = () => { bar.querySelector("#mlTools").innerHTML = toolsHTML(); bar.querySelector("#mlSizes").innerHTML = sizesHTML(); bar.querySelectorAll(".sw").forEach(x => x.classList.toggle("sel", x.dataset.c === col)); };
    drawBar();
    const ctx = cv.getContext("2d"), base = document.createElement("canvas"), bx = base.getContext("2d");
    let strokes = [], redo = [], cur = null, on = false, dpr = 1, raf = 0;
    const widthOf = (t, i) => SZ[t][i];
    /* one stroke drawn with smooth curves (middle points), the same way live and when rebuilding */
    const paintStroke = (g, a) => {
      g.save(); g.lineCap = a.t === "hi" ? "butt" : "round"; g.lineJoin = "round"; g.lineWidth = a.w; g.strokeStyle = a.c; g.fillStyle = a.c;
      g.globalAlpha = a.t === "hi" ? .45 : a.t === "pencil" ? .88 : 1; g.globalCompositeOperation = a.t === "er" ? "destination-out" : "source-over";
      const p = a.p;
      if (p.length < 3) { g.beginPath(); g.arc(p[0].x, p[0].y, a.w / 2, 0, 6.2832); if (p.length === 2) { g.moveTo(p[1].x + a.w / 2, p[1].y); g.arc(p[1].x, p[1].y, a.w / 2, 0, 6.2832); g.fill(); g.beginPath(); g.moveTo(p[0].x, p[0].y); g.lineTo(p[1].x, p[1].y); g.stroke(); } else g.fill(); }
      else { g.beginPath(); g.moveTo(p[0].x, p[0].y); for (let i = 1; i < p.length - 1; i++) { const m = { x: (p[i].x + p[i + 1].x) / 2, y: (p[i].y + p[i + 1].y) / 2 }; g.quadraticCurveTo(p[i].x, p[i].y, m.x, m.y); } g.lineTo(p[p.length - 1].x, p[p.length - 1].y); g.stroke(); }
      g.restore();
    };
    const clearAll = g => { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, g.canvas.width, g.canvas.height); g.restore(); };
    const rebuild = () => { clearAll(bx); strokes.forEach(s => paintStroke(bx, s)); show(); };
    const show = () => { clearAll(ctx); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(base, 0, 0); ctx.restore(); if (cur) paintStroke(ctx, cur); };
    const sched = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; show(); }); };
    const fit = () => { const r = ov.getBoundingClientRect(); if (!r.width) return; dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = base.width = Math.round(r.width * dpr); cv.height = base.height = Math.round(r.height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); bx.setTransform(dpr, 0, 0, dpr, 0, 0); rebuild(); };
    const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const moveEc = e => { if (!on || tool !== "er") { ec.style.display = "none"; return; } const d = widthOf("er", wi); ec.style.cssText = `display:block;width:${d}px;height:${d}px;left:${e.clientX}px;top:${e.clientY}px`; };
    cv.addEventListener("pointerdown", e => { if (!on) return; e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch {}
      const w = widthOf(tool, wi) * (tool === "pen" && e.pointerType === "pen" && e.pressure ? .6 + e.pressure * .8 : 1);
      cur = { t: tool, c: col, w, p: [pos(e)] }; redo = []; moveEc(e); sched(); });
    cv.addEventListener("pointermove", e => { moveEc(e); if (!cur) return; e.preventDefault(); const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e], last = cur.p[cur.p.length - 1];
      (evs.length ? evs : [e]).forEach(x => { const q = pos(x); if (Math.abs(q.x - last.x) + Math.abs(q.y - last.y) >= 1.2) cur.p.push(q); }); sched(); });
    const up = () => { if (!cur) return; strokes.push(cur); paintStroke(bx, cur); cur = null; show(); updBtns(); };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up); cv.addEventListener("pointerleave", () => { ec.style.display = "none"; });
    const updBtns = () => { const u = bar.querySelector('[data-a="undo"]'), r = bar.querySelector('[data-a="redo"]'); if (u) u.disabled = !strokes.length; if (r) r.disabled = !redo.length; };
    const setOn = v => { on = v; cv.classList.toggle("on", v); bar.hidden = !v; if (!v) ec.style.display = "none"; const b = ov.querySelector('[data-mlx="pen"]'); if (b) b.classList.toggle("on", v); updBtns(); };
    bar.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; e.stopPropagation();
      if (b.dataset.c) { col = b.dataset.c; if (tool === "er") tool = "pen"; drawBar(); }
      else if (b.dataset.w) { wi = +b.dataset.w; drawBar(); }
      else if (b.dataset.t) { tool = b.dataset.t; drawBar(); }
      else if (b.dataset.a === "undo") { const s = strokes.pop(); if (s) redo.push(s); rebuild(); updBtns(); }
      else if (b.dataset.a === "redo") { const s = redo.pop(); if (s) { strokes.push(s); paintStroke(bx, s); show(); } updBtns(); }
      else if (b.dataset.a === "clear") { strokes = []; redo = []; rebuild(); updBtns(); }
      else if (b.dataset.a === "done") setOn(false); });
    ov.querySelector('[data-mlx="pen"]').addEventListener("click", e => { e.stopPropagation(); setOn(!on); });
    window.addEventListener("resize", fit); document.addEventListener("fullscreenchange", () => setTimeout(fit, 200));
    new ResizeObserver(fit).observe(ov); fit(); updBtns();
  }
  /* Countdown timer like Canva's: big digits, presets, start/pause, +1 min, a bar, a sound and "Time's up" at zero. Draggable; shrinks to a small pill. */
  function setupTimer() {
    if (!document.getElementById("mlTimerCss")) { const st = document.createElement("style"); st.id = "mlTimerCss";
      st.textContent = ".ml-fab.t{top:10px;right:178px}.ml-fab.t.on{background:#7c3aed;opacity:1}.ml-fab.o{right:234px}"
        + ".ml-tm{position:absolute;z-index:5;left:50%;top:70px;transform:translateX(-50%);width:min(340px,calc(100% - 20px));background:#fff;color:#1f1147;border-radius:22px;box-shadow:0 12px 40px rgba(0,0,0,.5);overflow:hidden;font-family:system-ui,sans-serif;touch-action:none}.ml-tm[hidden]{display:none}"
        + ".ml-tm .h{display:flex;align-items:center;justify-content:space-between;padding:10px 12px 0 16px;cursor:grab;font:800 14px system-ui;color:#6d28d9}.ml-tm .h button{width:34px;height:34px;border-radius:50%;border:0;background:#f1ecfd;color:#6d28d9;font:800 16px/1 system-ui;cursor:pointer}"
        + ".ml-tm .d{font:800 84px/1.05 ui-rounded,system-ui,sans-serif;font-variant-numeric:tabular-nums;text-align:center;padding:6px 8px 2px;letter-spacing:-2px}.ml-tm.low .d{color:#dc2626}.ml-tm.end .d{color:#dc2626;animation:mltm 1s infinite}"
        + ".ml-tm .bar{height:8px;margin:6px 18px 12px;border-radius:99px;background:#ece7fb;overflow:hidden}.ml-tm .bar i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#7c3aed,#06b6d4);border-radius:99px;transition:width .3s linear}"
        + ".ml-tm .r{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding:0 14px 12px}.ml-tm .r button{border:0;border-radius:999px;padding:11px 18px;font:800 16px system-ui;cursor:pointer;background:#f1ecfd;color:#5b21b6;min-height:44px}"
        + ".ml-tm .r .go{background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;min-width:110px}.ml-tm .r button.sel{outline:3px solid #7c3aed}.ml-tm .c{display:flex;gap:6px;justify-content:center;padding:0 14px 14px;align-items:center}.ml-tm .c input{width:70px;padding:9px;border-radius:12px;border:2px solid #d9cffa;font:700 16px system-ui;text-align:center}"
        + ".ml-tpill{position:absolute;z-index:5;left:50%;top:12px;transform:translateX(-50%);padding:8px 18px;border-radius:999px;background:#7c3aed;color:#fff;font:800 22px ui-rounded,system-ui;font-variant-numeric:tabular-nums;border:2px solid #fff;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.45)}.ml-tpill[hidden]{display:none}.ml-tpill.end{background:#dc2626;animation:mltm 1s infinite}@keyframes mltm{50%{opacity:.45}}@media (prefers-reduced-motion:reduce){.ml-tm.end .d,.ml-tpill.end{animation:none}}";
      document.head.appendChild(st); }
    const card = document.createElement("section"); card.className = "ml-tm"; card.hidden = true; card.setAttribute("aria-label", "Timer");
    card.innerHTML = `<div class="h" data-drag><span>⏱ Timer</span><button type="button" data-k="min" aria-label="Shrink the timer">–</button></div><div class="d" data-k="d">05:00</div><div class="bar"><i data-k="bar"></i></div>
      <div class="r"><button type="button" class="go" data-k="go">Start</button><button type="button" data-k="add">+1 min</button><button type="button" data-k="reset">Reset</button></div>
      <div class="r">${[1, 3, 5, 10, 15].map(m => `<button type="button" data-m="${m}"${m === 5 ? ' class="sel"' : ""}>${m} min</button>`).join("")}</div>
      <div class="c"><input type="number" min="1" max="180" inputmode="numeric" placeholder="min" data-k="cu" aria-label="Minutes"><button type="button" class="ml-tmset" data-k="set" style="border:0;border-radius:999px;padding:10px 16px;background:#f1ecfd;color:#5b21b6;font:800 15px system-ui;cursor:pointer">Set</button></div>`;
    const pill = document.createElement("button"); pill.type = "button"; pill.className = "ml-tpill"; pill.hidden = true; pill.setAttribute("aria-label", "Open the timer");
    ov.appendChild(card); ov.appendChild(pill);
    const $k = k => card.querySelector(`[data-k="${k}"]`), btn = ov.querySelector('[data-mlx="timer"]');
    let total = 300, left = 300, endAt = 0, run = false, tk = 0, done = false, shown = false;
    const fmt = n => { n = Math.max(0, Math.ceil(n)); return String(Math.floor(n / 60)).padStart(2, "0") + ":" + String(n % 60).padStart(2, "0"); };
    const beep = () => { try { const A = new (window.AudioContext || window.webkitAudioContext)(); [0, .35, .7].forEach(t => { const o = A.createOscillator(), g = A.createGain(); o.frequency.value = 880; g.gain.setValueAtTime(.0001, A.currentTime + t); g.gain.exponentialRampToValueAtTime(.4, A.currentTime + t + .03); g.gain.exponentialRampToValueAtTime(.0001, A.currentTime + t + .3); o.connect(g); g.connect(A.destination); o.start(A.currentTime + t); o.stop(A.currentTime + t + .32); }); } catch {} };
    const paint = () => { const t = fmt(left); $k("d").textContent = done ? "Time's up" : t; $k("d").style.fontSize = done ? "44px" : ""; $k("bar").style.width = (total ? 100 * left / total : 0) + "%"; card.classList.toggle("low", run && left <= 10 && !done); card.classList.toggle("end", done);
      $k("go").textContent = run ? "Pause" : done ? "Again" : "Start"; pill.textContent = done ? "Time's up" : t; pill.classList.toggle("end", done); pill.hidden = !(shown === false && (run || done)); btn.classList.toggle("on", run || done); };
    const stop = () => { run = false; clearInterval(tk); tk = 0; };
    const tick = () => { if (!ov.isConnected) return stop(); left = Math.max(0, (endAt - Date.now()) / 1000); if (left <= 0) { stop(); done = true; left = 0; beep(); if (shown === false) { shown = true; card.hidden = false; } } paint(); };
    const start = () => { if (done || left <= 0) { left = total; done = false; } run = true; endAt = Date.now() + left * 1000; clearInterval(tk); tk = setInterval(tick, 250); paint(); };
    const setMin = m => { m = Math.max(1, Math.min(180, Math.round(+m || 0))); if (!m) return; stop(); done = false; total = left = m * 60; card.querySelectorAll("[data-m]").forEach(x => x.classList.toggle("sel", +x.dataset.m === m)); paint(); };
    const open = v => { shown = v; card.hidden = !v; paint(); };
    btn.addEventListener("click", e => { e.stopPropagation(); open(card.hidden); });
    pill.addEventListener("click", e => { e.stopPropagation(); open(true); });
    card.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; e.stopPropagation(); const k = b.dataset.k;
      if (b.dataset.m) return setMin(b.dataset.m);
      if (k === "min") return open(false);
      if (k === "go") { if (run) { stop(); paint(); } else start(); }
      if (k === "add") { total += 60; left += 60; if (run) endAt += 60000; done = false; paint(); }
      if (k === "reset") { stop(); done = false; left = total; paint(); }
      if (k === "set") { const v = $k("cu").value; if (v) { setMin(v); $k("cu").value = ""; } } });
    let dr = null; card.querySelector("[data-drag]").addEventListener("pointerdown", e => { if (e.target.closest("button")) return; const r = card.getBoundingClientRect(), o = ov.getBoundingClientRect(); dr = { dx: e.clientX - r.left, dy: e.clientY - r.top, ox: o.left, oy: o.top }; card.style.transform = "none"; card.style.left = (r.left - o.left) + "px"; card.style.top = (r.top - o.top) + "px"; try { e.target.setPointerCapture(e.pointerId); } catch {} });
    card.addEventListener("pointermove", e => { if (!dr) return; card.style.left = Math.max(0, e.clientX - dr.ox - dr.dx) + "px"; card.style.top = Math.max(0, e.clientY - dr.oy - dr.dy) + "px"; });
    card.addEventListener("pointerup", () => { dr = null; }); paint();
  }
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
