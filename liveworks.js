// Interactive worksheets (worked examples + worksheet pages) that the teacher starts class by class.
// To add one: put its .html file next to the others and add an entry here. A new entry stays hidden from students
// until the teacher presses "Start" for a class (Tools -> Live worksheets).
//   was:   classes that already had it before this list existed (visible by default until the teacher changes it)
//   parts: progress chips [play id suffix, label]; the "ws" part is the worksheet and marks it done
//   pages: several pages in one card, [file, label]; they show no progress ticks
//   noWs:  only the worked-example page exists so far (no worksheet yet)
//   xp:    key in the lesson XP record (only the older lessons have XP)
const D = "Go through the worked examples first. Then the short worksheet opens.";
const G = "Do the examples, play the games, then do the multiple choice worksheet.";
const EL = ["8B", "8Y", "8S", "8M", "8D"];
export const LIVE_WS = [
  { id: "ineq43d2", title: "4.3 Inequalities Day 2", sub: "Exercise 4.3 · Day 2", file: "ineq43d2.html", desc: "Go through the worked example first. Then the short worksheet opens (about 10 minutes)." },
  { id: "ineq43", title: "Inequalities: number lines and integers", sub: "Exercise 4.3 · Day 1", file: "ineq43.html", desc: "Go through the worked example first. Then the short worksheet opens (about 10 minutes)." },
  { id: "graph42", title: "Graphing simultaneous equations", sub: "Exercise 4.2 · workbook class work", file: "graphpkg.html", xp: "graph42", desc: "Go through the two worked examples first. When you finish them, the worksheet opens." },
  { id: "sb42", title: "Substitution method: extra practice", sub: "Exercise 4.2 · new questions", file: "subst2.html", desc: "Put one equation into the other. Go through the examples first. Then the worksheet opens (6 to 8 minutes).", was: ["8Y", "8S", "8M", "8D"], xp: "sb42" },
  { id: "su42", title: "Simultaneous equations: substitution", sub: "Exercise 4.2 · Day 2", file: "subst.html", desc: "Go through the worked examples first. Then the short worksheet opens (5 to 7 minutes).", was: EL, xp: "su42" },
  { id: "el42", title: "Simultaneous equations: elimination", sub: "Exercise 4.2 · Day 1", file: "elim.html", desc: G, was: EL, xp: "el42", games: [["addsub", "Game 1"], ["solve", "Game 2"], ["spot", "Game 3"]] },
  { id: "eq41", title: "Exercise 4.1: Solving equations", sub: "Easy version", file: "eq41.html", desc: D, was: ["8G"], xp: "eq41" },
  { id: "ag34", title: "Lesson 3.4: Upper and lower bounds", sub: "Mon 9 Nov 2026", file: "ag34.html", desc: G, was: ["8G"], xp: "ag34", games: [["tap", "Game 1"], ["bound", "Game 2"], ["ineq", "Game 3"]] },
];
// Is this worksheet open for this class? Once the teacher has pressed Start/Stop, her saved choice wins; before that, "was" decides.
export const isLive = (w, open, cls) => { const c = String(cls || "").trim().toUpperCase(), o = open && open[w.id]; return o ? Object.keys(o).some(k => k.toUpperCase() === c && o[k]) : (w.was || []).some(k => k.toUpperCase() === c); };

// The worksheets above are the owner's. Other teachers (and their students) do not get them.
export function liveScope(ownerBase) { if (!ownerBase) LIVE_WS.length = 0; }

