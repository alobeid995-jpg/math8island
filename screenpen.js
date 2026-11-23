// Watch & help: the teacher sees a student's worksheet as he fills it in, and draws on it; the student sees the drawing.
// Student -> liveplayers/scr_<sid> { sess:"scr", sid, name, joined, ans:{ wid, a:[answers], f:question in focus } }
// Teacher -> live/scr_<sid>        { kind:"screen", cls:[class], sid, wid, on, strokes:[{ q, c, p:[[x,y],...] }], at }
// Points are fractions (0..1) of each question box, so the drawing lands on the same question on any screen size.
export const SCR = "scr";
export const COLORS = ["#e0443e", "#2f6fe0", "#1f9d55", "#111827"];

if (!document.getElementById("scrCss")) {
  const st = document.createElement("style"); st.id = "scrCss";
  st.textContent = `.scr-host{position:relative}
.scr-cv{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3}
.scr-cv.pen{pointer-events:auto;touch-action:none;cursor:crosshair}
.scr-banner{position:sticky;top:8px;z-index:20;display:flex;align-items:center;gap:8px;margin:0 0 10px;padding:10px 14px;border-radius:12px;background:#fff4d6;border:2px solid #e5a50a;color:#5a3d00;font-weight:700}
.scr-banner i{width:10px;height:10px;border-radius:50%;background:#e0443e;animation:scrBlink 1.2s infinite}
@keyframes scrBlink{50%{opacity:.25}}
@media (prefers-reduced-motion: reduce){.scr-banner i{animation:none}}`;
  document.head.appendChild(st);
}

// Put a drawing layer over one question box. Returns { cv, paint(strokes) }.
export function layer(host, q, opts = {}) {
  host.classList.add("scr-host");
  let cv = host.querySelector(":scope > .scr-cv");
  if (!cv) { cv = document.createElement("canvas"); cv.className = "scr-cv"; host.appendChild(cv); }
  const fit = () => { const r = host.getBoundingClientRect(), d = window.devicePixelRatio || 1; const w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d)); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } };
  let last = [];
  const paint = (strokes, extra) => {
    last = strokes || []; fit(); const all = extra ? last.concat([extra]) : last;
    const x = cv.getContext("2d"), W = cv.width, H = cv.height, d = window.devicePixelRatio || 1;
    x.clearRect(0, 0, W, H); x.lineCap = "round"; x.lineJoin = "round";
    all.filter(s => s.q === q && s.p && s.p.length).forEach(s => {
      x.strokeStyle = s.c || COLORS[0]; x.lineWidth = 3.5 * d; x.beginPath();
      s.p.forEach(([px, py], i) => { const X = px * W, Y = py * H; i ? x.lineTo(X, Y) : x.moveTo(X, Y); });
      if (s.p.length === 1) x.lineTo(s.p[0][0] * W + 0.5, s.p[0][1] * H + 0.5);
      x.stroke();
    });
  };
  if (opts.draw) {
    let cur = null;
    const pt = e => { const r = cv.getBoundingClientRect(); return [Math.round(((e.clientX - r.left) / r.width) * 1000) / 1000, Math.round(((e.clientY - r.top) / r.height) * 1000) / 1000]; };
    cv.addEventListener("pointerdown", e => { if (!cv.classList.contains("pen")) return; e.preventDefault(); cv.setPointerCapture(e.pointerId); cur = { q, c: opts.color(), p: [pt(e)] }; last = last.concat([cur]); paint(last); });
    cv.addEventListener("pointermove", e => { if (!cur) return; const p = pt(e), l = cur.p[cur.p.length - 1]; if (Math.abs(p[0] - l[0]) + Math.abs(p[1] - l[1]) < 0.004) return; if (cur.p.length < 400) cur.p.push(p); paint(last); if (opts.onMove) opts.onMove(cur); });
    const end = () => { if (!cur) return; const s = cur; cur = null; opts.onStroke(s); };
    cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
  }
  const ro = window.ResizeObserver ? new ResizeObserver(() => paint(last)) : null; if (ro) ro.observe(host);
  return { cv, paint };
}

// Fast lane (Supabase Realtime broadcast over one websocket). The database polling above keeps working underneath,
// so if the socket cannot connect nothing breaks: it is only slower. Topic names carry a random token from the teacher.
const RT_URL = "wss://xsbcdapkzynfoouobhav.supabase.co/realtime/v1/websocket?apikey=sb_publishable_V7TGwwZ1J6CNMypJn8wyig_uHQJRGui&vsn=1.0.0";
let ws = null, wsOpen = null, ref = 0, hb = 0;
const subs = new Map();   // topic -> Set(handler)
function sock() {
  if (ws && (ws.readyState === 0 || ws.readyState === 1)) return wsOpen;
  ws = new WebSocket(RT_URL);
  wsOpen = new Promise((res, rej) => { ws.onopen = () => res(); ws.onerror = () => rej(new Error("realtime")); });
  ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch { return; } if (m.event !== "broadcast") return; const hs = subs.get(m.topic); if (hs) hs.forEach(h => { try { h(m.payload.event, m.payload.payload); } catch {} }); };
  ws.onclose = () => { clearInterval(hb); const again = [...subs.keys()]; ws = null; if (again.length) setTimeout(() => again.forEach(t => join(t)), 1500); };
  clearInterval(hb); hb = setInterval(() => { try { ws && ws.readyState === 1 && ws.send(JSON.stringify({ topic: "phoenix", event: "heartbeat", payload: {}, ref: String(++ref) })); } catch {} }, 25000);
  wsOpen.catch(() => {});
  return wsOpen;
}
async function join(topic) { await sock(); ws.send(JSON.stringify({ topic, event: "phx_join", payload: { config: { broadcast: { self: false, ack: false }, presence: { key: "" }, postgres_changes: [], private: false } }, ref: String(++ref) })); }
// rt("abc") -> { send(event, payload), close() }; onMsg(event, payload) gets the other side's messages.
export function rt(token, onMsg) {
  const topic = "realtime:scr-" + token; let hs = subs.get(topic); const fresh = !hs;
  if (!hs) { hs = new Set(); subs.set(topic, hs); }
  hs.add(onMsg); if (fresh) join(topic).catch(() => {});
  return {
    send(event, payload) { try { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ topic, event: "broadcast", payload: { type: "broadcast", event, payload }, ref: String(++ref) })); } catch {} },
    close() { hs.delete(onMsg); if (!hs.size) { subs.delete(topic); try { ws && ws.readyState === 1 && ws.send(JSON.stringify({ topic, event: "phx_leave", payload: {}, ref: String(++ref) })); } catch {} } }
  };
}
export const token = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, "0")).join("");
