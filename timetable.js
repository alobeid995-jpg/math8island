// Mr. Khalid's maths timetable (Bahrain time, Sunday to Thursday).
// Teacher side: a small panel with today's lessons and a 5-minute warning before each lesson ends.
// Student side: when the next maths lesson of their class starts and ends, and how long is left.
const D = [  // [day 0=Sun..4=Thu, class, start, end]  (24h)
  [0, "8B", "07:30", "08:15"], [0, "8S", "08:20", "09:05"], [0, "8M", "09:35", "10:20"], [0, "9S", "10:40", "11:30"], [0, "8Y", "12:25", "13:10"],
  [1, "8S", "08:20", "09:05"], [1, "9S", "09:20", "10:10"], [1, "8G", "10:25", "11:10"], [1, "8B", "11:15", "12:00"], [1, "8M", "12:25", "13:10"],
  [2, "9S", "07:30", "08:20"], [2, "8G", "08:20", "09:10"], [2, "8B", "09:35", "10:20"], [2, "8M", "11:15", "12:00"], [2, "8Y", "12:25", "13:10"],
  [3, "9S", "08:25", "09:15"], [3, "8G", "09:35", "10:20"], [3, "8Y", "10:25", "11:10"], [3, "8S", "11:15", "12:00"], [3, "8M", "12:25", "13:10"],
  [4, "8G", "08:15", "08:55"], [4, "8Y", "09:25", "10:05"], [4, "8S", "10:10", "10:55"], [4, "8B", "11:00", "11:40"]
];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const mins = t => { const [h, m] = t.split(".").length > 1 ? t.split(".") : t.split(":"); return +h * 60 + +m; };
const fmt = t => { let [h, m] = t.split(":").map(Number); const ap = h >= 12 ? "pm" : "am"; h = h % 12 || 12; return h + ":" + String(m).padStart(2, "0") + " " + ap; };
const L = D.map(([d, c, s, e]) => ({ d, cls: c, s, e, sm: mins(s), em: mins(e) }));

/* now in Bahrain (UTC+3), whatever the device's own time zone is */
export function nowBH(t = Date.now()) {
  const x = new Date(t + 3 * 3600e3), jd = x.getUTCDay();          // 0 = Sunday
  return { d: jd, m: x.getUTCHours() * 60 + x.getUTCMinutes(), s: x.getUTCSeconds(), key: x.toISOString().slice(0, 10) };
}
const teach = c => (c === "8D" ? "8S" : c);    // 8D (demo class) follows 8S
const dayList = (d, c) => L.filter(l => l.d === d && (!c || l.cls === teach(c))).sort((a, b) => a.sm - b.sm);
const dur = m => m >= 60 ? Math.floor(m / 60) + " h" + (m % 60 ? " " + (m % 60) + " min" : "") : m + " min";
const left = (n, tgtMin) => Math.max(0, Math.ceil((tgtMin * 60 - (n.m * 60 + n.s)) / 60));

