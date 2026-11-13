// Student page: "My achievements" (badges, progress, certificates). Pieces copied from the teacher page so a student sees exactly what his teacher gives him.
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const POSITIVE = [
  { title: "Active Participation", xp: 10 },
  { title: "Quiet & Focused During Class", xp: 5 },
  { title: "Brought All Math Equipment", xp: 5 },
  { title: "Task Completed On Time", xp: 10 },
  { title: "Helping Peer / Teamwork", xp: 10 },
  { title: "Great Mathematical Reasoning", xp: 15 }
];
const TIERS = [
  { key: "gold", name: "Gold", at: 10 },
  { key: "platinum", name: "Platinum", at: 20 },
  { key: "diamond", name: "Diamond", at: 30 },
  { key: "legendary", name: "Legendary", at: 100 }
];
const tierFor = n => TIERS.reduce((t, x) => (n >= x.at ? x : t), null);
const nextTier = n => TIERS.find(x => n < x.at) || null;
const isPositiveTitle = t => POSITIVE.some(p => p.title === t);
function countsFromLog(log) {
  const c = {};
  log.forEach(e => { if (e && e.xp > 0 && isPositiveTitle(e.title)) c[e.title] = (c[e.title] || 0) + 1; });
  return c;
}
function readCounts(v, log) {
  if (v.counts && typeof v.counts === "object") {
    const c = {};
    Object.keys(v.counts).forEach(k => { const n = Number(v.counts[k]); if (n > 0) c[k] = n; });
    return c;
  }
  return countsFromLog(log);
}
// one glyph per positive behaviour (drawn in a 24 x 24 box)
const BADGE_GLYPHS = [
  `<path d="M4 5h16v10h-9l-4.5 4v-4H4Z"/><path d="M8.5 10h.01M12 10h.01M15.5 10h.01" stroke-width="2.8"/>`,
  `<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>`,
  `<rect x="3" y="8.5" width="18" height="7" rx="1.2"/><path d="M7 8.5v3M11 8.5v4M15 8.5v3M19 8.5v2"/>`,
  `<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.2 2"/>`,
  `<circle cx="8" cy="8.5" r="2.8"/><circle cx="16" cy="8.5" r="2.8"/><path d="M2.8 19c.6-3.3 2.6-5 5.2-5s4.6 1.7 5.2 5M10.8 19c.6-3.3 2.6-5 5.2-5s4.6 1.7 5.2 5"/>`,
  `<path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2.1v.6h5.2v-.6c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z"/><path d="M9.6 19h4.8M10.4 21.5h3.2"/>`
];
const BADGE_FRAMES = {
  gold: { glyph: "#6b4200", svg: `<circle cx="20" cy="20" r="18.5" fill="#b8860b"/><circle cx="20" cy="20" r="15.5" fill="#f7c948"/><circle cx="20" cy="20" r="15.5" fill="none" stroke="#fff3c4" stroke-width="1.2" stroke-dasharray="2 2.6"/>` },
  platinum: { glyph: "#2e3a4d", svg: `<polygon points="20,1.5 36.5,11 36.5,29 20,38.5 3.5,29 3.5,11" fill="#7c8ea6"/><polygon points="20,5 33.5,12.8 33.5,27.2 20,35 6.5,27.2 6.5,12.8" fill="#e6ecf4"/><polygon points="20,5 33.5,12.8 20,20" fill="#ffffff" opacity=".55"/>` },
  diamond: { glyph: "#0a3a8c", svg: `<polygon points="20,0.8 39.2,20 20,39.2 0.8,20" fill="#1565c0"/><polygon points="20,4.5 35.5,20 20,35.5 4.5,20" fill="#7fe3ff"/><polygon points="20,4.5 35.5,20 20,20" fill="#c8f6ff" opacity=".8"/><polygon points="4.5,20 20,35.5 20,20" fill="#4fc3f7" opacity=".6"/>` },
  legendary: { glyph: "#ffffff", svg: `<polygon points="20,0.5 24.6,8.9 34.1,5.9 31.1,15.4 39.5,20 31.1,24.6 34.1,34.1 24.6,31.1 20,39.5 15.4,31.1 5.9,34.1 8.9,24.6 0.5,20 8.9,15.4 5.9,5.9 15.4,8.9" fill="#f59e0b"/><circle cx="20" cy="20" r="13" fill="#7c3aed"/><circle cx="20" cy="20" r="13" fill="none" stroke="#f0abfc" stroke-width="1.4"/><path d="M11 14a10 10 0 0 1 10-6" stroke="#f0abfc" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".8"/>` },
  locked: { glyph: "var(--muted)", svg: `<circle cx="20" cy="20" r="18.5" fill="var(--line)"/><circle cx="20" cy="20" r="15.5" fill="var(--paper)"/>` }
};
function badgeSVG(tierKey, behIndex) {
  const f = BADGE_FRAMES[tierKey] || BADGE_FRAMES.locked;
  return `<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">${f.svg}<g transform="translate(8 8)" fill="none" stroke="${f.glyph}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color:${f.glyph}">${BADGE_GLYPHS[behIndex] || ""}</g></svg>`;
}
function badgeHTML(tier, behIndex, size, count) {
  const b = POSITIVE[behIndex];
  const label = tier ? `${tier.name} badge: ${b.title}${count ? ` (${count} times)` : ""}` : `${b.title}: not unlocked yet`;
  return `<span class="bdg ${size || ""} t-${tier ? tier.key : "locked"}" role="img" aria-label="${esc(label)}" title="${esc(label)}">${badgeSVG(tier ? tier.key : "locked", behIndex)}</span>`;
}
const CERT_BEH = {
  "Active Participation": ["Active Participation Award", "for outstanding active participation in Mathematics lessons"],
  "Quiet & Focused During Class": ["Focus Award", "for staying quiet, calm and focused during Mathematics lessons"],
  "Brought All Math Equipment": ["Always Prepared Award", "for always coming to class prepared with all Mathematics equipment"],
  "Task Completed On Time": ["Responsibility Award", "for completing tasks on time and with great care"],
  "Helping Peer / Teamwork": ["Teamwork Award", "for helping classmates and showing excellent teamwork"],
  "Great Mathematical Reasoning": ["Mathematical Thinker Award", "for great mathematical reasoning and clear thinking"]
};
const CERT_TYPES = [
  ["day", "Student of the Day", "Student of the Day", "in recognition of excellent effort, attitude and work in Mathematics today"],
  ["week", "Student of the Week", "Student of the Week", "for outstanding effort, behaviour and achievement in Mathematics this week"],
  ["month", "Student of the Month", "Student of the Month", "for outstanding achievement and commitment in Mathematics this month"],
  ...POSITIVE.map(p => ["b:" + p.title, p.title, CERT_BEH[p.title][0], CERT_BEH[p.title][1]]),
  ["custom", "Something else (write your own)", "Certificate of Achievement", ""]
];
function certWrap(t, n) {
  const L = []; let cur = "";
  String(t).split(/\s+/).filter(Boolean).forEach(w => { if ((cur + " " + w).trim().length > n) { L.push(cur); cur = w; } else cur = (cur + " " + w).trim(); });
  if (cur) L.push(cur); return L.slice(0, 3);
}
function certSVG(c) {
  const st = c.st; if (!st) return "";
  const G = "#b8860b", G2 = "#e0b43c", INK = "#17233b", SER = "Georgia, 'Times New Roman', serif";
  const e0 = eqOf(st), seed = avatarSeed(st), wid = e0.top && shopItem(e0.top) ? e0.top : "", skid = e0.skin && shopItem(e0.skin) ? e0.skin : "";   // the same picture the student sees: equipped skin and top included
  const av = (skid ? enemyFig(skid, wid) : isGirlCls(st.cls) ? girlBase(seed, wid) : avatarSVG(seed, wid)).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  const fit = (t, base, maxW, min, k) => { const w = t.length * base * k; return w <= maxW ? { fs: base, tl: 0 } : (t.length * min * k <= maxW ? { fs: Math.floor(maxW / (t.length * k)), tl: 0 } : { fs: min, tl: maxW }); };
  const tla = f => f.tl ? ` textLength="${f.tl}" lengthAdjust="spacingAndGlyphs"` : "";
  const name = st.name, nF = fit(name, 62, 760, 26, .6), nfs = nF.fs;
  const tF = fit(c.title, 32, 760, 18, .6), tfs = tF.fs;
  const rh = Math.min(450, Math.max(270, Math.round((nF.tl || name.length * nfs * .6) / 2) + 24));
  const tchF = fit(c.teacher || "", 22, 200, 12, .55);
  const lines = certWrap(c.reason || "", 64);
  const dateTxt = c.date ? new Date(c.date + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "";
  const sym = (t, x, y, sz) => `<text x="${x}" y="${y}" font-family="${SER}" font-size="${sz}" fill="${G}" opacity=".13" text-anchor="middle">${t}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700" font-family="${SER}">
  <defs><pattern id="cg" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#cfd9ea" stroke-width=".6"/></pattern>
  <linearGradient id="cgold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0a8"/><stop offset=".5" stop-color="#d9a21b"/><stop offset="1" stop-color="#8a6508"/></linearGradient>
  <clipPath id="cav"><circle cx="500" cy="545" r="50"/></clipPath></defs>
  <rect width="1000" height="700" fill="#fffdf4"/><rect x="38" y="38" width="924" height="624" fill="url(#cg)" opacity=".7"/>
  <rect x="20" y="20" width="960" height="660" fill="none" stroke="url(#cgold)" stroke-width="8"/><rect x="36" y="36" width="928" height="628" fill="none" stroke="${G2}" stroke-width="1.6"/>
  ${[[36, 36], [964, 36], [36, 664], [964, 664]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="13" fill="#fffdf4" stroke="${G}" stroke-width="3"/><circle cx="${x}" cy="${y}" r="4.5" fill="${G}"/>`).join("")}
  <circle cx="500" cy="664" r="13" fill="#fffdf4" stroke="${G}" stroke-width="3"/>
  <g transform="translate(500 664) scale(.14) translate(-121 -120)"><path d="M92.4 164.3V103.2Q92.4 99.4 91.7 97.4Q91 95.5 89 94.8Q87 94.1 83 94.1Q82.6 94.1 82.6 93.3Q82.6 92.5 83 92.5Q86.4 92.5 90.7 92.7Q94.9 92.9 99.6 92.9Q104.6 92.9 108.9 92.7Q113.1 92.5 116.4 92.5Q116.8 92.5 116.8 93.3Q116.8 94.1 116.4 94.1Q112.4 94.1 110.5 94.9Q108.5 95.7 107.7 97.6Q107 99.6 107 103.5V131.4L131.8 106.1Q136.7 101.2 135.5 97.6Q134.2 94.1 127.6 94.1Q127.2 94.1 127.2 93.3Q127.2 92.5 127.6 92.5Q131.2 92.5 134.9 92.7Q138.6 92.9 144.6 92.9Q151 92.9 154.7 92.7Q158.4 92.5 161.8 92.5Q162.2 92.5 162.2 93.3Q162.2 94.1 161.8 94.1Q155.7 94.1 148.5 97.6Q141.2 101.1 135.3 106.9L120.3 122.1L139.9 148.5Q145 155.7 148.6 160.4Q152.2 165.1 154.6 167.8Q157 170.5 158.9 171.7Q160.7 172.9 162.5 173.2Q164.3 173.4 166.4 173.4Q166.8 173.4 166.8 174.2Q166.8 175 166.4 175H151.6Q149.7 175 148.2 175.1Q146.8 175.3 145.7 175.3Q144 175.3 142.7 174.6Q141.3 173.9 139.6 172Q137.8 170 134.9 166.2Q132 162.3 127.2 155.9L109.9 132.6L107 135.5V164.3Q107 168.1 107.7 170.1Q108.3 172.1 110.3 172.8Q112.3 173.4 116.4 173.4Q116.9 173.4 116.9 174.2Q116.9 175 116.4 175Q113 175 108.8 174.9Q104.6 174.7 99.6 174.7Q94.9 174.7 90.5 174.9Q86.2 175 82.7 175Q82.5 175 82.5 174.2Q82.5 173.4 82.7 173.4Q86.8 173.4 88.9 172.8Q90.9 172.1 91.6 170.1Q92.4 168.1 92.4 164.3Z" fill="${INK}"/><path d="M121 64L129 74L121 84L113 74Z" fill="${G}"/></g>
  ${sym("π", 110, 150, 90)}${sym("∑", 890, 160, 90)}${sym("√", 100, 540, 90)}${sym("∞", 900, 540, 90)}${sym("x²", 170, 400, 60)}${sym("÷", 840, 400, 70)}
  <text x="500" y="92" text-anchor="middle" font-size="17" letter-spacing="4" fill="${INK}" opacity=".75">HAWAR INTERNATIONAL SCHOOL · MATHEMATICS</text>
  <text x="500" y="160" text-anchor="middle" font-size="58" font-weight="700" letter-spacing="10" fill="${INK}">CERTIFICATE</text>
  <path d="M330 178 H670" stroke="${G}" stroke-width="2"/><path d="M490 178 l10 -8 l10 8 l-10 8z" fill="${G}"/>
  <text x="500" y="222" text-anchor="middle" font-size="${tfs}"${tla(tF)} font-style="italic" font-weight="700" fill="${G}">${esc(c.title)}</text>
  <text x="500" y="266" text-anchor="middle" font-size="18" fill="${INK}" opacity=".75">is proudly presented to</text>
  <text x="500" y="338" text-anchor="middle" font-size="${nfs}"${tla(nF)} font-style="italic" font-weight="700" fill="${INK}">${esc(name)}</text>
  <path d="M${500 - rh} 354 H${500 + rh}" stroke="${G}" stroke-width="1.6"/>
  <text x="500" y="382" text-anchor="middle" font-size="16" fill="${INK}" opacity=".65">Class ${esc(st.cls)} · Mathematics</text>
  ${lines.map((l, i) => `<text x="500" y="${420 + i * 28}" text-anchor="middle" font-size="21" fill="${INK}">${esc(l)}</text>`).join("")}
  <circle cx="500" cy="545" r="60" fill="url(#cgold)"/><circle cx="500" cy="545" r="54" fill="#fffdf4"/><g clip-path="url(#cav)"><g transform="translate(450 495) scale(1)">${av}</g></g>
  <path d="M536 585 l20 40 l-12 -3 l-8 12 l-8 -34z M464 585 l-20 40 l12 -3 l8 12 l8 -34z" fill="${G}" opacity=".85"/>
  <path d="M120 600 H340" stroke="${INK}" stroke-width="1.4"/><text x="230" y="590" text-anchor="middle" font-size="19" fill="${INK}">${esc(dateTxt)}</text><text x="230" y="624" text-anchor="middle" font-size="15" fill="${INK}" opacity=".7">Date</text>
  <path d="M660 600 H880" stroke="${INK}" stroke-width="1.4"/><text x="770" y="590" text-anchor="middle" font-size="${tchF.fs}"${tla(tchF)} font-style="italic" fill="${INK}">${esc(c.teacher || "")}</text><text x="770" y="624" text-anchor="middle" font-size="15" fill="${INK}" opacity=".7">Mathematics Teacher</text>