// Worksheets the teacher uploaded as an HTML file (work/<id> with kind "htmlws"). They join the list above, newest first.
export function setUploaded(docs) {
  for (let i = LIVE_WS.length - 1; i >= 0; i--) if (LIVE_WS[i].up) LIVE_WS.splice(i, 1);
  docs.filter(d => d && d.kind === "htmlws" && d.title).sort((a, b) => (a.created || 0) - (b.created || 0))
    .forEach(d => LIVE_WS.unshift({ id: d.id, title: d.title, sub: d.sub || "Uploaded worksheet", up: true, created: d.created || 0, desc: "Open the worksheet and finish it." }));
}
// What an uploaded worksheet gets on top of its own code: window.MI.done(right, wrong, mistakes) hands the result to the site.
export const MI_BRIDGE = '<script>window.MI={done:function(r,w,m){try{parent.postMessage({mi:"done",r:+r||0,w:+w||0,m:Array.isArray(m)?m.slice(-20).map(String):[]},"*")}catch(e){}},close:function(){try{parent.postMessage({mi:"close"},"*")}catch(e){}}};<\/script>';
// Watch & help inside a worksheet page: sends a picture of the page (as HTML) to the site while the teacher watches, and draws the teacher's pen.
export const WATCH_JS = "(function(){if(window.__miWatch)return;window.__miWatch=1;var on=false,t=0,cv=null;function snap(){try{var d=document.documentElement.cloneNode(true),src=document.querySelectorAll(\"input,textarea,select,canvas\"),dst=d.querySelectorAll(\"input,textarea,select,canvas\");for(var i=0;i<src.length&&i<dst.length;i++){var a=src[i],b=dst[i];if(a.id===\"__miPen\"){b.parentNode&&b.parentNode.removeChild(b);continue;}if(a.tagName===\"CANVAS\"){try{var im=document.createElement(\"img\");im.src=a.toDataURL(\"image/png\");im.setAttribute(\"style\",a.getAttribute(\"style\")||\"\");im.style.width=a.clientWidth+\"px\";im.style.height=a.clientHeight+\"px\";im.className=a.className;b.parentNode.replaceChild(im,b);}catch(e){}}else if(a.type===\"checkbox\"||a.type===\"radio\"){if(a.checked)b.setAttribute(\"checked\",\"\");else b.removeAttribute(\"checked\");}else if(a.tagName===\"SELECT\"){for(var k=0;k<b.options.length;k++){if(k===a.selectedIndex)b.options[k].setAttribute(\"selected\",\"\");else b.options[k].removeAttribute(\"selected\");}}else if(a.tagName===\"TEXTAREA\"){b.textContent=a.value;}else{b.setAttribute(\"value\",a.value);}}var ss=d.querySelectorAll(\"script\");for(var j=0;j<ss.length;j++)ss[j].parentNode.removeChild(ss[j]);var h=\"<!doctype html>\"+d.outerHTML;parent.postMessage({mi:\"snap\",h:h.length<450000?h:\"\",w:innerWidth,vh:innerHeight,y:Math.round(scrollY),dh:Math.max(document.documentElement.scrollHeight,innerHeight)},\"*\");}catch(e){}}function later(){clearTimeout(t);t=setTimeout(snap,250);}var mo=window.MutationObserver?new MutationObserver(function(rs){if(!on)return;for(var i=0;i<rs.length;i++){if(rs[i].target!==cv){later();return;}}}):null;function paint(list,ex){if(!cv){cv=document.createElement(\"canvas\");cv.id=\"__miPen\";cv.setAttribute(\"aria-hidden\",\"true\");cv.style.cssText=\"position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483647\";document.body.appendChild(cv);}var r=window.devicePixelRatio||1,W=Math.round(innerWidth*r),H=Math.round(innerHeight*r);if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;}var x=cv.getContext(\"2d\");x.clearRect(0,0,W,H);x.lineCap=\"round\";x.lineJoin=\"round\";(list||[]).concat(ex?[ex]:[]).forEach(function(s){if(!s||!s.p||!s.p.length)return;x.strokeStyle=s.c||\"#e0443e\";x.lineWidth=3.5*r;x.beginPath();s.p.forEach(function(p,i){var X=p[0]*W,Y=p[1]*H;if(i)x.lineTo(X,Y);else x.moveTo(X,Y);});if(s.p.length===1)x.lineTo(s.p[0][0]*W+.5,s.p[0][1]*H+.5);x.stroke();});}addEventListener(\"message\",function(e){if(e.source!==parent||!e.data||typeof e.data!==\"object\")return;var m=e.data;if(m.mi===\"watch\"){on=!!m.on;if(on){if(mo)mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,characterData:true});snap();}else{if(mo)mo.disconnect();paint([],null);}}if(m.mi===\"strokes\")paint(m.list,m.extra);if(m.mi===\"snapnow\")snap();});addEventListener(\"input\",function(){if(on)later();},true);addEventListener(\"change\",function(){if(on)later();},true);addEventListener(\"scroll\",function(){if(on)later();},{passive:true});addEventListener(\"resize\",function(){if(on)later();});})();";
export const withBridge = html => { const s = String(html || ""), add = MI_BRIDGE + "<script>" + WATCH_JS + "<\/script>"; return /<head[^>]*>/i.test(s) ? s.replace(/<head[^>]*>/i, m => m + add) : add + s; };
export const reportsItself = html => /MI\.done\s*\(/.test(String(html || ""));