/* ---------- students ---------- */
export function nextMath(c, t = Date.now()) {
  const n = nowBH(t), tc = teach(c);
  const today = dayList(n.d, c);
  const cur = today.find(l => n.m >= l.sm && n.m < l.em);
  if (cur) return { state: "now", l: cur, mins: left(n, cur.em), dayName: "Today", n };
  const nxt = today.find(l => l.sm > n.m);
  if (nxt) return { state: "next", l: nxt, mins: nxt.sm - n.m, dayName: "Today", n };
  for (let i = 1; i <= 7; i++) {
    const d = (n.d + i) % 7, l = dayList(d, c)[0];
    if (l) return { state: "later", l, mins: i * 1440 - n.m + l.sm, dayName: i === 1 ? "Tomorrow" : DAYS[d], n };
  }
  return null;
}
export function studentTT(c) {
  if (!c || !L.some(l => l.cls === teach(c))) return "";
  const r = nextMath(c); if (!r) return "";
  const n = r.n, items = [0, 1, 2, 3, 4].flatMap(d => dayList(d, c));
  const head = r.state === "now" ? `<span class="tt-live">● Maths is on now</span>` : `<span>Next maths lesson</span>`;
  const big = r.state === "now" ? `${r.mins} min left` : r.state === "next" ? `in ${dur(r.mins)}` : r.dayName + " " + fmt(r.l.s);
  const sub = r.state === "now" ? `Ends at ${fmt(r.l.e)}` : `${r.dayName} · ${fmt(r.l.s)} to ${fmt(r.l.e)}${r.state === "later" ? " · in " + dur(r.mins) : ""}`;
  const pct = r.state === "now" ? Math.min(100, Math.round(100 * (n.m - r.l.sm) / (r.l.em - r.l.sm))) : 0;
  const tl = items.map(l => {
    const past = l.d < n.d || (l.d === n.d && n.m >= l.em), cur = l.d === n.d && n.m >= l.sm && n.m < l.em, nx = r.l === l;
    return `<li class="tt-i${past ? " tt-past" : ""}${cur ? " tt-cur" : ""}${nx && !cur ? " tt-nx" : ""}"><i></i><b>${DAYS[l.d].slice(0, 3)}${l.d === n.d ? " · today" : ""}</b><span>${fmt(l.s)} – ${fmt(l.e)}</span></li>`;
  }).join("");
  return `<section class="card tt-card" id="ttBox" data-cls="${c}"><div class="tt-h">${head}</div><div class="tt-big">${big}</div><div class="tt-sub">${sub}</div>${r.state === "now" ? `<div class="tt-bar"><i style="width:${pct}%"></i></div>` : ""}<div class="tt-h" style="margin-top:8px">This week</div><ul class="tt-tl">${tl}</ul></section>`;
}
let stuTimer = 0;
export function mountStudentTT(getMe) {
  const go = () => {
    const g = getMe(), me = typeof g === "string" ? g : g && g.cls, news = document.getElementById("stuNews"); if (!me || !news) return false;
    let top = document.getElementById("stuTop");
    if (!top) { top = document.createElement("div"); top.id = "stuTop"; news.before(top); top.appendChild(news); const t = document.createElement("div"); t.id = "stuTT"; top.appendChild(t); }
    const t = document.getElementById("stuTT"), h = studentTT(me);
    t.innerHTML = h; top.classList.toggle("tt-none", !h);
    return !!h;
  };
  let tries = 0; const w = setInterval(() => { if (go() || ++tries > 60) clearInterval(w); }, 500);
  if (!stuTimer) stuTimer = setInterval(go, 20000);
}

