/* Student Island · new design (stage 1).
   A new look and a new menu on top of the same page: every tool is still the one you know, only reached and drawn differently.
   Off by default. "Try the new design" turns it on for this device (localStorage si_nd = "1"); "Back to the old design" turns it off.
   Classic script: it uses the page's own globals (students, CLASSES, cls, hubTab, render, insights, TNAME). */
(function () {
  "use strict";
  var KEY = "si_nd";
  var on = function () { try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; } };
  var setOn = function (v) { try { localStorage.setItem(KEY, v ? "1" : "0"); } catch (e) {} location.reload(); };
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  /* ---------- the way in from the old design ---------- */
  function offerButton() {
    if ($("ndTry")) return;
    var b = document.createElement("button"); b.id = "ndTry"; b.type = "button"; b.className = "ghost small"; b.textContent = "✨ Try the new design";
    b.onclick = function () { setOn(true); };
    var acct = document.querySelector("header.book .acct"); if (acct) acct.insertBefore(b, acct.firstChild); else document.body.appendChild(b);
    var t = document.createElement("button"); t.id = "ndTry2"; t.type = "button"; t.className = "primary small"; t.textContent = "✨ Try the new design"; t.onclick = function () { setOn(true); };
    var place = function () { var h = $("toolsView"); if (h && !h.hidden && !$("ndTry2")) { var p = h.querySelector(".shop-intro"); if (p) p.appendChild(t); } };
    setInterval(place, 1000);
  }
  try { var q = new URLSearchParams(location.search).get("nd"); if (q === "1" || q === "0") { localStorage.setItem(KEY, q); history.replaceState(null, "", location.pathname + location.hash); } } catch (e) {}   // mathkn.fun/teacher.html?nd=1 turns it on, ?nd=0 off
  if (!on()) { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", offerButton); else offerButton(); return; }

  document.documentElement.classList.add("nd");
  var fonts = document.createElement("link"); fonts.rel = "stylesheet"; fonts.href = "https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700;800&family=Figtree:wght@400;500;600;700;800&display=swap"; document.head.appendChild(fonts);

  var css = document.createElement("style"); css.id = "ndCss";
  css.textContent = [
    ":root.nd.nd{--paper:#f2f7ff;--grid:#f2f7ff;--card:#FFFFFF;--ink:#0c2a5e;--muted:#5a6b8a;--line:#d6e2f6;--edge:#d6e2f6;--accent:#1f5bbd;--accent-soft:#dbe9ff;--good:#0B7A5A;--good-soft:#DFF3EC;--bad:#C43E24;--bad-soft:#FBE6E1;--gold:#B7791F;--gold-soft:#fff1c9;--f-display:Unbounded,'Segoe UI',system-ui,sans-serif;--f-body:Figtree,'Segoe UI',system-ui,sans-serif;--shadow:0 1px 2px rgba(15,42,58,.05),0 6px 20px rgba(15,42,58,.06);color-scheme:light}",
    "html.nd body{background:#f2f7ff!important;background-image:none!important;font-family:var(--f-body)!important;color:#0c2a5e}",
    "html.nd header.book,html.nd .ruler,html.nd nav.views,html.nd #ndTry{display:none!important}",
    "html.nd .wrap{margin-left:248px!important;max-width:none!important;padding:28px 36px 60px!important;box-sizing:border-box}",
    "html.nd .card,html.nd .stat,html.nd .sitem,html.nd .grp,html.nd .ins-c,html.nd .cb-btn,html.nd .empty{border:1px solid #d6e2f6!important;border-radius:20px!important;box-shadow:var(--shadow)!important;background:#fff}",
    "html.nd h1,html.nd h2,html.nd h3{font-family:var(--f-display);letter-spacing:-.01em}",
    "html.nd .shop-intro h2{font-size:30px}",
    "html.nd button.primary{background:#0c2a5e!important;border-color:#0c2a5e!important;color:#fff!important;border-radius:14px!important}",
    "html.nd button.ghost{border-radius:14px!important}",
    "html.nd .shop-tab{border-radius:99px!important}",
    "html.nd .shop-tab[aria-pressed=true]{background:#0c2a5e!important;color:#fff!important;border-color:#0c2a5e!important}",
    /* hub: the menu already lists these pages, so no second row of tabs; the class picker is one neat bar */
    "html.nd #hubView .hub-tabs,html.nd #hubView .shop-intro p,html.nd #hubView .hub-t-old{display:none!important}",
    "html.nd #hubView .hub-t-nd{display:inline}",
    "html.nd .hub-cls{display:inline-flex!important;width:fit-content!important;max-width:100%;box-sizing:border-box;flex-wrap:wrap;align-items:center;gap:2px!important;padding:4px!important;margin:4px 0 18px!important;background:#fff;border:1px solid #d6e2f6;border-radius:14px;box-shadow:0 1px 2px rgba(12,42,94,.06)}",
    "html.nd .hub-cls::before{content:'Class';font-size:13px;font-weight:700;color:#5a6b8a;padding:0 10px 0 8px}",
    "html.nd .hub-cls .shop-tab{border:0!important;background:transparent!important;box-shadow:none!important;border-radius:10px!important;padding:7px 14px!important;font-weight:600;color:#0c2a5e!important;min-height:0}",
    "html.nd .hub-cls .shop-tab:hover{background:#eaf2ff!important}",
    "html.nd .hub-cls .shop-tab[aria-pressed=true]{background:#1f5bbd!important;color:#fff!important}",
    "html.nd .hub-cls .shop-tab small{font-size:11px;opacity:.6;margin-left:3px}",
    "html.nd .hub-cls .shop-tab[aria-pressed=true] small{opacity:.85}",
    /* ---------- class page (stage 2) ---------- */
    "html.nd #studentsView{display:flex;flex-direction:column;gap:18px}",
    "html.nd #studentsView>#tabs,html.nd #studentsView>#statsSec,html.nd #studentsView>.classbar,html.nd #soundGate{display:none!important}",
    "html.nd #ndClass{order:0}html.nd #ndCStats{order:1}html.nd #studentsView>.toolbar{order:2}html.nd #studentsView>#grid{order:3}html.nd #studentsView>#topStrip{order:4}",
    ".nd-chead{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap}",
    ".nd-chead p{margin:0;color:#5a6b8a;font-weight:600;font-size:15px}.nd-chead h1{margin:2px 0 0;font-family:var(--f-display);font-size:46px;font-weight:800;line-height:1;color:#0c2a5e}",
    ".nd-cacts{display:flex;gap:10px;flex-wrap:wrap}",
    ".nd-btn{all:unset;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;gap:8px;padding:11px 16px;border-radius:14px;background:#fff;border:1px solid #d6e2f6;color:#0c2a5e;font-weight:700;font-size:14px;font-family:var(--f-body)}",
    ".nd-btn:hover{border-color:#3d8bf0}.nd-btn:focus-visible{outline:3px solid #f6b91c}.nd-btn.p{background:#1f5bbd;border-color:#1f5bbd;color:#fff}.nd-btn.p:hover{background:#17499c}",
    ".nd-cstats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}",
    ".nd-st{background:#fff;border:1px solid #d6e2f6;border-radius:20px;padding:16px 18px;min-width:0}.nd-st span{font-size:13px;color:#5a6b8a;font-weight:600}",
    ".nd-st b{display:block;font-family:var(--f-display);font-size:28px;font-weight:800;margin-top:4px;color:#0c2a5e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nd-st small{display:block;font-size:13px;color:#5a6b8a;font-weight:700;margin-top:2px}",
    ".nd-st small.up{color:#0b7a5a}.nd-st small.down{color:#c43e24}.nd-st b.nm{font-size:20px;margin-top:9px}",
    ".nd-st.sky{background:linear-gradient(160deg,#1f5bbd,#3d8bf0);border:0}.nd-st.sky span,.nd-st.sky small{color:#dbe9ff}.nd-st.sky b{color:#fff}",
    "html.nd #studentsView>.toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:0}",
    "html.nd #studentsView>.toolbar .add{flex:1 1 320px;margin:0}html.nd #studentsView>.toolbar .tools{display:flex;flex-wrap:wrap;gap:8px;margin:0}",
    "#ndFind{flex:1 1 220px;min-width:0;border:1px solid #d6e2f6;background:#fff;border-radius:14px;padding:11px 14px 11px 38px;font:600 15px var(--f-body);color:#0c2a5e;background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%235a6b8a' stroke-width='2.2' stroke-linecap='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='m20 20-4-4'/%3E%3C/svg%3E\");background-repeat:no-repeat;background-position:12px center}",
    "#ndFind:focus{outline:3px solid #f6b91c;outline-offset:1px}",
    /* student cards */
    "html.nd #grid ol.list{display:grid!important;align-items:stretch;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;padding:0;margin:0;list-style:none;counter-reset:none}",
    "html.nd #grid li.item{position:relative;display:flex!important;flex-direction:column;height:100%;box-sizing:border-box;background:#fff;border:1px solid #d6e2f6!important;border-radius:20px!important;box-shadow:0 1px 2px rgba(12,42,94,.05)!important;padding:0!important;margin:0!important;overflow:visible}",
    "html.nd #grid li.item::before,html.nd #grid li.item::after{display:none!important}",
    "html.nd #grid li.item.nd-hide{display:none}",
    "html.nd #grid li.item.open{border:2px solid #1f5bbd!important;box-shadow:0 8px 24px -10px rgba(31,91,189,.55)!important}",
    "html.nd #grid li.item.absent{opacity:.6}",
    "html.nd #grid .srow{all:unset;box-sizing:border-box;cursor:pointer;display:flex!important;flex:1 0 auto;flex-direction:column;align-items:center;gap:6px;width:100%;padding:38px 12px 6px!important;text-align:center;border-radius:20px;background:none!important;box-shadow:none!important;border:0!important;grid-template-columns:none!important}",
    "html.nd #grid .srow:focus-visible{outline:3px solid #f6b91c;outline-offset:-3px}",
    "html.nd #grid .srow::before,html.nd #grid .srow::after{display:none!important}",
    "html.nd #grid .srow>.av,html.nd #grid .srow>.avw{transform:scale(1.55);transform-origin:center top;margin:2px 0 26px!important}",
    "html.nd #grid .srow .chev{display:none!important}",
    "html.nd #grid .srow *,html.nd #grid .srow *::before,html.nd #grid .srow *::after{animation:none!important;transition:none!important}",
    "html.nd #grid .srow .avw.fr.f-gold,html.nd #grid .srow .avw.fr.f-diamond,html.nd #grid .srow .avw.fr.f-fire,html.nd #grid .srow .avw.sw{box-shadow:0 0 12px 2px var(--gl)!important}",
    "html.nd #grid li.item{contain:layout paint}",
    "html.nd #grid .srow .smain{display:flex;flex-direction:column;align-items:center;gap:6px;width:100%;min-width:0}",
    "html.nd #grid .srow .snm{display:flex;flex-wrap:wrap;justify-content:center;gap:4px;font-weight:700;font-size:15px;color:#0c2a5e;max-width:100%}",
    "html.nd #grid .srow .lvrow{display:flex;flex-direction:column;align-items:center;gap:6px;width:100%}",
    "html.nd #grid .srow .lvpill{order:-1;background:#eaf2ff!important;color:#1f5bbd!important;border:0!important;border-radius:99px!important;font:800 12px var(--f-body)!important;padding:2px 10px!important}",
    "html.nd #grid .srow .lvbar{display:block!important;flex:none!important;width:78%!important;height:6px!important;border-radius:99px!important;background:#e3ecfb!important;border:0!important;min-width:0!important}",
    "html.nd #grid .srow .lvbar i{background:#3d8bf0!important;border-radius:99px!important}",
    "html.nd #grid .srow .lvtxt{display:none}",
    "html.nd #grid .srow .xp{display:flex!important;align-items:baseline;gap:2px;order:-1;background:none!important;border:0!important;box-shadow:none!important;padding:0!important;font-family:var(--f-display)!important;font-size:24px!important;font-weight:800;color:#0c2a5e!important;min-width:0!important}",
    "html.nd #grid .srow .xp.neg{color:#c43e24!important}",
    "html.nd #grid .srow .xp small{display:inline!important;font-size:12px!important;color:#5a6b8a;margin-left:3px;font-family:var(--f-body)}",
    "html.nd #grid .srow{flex-direction:column}html.nd #grid .srow .xp{order:2}html.nd #grid .srow .smain{order:1}",
    "html.nd #grid .srow .swk{position:absolute;top:10px;left:10px;font-size:11px!important;font-weight:800;margin:0!important;background:#dff3ec;color:#0b5f45;border-radius:99px;padding:2px 8px;z-index:1}","html.nd #grid .srow .swk.down{background:#fbe6e1;color:#9a2f1a}",
    "html.nd #grid .srow .bdgrow{justify-content:center}",
    ".nd-q{display:flex;gap:6px;justify-content:center;padding:4px 10px 14px;margin-top:auto}",
    "html.nd #grid .srow .snm .nmx,html.nd #grid .srow .snm .nt{white-space:normal!important;overflow:visible!important;text-overflow:clip!important;max-width:100%}",
    "html.nd #grid .srow .snm .nt{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden!important;line-height:1.25}",
    "html.nd #grid .srow .ttag{font-size:11px!important}",
    ".nd-q button{all:unset;box-sizing:border-box;cursor:pointer;min-width:40px;height:32px;padding:0 8px;border-radius:10px;display:grid;place-items:center;font:800 13px var(--f-body);background:#dff3ec;color:#0b5f45}",
    ".nd-q button.m{background:#fbe6e1;color:#9a2f1a}.nd-q button:hover{filter:brightness(.95)}.nd-q button:focus-visible{outline:3px solid #f6b91c}",
    ".nd-q button:disabled{opacity:.4;cursor:default}",
    ".nd-flag{position:absolute;top:12px;right:12px;width:10px;height:10px;border-radius:50%;background:#c43e24}",
    /* the open student: a panel on the right */
    "#ndDrawer[hidden]{display:none!important}#ndDrawer{position:fixed;top:0;right:0;bottom:0;width:min(400px,100vw);z-index:9;background:#fff;border-left:1px solid #d6e2f6;box-shadow:-18px 0 40px -20px rgba(12,42,94,.35);overflow-y:auto;box-sizing:border-box;padding:56px 22px 28px;color:#0c2a5e}",
    "#ndDrawer>.panel{position:static!important;display:block!important;margin:0!important;padding:0!important;border:0!important;box-shadow:none!important;background:none!important;width:auto!important;max-width:none!important}",
    "#ndDrawer .nd-x{position:absolute}",
    "#ndDrawer .qgrid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}",
    "#ndDrawer .qb{word-break:normal!important;overflow-wrap:normal!important;hyphens:none!important;border-radius:14px!important;min-height:52px}",
    "#ndDrawer .who2{margin-bottom:12px}",
    "html.nd #grid li.item.open>.panel{display:none!important;position:fixed!important;top:0;right:0;bottom:0;width:min(400px,100vw);z-index:950;margin:0!important;border:0!important;border-left:1px solid #d6e2f6!important;border-radius:0!important;background:#fff!important;box-shadow:-18px 0 40px -20px rgba(12,42,94,.35)!important;overflow-y:auto;padding:56px 22px 28px!important;box-sizing:border-box}",
    "html.nd body.nd-drawer .wrap{margin-right:400px!important}",
    ".nd-x{all:unset;box-sizing:border-box;cursor:pointer;position:absolute;top:12px;right:14px;width:38px;height:38px;border-radius:12px;display:grid;place-items:center;font-size:18px;font-weight:800;color:#0c2a5e;background:#f2f7ff}",
    ".nd-x:hover{background:#e3ecfb}.nd-x:focus-visible{outline:3px solid #f6b91c}",
    "@media (max-width:1180px){.nd-cstats{grid-template-columns:repeat(2,minmax(0,1fr))}html.nd body.nd-drawer .wrap{margin-right:0!important}}",
    "@media (max-width:700px){html.nd #studentsView>.toolbar{flex-direction:column!important;align-items:stretch!important}html.nd #studentsView>.toolbar>*{flex:none!important;width:100%!important}}",
    "@media (max-width:560px){.nd-chead h1{font-size:36px}html.nd #grid ol.list{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}}",
    /* sidebar */
    "#ndNav{position:fixed;left:0;top:0;bottom:0;width:248px;z-index:9;background:#0c2a5e;color:#eaf2ff;display:flex;flex-direction:column;gap:18px;padding:22px 14px 16px;box-sizing:border-box;overflow-y:auto;font-family:var(--f-body)}",
    "#ndNav .nd-brand{display:flex;align-items:center;gap:10px;padding:0 8px;font-family:var(--f-display);font-weight:700;font-size:16px}",
    "#ndNav .nd-g{display:flex;flex-direction:column;gap:2px}",
    "#ndNav button{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:12px;width:100%;padding:10px 12px;border-radius:12px;cursor:pointer;font-weight:600;font-size:15px;color:#eaf2ff}",
    "#ndNav button:hover{background:#17499c}",
    "#ndNav button:focus-visible{outline:2px solid #f6b91c;outline-offset:1px}",
    "#ndNav button.on{background:#3d8bf0;color:#fff;font-weight:700}",
    "#ndNav .nd-sub{display:none;flex-direction:column;gap:0;padding:2px 0 6px 34px}",
    "#ndNav .nd-g.open .nd-sub{display:flex}",
    "#ndNav .nd-sub button{padding:7px 10px;font-size:14px;font-weight:500;color:#b7cdf0}",
    "#ndNav .nd-sub button.on{background:transparent;color:#f6b91c;font-weight:700}",
    "#ndNav .nd-sub small{margin-left:auto;color:#8aa3cc;font-weight:600}",
    "#ndNav svg{flex:none}",
    "#ndNav .nd-brand img{width:36px;height:36px;border-radius:22%;flex:none}",
    "#ndNav .nd-old{justify-content:center;border:1.5px solid #3d6fc4;font-size:14px}",
    "#ndNav .nd-old:hover{background:#17499c}",
    "#ndTop img{width:32px;height:32px;border-radius:22%}",
    "#ndNav .nd-badge{margin-left:auto;background:#f6b91c;color:#0c2a5e;border-radius:99px;font-size:12px;font-weight:800;padding:1px 8px}",
    "#ndNav .nd-me{margin-top:auto;display:flex;align-items:center;gap:10px;padding:12px;border-radius:14px;background:#17499c}",
    "#ndNav .nd-me b{display:block;font-size:14px;color:#fff}#ndNav .nd-me span{font-size:12px;color:#9fb3d6}#ndNav .nd-me .nd-av{color:#0c2a5e;font-size:13px}",
    "#ndNav .nd-av{width:36px;height:36px;border-radius:50%;background:#f6b91c;color:#0c2a5e;display:grid;place-items:center;font-family:var(--f-display);font-weight:700;font-size:13px;flex:none}",
    "#ndTop{display:none}",
    /* today */
    "#ndToday{display:none;flex-direction:column;gap:24px}",
    ".nd-sch{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 6px}",
    ".nd-sch button{border:0;border-radius:99px;padding:5px 12px;font:600 13px inherit;font-family:inherit;background:rgba(12,42,94,.08);color:#0c2a5e;cursor:pointer}",
    ".nd-sch button[aria-pressed=true]{background:#0c2a5e;color:#fff}",
    ".nd-sch button:focus-visible{outline:2px solid #0c2a5e;outline-offset:2px}",
    "html.nd-today #ndToday{display:flex}",
    "html.nd-today #studentsView,html.nd-today #cupView,html.nd-today #shopView,html.nd-today #hubView,html.nd-today #toolsView,html.nd-today #dashView{display:none!important}",
    ".nd-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:12px}",
    ".nd-head span{font-size:15px;color:#5a6b8a;font-weight:600}",
    ".nd-head h1{margin:6px 0 0;font-family:var(--f-display);font-weight:700;font-size:34px;line-height:1.1}",
    ".nd-tide{position:relative;background:linear-gradient(180deg,#17499c 0%,#1f5bbd 46%,#2f74dc 100%);color:#eaf2ff;border-radius:26px;padding:24px 28px 56px;overflow:hidden}",
    ".nd-tide svg.wave{position:absolute;left:0;right:0;bottom:0;width:100%;height:54px}",
    ".nd-tide h2{position:relative;margin:0 0 16px;font-size:17px;font-family:var(--f-display);color:#eaf2ff}",
    ".nd-tide ol{position:relative;list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px}",
    ".nd-tide li{display:flex;flex-direction:column;gap:5px}",
    ".nd-tide li b{font-family:var(--f-display);font-size:20px}",
    ".nd-tide li span{font-size:13px}",
    ".nd-tide li.done{opacity:.55}",
    ".nd-tide li.now{background:#f6b91c;color:#0c2a5e;border-radius:16px;padding:12px 14px;margin:-12px 0}",
    ".nd-cols{display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start}",
    ".nd-main{flex:999 1 520px;min-width:0;display:flex;flex-direction:column;gap:24px}",
    ".nd-side{flex:1 1 300px;min-width:0;display:flex;flex-direction:column;gap:16px}",
    ".nd-box{background:#fff;border:1px solid #d6e2f6;border-radius:22px;padding:22px;display:flex;flex-direction:column;gap:14px;box-shadow:var(--shadow)}",
    ".nd-box h2{margin:0;font-family:var(--f-display);font-size:19px;font-weight:700}",
    ".nd-kick{font-size:14px;color:#1f5bbd;font-weight:700}",
    ".nd-acts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}",
    ".nd-act{all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;gap:8px;padding:16px;border-radius:16px;background:#f2f7ff;border:1px solid #d6e2f6;color:#0c2a5e}",
    ".nd-act:hover{border-color:#3d8bf0}.nd-act:focus-visible{outline:3px solid #f6b91c}",
    ".nd-act b{font-size:15px}.nd-act span{font-size:13px;color:#5a6b8a}",
    ".nd-cls{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}",
    ".nd-cc{all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;gap:12px;padding:18px;border-radius:20px;background:#fff;border:1px solid #d6e2f6;box-shadow:var(--shadow)}",
    ".nd-cc:hover{border-color:#3d8bf0}.nd-cc:focus-visible{outline:3px solid #f6b91c}",
    ".nd-cc .t{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}",
    ".nd-cc .t b{font-family:var(--f-display);font-size:24px;display:block}.nd-cc .t small{font-size:13px;color:#5a6b8a}",
    ".nd-cc .xp{background:#fff1c9;color:#6B4A00;border-radius:99px;padding:5px 12px;font-weight:800;font-size:13px;white-space:nowrap}",
    ".nd-bar{height:8px;border-radius:99px;background:#e3ecfb;overflow:hidden}.nd-bar i{display:block;height:100%;border-radius:99px}",
    ".nd-row{display:flex;justify-content:space-between;font-size:13px;color:#5a6b8a}.nd-row b{color:#0c2a5e}",
    ".nd-pn{display:flex;gap:8px;flex-wrap:wrap;font-size:13px}.nd-pn span{border-radius:10px;padding:5px 10px;font-weight:700}",
    ".nd-todo{all:unset;box-sizing:border-box;cursor:pointer;display:flex;gap:12px;align-items:flex-start;padding:12px;border-radius:14px;background:#f2f7ff}",
    ".nd-todo:hover{background:#e6effd}.nd-todo i{flex:none;width:10px;height:10px;border-radius:50%;margin-top:6px}",
    ".nd-todo b{display:block;font-size:15px}.nd-todo span{font-size:13px;color:#5a6b8a}",
    ".nd-none{color:#5a6b8a;font-size:14px}",
    /* phone and the app */
    "@media (max-width:900px){html.nd .wrap{margin-left:0!important;padding:76px 14px 40px!important}",
    "#ndNav{transform:translateX(-105%);transition:transform .2s;box-shadow:0 0 40px rgba(0,0,0,.3)}html.nd-menu #ndNav{transform:none}",
    "#ndTop{display:flex;position:fixed;left:0;right:0;top:0;z-index:9;height:60px;align-items:center;gap:12px;padding:0 14px;background:#0c2a5e;color:#fff;font-family:var(--f-display);font-weight:700}",
    "#ndTop button{all:unset;cursor:pointer;width:44px;height:44px;display:grid;place-items:center;border-radius:12px}",
    "#ndShade{display:none}html.nd-menu #ndShade{display:block;position:fixed;inset:0;z-index:8;background:rgba(12,42,94,.45)}.nd-tide li.now{margin:0}}",
    "html.nd.app body{padding-bottom:30px!important}",
    "@media (prefers-reduced-motion:reduce){#ndNav{transition:none}}"
  ].join("\n");
  document.head.appendChild(css);

  /* ---------- icons ---------- */
  var I = {
    today: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    classes: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6 6 0 0 1 3.5 5.5"/>',
    teach: '<path d="M3 5h18v11H3zM8 20h8M12 16v4"/><path d="m10 8 4 2.5-4 2.5z"/>',
    assess: '<path d="M7 3h7l4 4v14H7z"/><path d="m10 14 2 2 4-4"/>',
    rewards: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>',
    messages: '<path d="M4 5h16v11H9l-5 4z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>'
  };
  var svg = function (k, s) { return '<svg width="' + (s || 20) + '" height="' + (s || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + I[k] + "</svg>"; };

  /* ---------- actions: each menu item uses the page's existing tool ---------- */
  var press = function (id) { var b = $(id); if (b) { b.click(); return true; } return false; };
  var showView = function (v) { leaveToday(); var map = { students: "vStudents", cup: "vCup", shop: "vShop", board: "vBoard", hub: "vHub", tools: "vTools" }; press(map[v]); };
  var hub = function (tab, c) { leaveToday(); try { if (c) cls = c; hubTab = tab; } catch (e) {} press("vHub"); try { render(); } catch (e) {} };
  var openClass = function (c) { leaveToday(); try { cls = c; } catch (e) {} press("vStudents"); try { render(); } catch (e) {} };
  var leaveToday = function () { document.documentElement.classList.remove("nd-today"); };
  var classes = function () { try { var s = new Set(CLASSES); (students || []).forEach(function (x) { if (x.cls) s.add(x.cls); }); return Array.from(s); } catch (e) { return []; } };
  var count = function (c) { try { return students.filter(function (s) { return s.cls === c; }).length; } catch (e) { return 0; } };

  var sel = "today";
  var MENU = function () {
    return [
      { k: "today", label: "Today", go: function () { showToday(); } },
      { k: "classes", label: "Classes", sub: classes().map(function (c) { return { k: "c:" + c, label: c, n: count(c), go: function () { openClass(c); } }; }).concat([
        { k: "h:att", label: "Attendance", go: function () { hub("att"); } },
        { k: "h:wbc", label: "Notebook / workbook classwork", go: function () { hub("wbc"); } },
        { k: "h:books", label: "Notebook submission", go: function () { hub("books"); } },
        { k: "h:seats", label: "Seat plan", go: function () { hub("seats"); } },
        { k: "h:groups", label: "Group maker", go: function () { hub("groups"); } }]) },
      { k: "teach", label: "Teach", sub: [
        { k: "t:ml", label: "My lessons", go: function () { press("mlBtn"); } },
        { k: "t:lw", label: "Live worksheets", go: function () { press("lwBtn"); } },
        { k: "t:lq", label: "Live quiz", go: function () { press("liveBtn"); } },
        { k: "t:cc", label: "Coconut Crack", go: function () { press("ccBtn"); } },
        { k: "t:fp", label: "Fun Park", go: function () { press("funBtn"); } },
        { k: "t:wh", label: "Watch & help", go: function () { if (window.__openWatch) window.__openWatch(); } }] },
      { k: "assess", label: "Assess", sub: [
        { k: "a:cw", label: "Classwork", go: function () { press("workBtn"); } },
        { k: "a:gw", label: "Graded worksheets", go: function () { press("gwBtn"); } },
        { k: "h:marks", label: "Marks", go: function () { hub("marks"); } },
        { k: "h:hw", label: "Homework", go: function () { hub("hw"); } },
        { k: "h:grades", label: "Grades /10", go: function () { hub("grades"); } },
        { k: "h:insights", label: "Insights", go: function () { hub("insights"); } },
        { k: "a:pg", label: "Students progress", go: function () { press("islandBtn"); } }] },
      { k: "rewards", label: "Rewards", sub: [
        { k: "v:shop", label: "Shop", go: function () { showView("shop"); } },
        { k: "v:cup", label: "Class Cup", go: function () { showView("cup"); } },
        { k: "v:board", label: "Dashboard", go: function () { showView("board"); } }] },
      { k: "messages", label: "Messages", sub: [
        { k: "m:ann", label: "Announcements", go: function () { press("inboxBtn"); } },
        { k: "m:mail", label: "Email students", go: function () { press("mailBtn"); } },
        { k: "m:mat", label: "My material", go: function () { press("matBtn"); } },
        { k: "m:chat", label: "Chat", go: function () { press("chDock"); } }] },
      { k: "settings", label: "Settings", sub: [
        { k: "s:tools", label: "Tools and XP reset", go: function () { showView("tools"); } },
        { k: "s:log", label: "Student logins", go: function () { press("loginsBtn"); } },
        { k: "s:imp", label: "Import old data", go: function () { press("impBtn"); } },
        { k: "s:bk", label: "Backup (Excel)", go: function () { press("backupBtn"); } },
        { k: "s:dev", label: "Developer", go: function () { press("devBtn"); } },
        { k: "s:me", label: "My email & password", go: function () { press("emailBtn"); } },
        { k: "s:old", label: "Back to the old design", go: function () { setOn(false); } }] }
    ];
  };
  var openGroup = "classes";
  function paintNav() {
    var nav = $("ndNav"); if (!nav) return;
    var menu = MENU(), name = (typeof TNAME !== "undefined" && TNAME) || "Teacher", ini = name.replace(/^(mr|ms|mrs|miss)\.?\s+/i, "").split(/\s+/).map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase();
    nav.innerHTML = '<div class="nd-brand"><img src="logo.svg" alt="">Student Island</div>'
      + menu.map(function (g) {
        var groupOn = sel === g.k || (g.sub || []).some(function (s) { return s.k === sel; });
        return '<div class="nd-g' + (openGroup === g.k || groupOn ? " open" : "") + '"><button type="button" class="' + (sel === g.k ? "on" : "") + '" data-nd="' + g.k + '" aria-expanded="' + (g.sub ? String(openGroup === g.k || groupOn) : "") + '">' + svg(g.k) + esc(g.label) + "</button>"
          + (g.sub ? '<div class="nd-sub">' + g.sub.map(function (s) { return '<button type="button" class="' + (sel === s.k ? "on" : "") + '" data-nd="' + esc(s.k) + '">' + esc(s.label) + (s.n != null ? "<small>" + s.n + "</small>" : "") + "</button>"; }).join("") + "</div>" : "") + "</div>";
      }).join("")
      + '<button type="button" class="nd-old" data-ndold="1">↩ Back to the old design</button>'
      + '<div class="nd-me"><span class="nd-av">' + esc(ini || "T") + '</span><span><b>' + esc(name) + "</b><span>Mathematics</span></span></div>";
  }
  function onNav(e) {
    if (e.target.closest("[data-ndold]")) { setOn(false); return; }
    var b = e.target.closest("[data-nd]"); if (!b) return;
    var k = b.dataset.nd, menu = MENU(), item = null, grp = null;
    menu.forEach(function (g) { if (g.k === k) { item = g; grp = g; } (g.sub || []).forEach(function (s) { if (s.k === k) { item = s; grp = g; } }); });
    if (!item) return;
    if (item.sub) { openGroup = openGroup === item.k ? "" : item.k; paintNav(); return; }
    var modalItem = /^(t:|a:cw|a:gw|a:pg|m:|s:log|s:imp|s:bk|s:dev|s:me)/.test(k);
    if (!modalItem) sel = k;
    openGroup = grp.k; document.documentElement.classList.remove("nd-menu");
    item.go(); paintNav();
  }

  /* ---------- Today ---------- */
  var starCls = "", tI = null, tAt = 0;
  function showToday() { sel = "today"; closeDrawer(); document.documentElement.classList.add("nd-today"); paintToday(); paintNav(); try { window.scrollTo(0, 0); } catch (e) {} }
  function paintToday() {
    var box = $("ndToday"); if (!box) return;
    var I2 = tI; if (!tI || Date.now() - tAt > 20000) { try { I2 = tI = insights(); tAt = Date.now(); } catch (e) {} }
    var name = (typeof TNAME !== "undefined" && TNAME) || "";
    var now = new Date(Date.now() + 3 * 3600e3), hr = now.getUTCHours(), hello = hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";
    var dateStr = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    var tt = []; try { tt = window.__todayTT ? window.__todayTT() : []; } catch (e) {}
    var live = null; try { live = window.__liveLesson ? window.__liveLesson() : null; } catch (e) {}
    var nowCls = live ? live.cls : (classes()[0] || "");
    var h = '<div class="nd-head"><div><span>' + esc(dateStr) + '</span><h1>' + hello + (name ? ", " + esc(name.replace(/\s+O$/, "")) : "") + '</h1></div></div>';
    if (tt.length) {
      h += '<section class="nd-tide" aria-label="Today\'s lessons"><svg class="wave" viewBox="0 0 1100 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 70 C 90 30 180 30 275 70 S 460 110 550 70 S 735 30 825 70 S 1010 110 1100 70 V120 H0Z" fill="#3d8bf0"/><path d="M0 70 C 90 30 180 30 275 70 S 460 110 550 70 S 735 30 825 70 S 1010 110 1100 70" fill="none" stroke="#79b4ff" stroke-width="3"/></svg>'
        + "<h2>Today's lessons</h2><ol>" + tt.map(function (l) { return '<li class="' + l.state + '"><span>' + (l.state === "now" ? "Now · " + l.left + " min left" : esc(l.s) + (l.state === "done" ? " · done" : "")) + "</span><b>" + esc(l.cls) + "</b><span>until " + esc(l.e) + "</span></li>"; }).join("") + "</ol></section>";
    }
    var act = function (k, title, sub) { return '<button type="button" class="nd-act" data-ndt="' + k + '"><b>' + esc(title) + "</b><span>" + esc(sub) + "</span></button>"; };
    h += '<div class="nd-cols"><div class="nd-main">';
    h += '<section class="nd-box"><span class="nd-kick">' + (live ? (live.now ? "Now teaching · " + esc(nowCls) + " · " + live.left + " min left" : "Next · " + esc(nowCls) + " in " + live.startsIn + " min") : "Quick start · " + esc(nowCls)) + "</span><h2>What do you need for " + esc(nowCls) + "?</h2><div class=\"nd-acts\">"
      + act("att", "Attendance", "Mark who is here") + act("wbc", "Notebook classwork", "Done · working · not done") + act("lw", "Live worksheets", "Start one for the class") + act("wh", "Watch & help", "See a student's screen") + act("ml", "My lessons", "Open the slides") + act("cls", "Give XP", "Open " + nowCls) + "</div></section>";
    if (I2 && I2.clsRows) {
      h += '<section aria-label="My classes" style="display:flex;flex-direction:column;gap:12px"><div class="nd-row" style="font-size:15px"><h2 style="margin:0;font-family:var(--f-display);font-size:20px;color:#0c2a5e">My classes</h2></div><div class="nd-cls">'
        + I2.clsRows.map(function (r) { var a = r.att, col = a === null ? "transparent" : a >= 85 ? "#3d8bf0" : a >= 75 ? "#E0A100" : "#C43E24";
          return '<button type="button" class="nd-cc" data-ndc="' + esc(r.c) + '"><span class="t"><span><b>' + esc(r.c) + "</b><small>" + r.n + ' students</small></span><span class="xp">' + r.avg + ' XP avg</span></span>'
            + '<span class="nd-row"><span>Attendance · 30 days</span><b>' + (a === null ? "not recorded" : a + "%") + '</b></span><span class="nd-bar"><i style="width:' + (a || 0) + "%;background:" + col + '"></i></span>'
            + '<span class="nd-pn"><span style="background:#DFF3EC;color:#0B5F45">+' + r.pos + ' positive</span><span style="background:#FBE6E1;color:#9A2F1A">' + r.neg + " deductions</span></span></button>"; }).join("") + "</div></section>";
    }
    h += '</div><aside class="nd-side">';
    var todo = [];
    try { var req = students.filter(function (s) { return (s.reqs || []).length; }).reduce(function (a, s) { return a + s.reqs.length; }, 0); if (req) todo.push({ k: "shop", dot: "#3d8bf0", t: req + " shop request" + (req === 1 ? "" : "s"), s: "Approve or refuse" }); } catch (e) {}
    try { var owe = students.filter(function (s) { return typeof bkOwing === "function" && bkOwing(s).length; }); if (owe.length) todo.push({ k: "books", dot: "#E0A100", t: owe.length + " notebook" + (owe.length === 1 ? "" : "s") + " still owed", s: "Notebook submission" }); } catch (e) {}
    if (I2 && I2.attention) I2.attention.slice(0, 4).forEach(function (p) { todo.push({ k: "c:" + p.st.cls, dot: "#C43E24", t: (p.st.name || "").split(" ").slice(0, 2).join(" ") + " · " + p.st.cls, s: p.reasons.join(" · ") }); });
    h += '<section class="nd-box"><h2>Needs you</h2>' + (todo.length ? todo.map(function (x) { return '<button type="button" class="nd-todo" data-ndt="' + esc(x.k) + '"><i style="background:' + x.dot + '"></i><span><b>' + esc(x.t) + "</b><span>" + esc(x.s) + "</span></span></button>"; }).join("") : '<p class="nd-none">Nothing is waiting for you. Enjoy the day.</p>') + "</section>";
    if (I2 && I2.per) {
      var sc = starCls || nowCls || (typeof cls !== "undefined" ? cls : ""), have = classes().filter(function (c) { return I2.per.some(function (p) { return p.st.cls === c; }); });
      if (have.indexOf(sc) < 0) sc = have[0] || "";
      var top = I2.per.filter(function (p) { return p.st.cls === sc && p.posXP30 > 0; }).sort(function (a, b) { return b.posXP30 - a.posXP30; }).slice(0, 5);
      h += '<section class="nd-box nd-stars" style="background:#dbe9ff;border-color:#dbe9ff"><h2 style="color:#0c2a5e">Stars of the month</h2>'
        + '<div class="nd-sch" role="group" aria-label="Choose a class">' + have.map(function (c) { return '<button type="button" data-nds="' + esc(c) + '" aria-pressed="' + (c === sc) + '">' + esc(c) + "</button>"; }).join("") + "</div>"
        + (top.length ? top.map(function (p, i) { return '<div class="nd-row" style="font-size:15px;color:#0c2a5e"><span><b style="font-family:var(--f-display);margin-right:10px">' + (i + 1) + "</b>" + esc((p.st.name || "").split(" ").slice(0, 2).join(" ")) + "</span><b>+" + p.posXP30 + " XP</b></div>"; }).join("") : '<p class="nd-none" style="color:#0c2a5e">No XP earned in ' + esc(sc) + " in the last 30 days.</p>") + "</section>";
    }
    h += "</aside></div>";
    box.innerHTML = h;
    box.dataset.cls = nowCls;
  }
  function onToday(e) {
    var st = e.target.closest("[data-nds]"); if (st) { starCls = st.dataset.nds; paintToday(); return; }
    var c = e.target.closest("[data-ndc]"); if (c) { sel = "c:" + c.dataset.ndc; openClass(c.dataset.ndc); paintNav(); return; }
    var b = e.target.closest("[data-ndt]"); if (!b) return;
    var k = b.dataset.ndt, nc = $("ndToday").dataset.cls;
    if (k === "att") { sel = "h:att"; hub("att", nc); }
    else if (k === "wbc") { sel = "h:wbc"; hub("wbc", nc); }
    else if (k === "books") { sel = "h:books"; hub("books"); }
    else if (k === "lw") press("lwBtn");
    else if (k === "wh") { if (window.__openWatch) window.__openWatch(); }
    else if (k === "ml") press("mlBtn");
    else if (k === "cls") { sel = "c:" + nc; openClass(nc); }
    else if (k === "shop") { sel = "v:shop"; showView("shop"); }
    else if (k.indexOf("c:") === 0) { sel = k; openClass(k.slice(2)); }
    paintNav();
  }


  /* ---------- class page (stage 2): header, numbers, cards with quick XP, a search and the open student on the right ---------- */
  var findQ = "", needIds = new Set(), needAt = 0;
  function paintClass() {
    var sv = $("studentsView"); if (!sv || sv.hidden || document.documentElement.classList.contains("nd-today")) { closeDrawer(); return; }
    var c = (typeof cls !== "undefined" && cls) || "", list = [];
    try { list = students.filter(function (x) { return x.cls === c; }); } catch (e) {}
    var head = $("ndClass"); if (!head) { head = document.createElement("div"); head.id = "ndClass"; head.className = "nd-chead"; head.addEventListener("click", function (e) { if (e.target.closest("[data-ndca]")) hub("att", c); }); sv.insertBefore(head, sv.firstChild); }
    var g = (c.match(/^(\d+)/) || [])[1];
    head.innerHTML = '<div><p>' + (g ? "Grade " + g + " · " : "") + list.length + " student" + (list.length === 1 ? "" : "s") + '</p><h1>' + esc(c) + "</h1></div>"
      + '<div class="nd-cacts"><button type="button" class="nd-btn" data-act="pkOpen">🎲 Pick a student</button><button type="button" class="nd-btn" data-ndca="1">✓ Attendance</button>'
      + ((typeof readOnly !== "undefined" && readOnly) ? "" : '<button type="button" class="nd-btn p" data-act="wcOpen">＋ Give XP to many</button>') + "</div>";
    var stt = $("ndCStats"); if (!stt) { stt = document.createElement("div"); stt.id = "ndCStats"; stt.className = "nd-cstats"; head.after(stt); }
    var avg = list.length ? Math.round(list.reduce(function (a, x) { return a + (x.xp || 0); }, 0) / list.length) : 0, lv = 1;
    try { lv = level(avg); } catch (e) {}
    var wk = 0, lwk = 0; try { list.forEach(function (x) { wk += weekGain(x, weekStartOf(0)); lwk += weekGain(x, weekStartOf(1)); }); } catch (e) {}
    var trend = lwk > 0 ? Math.round((wk - lwk) / lwk * 100) : null;
    var taken = false, abs = []; try { var d = att.get(todayStr() + "_" + c); taken = !!(d && d.m && Object.keys(d.m).length); list.forEach(function (x) { if (isAbsent(x)) abs.push(x); }); } catch (e) {}
    var first = function (n) { return String(n || "").split(/\s+/)[0]; };
    var star = []; try { star = topOfWeek(list, weekStartOf(0)); } catch (e) {}
    stt.innerHTML = '<div class="nd-st sky"><span>Class average</span><b>' + avg + " XP</b><small>Level " + lv + "</small></div>"
      + '<div class="nd-st"><span>This week</span><b>' + (wk > 0 ? "+" : "") + wk + " XP</b>" + (trend === null ? "<small>Since Sunday</small>" : '<small class="' + (trend >= 0 ? "up" : "down") + '">' + (trend >= 0 ? "▲ " : "▼ ") + Math.abs(trend) + "% on last week</small>") + "</div>"
      + '<div class="nd-st"><span>Here today</span><b>' + (taken ? (list.length - abs.length) + " / " + list.length : "—") + "</b><small>" + (!taken ? "Attendance not taken yet" : abs.length ? abs.length + " absent · " + esc(abs.slice(0, 2).map(function (x) { return first(x.name); }).join(", ")) + (abs.length > 2 ? "…" : "") : "Everyone is here") + "</small></div>"
      + '<div class="nd-st"><span>Star of the week</span>' + (star.length ? '<b class="nm">' + esc(star.map(function (x) { return shortName(x.st.name); }).join(" & ")) + '</b><small class="up">+' + star[0].g + " XP</small>" : '<b class="nm">—</b><small>No XP earned yet this week</small>') + "</div>";
    // search box in the toolbar
    var tb = sv.querySelector(".toolbar");
    if (tb && !$("ndFind")) { var f = document.createElement("input"); f.id = "ndFind"; f.type = "search"; f.placeholder = "Find a student"; f.setAttribute("aria-label", "Find a student"); f.autocomplete = "off"; f.value = findQ; f.addEventListener("input", function () { findQ = f.value; filterCards(); }); tb.insertBefore(f, tb.firstChild); }
    // cards: quick XP buttons, a red dot for "needs you", a close button on the open student
    var ro = typeof readOnly !== "undefined" && readOnly, need = new Set();
    // "needs you" looks through every student's history, so it is worked out at most once a minute, not on every redraw
    if (!needAt || Date.now() - needAt > 60000) { needIds = new Set(); try { insights().attention.forEach(function (p) { needIds.add(p.st.id); }); } catch (e) {} needAt = Date.now(); }
    need = needIds;
    var P = typeof POSITIVE !== "undefined" ? POSITIVE : [], N = typeof NEGATIVE !== "undefined" ? NEGATIVE : [];
    var qb = function (k, i, id) { var b = (k === "qpos" ? P : N)[i]; return b ? '<button type="button" class="' + (k === "qneg" ? "m" : "") + '" data-act="' + k + '" data-id="' + esc(id) + '" data-i="' + i + '" title="' + esc(b.title) + " (" + (b.xp > 0 ? "+" : "") + b.xp + ')" aria-label="' + esc(b.title) + '">' + (b.xp > 0 ? "+" : "−") + Math.abs(b.xp) + "</button>" : ""; };
    var openPanel = null, openSid = "";
    sv.querySelectorAll("#grid li.item").forEach(function (li) {
      var r = li.querySelector(".srow"); if (!r) return; var id = r.dataset.id;
      if (need.has(id) && !li.querySelector(".nd-flag")) { var fl = document.createElement("span"); fl.className = "nd-flag"; fl.title = "Needs you"; li.appendChild(fl); }
      if (!ro && !li.classList.contains("open") && !li.querySelector(".nd-q")) { var q = document.createElement("div"); q.className = "nd-q"; q.innerHTML = qb("qpos", 0, id) + qb("qpos", 1, id) + qb("qneg", 4, id); li.appendChild(q); }
      var nt = r.querySelector(".nt"); if (nt && !nt.dataset.full) { var full = nt.textContent, star = /^★ /.test(full) ? "★ " : "", nm = full.replace(/^★ /, ""), sh = nm; try { sh = shortName(nm); } catch (e) {} nt.dataset.full = full; nt.title = nm; nt.textContent = star + sh; }
      var pn = li.querySelector(".panel"); if (pn) { openPanel = pn; openSid = id; }
    });
    // the open student's options show in a panel on the right (moved out of the card so it can sit on the side)
    var dr = $("ndDrawer"); if (!dr) { dr = document.createElement("aside"); dr.id = "ndDrawer"; dr.setAttribute("aria-label", "Student"); dr.hidden = true; document.body.appendChild(dr); }
    if (openPanel) { var y = dr.scrollTop; dr.innerHTML = '<button type="button" class="nd-x" data-act="toggle" data-id="' + esc(openSid) + '" aria-label="Close">✕</button>'; dr.appendChild(openPanel); dr.hidden = false; document.body.classList.add("nd-drawer"); if (dr.dataset.sid === openSid) dr.scrollTop = y; dr.dataset.sid = openSid; }
    else closeDrawer();
    filterCards();
  }
  function closeDrawer() { var dr = $("ndDrawer"); if (dr) { dr.hidden = true; dr.innerHTML = ""; dr.dataset.sid = ""; } document.body.classList.remove("nd-drawer"); }
  function filterCards() {
    var q = findQ.trim().toLowerCase();
    document.querySelectorAll("#grid li.item").forEach(function (li) { var nt = li.querySelector(".nt"), n = ((nt && nt.dataset.full) || (li.querySelector(".snm") || li).textContent).toLowerCase(); li.classList.toggle("nd-hide", !!q && n.indexOf(q) < 0); });
  }

  /* ---------- build ---------- */
  function build() {
    if ($("ndNav")) return;
    var nav = document.createElement("nav"); nav.id = "ndNav"; nav.setAttribute("aria-label", "Main menu"); nav.addEventListener("click", onNav); document.body.appendChild(nav);
    var top = document.createElement("div"); top.id = "ndTop"; top.innerHTML = '<button type="button" aria-label="Open the menu"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button><img src="logo.svg" alt=""><span>Student Island</span>';
    top.querySelector("button").onclick = function () { document.documentElement.classList.add("nd-menu"); }; document.body.appendChild(top);
    var shade = document.createElement("div"); shade.id = "ndShade"; shade.onclick = function () { document.documentElement.classList.remove("nd-menu"); }; document.body.appendChild(shade);
    var today = document.createElement("section"); today.id = "ndToday"; today.setAttribute("aria-label", "Today"); today.addEventListener("click", onToday);
    var wrap = document.querySelector(".wrap"), dash = $("dashView"); if (dash && dash.parentNode) dash.parentNode.insertBefore(today, dash.nextSibling); else if (wrap) wrap.appendChild(today); else document.body.appendChild(today);
    paintNav(); showToday();
    // keep the menu and Today up to date when the page redraws (new data, class changes)
    var r0 = window.render;
    if (typeof r0 === "function" && !r0.__nd) { var w = function () { var out = r0.apply(this, arguments); try { paintNav(); if (document.documentElement.classList.contains("nd-today")) paintToday(); else paintClass(); } catch (e) {} return out; }; w.__nd = true; window.render = w; }
    setInterval(function () { if (document.documentElement.classList.contains("nd-today") && !document.hidden) paintToday(); }, 60000);
    document.addEventListener("keydown", function (e) { if (e.key !== "Escape") return; var dr = $("ndDrawer"); if (dr && !dr.hidden && !document.querySelector(".modal:not([hidden])")) { var x = dr.querySelector(".nd-x"); if (x) x.click(); } });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(build, 0); }); else setTimeout(build, 0);
})();