</svg>`;
}

const LESSONS = { eq41: "Exercise 4.1: Solving equations", ag34: "Lesson 3.4: Upper and lower bounds", su42: "Simultaneous equations: substitution", el42: "Simultaneous equations: elimination", sb42: "Substitution method: extra practice" };
let tab = "badges", hook = () => {}, getMe = () => null, certs = [];
export function initAch(h, g) { hook = h; getMe = g; }
const dayOf = c => { if (c.date) return c.date; const d = new Date((+c.at || 0) + 3 * 3600e3); return isNaN(d) ? "" : d.toISOString().slice(0, 10); };
const showDate = d => d ? new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "";
function certData(st, c) {
  const t = CERT_TYPES.find(x => x[2] === c.title || x[1] === c.title);
  return { st, title: c.title, reason: c.reason || (t ? t[3] : ""), date: dayOf(c), teacher: c.teacher || "" };
}
export function achCard(st) {
  const counts = st.counts || {}, rows = POSITIVE.map((b, i) => ({ b, i, n: counts[b.title] || 0 }));
  const unlocked = rows.filter(r => tierFor(r.n)).length, lx = st.lx || {}, lk = Object.keys(lx).filter(k => LESSONS[k] && (lx[k].done || lx[k].perfect));
  const perfect = lk.filter(k => lx[k].perfect).length, cs = (st.certs || []).slice().reverse();
  const tabs = [["badges", "Badges", unlocked], ["progress", "Progress", ""], ["certs", "Certificates", cs.length]];
  let body = "";
  if (tab === "badges") {
    body = `<div class="ach-grid">${rows.map(r => { const tr = tierFor(r.n), nx = nextTier(r.n); const pct = nx ? Math.min(100, Math.round(100 * r.n / nx.at)) : 100;
      return `<div class="ach-b${tr ? "" : " lock"}">${badgeHTML(tr, r.i, "md", r.n)}<div><b>${esc(r.b.title)}</b><small>${tr ? esc(tr.name) + " · " : "Locked · "}${r.n} time${r.n === 1 ? "" : "s"}${nx ? ` · ${nx.at - r.n} more for ${esc(nx.name)}` : " · top badge!"}</small><i class="ach-bar"><u style="width:${pct}%"></u></i></div></div>`; }).join("")}</div>`;
  } else if (tab === "progress") {
    const lv = Math.max(1, Math.floor((st.xp || 0) / 50) + 1);
    body = `<div class="ach-stats"><div><b>${lv}</b><small>Level</small></div><div><b>${st.xp || 0}</b><small>XP earned</small></div><div><b>${unlocked}/${POSITIVE.length}</b><small>Badges</small></div><div><b>${lk.length}</b><small>Lessons done</small></div><div><b>${perfect}</b><small>All correct</small></div><div><b>${cs.length}</b><small>Certificates</small></div></div>
      ${lk.length ? `<div class="ach-list">${lk.map(k => `<div class="ach-r"><span>${esc(LESSONS[k])}</span><span class="ach-t${lx[k].perfect ? " gold" : ""}">${lx[k].perfect ? "⭐ All correct · +200 XP" : "✓ Finished · +100 XP"}</span></div>`).join("")}</div>` : `<p class="none">Finish a lesson in My classwork and it shows up here.</p>`}`;
  } else {
    body = cs.length ? `<div class="ach-list">${cs.map((c, i) => `<div class="ach-r"><span><b>${esc(c.title)}</b><small>${esc(showDate(dayOf(c)))}${c.teacher ? " · " + esc(c.teacher) : ""}</small></span><button class="primary small" type="button" data-ach="cert" data-i="${cs.length - 1 - i}">Open</button></div>`).join("")}</div>` : `<p class="none">No certificates yet. Keep working hard!</p>`;
  }
  return `<section class="card ach-card"><h3>My achievements</h3><div class="shop-tabs">${tabs.map(([k, l, n]) => `<button class="shop-tab" type="button" data-ach="tab" data-tab="${k}" aria-pressed="${k === tab}">${l}${n !== "" && n !== 0 ? ` <small>${n}</small>` : ""}</button>`).join("")}</div>${body}</section>`;
}
function closeCert() { const o = document.getElementById("achCv"); if (o) o.remove(); document.body.classList.remove("pc", "wk-noscroll"); }
function showCert(c) {
  closeCert(); const st = getMe(); if (!st) return;
  const svg = certSVG(certData(st, c)), o = document.createElement("div"); o.className = "ach-cv"; o.id = "achCv";
  o.innerHTML = `<div class="ach-sheet" role="dialog" aria-modal="true" aria-label="Certificate"><div class="ach-svg">${svg}</div><div class="ach-acts"><button class="primary" type="button" data-ach="print">Print / Save as PDF</button><button class="ghost" type="button" data-ach="png">Download picture</button><button class="ghost" type="button" data-ach="close">Close</button></div></div>`;
  document.body.appendChild(o); document.body.classList.add("wk-noscroll");
}
function downloadPng() {
  const el = document.querySelector("#achCv .ach-svg svg"); if (!el) return;
  const xml = new XMLSerializer().serializeToString(el), img = new Image();
  img.onload = () => { const cv = document.createElement("canvas"); cv.width = 2000; cv.height = 1400; const x = cv.getContext("2d"); x.fillStyle = "#fffdf4"; x.fillRect(0, 0, 2000, 1400); x.drawImage(img, 0, 0, 2000, 1400);
    cv.toBlob(b => { if (!b) return; const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "Certificate.png"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }, "image/png"); };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-ach]"); if (!b) return; const a = b.dataset.ach;
  if (a === "tab") { tab = b.dataset.tab; hook(); }
  else if (a === "cert") { const st = getMe(); const c = st && (st.certs || [])[+b.dataset.i]; if (c) showCert(c); }
  else if (a === "close") closeCert();
  else if (a === "print") { document.body.classList.add("pc"); const done = () => { document.body.classList.remove("pc"); window.removeEventListener("afterprint", done); }; window.addEventListener("afterprint", done); try { window.print(); } catch { done(); } }
  else if (a === "png") downloadPng();
});
