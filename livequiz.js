// Student side: Live quiz. A teacher opens a game for the class; the student taps Join, waits in the lobby, then answers each question
// on the big coloured buttons. After every question he sees if he was right and his place; at the end, the winners' podium.
import { fs, doc, setDoc, collection, onSnapshot, query, where } from "./fb.js?v=1112g";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const COL = ["#e0443e", "#2f6fe0", "#e5a50a", "#1f9d55"], SHAPE = ["▲", "◆", "●", "■"];
const ls = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };

let P = null, base = [], me = null, cur = null, joined = false, hidden = false, lastSeq = 0, t0 = 0, dur = 20, answers = {}, tick = null, noted = "", locked = false;

{ const st = document.createElement("style"); st.textContent = `
#livePill{position:fixed;right:14px;bottom:96px;z-index:2900;border:3px solid #151412;border-radius:999px;background:#ffd84a;color:#151412;font-weight:800;padding:10px 16px;font:inherit;font-weight:800;box-shadow:0 4px 0 #151412;cursor:pointer;animation:lqpulse 1.6s ease-in-out 3}
@keyframes lqpulse{50%{transform:scale(1.07)}}
#liveOv{position:fixed;inset:0;z-index:3000;background:linear-gradient(160deg,#1c3f94,#3a1c8f);color:#fff;display:flex;flex-direction:column;padding:14px 16px calc(16px + env(safe-area-inset-bottom,0px));overflow:auto}
#liveOv .lq-top{display:flex;justify-content:space-between;align-items:center;gap:10px}#liveOv .lq-x{background:rgba(255,255,255,.18);color:#fff;border:0;border-radius:10px;padding:8px 12px;font:inherit;font-weight:700}
#liveOv .lq-mid{flex:1;display:flex;flex-direction:column;justify-content:center;gap:14px;text-align:center;width:min(760px,100%);margin:0 auto}
#liveOv h2{margin:0;font-size:clamp(24px,6vw,40px)}#liveOv .lq-q{font-size:clamp(22px,5.4vw,38px);font-weight:800;line-height:1.2}
#liveOv .lq-btn{background:#ffd84a;color:#151412;border:0;border-radius:14px;padding:16px 26px;font:inherit;font-weight:900;font-size:20px}
#liveOv .lq-opts{display:grid;grid-template-columns:1fr 1fr;gap:12px}
#liveOv .lq-opt{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border:0;border-radius:16px;min-height:clamp(96px,22vh,170px);color:#fff;font:inherit;font-weight:800;font-size:clamp(16px,4.4vw,26px);padding:10px}
#liveOv .lq-opt i{font-style:normal;font-size:1.5em}#liveOv .lq-opt.dim{opacity:.3}#liveOv .lq-opt.pick{outline:5px solid #fff}
#liveOv .lq-timer{height:12px;border-radius:8px;background:rgba(255,255,255,.25);overflow:hidden}#liveOv .lq-timer i{display:block;height:100%;background:#ffd84a;transition:width .25s linear}
#liveOv .lq-big{font-size:clamp(46px,14vw,110px);font-weight:900}#liveOv .lq-pts{font-size:clamp(22px,6vw,34px);font-weight:800}
#liveOv .lq-list{display:grid;gap:6px;text-align:left}#liveOv .lq-list div{display:grid;grid-template-columns:2em 1fr auto;gap:8px;background:rgba(255,255,255,.14);padding:8px 12px;border-radius:12px;font-weight:700}
#liveOv .lq-list .me{background:#ffd84a;color:#151412}
#liveOv .lq-pod{display:flex;gap:10px;align-items:flex-end;justify-content:center;min-height:250px}#liveOv .lq-pod>div{width:30%;max-width:190px}
#liveOv .lq-n{display:flex;align-items:center;gap:8px}#liveOv .lq-pod .av{display:flex;justify-content:center;margin-bottom:6px;opacity:0;animation:lqfade .5s forwards}#liveOv .p3 .av{animation-delay:.9s}#liveOv .p2 .av{animation-delay:2.2s}#liveOv .p1 .av{animation-delay:3.5s}
#liveOv .lq-pod .nm{font-weight:800;opacity:0;animation:lqfade .5s forwards}#liveOv .lq-pod .sc{font-weight:700;opacity:0;animation:lqfade .5s forwards}
#liveOv .lq-pod .bl{border-radius:12px 12px 0 0;color:#fff;font-weight:900;font-size:44px;padding-top:8px;transform-origin:bottom;transform:scaleY(0);animation:lqrise .8s cubic-bezier(.2,.9,.3,1.2) forwards}
#liveOv .p3 .bl{height:90px;background:#b3733a;animation-delay:.2s}#liveOv .p3 .nm,#liveOv .p3 .sc{animation-delay:.9s}
#liveOv .p2 .bl{height:130px;background:#8e9aa8;animation-delay:1.5s}#liveOv .p2 .nm,#liveOv .p2 .sc{animation-delay:2.2s}
#liveOv .p1 .bl{height:180px;background:#e5a50a;animation-delay:2.8s}#liveOv .p1 .nm,#liveOv .p1 .sc{animation-delay:3.5s}
@keyframes lqrise{to{transform:scaleY(1)}}@keyframes lqfade{to{opacity:1}}`; document.head.appendChild(st); }

