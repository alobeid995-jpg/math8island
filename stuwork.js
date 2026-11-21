// "My classwork" on the student page: worksheets from the teacher, and (for the 9S boys) the lesson games.
import { fs, doc, getDoc, setDoc, collection, getDocs, query, where } from "./fb.js?v=1121d";
import { playerOf, catalog } from "./islandmap.js?v=1121d";
import { logEv } from "./presence.js?v=1121d";
import { LIVE_WS, isLive } from "./liveworks.js?v=1121d";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const when = t => new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
let materials = [], lxs = {}, P = null, base = [], works = [], mine = new Map(), openId = "", me = null, toast = () => {};
let liveOpen = {}, player = "", lessons = [], played = new Map(), showAll = false, agPlays = new Set(), isAG = false, isEL = false, isSB = false;

export async function initWork(profile, getMe, toastFn) {
  P = profile; base = profile.tid ? ["teachers", profile.tid] : []; toast = toastFn || toast;
  for (let i = 0; i < 50 && !(me = getMe()); i++) await new Promise(r => setTimeout(r, 200));   // wait for his record (class)
  if (!me) return;
  await load(); draw();
}
const liveList = () => LIVE_WS.filter(w => isLive(w, liveOpen, String((me && me.cls) || "").trim()));
let remindOn = false;   // the teacher pressed "Remind about missing work" for this class
async function load() {
  try {
    const w = await getDocs(query(collection(fs, ...base, "work"), where("classes", "array-contains", me.cls)));
    const all = w.docs.map(d => ({ id: d.id, ...d.data() }));
    materials = all.filter(x => x.kind === "material" && Array.isArray(x.units)).sort((a, b) => (b.created || 0) - (a.created || 0));
    works = all.filter(x => x.kind !== "material" && x.kind !== "announcement" && x.kind !== "funpark" && x.kind !== "liveopen" && x.kind !== "remind" && x.kind !== "mylessons").sort((a, b) => (b.created || 0) - (a.created || 0));
    { const lo = all.find(x => x.id === "liveopen" && x.kind === "liveopen"); liveOpen = (lo && lo.open) || {}; }
    { const rd = all.find(x => x.id === "remind" && x.kind === "remind"), at = (rd && rd.at) || {}; remindOn = Object.keys(at).some(k => at[k] && k.toUpperCase() === String(me.cls || "").trim().toUpperCase()); }
    const s = await getDocs(query(collection(fs, ...base, "subs"), where("sid", "==", P.sid)));
    mine = new Map(s.docs.map(d => [d.data().wid, d.data()]));
  } catch { works = []; }
  player = playerOf(me);
  isAG = /^8G$/i.test(String(me.cls || "").trim());   // this lesson is only for class 8G
  isSB = /^(8Y|8S|8M|8D)$/i.test(String(me.cls || "").trim());   // extra substitution practice: 8Y, 8S, 8M, 8D
  isEL = /^(8B|8Y|8S|8M|8D)$/i.test(String(me.cls || "").trim());   // elimination lesson: only these four classes
  if (liveList().length) { try { const pl = await getDocs(query(collection(fs, ...base, "plays"), where("sid", "==", P.sid))); let rt = {}; try { const sd = await getDoc(doc(fs, ...base, "students", P.sid)); rt = (sd.exists() && sd.data().rt) || {}; lxs = (sd.exists() && sd.data().lx) || {}; } catch {}
      agPlays = new Set(pl.docs.map(d => d.data()).filter(v => (v.u || v.t || 0) > (rt[v.g] || 0)).map(v => v.g)); } catch {} }
  if (player) {
    try {
      const c = await catalog(), grp = (c.players.find(x => x.id === player) || {}).group;
      lessons = c.lessons.filter(l => l.group === grp).map(l => ({ ...l, games: c.games.filter(g => g.sec === l.id) })).filter(l => l.games.length);
      const pl = await getDocs(query(collection(fs, ...base, "plays"), where("sid", "==", P.sid)));
      played = new Map();
      pl.docs.forEach(d => { const v = d.data(), a = played.get(v.g) || { r: 0, w: 0 }; a.r += +v.r || 0; a.w += +v.w || 0; played.set(v.g, a); });
    } catch { lessons = []; }
  }
}
function draw() {
  const box = $("work"); if (!box) return;
  const w = works.find(x => x.id === openId);
  if (w && !mine.has(w.id)) return drawSheet(box, w);
  const list = works.filter(x => x.open !== false || mine.has(x.id));
  const sheets = list.map(x => { const s = mine.get(x.id);
    return `<div class="wk-card${s ? " done" : ""}"><div><b>${esc(x.title)}</b><small>${x.test && x.test.on ? `<b>TEST · ${x.test.min} minutes</b>` : "Worksheet"} · ${(x.questions || []).length} questions${s ? ` · handed in ${esc(when(s.at))}` : ""}</small></div>
      ${s ? `<span class="wk-tick">Done ✓</span>` : `<button class="primary small" type="button" data-wkact="open" data-id="${x.id}">${x.test && x.test.on ? "Start test" : "Start"}</button>`}</div>`; }).join("");
  const shown = showAll ? lessons : lessons.slice(0, 3);
  const games = shown.map((l, i) => `<div class="wk-lesson"><div class="wk-lh"><b>${esc(l.title)}</b><small>${esc(l.date)}</small></div>
      <div class="wk-games">${l.games.map(g => { const a = played.get(g.id), p = a && (a.r + a.w) ? Math.round(100 * a.r / (a.r + a.w)) : null;
        return `<button class="wk-game${a ? " done" : ""}" type="button" data-wkact="game" data-id="${esc(g.id)}"><b>${esc(g.title)}</b><small>${esc(g.desc)}</small>${a ? `<span class="wk-tick">${p}% ✓</span>` : ""}</button>`; }).join("")}</div></div>`).join("");
  const xpNote = k => { const r = lxs[k] || {}; return `<small class="wk-xpnote">${r.perfect ? "⭐ +200 XP earned: all correct!" : r.done ? "✓ +100 XP earned. Get the worksheet 100% right for +100 more." : "Finish everything for +100 XP. Get the worksheet 100% right for +100 more."}</small>`; };
  const agPart = (g, l) => `<span class="wk-tick" style="margin-left:6px;opacity:${agPlays.has(g) ? 1 : .35}">${agPlays.has(g) ? "✓ " : ""}${l}</span>`;
  const lv = liveList();
  const liveCards = lv.map(w => w.pages ? `<div class="wk-lesson"><div class="wk-lh"><b>${esc(w.title)}</b><small>${esc(w.sub || "")}</small></div>
      <small>${esc(w.desc || "")}</small><div class="wk-games">${w.pages.map(([f, l], k) => `<button class="wk-game" type="button" data-wkact="live" data-id="${esc(w.id)}" data-p="${k}"><b>${esc(l)}</b></button>`).join("")}</div></div>` : `<div class="wk-lesson"><div class="wk-lh"><b>${esc(w.title)}</b><small>${esc(w.sub || "")}</small></div>
      <div class="wk-games"><button class="wk-game${agPlays.has(w.id + "-ws") ? " done" : ""}" type="button" data-wkact="live" data-id="${esc(w.id)}"><b>${w.games ? "Examples, games and worksheet" : w.noWs ? "Worked example" : "Worked examples, then a worksheet"}</b><small>${esc(w.desc || "Go through the worked examples first. Then the worksheet opens.")}</small>${w.noWs ? "" : xpNote(w.xp || w.id)}
      <span>${agPart(w.id + "-examples", "Examples")}${(w.games || []).map(([k, l]) => agPart(w.id + "-" + k, l)).join("")}${w.noWs ? "" : agPart(w.id + "-ws", "Worksheet")}</span></button></div></div>`).join("");
  const matCard = (() => {
    if (!materials.length) return "";
    return `<section class="card wk-box mt-box"><h3>My material</h3>` + materials.map((m, i) => {
      const ls = m.units.flatMap(u => u.lessons || []), have = ls.filter(l => (l.links || []).length).length;
      return `<details class="mt-list"${i === 0 ? " open" : ""}><summary><b>${esc(m.title || "Quarter 2")}</b><small>${have} of ${ls.length} lessons ready</small></summary>
        ${m.units.map(u => `<h4 class="mt-un">${esc(u.title)}</h4>${(u.lessons || []).map(l => { const L = (l.links || []).filter(k => /^https?:\/\//i.test(k.url));
          return `<div class="mt-ls${L.length ? " ok" : ""}"><span class="mt-n">${esc(l.code)}</span><div><b>${esc(l.title)}</b>${L.length ? `<div class="mt-lk">${L.map(k => `<a class="mt-a" href="${esc(k.url)}" target="_blank" rel="noopener">${esc(k.label)}</a>`).join("")}</div>` : `<small>Coming soon</small>`}</div></div>`; }).join("")}`).join("")}</details>`; }).join("") + `</section>`;
  })();
  const pend = list.filter(x => !mine.has(x.id)).length
    + lv.filter(w => !agPlays.has(w.id + "-ws")).length + shown.filter(l => l.games.some(g => !played.has(g.id))).length;
  const cwN = (sheets ? 1 : 0) + lv.length + shown.length;
  const nudge = pend && remindOn ? `<button class="cw-nudge" type="button" data-wkact="jump"><span class="cw-dot">${pend}</span> Your teacher says: you have ${pend === 1 ? "1 missing classwork" : pend + " missing classwork"}. Please finish ${pend === 1 ? "it" : "them"}. Tap to open.</button>` : "";
  box.innerHTML = nudge + matCard + `<section class="card wk-box cw-box" id="cwBox"><h3>My classwork${pend ? ` <span class="cw-badge">${pend} to do</span>` : cwN ? ` <span class="cw-badge ok">All done ✓</span>` : ""}</h3>
    <div class="cw-scroll">${liveCards}
    ${sheets ? `<div class="wk-list">${sheets}</div>` : ""}
    ${games}</div>${cwN > 1 ? `<small class="cw-hint">Scroll down inside the box to see more ↓</small>` : ""}
    ${lessons.length > 3 ? `<button class="ghost small" type="button" data-wkact="more">${showAll ? "Show fewer lessons" : `Show older lessons (${lessons.length - 3})`}</button>` : ""}
    ${!sheets && !games && !lv.length ? `<p class="none">Nothing to do right now. Your teacher's work will appear here.</p>` : ""}</section>`;
}
/* ---------- Test mode: full screen, timer, shuffled questions, warnings when the student leaves the page ---------- */
const hashSeed = str => { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; }; };
const shuf = (a, rnd) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
let testOff = null;
function drawTest(box, w) {
  const T = w.test, mins = Math.max(1, +T.min || 30), maxW = Math.max(0, +T.warn >= 0 ? +T.warn : 3), KEY = `mi_test_${w.id}_${P.sid}`, qs = w.questions || [];
  let st = null; try { st = JSON.parse(localStorage.getItem(KEY) || "null"); } catch {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} };
  const fsOk = !!(document.documentElement.requestFullscreen), goFs = () => { try { if (fsOk && !document.fullscreenElement) return document.documentElement.requestFullscreen().catch(() => {}); } catch {} };
  if (!st) {
    box.innerHTML = `<section class="card wk-do"><h3>${esc(w.title)} · TEST</h3>
      <p><b>${qs.length} questions · ${mins} minutes.</b> Read the rules before you start:</p>
      <ul style="line-height:1.7;padding-left:20px"><li>The test opens in <b>full screen</b>. Stay in it until you hand in.</li><li>If you leave the page, change the tab or leave full screen, you get a <b>warning</b>. Your teacher can see every warning.</li><li>After <b>${maxW} warning${maxW === 1 ? "" : "s"}</b> your test is handed in by itself.</li><li>The timer keeps running. When it reaches zero your test is handed in by itself.</li><li>You cannot copy or paste. You can hand in only once.</li>${fsOk ? "" : "<li><b>This device cannot use full screen. Please use a laptop or computer if your teacher asks.</b></li>"}</ul>
      <div class="sbtns"><button class="primary" type="button" id="tStart">Start the test</button><button class="ghost" type="button" data-wkact="back">Back</button></div></section>`;
    $("tStart").onclick = () => { st = { start: Date.now(), log: [], ans: {}, seen: Date.now() }; save(); goFs(); run(); };
    return;
  }
  run(true);
  function run(resume) {
    const rnd = hashSeed(w.id + "|" + P.sid), order = shuf(qs.map((_, i) => i), rnd), optOrd = qs.map(q => q.type === "mc" ? shuf(q.opts || [], hashSeed(w.id + "|" + P.sid + "|" + (q.q || ""))) : null);
    let done = false, busy = false, lastW = 0, ov = null;
    const secsUsed = () => Math.round((Date.now() - st.start) / 1000), left = () => st.start + mins * 60000 - Date.now();
    const cleanup = () => { clearInterval(tm); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("blur", onBlur); document.removeEventListener("fullscreenchange", onFs); document.removeEventListener("copy", block, true); document.removeEventListener("cut", block, true); document.removeEventListener("paste", block, true); document.removeEventListener("contextmenu", block, true); document.removeEventListener("selectstart", block, true); document.removeEventListener("keydown", onKey, true); testOff = null; if (ov) ov.remove(); try { if (document.fullscreenElement) document.exitFullscreen(); } catch {} document.body.classList.remove("wk-noscroll"); };
    testOff = cleanup;
    const answersOf = () => qs.map((q, i) => String(st.ans[i] ?? "").trim());
    async function finish(reason) {
      if (done) return; done = true; busy = true;
      const answers = answersOf().concat(["@@test " + JSON.stringify({ w: st.log.length, l: st.log.slice(0, 25), s: Math.min(secsUsed(), mins * 60), r: reason })]);
      const sub = { wid: w.id, sid: P.sid, name: me.name, cls: me.cls, answers, at: Date.now() };
      try { await setDoc(doc(fs, ...base, "subs", w.id + "_" + P.sid), sub); mine.set(w.id, sub); try { localStorage.removeItem(KEY); } catch {} logEv("Handed in test: " + String(w.title || "test").slice(0, 40)); cleanup(); openId = ""; toast(reason === "hand" ? "Handed in. Well done!" : "Your test was handed in."); draw(); }
      catch (er) { done = false; busy = false; const n = $("wkNote"); if (n) n.textContent = er && er.code === "permission-denied" ? "This test is closed or was already handed in." : "Could not hand in. Check your internet. Tap Hand in again."; }
    }
    function warn(kind) {
      if (done || busy || Date.now() - lastW < 1200) return; lastW = Date.now();
      st.log.push({ t: secsUsed(), k: kind }); save();
      if (st.log.length > maxW) return finish("locked");
      showWarn(kind);
    }
    function showWarn(kind) {
      if (ov) ov.remove();
      ov = document.createElement("div"); ov.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(150,20,10,.96);color:#fff;display:grid;place-items:center;text-align:center;padding:24px";
      ov.innerHTML = `<div style="max-width:420px"><div style="font-size:54px">⚠️</div><h2 style="margin:6px 0">Warning ${st.log.length} of ${maxW}</h2><p style="font-size:18px">${kind === "reload" ? "You reloaded the page." : "You left the test screen."} Your teacher can see this. ${st.log.length === maxW ? "<b>One more and your test is handed in.</b>" : ""}</p><button type="button" id="tBack" style="font:inherit;font-weight:800;padding:12px 22px;border-radius:12px;border:0;cursor:pointer">Back to the test</button></div>`;
      document.body.appendChild(ov); $("tBack").onclick = () => { ov.remove(); ov = null; goFs(); };
    }
    const onVis = () => { if (document.hidden) warn("tab"); }, onBlur = () => { if (!busy) setTimeout(() => { if (!document.hasFocus() && !document.hidden) warn("blur"); }, 400); };
    const onFs = () => { if (fsOk && !document.fullscreenElement && !busy) warn("fs"); };
    const block = e => { if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName) && e.type === "paste") { e.preventDefault(); return; } e.preventDefault(); };
    const onKey = e => { const k = (e.key || "").toLowerCase(); if ((e.ctrlKey || e.metaKey) && ["c", "v", "x", "p", "s", "u", "a"].includes(k)) e.preventDefault(); };
    document.addEventListener("visibilitychange", onVis); window.addEventListener("blur", onBlur); document.addEventListener("fullscreenchange", onFs);
    ["copy", "cut", "paste", "contextmenu", "selectstart"].forEach(t => document.addEventListener(t, block, true)); document.addEventListener("keydown", onKey, true);
    document.body.classList.add("wk-noscroll");
    box.innerHTML = `<section class="card wk-do" style="user-select:none;-webkit-user-select:none"><div style="position:sticky;top:0;z-index:5;background:var(--card,#fff);padding:8px 0;border-bottom:2px solid var(--line,#cdd5e3);display:flex;justify-content:space-between;align-items:center;gap:10px"><b>${esc(w.title)}</b><span id="tClock" style="font-weight:900;font-size:20px;font-variant-numeric:tabular-nums"></span></div>
      <form id="wkForm" style="margin-top:10px">${order.map((qi, pos) => { const q = qs[qi]; return `<div class="wk-item"><p><b>${pos + 1}.</b> ${esc(q.q).replace(/\n/g, "<br>")}</p>${q.type === "mc"
        ? `<div class="wk-mc">${optOrd[qi].map(o => `<label><input type="radio" name="q${qi}" value="${esc(o)}" ${st.ans[qi] === o ? "checked" : ""}> ${esc(o)}</label>`).join("")}</div>`
        : `<input name="q${qi}" autocomplete="off" maxlength="300" placeholder="Your answer" value="${esc(st.ans[qi] || "")}" style="user-select:text;-webkit-user-select:text">`}</div>`; }).join("")}
      <p class="wk-note" id="wkNote"></p><div class="sbtns"><button class="primary" type="submit" id="wkSend">Hand in</button></div></form></section>`;
    const clock = $("tClock"), paint = () => { const r = Math.max(0, left()), m = Math.floor(r / 60000), sec = Math.floor(r / 1000) % 60; clock.textContent = `${m}:${String(sec).padStart(2, "0")}`; clock.style.color = r < 120000 ? "#b3261e" : ""; };
    const tm = setInterval(() => { paint(); if (left() <= 0) finish("time"); }, 1000); paint();
    $("wkForm").addEventListener("input", e => { const el = e.target; if (el && el.name) { st.ans[+el.name.slice(1)] = el.value; save(); } });
    $("wkForm").addEventListener("change", e => { const el = e.target; if (el && el.name) { st.ans[+el.name.slice(1)] = el.value; save(); } });
    $("wkForm").onsubmit = async e => {
      e.preventDefault(); busy = true;
      const empty = answersOf().filter(a => !a).length;
      const ok = confirm(empty ? `${empty} question${empty === 1 ? " is" : "s are"} still empty. Hand in anyway?` : "Hand in now? You cannot change your answers after this.");
      busy = false; lastW = Date.now(); if (ok) finish("hand"); else goFs();
    };
    if (resume) { warn("reload"); }
  }
}
function drawSheet(box, w) {
  if (w.test && w.test.on) { if (testOff) testOff(); return drawTest(box, w); }
  box.innerHTML = `<section class="card wk-do"><h3>${esc(w.title)}</h3>
    <form id="wkForm">${(w.questions || []).map((q, i) => `<div class="wk-item"><p><b>${i + 1}.</b> ${esc(q.q).replace(/\n/g, "<br>")}</p>${q.type === "mc"
      ? `<div class="wk-mc">${q.opts.map(o => `<label><input type="radio" name="q${i}" value="${esc(o)}"> ${esc(o)}</label>`).join("")}</div>`
      : `<input name="q${i}" autocomplete="off" maxlength="300" placeholder="Your answer">`}</div>`).join("")}
    <p class="wk-note" id="wkNote"></p>
    <div class="sbtns"><button class="primary" type="submit" id="wkSend">Hand in</button><button class="ghost" type="button" data-wkact="back">Back</button></div></form></section>`;
  $("wkForm").onsubmit = async e => {
    e.preventDefault();
    const f = e.target, answers = (w.questions || []).map((q, i) => { const el = f.elements["q" + i]; return String((el && (el.value ?? "")) || "").trim(); });
    const empty = answers.filter(a => !a).length;
    if (empty && !confirm(`${empty} question${empty === 1 ? " is" : "s are"} still empty. Hand in anyway?`)) return;
    if (!empty && !confirm("Hand in now? You cannot change your answers after this.")) return;
    $("wkSend").disabled = true;
    const sub = { wid: w.id, sid: P.sid, name: me.name, cls: me.cls, answers, at: Date.now() };
    try { await setDoc(doc(fs, ...base, "subs", w.id + "_" + P.sid), sub); mine.set(w.id, sub); logEv("Handed in: " + String(w.title || "worksheet").slice(0, 50)); openId = ""; toast("Handed in. Well done!"); draw(); }
    catch (er) { $("wkSend").disabled = false; $("wkNote").textContent = er && er.code === "permission-denied" ? "This worksheet is closed or was already handed in." : "Could not hand in. Check your internet and try again."; }
  };
}
function openAG(file = "ag34.html", ttl = "Lesson 3.4") {
  const ov = document.createElement("div"); ov.className = "wk-play"; ov.id = "wkPlay";
  ov.innerHTML = `<button class="wk-x" type="button" data-wkact="closegame" aria-label="Close the lesson">✕ Close</button><iframe src="${file}" title="${ttl}"></iframe>`;
  document.body.appendChild(ov); document.body.classList.add("wk-noscroll");
}
function openGame(id) {
  const gm = lessons.flatMap(l => l.games).find(g => g.id === id); logEv("Opened game: " + (gm ? gm.title : id));
  const ov = document.createElement("div"); ov.className = "wk-play"; ov.id = "wkPlay";
  ov.innerHTML = `<button class="wk-x" type="button" data-wkact="closegame" aria-label="Close the game">✕ Close</button><iframe src="island9s.html#g=${encodeURIComponent(id)}" title="Game" allow="autoplay"></iframe>`;
  document.body.appendChild(ov); document.body.classList.add("wk-noscroll");
}
async function closeGame() {
  const ov = $("wkPlay"); if (ov) ov.remove(); document.body.classList.remove("wk-noscroll");
  await load(); draw();
}
window.addEventListener("message", e => { if (e.origin === location.origin && e.data === "mi-close") closeGame(); });
document.addEventListener("click", e => {
  const b = e.target.closest("[data-wkact]"); if (!b) return;
  const a = b.dataset.wkact;
  if (a === "open") { openId = b.dataset.id; draw(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  if (a === "back") { openId = ""; draw(); }
  if (a === "more") { showAll = !showAll; draw(); }
  if (a === "jump") { const c = $("cwBox"); if (c) c.scrollIntoView({ behavior: "smooth", block: "center" }); }
  if (a === "game") openGame(b.dataset.id);
  if (a === "live") { const w = LIVE_WS.find(x => x.id === b.dataset.id); if (w && liveList().includes(w)) { const pg = w.pages && w.pages[+b.dataset.p || 0]; openAG(pg ? pg[0] : w.file, w.title); } }
  if (a === "closegame") closeGame();
});

{ const st = document.createElement("style"); st.textContent = ".mt-un{margin:14px 0 6px;font-size:16px}.mt-list{margin:8px 0;border-top:1px solid var(--line);padding-top:8px}.mt-list summary{cursor:pointer;display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;font-size:16px}.mt-list summary small{opacity:.7}.mt-ls{display:flex;gap:12px;align-items:flex-start;padding:10px 12px;border-radius:12px;margin:6px 0;background:color-mix(in srgb,var(--accent) 7%,var(--card));color:var(--muted)}.mt-ls.ok{background:color-mix(in srgb,var(--good) 18%,var(--card));color:var(--ink)}.mt-n{font-weight:800;min-width:2.3em}.mt-ls small{display:block;opacity:.8}.mt-lk{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}.mt-a{display:inline-block;padding:6px 12px;border-radius:99px;background:var(--sea-700);color:#fff;font-weight:700;text-decoration:none}"; document.head.appendChild(st); }
{ const st = document.createElement("style"); st.textContent = ".cw-scroll{max-height:340px;overflow-y:auto;padding-right:6px;scroll-snap-type:y proximity;overscroll-behavior:contain}.cw-scroll>*{scroll-snap-align:start}.cw-hint{display:block;margin-top:6px;opacity:.75}.cw-badge{display:inline-block;margin-left:8px;padding:2px 10px;border-radius:99px;background:#d8392b;color:#fff;font-size:13px;font-weight:800;vertical-align:middle}.cw-badge.ok{background:var(--good,#1f7a4a)}.cw-nudge{grid-column:1/-1;display:flex;align-items:center;gap:10px;width:100%;margin:0 0 4px;padding:10px 14px;border:0;border-radius:14px;background:#d8392b;color:#fff;font:inherit;font-weight:700;cursor:pointer;text-align:left}.cw-dot{display:inline-grid;place-items:center;min-width:26px;height:26px;border-radius:99px;background:#fff;color:#d8392b;font-weight:800}@media(min-width:860px){#work{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;align-items:start}#work>section:only-child{grid-column:1/-1}#work>section{margin:0}}"; document.head.appendChild(st); }
{ const st = document.createElement("style"); st.textContent = "#work .wk-box{padding:14px 16px!important}#work .wk-box h3{margin:0 0 6px!important;font-size:18px!important;line-height:1.2}#work .mt-un{font-size:14px;margin:10px 0 4px}#work .mt-ls{padding:7px 10px;margin:4px 0;font-size:14px;gap:8px}#work .mt-n{min-width:2em}#work .mt-list{margin:6px 0;padding-top:6px}#work .mt-list summary{font-size:15px}#work .mt-a{padding:4px 10px;font-size:13px}#work .wk-lh b{font-size:15px}#work .wk-game{padding:10px 12px}#work .wk-game b{font-size:15px}#work .wk-game small{font-size:12.5px}@media(min-width:860px){#work .mt-box{max-height:560px;overflow:auto}}"; document.head.appendChild(st); }

// A worksheet the teacher just started appears without reloading. Every 45 s we read only the two small switch documents (2 reads);
// the full work list (many reads) is loaded again only when one of them changed.
let lastSwitch = "";
setInterval(async () => {
  if (!me || document.hidden || $("wkPlay") || openId || !LIVE_WS.length) return;
  let sig = "";
  try { const a = await getDoc(doc(fs, ...base, "work", "liveopen")), b = await getDoc(doc(fs, ...base, "work", "remind")); sig = JSON.stringify([a.exists() ? a.data().open : null, b.exists() ? b.data().at : null]); } catch { return; }
  if (!lastSwitch) { lastSwitch = sig; return; }
  if (sig === lastSwitch) return;
  lastSwitch = sig;
  const before = JSON.stringify(liveList().map(w => w.id));
  try { await load(); } catch { return; }
  if (JSON.stringify(liveList().map(w => w.id)) !== before) draw();
}, 45000);
