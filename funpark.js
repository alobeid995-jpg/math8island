// Student side: Fun Park. When the teacher opens it for the class, a button appears; it shows the games, each one opens inside the page.
// Open/closed state: work/funpark (kind "funpark", classes = the classes it is open for). Allowed teachers: shop/features.funpark ({all, uids}).
import { fs, doc, getDoc } from "./fb.js?v=1113e";
import { GAMES } from "./fpgames.js?v=1113e";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let P = null, base = [], me = null, open = false, ov = null, pill = null, cur = "";

{ const st = document.createElement("style"); st.textContent = `
#fpPill{position:fixed;left:14px;bottom:96px;z-index:2800;border:3px solid #151412;border-radius:999px;background:#7be0ad;color:#151412;font:inherit;font-weight:800;padding:10px 16px;box-shadow:0 4px 0 #151412;cursor:pointer}
#fpOv{position:fixed;inset:0;z-index:3100;background:linear-gradient(160deg,#10224f,#2a1362);color:#fff;display:flex;flex-direction:column;padding:12px 14px calc(12px + env(safe-area-inset-bottom,0px))}
#fpOv[hidden]{display:none}
#fpOv .fp-top{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}
#fpOv h2{margin:0;font-size:clamp(22px,5vw,34px)}
#fpOv .fp-x{background:rgba(255,255,255,.18);color:#fff;border:0;border-radius:10px;padding:9px 14px;font:inherit;font-weight:700;cursor:pointer}
#fpOv .fp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px;overflow:auto;padding:2px}
#fpOv .fp-card{border:0;border-radius:18px;padding:16px 14px;color:#fff;text-align:left;font:inherit;cursor:pointer;display:flex;flex-direction:column;gap:6px;min-height:150px;box-shadow:0 5px 0 rgba(0,0,0,.35)}
#fpOv .fp-card:active{transform:translateY(3px);box-shadow:0 2px 0 rgba(0,0,0,.35)}
#fpOv .fp-card b{font-size:20px}#fpOv .fp-card i{font-style:normal;font-size:42px}#fpOv .fp-card small{opacity:.9;font-weight:700}
#fpOv .fp-how{background:rgba(255,255,255,.14);border-radius:12px;padding:8px 12px;margin-bottom:8px;font-weight:600}
#fpOv iframe{flex:1;width:100%;border:0;border-radius:14px;background:#000;min-height:0}
@media (max-width:700px){#fpPill{bottom:84px}}
`; document.head.appendChild(st); }

async function allowed() {
  if (!P.tid) return true;   // the owner's own students
  try { const s = await getDoc(doc(fs, "shop", "features")); const f = s.exists() && s.data().funpark; return !!f && (f.all === true || (Array.isArray(f.uids) && f.uids.includes(P.tid))); } catch { return false; }
}
async function isOpen() {
  if (!me || !me.cls) return false;
  try { const s = await getDoc(doc(fs, ...base, "work", "funpark")); return s.exists() && (s.data().classes || []).includes(me.cls) && await allowed(); } catch { return false; }
}
function shut() { if (ov) { ov.hidden = true; ov.innerHTML = ""; } cur = ""; }
function menu() {
  cur = "";
  ov.innerHTML = `<div class="fp-top"><h2>🎮 Fun Park</h2><button class="fp-x" type="button" data-x="1">Close</button></div><div class="fp-grid">${GAMES.map(g => `<button class="fp-card" type="button" data-g="${g.dir}" style="background:${g.c}"><i>${g.icon}</i><b>${esc(g.title)}</b><small>${esc(g.kind)}</small></button>`).join("")}</div>`;
}
function play(dir) {
  const g = GAMES.find(x => x.dir === dir); if (!g) return; cur = dir;
  ov.innerHTML = `<div class="fp-top"><h2>${g.icon} ${esc(g.title)}</h2><button class="fp-x" type="button" data-back="1">All games</button></div><div class="fp-how">${esc(g.how)}</div><iframe src="funpark/${g.dir}/index.html" allow="autoplay; fullscreen; gamepad" title="${esc(g.title)}"></iframe>`;
}
function ensureUi() {
  if (ov) return;
  pill = document.createElement("button"); pill.id = "fpPill"; pill.type = "button"; pill.textContent = "🎮 Fun Park"; pill.hidden = true;
  ov = document.createElement("div"); ov.id = "fpOv"; ov.hidden = true;
  document.body.append(pill, ov);
  pill.onclick = () => { menu(); ov.hidden = false; };
  ov.onclick = e => { const t = e.target.closest("button"); if (!t) return; if (t.dataset.x) shut(); else if (t.dataset.back) menu(); else if (t.dataset.g) play(t.dataset.g); };
}
async function check() {
  me = me && me.cls ? me : me;
  const o = await isOpen();
  if (o === open) return; open = o; ensureUi(); pill.hidden = !o;
  if (!o) shut();   // the teacher closed it while the student was playing
}
export async function initFunpark(profile, getMe) {
  P = profile; base = profile.tid ? ["teachers", profile.tid] : [];
  for (let i = 0; i < 50 && !(me = getMe()); i++) await new Promise(r => setTimeout(r, 200));
  if (!me) return;
  await check();
  setInterval(() => { me = getMe() || me; check(); }, 40000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { me = getMe() || me; check(); } });
}