const ov = document.createElement("div"); ov.id = "liveOv"; ov.hidden = true; document.body.appendChild(ov);
const pill = document.createElement("button"); pill.id = "livePill"; pill.type = "button"; pill.hidden = true; pill.textContent = "🎮 Live quiz"; document.body.appendChild(pill);

const durOf = i => (cur.qs[i] && cur.qs[i].t) || cur.dur || 20;
const key = () => `mi_live_${P.sid}_${cur.id}`;
const av = (r, sz) => { try { return avatarHTML({ id: r.sid, name: r.name || "", avatar: r.a || 0, eq: r.e || {}, cls: r.c || "" }, sz); } catch { return ""; } };
const myRow = () => (cur.board || []).find(r => r.sid === P.sid);

function show() {
  if (!cur) { ov.hidden = true; pill.hidden = true; return; }
  pill.hidden = !hidden; ov.hidden = hidden; if (hidden) return;
  const top = `<div class="lq-top"><b>${esc(cur.title)}</b><button class="lq-x" type="button" data-lq="hide">Hide</button></div>`;
  let mid = "";
  if (!joined) {
    mid = `<h2>🎮 Live quiz</h2><p class="lq-q" style="font-size:22px">${esc(cur.title)}</p><button class="lq-btn" type="button" data-lq="join">Join the game</button>`;
  } else if (cur.status === "lobby") {
    mid = `<div style="display:flex;justify-content:center">${av({ sid: P.sid, name: me && me.name, a: me && me.avatar, e: me && me.eq, c: me && me.cls }, "xl")}</div><h2>You are in, ${esc((me && me.name || "").split(" ")[0])}!</h2><p class="lq-q" style="font-size:22px">Look at the screen. Your teacher will start the game soon.</p>`;
  } else if (cur.status === "q") {
    const q = cur.qs[cur.qi], a = answers[cur.qi];
    mid = `<div class="lq-timer"><i id="lqTb" style="width:100%"></i></div><div class="lq-q">${esc(q.q)}</div>
      <div class="lq-opts">${q.o.map((o, i) => `<button class="lq-opt${a !== undefined ? (a === i ? " pick" : " dim") : ""}" type="button" style="background:${COL[i]}" data-lq="ans" data-i="${i}"${a !== undefined || locked ? " disabled" : ""}><i>${SHAPE[i]}</i>${esc(o)}</button>`).join("")}</div>
      <p id="lqNote">${a !== undefined ? "Answer locked in ✓ Wait for the others…" : locked ? "Time is up." : ""}</p>`;
  } else if (cur.status === "result") {
    const q = cur.qs[cur.qi], r = myRow(), a = answers[cur.qi];
    if (!r) mid = `<h2>Waiting for the next question…</h2>`;
    else {
      const ok = a === q.c, pos = (cur.board || []).indexOf(r) + 1;
      mid = `<div class="lq-big">${ok ? "✓" : a === undefined ? "⏱" : "✗"}</div><h2>${ok ? "Correct!" : a === undefined ? "Time ran out" : "Not this time"}</h2>
        ${ok ? `<div class="lq-pts">+${r.gain} points</div>` : `<div class="lq-pts">The answer: ${esc(q.o[q.c])}</div>`}
        <div class="lq-pts">You are number ${pos} of ${cur.board.length} · ${r.score} points</div>
        <div class="lq-list">${cur.board.slice(0, 5).map((x, i) => `<div class="${x.sid === P.sid ? "me" : ""}"><span>${i + 1}</span><span class="lq-n">${av(x, "xs")}${esc(x.name)}</span><span>${x.score}</span></div>`).join("")}</div>`;
    }
  } else {
    const t = (cur.board || []).slice(0, 3), r = myRow(), pos = r ? cur.board.indexOf(r) + 1 : 0;
    mid = `<h2>Winners</h2><div class="lq-pod">${[2, 1, 0].map(i => t[i] ? `<div class="p${i + 1}"><div class="av">${av(t[i], "lg")}</div><div class="nm">${esc(t[i].name)}</div><div class="bl">${i + 1}</div><div class="sc">${t[i].score}</div></div>` : "").join("")}</div>
      ${r ? `<div class="lq-pts">You finished number ${pos} with ${r.score} points</div>` : ""}`;
  }
  ov.innerHTML = top + `<div class="lq-mid">${mid}</div>`;
  if (joined && cur.status === "q") startTimer();
}
function startTimer() {
  clearInterval(tick);
  tick = setInterval(() => {
    if (!cur || cur.status !== "q") return clearInterval(tick);
    const left = Math.max(0, dur - (performance.now() - t0) / 1000), tb = $("lqTb"); if (tb) tb.style.width = (100 * left / dur) + "%";
    if (left <= 0) { clearInterval(tick); if (answers[cur.qi] === undefined) { locked = true; ov.querySelectorAll(".lq-opt").forEach(b => b.disabled = true); const n = $("lqNote"); if (n) n.textContent = "Time is up."; } }
  }, 200);
}
async function send(i) {
  const qi = cur.qi, ms = Math.round(performance.now() - t0), ref = doc(fs, ...base, "liveplayers", cur.id + "_" + P.sid);
  answers[qi] = i; ls.set(key() + "_a", JSON.stringify(answers)); show();
  const ans = {}; ans[qi] = { c: i, ms };
  try { await setDoc(ref, { sess: cur.id, sid: P.sid, name: String((me && me.name) || P.sid).slice(0, 80), joined: Number(ls.get(key() + "_j")) || Date.now(), ans }, { merge: true }); }
  catch { const n = $("lqNote"); if (n) n.textContent = "Could not send. Check your internet."; }
}
async function join() {
  const ref = doc(fs, ...base, "liveplayers", cur.id + "_" + P.sid), j = Date.now();
  try { await setDoc(ref, { sess: cur.id, sid: P.sid, name: String((me && me.name) || P.sid).slice(0, 80), joined: j, ans: {} }, { merge: true }); }
  catch { const el = ov.querySelector(".lq-mid"); if (el) el.insertAdjacentHTML("beforeend", "<p>Could not join. Ask your teacher.</p>"); return; }
  ls.set(key() + "_j", String(j)); joined = true; show();
}
function pick(docs) {
  const lim = Date.now() - 10 * 60 * 1000;
  return docs.map(d => ({ id: d.id, ...d.data() })).filter(x => x.kind === "session" && (x.status !== "end" || (x.endedAt || 0) > lim)).sort((a, b) => (b.created || 0) - (a.created || 0))[0] || null;
}
function onSession(s) {
  if (!s) { cur = null; clearInterval(tick); return show(); }
  const first = !cur || cur.id !== s.id; cur = s;
  if (first) {
    joined = ls.get(key() + "_j") !== null; hidden = ls.get(key() + "_h") === "1";
    try { answers = JSON.parse(ls.get(key() + "_a") || "{}"); } catch { answers = {}; }
    lastSeq = 0;
  }
  if (cur.status === "q" && cur.seq !== lastSeq) { lastSeq = cur.seq; t0 = performance.now(); dur = durOf(cur.qi); locked = false; if (joined && hidden) hidden = false; }
  if (first && !joined) hidden = false;   // a new game: show the Join button at once
  if (cur.status === "end" && noted !== cur.id) { noted = cur.id; if (joined) hidden = false; }
  show();
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-lq]"); if (!b || !cur) return; const a = b.dataset.lq;
  if (a === "join") join();
  else if (a === "hide") { hidden = true; ls.set(key() + "_h", "1"); show(); }
  else if (a === "ans" && cur.status === "q" && answers[cur.qi] === undefined && !locked) send(Number(b.dataset.i));
});
pill.onclick = () => { hidden = false; ls.set(key() + "_h", "0"); show(); };

export async function initLive(profile, getMe) {
  P = profile; base = P.tid ? ["teachers", P.tid] : [];
  for (let i = 0; i < 40 && !getMe(); i++) await new Promise(r => setTimeout(r, 250));
  me = getMe(); if (!me || !me.cls) return;
  const refresh = setInterval(() => { me = getMe() || me; }, 20000); void refresh;
  onSnapshot(query(collection(fs, ...base, "live"), where("cls", "array-contains", me.cls)), snap => onSession(pick(snap.docs)), () => {});
}