/* ---------- teacher ---------- */
const css = `
#ttT{position:fixed;left:12px;bottom:12px;z-index:60;max-width:min(340px,calc(100vw - 24px));font-family:system-ui,sans-serif}
#ttT .tt-pill{display:flex;align-items:center;gap:8px;background:#13213f;color:#fff;border:0;border-radius:999px;padding:9px 14px;font-weight:700;font-size:.86rem;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.3)}
#ttT .tt-pill.on{background:#0a7a3d}#ttT .tt-pill.warn{background:#c0392b;animation:ttp 1s infinite alternate}
@keyframes ttp{to{transform:scale(1.05)}}
#ttT .tt-pan{background:#fff;color:#13213f;border:2px solid #13213f;border-radius:14px;padding:12px;margin-bottom:8px;box-shadow:0 8px 24px rgba(0,0,0,.3)}
#ttT .tt-pan h4{margin:0 0 8px;font-size:.95rem}
#ttT .tt-row{display:grid;grid-template-columns:auto 1fr auto;gap:8px;padding:6px 8px;border-radius:8px;font-size:.88rem;align-items:center}
#ttT .tt-row.cur{background:#c6efce;font-weight:800}#ttT .tt-row.done{opacity:.55}#ttT .tt-row.nxt{background:#e5eeff}
#ttT .tt-none{font-size:.88rem;color:#55607a}
#ttBanner{position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:200;background:#c0392b;color:#fff;border-radius:14px;padding:12px 18px;font:800 1.05rem system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.4);display:flex;gap:12px;align-items:center;max-width:calc(100vw - 24px)}
#ttBanner button{background:#fff;color:#c0392b;border:0;border-radius:8px;padding:5px 10px;font-weight:800;cursor:pointer}`;
function beep() { try { const a = new (window.AudioContext || window.webkitAudioContext)(), g = a.createGain(); g.connect(a.destination); g.gain.value = .15; [0, .25, .5].forEach(t => { const o = a.createOscillator(); o.frequency.value = 880; o.connect(g); o.start(a.currentTime + t); o.stop(a.currentTime + t + .15); }); } catch {} }
export function mountTeacherTT() {
  if (document.getElementById("ttT")) return;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  const box = document.createElement("div"); box.id = "ttT"; document.body.appendChild(box);
  let open = false; try { open = localStorage.getItem("tt_open") === "1"; } catch {}
  const seen = (() => { try { return JSON.parse(localStorage.getItem("tt_warned") || "{}"); } catch { return {}; } })();
  const tick = () => {
    const n = nowBH(), today = dayList(n.d), cur = today.find(l => n.m >= l.sm && n.m < l.em), nxt = today.find(l => l.sm > n.m);
    const remain = cur ? left(n, cur.em) : 0;
    // 5 minutes before the end
    if (cur && remain <= 5 && remain > 0) {
      const k = n.key + cur.cls + cur.s;
      if (!seen[k]) {
        seen[k] = 1; try { localStorage.setItem("tt_warned", JSON.stringify(Object.fromEntries(Object.entries(seen).slice(-40)))); } catch {}
        const old = document.getElementById("ttBanner"); if (old) old.remove();
        const bn = document.createElement("div"); bn.id = "ttBanner"; bn.innerHTML = `<span>⏰ ${remain} minutes left of ${cur.cls} (ends ${fmt(cur.e)})</span><button type="button">OK</button>`; bn.querySelector("button").onclick = () => bn.remove(); document.body.appendChild(bn); setTimeout(() => bn.remove(), 120000);
        beep();
        try { if ("Notification" in window && Notification.permission === "granted") new Notification("5 minutes left", { body: `${cur.cls} ends at ${fmt(cur.e)}` }); } catch {}
        try { if (navigator.vibrate) navigator.vibrate([300, 150, 300]); } catch {}
      }
    }
    const warn = cur && remain <= 5;
    const label = cur ? `${cur.cls} · ${remain} min left` : nxt ? `Next: ${nxt.cls} ${fmt(nxt.s)}` : today.length ? "No more lessons today" : (n.d > 4 ? "Weekend" : "No lessons today");
    const rows = today.map(l => { const c = n.m >= l.em ? "done" : n.m >= l.sm ? "cur" : l === nxt ? "nxt" : ""; return `<div class="tt-row ${c}"><b>${l.cls}</b><span>${fmt(l.s)} – ${fmt(l.e)}</span><span>${c === "cur" ? remain + " min left" : c === "nxt" ? "in " + dur(l.sm - n.m) : c === "done" ? "done" : ""}</span></div>`; }).join("");
    const pan = open ? `<div class="tt-pan"><h4>${DAYS[n.d]}'s lessons</h4>${rows || `<div class="tt-none">${n.d > 4 ? "No school lessons today." : "No lessons today."}</div>`}${"Notification" in window && Notification.permission === "default" ? `<button type="button" id="ttNf" class="ghost small" style="margin-top:8px">Also notify me outside this tab</button>` : ""}</div>` : "";
    box.innerHTML = pan + `<button type="button" class="tt-pill ${warn ? "warn" : cur ? "on" : ""}" id="ttPill" aria-expanded="${open}">🕑 ${label}</button>`;
    document.getElementById("ttPill").onclick = () => { open = !open; try { localStorage.setItem("tt_open", open ? "1" : "0"); } catch {} tick(); };
    const nf = document.getElementById("ttNf"); if (nf) nf.onclick = () => { try { Notification.requestPermission().then(tick); } catch {} };
  };
  tick(); setInterval(tick, 15000);
}
