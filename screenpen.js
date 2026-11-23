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
  const paint = strokes => {
    last = strokes || []; fit();
    const x = cv.getContext("2d"), W = cv.width, H = cv.height, d = window.devicePixelRatio || 1;
    x.clearRect(0, 0, W, H); x.lineCap = "round"; x.lineJoin = "round";
    last.filter(s => s.q === q && s.p && s.p.length).forEach(s => {
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
    cv.addEventListener("pointermove", e => { if (!cur) return; const p = pt(e), l = cur.p[cur.p.length - 1]; if (Math.abs(p[0] - l[0]) + Math.abs(p[1] - l[1]) < 0.004) return; if (cur.p.length < 400) cur.p.push(p); paint(last); });
    const end = () => { if (!cur) return; const s = cur; cur = null; opts.onStroke(s); };
    cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
  }
  const ro = window.ResizeObserver ? new ResizeObserver(() => paint(last)) : null; if (ro) ro.observe(host);
  return { cv, paint };
}
