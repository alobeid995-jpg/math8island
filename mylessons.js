/* "My lessons": interactive lessons that open full screen inside the site, with a slim class panel
   (student names, quick XP, a random picker) so the teacher never has to leave the lesson.
   Classic script: it shares the page's students / cls / giveEntry with teacher.html. */
(function () {
  "use strict";
  // To add a lesson: put its .html file next to this one and add a line here.
  const LESSONS = [
    { id: "l42d1", title: "Lesson 4.2: Solving simultaneous equations graphically", sub: "Day 1", file: "lesson42d1.html" },
  ];
  const $$ = id => document.getElementById(id);
  const E = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let ov = null, panel = null, sel = "", tab = "stu", openSid = "", note = "", pickBusy = false, picked = null, current = null, timer = 0, lastAuto = "";

  function css() {
    if ($$("mlCss")) return;
    const s = document.createElement("style"); s.id = "mlCss";
    s.textContent = `
.ml-ov{position:fixed;inset:0;z-index:99000;background:#000}
.ml-ov iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff}
.ml-fab{position:absolute;z-index:2;width:46px;height:46px;border-radius:50%;border:2px solid #fff;background:rgba(19,33,63,.82);color:#fff;font:800 20px/1 system-ui;cursor:pointer;display:grid;place-items:center;opacity:.72}
.ml-fab:hover,.ml-fab:focus-visible{opacity:1}
.ml-fab.x{top:10px;right:10px}.ml-fab.t{bottom:12px;right:12px}.ml-fab.f{bottom:12px;right:66px}
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
@media (prefers-reduced-motion:reduce){.ml-pill.warn{animation:none}}`;
    document.head.appendChild(s);
  }

  /* ---------- the list of lessons ---------- */
  window.openMyLessons = function () {
    css();
    let m = $$("mlModal");
    if (!m) {
      m = document.createElement("div"); m.className = "modal"; m.id = "mlModal"; m.hidden = true;
      m.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-label="My lessons" style="width:min(640px,100%)"><div id="mlList"></div></div>';
      document.body.appendChild(m);
      m.addEventListener("click", e => {
        if (e.target === m || e.target.closest("[data-ml=close]")) { m.hidden = true; return; }
        const b = e.target.closest("[data-ml-open]"); if (b) { m.hidden = true; openLesson(LESSONS.find(x => x.id === b.dataset.mlOpen)); }
      });
    }
    $$("mlList").innerHTML = `<h3>My lessons</h3><p style="margin:4px 0 10px">Tap a lesson to open it full screen. Inside it you get a small class panel (students, XP, random picker) so you never have to leave.</p>`
      + (LESSONS.length ? LESSONS.map(l => `<button type="button" class="ghost" data-ml-open="${E(l.id)}" style="display:block;width:100%;text-align:left;margin:8px 0;padding:12px 14px"><b>${E(l.title)}</b><br><small>${E(l.sub || "")}</small></button>`).join("") : `<p class="none">No lessons yet.</p>`)
      + `<div class="sbtns"><button class="ghost" type="button" data-ml="close">Close</button></div>`;
    m.hidden = false;
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
    ov.innerHTML = `<iframe src="${E(l.file)}" title="${E(l.title)}" allow="fullscreen; autoplay" allowfullscreen></iframe>
      <button class="ml-fab x" type="button" data-mlx="close" aria-label="Close the lesson" title="Close the lesson">✕</button>
      <button class="ml-fab f" type="button" data-mlx="full" aria-label="Full screen" title="Full screen">⛶</button>
      <button class="ml-fab t" type="button" data-mlx="panel" aria-label="Class panel" title="Class panel">👥</button>
      <div class="ml-pill" id="mlPill" hidden></div>
      <aside class="ml-p" id="mlPanel" hidden aria-label="Class panel"></aside>`;
    document.body.appendChild(ov); document.body.classList.add("wk-noscroll");
    panel = ov.querySelector("#mlPanel"); sel = auto() || (typeof cls !== "undefined" ? cls : classes()[0]) || ""; lastAuto = auto() || ""; tab = "stu"; openSid = ""; note = ""; current = null; picked = null;
    ov.addEventListener("click", onClick); ov.addEventListener("input", () => {});
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
    if (a && a !== lastAuto) { lastAuto = a; sel = a; current = null; picked = null; paint(); }   // the next lesson started: switch to its class
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
    else if (a === "tab") { tab = b.dataset.t; note = ""; paint(); }
    else if (a === "row") { openSid = openSid === b.dataset.id ? "" : b.dataset.id; note = ""; paint(); }
    else if (a === "give") { const st = allStudents().find(s => s.id === b.dataset.id); if (st) award(st, b.dataset.title, +b.dataset.xp); }
    else if (a === "custom") {
      const st = allStudents().find(s => s.id === b.dataset.id), inp = panel.querySelector("#mlCx"), n = Math.round(Number(inp && inp.value));
      if (!st) return; if (!inp.value.trim() || !Number.isFinite(n) || n === 0) { note = "Type an amount like 5 or -5."; return paint(); }
      if (Math.abs(n) > 500) { note = "Up to 500 XP here. Use the main page for more."; return paint(); }
      award(st, n > 0 ? "Bonus XP" : "XP adjustment", n);
    }
    else if (a === "undo") { const st = allStudents().find(s => s.id === b.dataset.id); if (st) undoLast(st); }
    else if (a === "spin") spin();
    else if (a === "again") { const set = getPicked(sel); set.clear(); setPicked(sel, set); note = "Everyone is back in the hat."; paint(); }
    else if (a === "absent") { if (current) { const set = getPicked(sel); set.add(current.id); setPicked(sel, set); } spin(); }
  }
  function awardsHTML(st) {
    return `<div class="ml-g">${POS().map(p => `<button class="ml-b g s" type="button" data-a="give" data-id="${E(st.id)}" data-title="${E(p.title)}" data-xp="${p.xp}">${E(short(p.title))} +${p.xp}</button>`).join("")}</div>
      <div class="ml-g">${NEG().map(p => `<button class="ml-b r s" type="button" data-a="give" data-id="${E(st.id)}" data-title="${E(p.title)}" data-xp="${p.xp}">${E(short(p.title))} ${p.xp}</button>`).join("")}</div>
      <div class="ml-cx"><input id="mlCx" type="number" inputmode="numeric" placeholder="XP, e.g. 5 or -5" aria-label="Custom XP"><button class="ml-b s" type="button" data-a="custom" data-id="${E(st.id)}">Add</button><button class="ml-b s" type="button" data-a="undo" data-id="${E(st.id)}">Undo last</button></div>`;
  }
  function paint() {
    if (!panel || panel.hidden) return;
    const list = inClass(sel), keep = panel.querySelector(".ml-body"), top = keep ? keep.scrollTop : 0;
    let body = "";
    if (tab === "stu") {
      body = list.length ? list.map(st => `<div class="ml-r"><button class="ml-rh" type="button" data-a="row" data-id="${E(st.id)}" aria-expanded="${openSid === st.id}"><b>${E(st.name)}</b><span>${st.xp} XP</span></button>${openSid === st.id ? `<div class="ml-ex">${awardsHTML(st)}</div>` : ""}</div>`).join("") : `<p>No students in ${E(sel)}.</p>`;
    } else {
      const set = getPicked(sel), left = list.filter(s => !set.has(s.id)).length;
      body = current ? `<div class="ml-big">${E(current.name)}</div><div class="ml-ex">${awardsHTML(current)}</div>` : `<div class="ml-q">?</div>`;
      body += `<div class="ml-g" style="justify-content:center;margin:12px 0"><button class="ml-b g" type="button" data-a="spin"${pickBusy ? " disabled" : ""}>${current ? "Pick another" : "Pick a student"}</button>${current ? `<button class="ml-b" type="button" data-a="absent">Absent, skip</button>` : ""}</div>
        <p style="text-align:center;margin:4px 0">${list.length - left} of ${list.length} have had a turn</p><div class="ml-g" style="justify-content:center"><button class="ml-b s" type="button" data-a="again">Start over</button></div>`;
    }
    panel.innerHTML = `<div class="ml-h"><b>${E(sel)}${auto() === sel ? " · now" : ""}</b><button class="ml-t" type="button" data-mlx="hide" aria-label="Hide the panel">Hide ✕</button></div>
      <div class="ml-chips">${classes().map(c => `<button class="ml-c" type="button" data-a="cls" data-c="${E(c)}" aria-pressed="${c === sel}">${E(c)}</button>`).join("")}</div>
      <div class="ml-chips"><button class="ml-t" type="button" data-a="tab" data-t="stu" aria-pressed="${tab === "stu"}">Students</button><button class="ml-t" type="button" data-a="tab" data-t="pick" aria-pressed="${tab === "pick"}">Random picker</button></div>
      <div class="ml-note" role="status">${E(note)}</div><div class="ml-body">${body}</div>`;
    const nb = panel.querySelector(".ml-body"); if (nb) nb.scrollTop = top;
  }
  async function spin() {
    if (pickBusy) return; const list = inClass(sel); if (!list.length) return;
    const set = getPicked(sel); let pool = list.filter(s => !set.has(s.id) && (!current || s.id !== current.id));
    if (!pool.length) { set.clear(); setPicked(sel, set); pool = list.filter(s => !current || list.length < 2 || s.id !== current.id); note = "Everyone had a turn. Starting again."; }
    const win = pool[Math.floor(Math.random() * pool.length)];
    pickBusy = true; openSid = "";
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (let i = 0; i < (reduce ? 2 : 14); i++) { current = { id: "x", name: list[Math.floor(Math.random() * list.length)].name, xp: 0 }; paintSpin(); await new Promise(r => setTimeout(r, 70 + i * 12)); }
    current = win; set.add(win.id); setPicked(sel, set); pickBusy = false; paint();
  }
  function paintSpin() { const big = panel && panel.querySelector(".ml-big"); if (big) big.textContent = current.name; else { const b = panel && panel.querySelector(".ml-body"); if (b) b.insertAdjacentHTML("afterbegin", `<div class="ml-big">${E(current.name)}</div>`); const q = panel && panel.querySelector(".ml-q"); if (q) q.remove(); } }
  document.addEventListener("fullscreenchange", () => { /* the overlay stays; the fullscreen button comes back */ });
})();
