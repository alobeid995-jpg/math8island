/* Student page, new design: a header with sections (Home, My work, Shop, Badges), a wider two-column Home on big screens,
   and a tab bar at the bottom on phones. Everything inside the cards is the same as before (themes, shop, badges, classwork).
   Classic script: it only arranges and restyles what student.js and the other modules draw. */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const root = document.documentElement;
  root.classList.add("sn");
  const TABS = [["home", "Home", '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/>'], ["work", "My work", '<path d="M7 3h7l4 4v14H7z"/><path d="M10 12h5M10 16h5"/>'],
    ["shop", "Shop", '<path d="M4 7h16l-1.5 12h-13z"/><path d="M9 7a3 3 0 0 1 6 0"/>'], ["badges", "Badges", '<circle cx="12" cy="9" r="5"/><path d="m9 13-2 8 5-3 5 3-2-8"/>']];
  let tab = "home"; try { const t = sessionStorage.getItem("sn_tab"); if (TABS.some(x => x[0] === t)) tab = t; } catch (e) {}
  const icon = p => '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + "</svg>";

  const css = document.createElement("style"); css.id = "snCss";
  css.textContent = `
html.sn body{padding-bottom:0}
html.sn .wrap>.topbar{display:none!important}
#snTop{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:14px;padding:10px 22px;background:rgba(255,255,255,.92);backdrop-filter:blur(10px);border-bottom:1px solid var(--line,#d6e2f6)}
@media (prefers-color-scheme:dark){html:not([data-theme="light"]) #snTop{background:rgba(15,32,64,.92)}}
#snTop .sn-brand{display:flex;align-items:center;gap:10px;font-family:"Fredoka",var(--f-display,system-ui);font-weight:600;font-size:19px;color:var(--ink,#0f2a57);white-space:nowrap}
#snTop .sn-brand img{width:34px;height:34px;border-radius:22%}
#snTabs{display:flex;gap:4px;margin:0 auto;background:var(--accent-soft,#eaf2ff);border-radius:14px;padding:4px}
#snTabs button{all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;gap:7px;padding:9px 16px;border-radius:10px;font-weight:600;font-size:14.5px;color:var(--muted,#5a6b8a)}
#snTabs button:hover{color:var(--ink,#0f2a57)}#snTabs button:focus-visible{outline:3px solid #f6b91c;outline-offset:1px}
#snTabs button[aria-current="page"]{background:#1f5bbd;color:#fff}
#snTabs button b{min-width:18px;height:18px;border-radius:99px;background:#c43e24;color:#fff;font-size:11px;display:grid;place-items:center;padding:0 5px;margin-left:2px}
#snTop .sn-coin{display:flex;align-items:center;gap:6px;background:#fff1c9;color:#6b4a00;border-radius:99px;padding:6px 12px;font-weight:800;font-size:14px;white-space:nowrap}
#snTop .sn-coin[hidden]{display:none}
#snTop #outBtn{margin:0}
html.sn .wrap{max-width:1180px!important;display:grid!important;grid-template-columns:minmax(0,1.45fr) minmax(0,1fr);gap:18px!important;align-items:start;padding-top:20px!important}
html.sn .wrap>*{grid-column:1/-1;margin:0!important}
html.sn #stuTop{display:contents!important}
html.sn #app{display:contents!important}
/* Home: hero, notices and news across the top; then classwork | timetable, latest XP | messages */
html.sn #app>*{grid-column:1/-1}
html.sn #app>section.card:first-of-type{order:1!important}
html.sn #app>.bknote{order:2!important}
html.sn #stuTop #stuNews{order:3!important;grid-column:1/-1}
html.sn .wrap>#work{order:4!important;grid-column:1}
html.sn #stuTop #stuTT{order:5!important;grid-column:2}
html.sn #app>.sn-log{order:6!important;grid-column:2}
html.sn .wrap>#stuMsg{order:6!important;grid-column:1}
html.sn #app>.sn-ach{order:8!important}html.sn #app>.sn-shop{order:9!important}html.sn .wrap>.sig-foot{order:20!important}
html.sn #work:empty{display:none}
/* the other sections show one thing each */
html[data-sn="home"] .sn-ach,html[data-sn="home"] .sn-shop{display:none!important}
html[data-sn="work"] #app>section,html[data-sn="work"] #stuTT,html[data-sn="work"] #stuNews,html[data-sn="work"] #stuMsg{display:none!important}
html[data-sn="work"] .wrap>#work{grid-column:1/-1}
html[data-sn="shop"] #app>section:not(.sn-shop):not(:first-of-type),html[data-sn="shop"] #app>.bknote,html[data-sn="shop"] #stuTT,html[data-sn="shop"] #stuNews,html[data-sn="shop"] #stuMsg,html[data-sn="shop"] #work{display:none!important}
html[data-sn="badges"] #app>section:not(.sn-ach),html[data-sn="badges"] #app>.bknote,html[data-sn="badges"] #stuTT,html[data-sn="badges"] #stuNews,html[data-sn="badges"] #stuMsg,html[data-sn="badges"] #work{display:none!important}
html[data-sn="shop"] #app>.sn-shop,html[data-sn="badges"] #app>.sn-ach{order:2!important}
.sn-empty{order:4;grid-column:1/-1;text-align:center;padding:30px 16px;border-radius:24px;background:var(--card,#fff);border:1px dashed var(--line,#d6e2f6);color:var(--muted,#5a6b8a);font-weight:600}
html:not([data-sn="work"]) .sn-empty{display:none}
#work:not(:empty)~.sn-empty{display:none}
/* phones and small tablets: one column, the sections in a bar at the bottom */
@media (max-width:820px){
  html.sn .wrap{grid-template-columns:minmax(0,1fr);padding-bottom:96px!important}
  html.sn .wrap>*,html.sn .wrap>#work,html.sn #stuTop #stuTT,html.sn #app>.sn-log,html.sn .wrap>#stuMsg{grid-column:1/-1}
  html.sn #stuTop #stuTT{order:3!important}
  #snTop{padding:10px 14px;backdrop-filter:none;background:var(--card,#fff)}#snTop .sn-brand span{display:none}
  #snTabs{position:fixed;left:10px;right:10px;bottom:calc(10px + env(safe-area-inset-bottom,0px));margin:0;justify-content:space-between;background:var(--card,#fff);border:1px solid var(--line,#d6e2f6);border-radius:20px;padding:6px;box-shadow:0 10px 30px -10px rgba(12,42,94,.45);z-index:30}
  #snTabs button{flex:1;flex-direction:column;gap:2px;padding:7px 4px;font-size:11.5px;justify-content:center;position:relative}
  #snTabs button b{position:absolute;top:2px;right:calc(50% - 22px);margin:0}
  #snTop .sn-coin{margin-left:auto}
  html.sn #chDock{bottom:calc(84px + env(safe-area-inset-bottom,0px))!important}
}
@media (prefers-reduced-motion:no-preference){html.sn .wrap>*{animation:snIn .25s ease-out both}}
@keyframes snIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`;
  document.head.appendChild(css);

  function build() {
    const wrap = document.querySelector(".wrap"); if (!wrap || $("snTop")) return;
    const top = document.createElement("header"); top.id = "snTop";
    top.innerHTML = `<div class="sn-brand"><img src="logo.svg" alt=""><span>Student Island</span></div>
      <nav id="snTabs" aria-label="Sections">${TABS.map(([k, l, p]) => `<button type="button" data-sn="${k}">${icon(p)}<span>${l}</span></button>`).join("")}</nav>
      <span class="sn-coin" id="snCoin" hidden title="XP you can spend in the shop"></span>`;
    wrap.parentNode.insertBefore(top, wrap);
    const out = $("outBtn"); if (out) top.appendChild(out);
    const empty = document.createElement("div"); empty.className = "sn-empty"; empty.textContent = "Nothing to do right now. Well done!"; wrap.appendChild(empty);
    top.addEventListener("click", e => { const b = e.target.closest("[data-sn]"); if (b) setTab(b.dataset.sn, true); });
    setTab(tab, false);
    const app = $("app"); if (app) new MutationObserver(mark).observe(app, { childList: true });
    const work = $("work"); if (work) new MutationObserver(mark).observe(work, { childList: true, subtree: true });
    mark();
  }
  function setTab(k, user) {
    tab = k; root.dataset.sn = k; try { sessionStorage.setItem("sn_tab", k); } catch (e) {}
    document.querySelectorAll("#snTabs [data-sn]").forEach(b => { if (b.dataset.sn === k) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    if (user) try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) { window.scrollTo(0, 0); }
  }
  // name the sections student.js draws, so each tab can show its own; keep the coins and the "to do" count in the header
  function mark() {
    const app = $("app"); if (!app) return;
    app.querySelectorAll(":scope>section.card").forEach(s => {
      const h = (s.querySelector("h3") || {}).textContent || "";
      s.classList.toggle("sn-ach", s.classList.contains("ach-card"));
      s.classList.toggle("sn-shop", !s.classList.contains("ach-card") && (!!s.querySelector(".shop-grid") || /shop|boutique/i.test(h)));
      s.classList.toggle("sn-log", /latest xp/i.test(h));
    });
    const w = app.querySelector(".wallet b"), coin = $("snCoin");
    if (coin) { if (w) { coin.textContent = "🪙 " + w.textContent; coin.hidden = false; } else coin.hidden = true; }
    const todo = document.querySelectorAll("#work [data-wkact=open]").length + app.querySelectorAll(":scope>.bknote").length, wb = document.querySelector('#snTabs [data-sn="work"]');
    if (wb) { let b = wb.querySelector("b"); if (todo) { if (!b) { b = document.createElement("b"); wb.appendChild(b); } b.textContent = todo; b.setAttribute("aria-label", todo + " to do"); } else if (b) b.remove(); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
})();
