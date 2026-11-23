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
    ":root.nd.nd{--paper:#F4F9FA;--grid:#F4F9FA;--card:#FFFFFF;--ink:#0F2A3A;--muted:#4E6675;--line:#D3E4E7;--edge:#D3E4E7;--accent:#0B6E69;--accent-soft:#D7F0EC;--good:#0B7A5A;--good-soft:#DFF3EC;--bad:#C43E24;--bad-soft:#FBE6E1;--gold:#B7791F;--gold-soft:#FFF3CC;--f-display:Unbounded,'Segoe UI',system-ui,sans-serif;--f-body:Figtree,'Segoe UI',system-ui,sans-serif;--shadow:0 1px 2px rgba(15,42,58,.05),0 6px 20px rgba(15,42,58,.06);color-scheme:light}",
    "html.nd body{background:#F4F9FA!important;background-image:none!important;font-family:var(--f-body)!important;color:#0F2A3A}",
    "html.nd header.book,html.nd .ruler,html.nd nav.views,html.nd #ndTry{display:none!important}",
    "html.nd .wrap{margin-left:248px!important;max-width:none!important;padding:28px 36px 60px!important;box-sizing:border-box}",
    "html.nd .card,html.nd .stat,html.nd .sitem,html.nd .grp,html.nd .ins-c,html.nd .cb-btn,html.nd .empty{border:1px solid #D3E4E7!important;border-radius:20px!important;box-shadow:var(--shadow)!important;background:#fff}",
    "html.nd h1,html.nd h2,html.nd h3{font-family:var(--f-display);letter-spacing:-.01em}",
    "html.nd .shop-intro h2{font-size:30px}",
    "html.nd button.primary{background:#0F2A3A!important;border-color:#0F2A3A!important;color:#fff!important;border-radius:14px!important}",
    "html.nd button.ghost{border-radius:14px!important}",
    "html.nd .shop-tab{border-radius:99px!important}",
    "html.nd .shop-tab[aria-pressed=true]{background:#0F2A3A!important;color:#fff!important;border-color:#0F2A3A!important}",
    /* sidebar */
    "#ndNav{position:fixed;left:0;top:0;bottom:0;width:248px;z-index:900;background:#0F2A3A;color:#E3F2F0;display:flex;flex-direction:column;gap:18px;padding:22px 14px 16px;box-sizing:border-box;overflow-y:auto;font-family:var(--f-body)}",
    "#ndNav .nd-brand{display:flex;align-items:center;gap:10px;padding:0 8px;font-family:var(--f-display);font-weight:700;font-size:16px}",
    "#ndNav .nd-g{display:flex;flex-direction:column;gap:2px}",
    "#ndNav button{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:12px;width:100%;padding:10px 12px;border-radius:12px;cursor:pointer;font-weight:600;font-size:15px;color:#E3F2F0}",
    "#ndNav button:hover{background:#173B4F}",
    "#ndNav button:focus-visible{outline:2px solid #FFC83D;outline-offset:1px}",
    "#ndNav button.on{background:#12A39A;color:#06221F;font-weight:700}",
    "#ndNav .nd-sub{display:none;flex-direction:column;gap:0;padding:2px 0 6px 34px}",
    "#ndNav .nd-g.open .nd-sub{display:flex}",
    "#ndNav .nd-sub button{padding:7px 10px;font-size:14px;font-weight:500;color:#B9D6DA}",
    "#ndNav .nd-sub button.on{background:transparent;color:#FFC83D;font-weight:700}",
    "#ndNav .nd-sub small{margin-left:auto;color:#7FA3AA;font-weight:600}",
    "#ndNav svg{flex:none}",
    "#ndNav .nd-badge{margin-left:auto;background:#FFC83D;color:#0F2A3A;border-radius:99px;font-size:12px;font-weight:800;padding:1px 8px}",
    "#ndNav .nd-me{margin-top:auto;display:flex;align-items:center;gap:10px;padding:12px;border-radius:14px;background:#173B4F}",
    "#ndNav .nd-me b{display:block;font-size:14px}#ndNav .nd-me span{font-size:12px;color:#9DC0C5}#ndNav .nd-me .nd-av{color:#0F2A3A;font-size:13px}",
    "#ndNav .nd-av{width:36px;height:36px;border-radius:50%;background:#FFC83D;color:#0F2A3A;display:grid;place-items:center;font-family:var(--f-display);font-weight:700;font-size:13px;flex:none}",
    "#ndTop{display:none}",
    /* today */
    "#ndToday{display:none;flex-direction:column;gap:24px}",
    "html.nd-today #ndToday{display:flex}",
    "html.nd-today #studentsView,html.nd-today #cupView,html.nd-today #shopView,html.nd-today #hubView,html.nd-today #toolsView,html.nd-today #dashView{display:none!important}",
    ".nd-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:12px}",
    ".nd-head span{font-size:15px;color:#4E6675;font-weight:600}",
    ".nd-head h1{margin:6px 0 0;font-family:var(--f-display);font-weight:700;font-size:34px;line-height:1.1}",
    ".nd-tide{position:relative;background:#0F2A3A;color:#E3F2F0;border-radius:26px;padding:24px 28px 26px;overflow:hidden}",
    ".nd-tide svg.wave{position:absolute;left:0;right:0;bottom:0;width:100%;height:110px}",
    ".nd-tide h2{position:relative;margin:0 0 16px;font-size:17px;font-family:var(--f-display);color:#E3F2F0}",
    ".nd-tide ol{position:relative;list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px}",
    ".nd-tide li{display:flex;flex-direction:column;gap:5px}",
    ".nd-tide li b{font-family:var(--f-display);font-size:20px}",
    ".nd-tide li span{font-size:13px}",
    ".nd-tide li.done{opacity:.55}",
    ".nd-tide li.now{background:#FFC83D;color:#0F2A3A;border-radius:16px;padding:12px 14px;margin:-12px 0}",
    ".nd-cols{display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start}",
    ".nd-main{flex:999 1 520px;min-width:0;display:flex;flex-direction:column;gap:24px}",
    ".nd-side{flex:1 1 300px;min-width:0;display:flex;flex-direction:column;gap:16px}",
    ".nd-box{background:#fff;border:1px solid #D3E4E7;border-radius:22px;padding:22px;display:flex;flex-direction:column;gap:14px;box-shadow:var(--shadow)}",
    ".nd-box h2{margin:0;font-family:var(--f-display);font-size:19px;font-weight:700}",
    ".nd-kick{font-size:14px;color:#0B6E69;font-weight:700}",
    ".nd-acts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}",
    ".nd-act{all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;gap:8px;padding:16px;border-radius:16px;background:#F4F9FA;border:1px solid #D3E4E7;color:#0F2A3A}",
    ".nd-act:hover{border-color:#12A39A}.nd-act:focus-visible{outline:3px solid #FFC83D}",
    ".nd-act b{font-size:15px}.nd-act span{font-size:13px;color:#4E6675}",
    ".nd-cls{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}",
    ".nd-cc{all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;gap:12px;padding:18px;border-radius:20px;background:#fff;border:1px solid #D3E4E7;box-shadow:var(--shadow)}",
    ".nd-cc:hover{border-color:#12A39A}.nd-cc:focus-visible{outline:3px solid #FFC83D}",
    ".nd-cc .t{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}",
    ".nd-cc .t b{font-family:var(--f-display);font-size:24px;display:block}.nd-cc .t small{font-size:13px;color:#4E6675}",
    ".nd-cc .xp{background:#FFF3CC;color:#6B4A00;border-radius:99px;padding:5px 12px;font-weight:800;font-size:13px;white-space:nowrap}",
    ".nd-bar{height:8px;border-radius:99px;background:#E4EEF0;overflow:hidden}.nd-bar i{display:block;height:100%;border-radius:99px}",
    ".nd-row{display:flex;justify-content:space-between;font-size:13px;color:#4E6675}.nd-row b{color:#0F2A3A}",
    ".nd-pn{display:flex;gap:8px;flex-wrap:wrap;font-size:13px}.nd-pn span{border-radius:10px;padding:5px 10px;font-weight:700}",
    ".nd-todo{all:unset;box-sizing:border-box;cursor:pointer;display:flex;gap:12px;align-items:flex-start;padding:12px;border-radius:14px;background:#F4F9FA}",
    ".nd-todo:hover{background:#E9F3F4}.nd-todo i{flex:none;width:10px;height:10px;border-radius:50%;margin-top:6px}",
    ".nd-todo b{display:block;font-size:15px}.nd-todo span{font-size:13px;color:#4E6675}",
    ".nd-none{color:#4E6675;font-size:14px}",
    /* phone and the app */
    "@media (max-width:900px){html.nd .wrap{margin-left:0!important;padding:76px 14px 40px!important}",
    "#ndNav{transform:translateX(-105%);transition:transform .2s;box-shadow:0 0 40px rgba(0,0,0,.3)}html.nd-menu #ndNav{transform:none}",
    "#ndTop{display:flex;position:fixed;left:0;right:0;top:0;z-index:899;height:60px;align-items:center;gap:12px;padding:0 14px;background:#0F2A3A;color:#fff;font-family:var(--f-display);font-weight:700}",
    "#ndTop button{all:unset;cursor:pointer;width:44px;height:44px;display:grid;place-items:center;border-radius:12px}",
    "#ndShade{display:none}html.nd-menu #ndShade{display:block;position:fixed;inset:0;z-index:898;background:rgba(15,42,58,.45)}.nd-tide li.now{margin:0}}",
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
    nav.innerHTML = '<div class="nd-brand"><svg width="32" height="32" viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="17" r="16" fill="#12A39A"/><path d="M5 22c4-3 8-3 12 0s8 3 12 0" stroke="#F4F9FA" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M17 8v9M13 12l4-4 4 4" stroke="#FFC83D" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>Student Island</div>'
      + menu.map(function (g) {
        var groupOn = sel === g.k || (g.sub || []).some(function (s) { return s.k === sel; });
        return '<div class="nd-g' + (openGroup === g.k || groupOn ? " open" : "") + '"><button type="button" class="' + (sel === g.k ? "on" : "") + '" data-nd="' + g.k + '" aria-expanded="' + (g.sub ? String(openGroup === g.k || groupOn) : "") + '">' + svg(g.k) + esc(g.label) + "</button>"
          + (g.sub ? '<div class="nd-sub">' + g.sub.map(function (s) { return '<button type="button" class="' + (sel === s.k ? "on" : "") + '" data-nd="' + esc(s.k) + '">' + esc(s.label) + (s.n != null ? "<small>" + s.n + "</small>" : "") + "</button>"; }).join("") + "</div>" : "") + "</div>";
      }).join("")
      + '<div class="nd-me"><span class="nd-av">' + esc(ini || "T") + '</span><span><b>' + esc(name) + "</b><span>Mathematics</span></span></div>";
  }
  function onNav(e) {
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
  function showToday() { sel = "today"; document.documentElement.classList.add("nd-today"); paintToday(); paintNav(); try { window.scrollTo(0, 0); } catch (e) {} }
  function paintToday() {
    var box = $("ndToday"); if (!box) return;
    var I2 = null; try { I2 = insights(); } catch (e) {}
    var name = (typeof TNAME !== "undefined" && TNAME) || "";
    var now = new Date(Date.now() + 3 * 3600e3), hr = now.getUTCHours(), hello = hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";
    var dateStr = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    var tt = []; try { tt = window.__todayTT ? window.__todayTT() : []; } catch (e) {}
    var live = null; try { live = window.__liveLesson ? window.__liveLesson() : null; } catch (e) {}
    var nowCls = live ? live.cls : (classes()[0] || "");
    var h = '<div class="nd-head"><div><span>' + esc(dateStr) + '</span><h1>' + hello + (name ? ", " + esc(name.replace(/\s+O$/, "")) : "") + '</h1></div></div>';
    if (tt.length) {
      h += '<section class="nd-tide" aria-label="Today\'s lessons"><svg class="wave" viewBox="0 0 1100 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 70 C 90 30 180 30 275 70 S 460 110 550 70 S 735 30 825 70 S 1010 110 1100 70 V120 H0Z" fill="#173B4F"/><path d="M0 70 C 90 30 180 30 275 70 S 460 110 550 70 S 735 30 825 70 S 1010 110 1100 70" fill="none" stroke="#12A39A" stroke-width="3"/></svg>'
        + "<h2>Today's lessons</h2><ol>" + tt.map(function (l) { return '<li class="' + l.state + '"><span>' + (l.state === "now" ? "Now · " + l.left + " min left" : esc(l.s) + (l.state === "done" ? " · done" : "")) + "</span><b>" + esc(l.cls) + "</b><span>until " + esc(l.e) + "</span></li>"; }).join("") + "</ol></section>";
    }
    var act = function (k, title, sub) { return '<button type="button" class="nd-act" data-ndt="' + k + '"><b>' + esc(title) + "</b><span>" + esc(sub) + "</span></button>"; };
    h += '<div class="nd-cols"><div class="nd-main">';
    h += '<section class="nd-box"><span class="nd-kick">' + (live ? (live.now ? "Now teaching · " + esc(nowCls) + " · " + live.left + " min left" : "Next · " + esc(nowCls) + " in " + live.startsIn + " min") : "Quick start · " + esc(nowCls)) + "</span><h2>What do you need for " + esc(nowCls) + "?</h2><div class=\"nd-acts\">"
      + act("att", "Attendance", "Mark who is here") + act("wbc", "Notebook classwork", "Done · working · not done") + act("lw", "Live worksheets", "Start one for the class") + act("wh", "Watch & help", "See a student's screen") + act("ml", "My lessons", "Open the slides") + act("cls", "Give XP", "Open " + nowCls) + "</div></section>";
    if (I2 && I2.clsRows) {
      h += '<section aria-label="My classes" style="display:flex;flex-direction:column;gap:12px"><div class="nd-row" style="font-size:15px"><h2 style="margin:0;font-family:var(--f-display);font-size:20px;color:#0F2A3A">My classes</h2></div><div class="nd-cls">'
        + I2.clsRows.map(function (r) { var a = r.att, col = a === null ? "transparent" : a >= 85 ? "#12A39A" : a >= 75 ? "#E0A100" : "#C43E24";
          return '<button type="button" class="nd-cc" data-ndc="' + esc(r.c) + '"><span class="t"><span><b>' + esc(r.c) + "</b><small>" + r.n + ' students</small></span><span class="xp">' + r.avg + ' XP avg</span></span>'
            + '<span class="nd-row"><span>Attendance · 30 days</span><b>' + (a === null ? "not recorded" : a + "%") + '</b></span><span class="nd-bar"><i style="width:' + (a || 0) + "%;background:" + col + '"></i></span>'
            + '<span class="nd-pn"><span style="background:#DFF3EC;color:#0B5F45">+' + r.pos + ' positive</span><span style="background:#FBE6E1;color:#9A2F1A">' + r.neg + " deductions</span></span></button>"; }).join("") + "</div></section>";
    }
    h += '</div><aside class="nd-side">';
    var todo = [];
    try { var req = students.filter(function (s) { return (s.reqs || []).length; }).reduce(function (a, s) { return a + s.reqs.length; }, 0); if (req) todo.push({ k: "shop", dot: "#12A39A", t: req + " shop request" + (req === 1 ? "" : "s"), s: "Approve or refuse" }); } catch (e) {}
    try { var owe = students.filter(function (s) { return typeof bkOwing === "function" && bkOwing(s).length; }); if (owe.length) todo.push({ k: "books", dot: "#E0A100", t: owe.length + " notebook" + (owe.length === 1 ? "" : "s") + " still owed", s: "Notebook submission" }); } catch (e) {}
    if (I2 && I2.attention) I2.attention.slice(0, 4).forEach(function (p) { todo.push({ k: "c:" + p.st.cls, dot: "#C43E24", t: (p.st.name || "").split(" ").slice(0, 2).join(" ") + " · " + p.st.cls, s: p.reasons.join(" · ") }); });
    h += '<section class="nd-box"><h2>Needs you</h2>' + (todo.length ? todo.map(function (x) { return '<button type="button" class="nd-todo" data-ndt="' + esc(x.k) + '"><i style="background:' + x.dot + '"></i><span><b>' + esc(x.t) + "</b><span>" + esc(x.s) + "</span></span></button>"; }).join("") : '<p class="nd-none">Nothing is waiting for you. Enjoy the day.</p>') + "</section>";
    if (I2 && I2.top && I2.top.length) h += '<section class="nd-box" style="background:#D7F0EC;border-color:#D7F0EC"><h2 style="color:#06403C">Stars of the month</h2>' + I2.top.slice(0, 5).map(function (p, i) { return '<div class="nd-row" style="font-size:15px;color:#06403C"><span><b style="font-family:var(--f-display);margin-right:10px">' + (i + 1) + "</b>" + esc((p.st.name || "").split(" ").slice(0, 2).join(" ")) + " · " + esc(p.st.cls) + "</span><b>+" + p.posXP30 + " XP</b></div>"; }).join("") + "</section>";
    h += "</aside></div>";
    box.innerHTML = h;
    box.dataset.cls = nowCls;
  }
  function onToday(e) {
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

  /* ---------- build ---------- */
  function build() {
    if ($("ndNav")) return;
    var nav = document.createElement("nav"); nav.id = "ndNav"; nav.setAttribute("aria-label", "Main menu"); nav.addEventListener("click", onNav); document.body.appendChild(nav);
    var top = document.createElement("div"); top.id = "ndTop"; top.innerHTML = '<button type="button" aria-label="Open the menu"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button><span>Student Island</span>';
    top.querySelector("button").onclick = function () { document.documentElement.classList.add("nd-menu"); }; document.body.appendChild(top);
    var shade = document.createElement("div"); shade.id = "ndShade"; shade.onclick = function () { document.documentElement.classList.remove("nd-menu"); }; document.body.appendChild(shade);
    var today = document.createElement("section"); today.id = "ndToday"; today.setAttribute("aria-label", "Today"); today.addEventListener("click", onToday);
    var wrap = document.querySelector(".wrap"), dash = $("dashView"); if (dash && dash.parentNode) dash.parentNode.insertBefore(today, dash.nextSibling); else if (wrap) wrap.appendChild(today); else document.body.appendChild(today);
    paintNav(); showToday();
    // keep the menu and Today up to date when the page redraws (new data, class changes)
    var r0 = window.render;
    if (typeof r0 === "function" && !r0.__nd) { var w = function () { var out = r0.apply(this, arguments); try { paintNav(); if (document.documentElement.classList.contains("nd-today")) paintToday(); } catch (e) {} return out; }; w.__nd = true; window.render = w; }
    setInterval(function () { if (document.documentElement.classList.contains("nd-today") && !document.hidden) paintToday(); }, 60000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(build, 0); }); else setTimeout(build, 0);
})();
