import re,sys
SRC=sys.argv[1]; OUT=sys.argv[2]
import os
__file__=os.path.abspath(sys.argv[0])
DESIGN=open(__file__.replace('build.py','design.css')).read() if '__file__' in globals() else open('design.css').read()
FONTS='<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Instrument+Serif:ital@0;1&family=Fredoka:wght@500;600;700&display=swap">'
GEO=open(os.path.join(os.path.dirname(__file__),'geo.svg.html')).read()
def rebrand(t):
    R=[('Hawar International School · Grade 8 Mathematics · 8B · 8Y · 8M · 8S','Math Island · XP for the maths classroom'),
       ('Hawar International School · Grade 8 Mathematics · ','Math Island · XP for the maths classroom · '),
       ('<div class="eyebrow">Hawar International School · Mathematics</div>','<div class="eyebrow">XP and rewards for the maths classroom</div>'),
       ('Hawar International School · Mathematics','Math Island · Mathematics'),
       ('<h1>Grade 8 Maths XP</h1>','<h1>Math Island</h1>'),
       ('<div class="formula" aria-label="Guardians of knowledge">حُرّاس المعرفة</div>','<div class="formula" aria-label="Effort adds up">∑ effort = progress</div>'),
       ('Grade 8 Mathematics Teacher\\nHawar International School','Mathematics Teacher'),
       ('Grade 8 ${esc(c)} · seat plan','Class ${esc(c)} · seat plan'),
       ('Class ${esc(st.cls)} · Grade 8 Mathematics','Class ${esc(st.cls)} · Mathematics'),
       ('<h2>Grade 8 ${esc(cls)} · dashboard</h2>','<h2>Class ${esc(cls)} · dashboard</h2>'),
       ('<em class="sym">x̄ =</em>','<em class="sym"><span class="ovl">x</span> =</em>'),
       ('Hawar International School','Math Island')]
    for a,b in R: t=t.replace(a,b)
    t=t.replace('<div class="scene" id="libScene" aria-hidden="true"></div>','<div class="scene" id="libScene" aria-hidden="true"></div>\n    <div class="geo" aria-hidden="true">'+GEO+'</div>',1)
    return t

L=open(SRC).read().split('\n')
def lines(a,b): return '\n'.join(L[a-1:b])      # 1-based inclusive
css=lines(7,[i for i,l in enumerate(L) if l.startswith("</style>")][0])
fonts=[l for l in L[:10] if 'fonts.googleapis.com/css2' in l][0]
# ---------------- student page ----------------
def find(pref, start=0):
    for i in range(start, len(L)):
        if L[i].startswith(pref): return i + 1          # 1-based line number
    raise SystemExit('anchor not found: ' + pref)
a0 = find('const $ = id => document.getElementById'); a1 = find('function titleTag(st)')
b0 = find('const SHOP_CATS = ['); b1 = find('function shopCard(') - 1
A=lines(a0,a1); B=lines(b0,b1)
stub='function isSotw(){return false}'
SIG=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'sig.snippet.html')).read()
student=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>My XP · Math Island</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
{fonts}
{FONTS}
<style>
{css}
{DESIGN}
.wrap{{max-width:760px}} #app{{display:grid;gap:16px}} #app .card h3{{margin:0;font-family:var(--f-display);font-size:20px}}
.topbar{{display:flex;justify-content:space-between;align-items:center;gap:10px}}
.topbar h1{{font-size:clamp(24px,5vw,32px)}}
.wk-box{{display:grid;gap:12px}} .wk-lesson{{display:grid;gap:8px}} .wk-lh b{{display:block;font-size:17px}} .wk-lh small{{color:var(--muted)}}
.wk-games{{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px}}
.wk-game{{display:grid;gap:2px;text-align:left;padding:10px 12px;border:2px solid var(--edge);border-radius:10px;background:var(--card);color:var(--ink);font:inherit;cursor:pointer}}
.wk-game b{{font-size:16px}} .wk-game small{{color:var(--muted);font-size:13px}} .wk-game.done{{border-color:#1e7a46}}
.wk-play{{position:fixed;inset:0;z-index:9999;background:#fff;display:flex;flex-direction:column}} .wk-play iframe{{flex:1;border:0;width:100%}}
.wk-x{{align-self:flex-end;margin:8px;padding:8px 14px;font:inherit;font-weight:800;border:2px solid #151412;border-radius:8px;background:#fffdf4;cursor:pointer}}
body.wk-noscroll{{overflow:hidden}}
.wk-list{{display:grid;gap:8px}} .wk-card{{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;border:2px solid var(--edge);border-radius:10px;background:var(--card)}}
.wk-card small{{display:block;color:var(--muted)}} .wk-card.done{{opacity:.75}} .wk-tick{{font-weight:800;color:#1e7a46}}
.wk-do form{{display:grid;gap:14px}} .wk-item p{{margin:0 0 6px;font-size:17px}} .wk-item input:not([type]){{font:inherit;font-size:18px;padding:10px 12px;width:100%;max-width:420px}}
.wk-mc{{display:grid;gap:6px}} .wk-mc label{{display:flex;gap:8px;align-items:center;font-size:17px;padding:8px 10px;border:2px solid var(--line, #ddd);border-radius:8px}}
.wk-note{{color:#b3261e;font-weight:600;margin:0;min-height:1.2em}} #work{{display:grid;gap:16px}} #work:not(:empty){{margin-bottom:16px}}
.pinset{{display:grid;gap:8px;max-width:420px}} #app > .pinset.card:first-child::before,#app > .pinset.card:first-child::after{{display:none}} .pinset input{{font:inherit;font-size:22px;letter-spacing:.3em;padding:10px 12px}} .pinset label{{font-weight:700;font-size:14px}} .pinmsg{{min-height:1.2em;margin:0;color:#b3261e;font-weight:600}}
</style></head><body>
<div class="wrap">
  <div class="topbar"><div><span class="mk" aria-hidden="true"></span><div><div class="eyebrow">Math Island</div><h1>My XP</h1></div></div><button class="ghost small" id="outBtn" type="button">Log out</button></div>
  <div id="work"></div>
  <div id="app"></div>
</div>
<div class="toast" id="toast" hidden></div>
<script>
{stub}
{A}
{B}
</script>
{SIG}
<script type="module" src="student.js"></script>
</body></html>'''
open(OUT+'/student.html','w').write(rebrand(student))

# ---------------- teacher page ----------------
T='\n'.join(L)
T=re.sub(r'<!--EXP-->.*?<!--/EXP-->','',T,flags=re.S)
T=T.replace('<title>Grade 8 Maths XP</title>','<title>Math Island · Teacher</title>',1)
shim='''<script>
/* The Claude version talked to window.claude. Here the same calls are answered by Firebase (see teacher.js). */
window.__ready = new Promise(r => { window.__resolveClaude = r; });
window.claude = { use: async n => (await window.__ready).use(n) };
</script>
'''
assert T.count('<script>\nconst POSITIVE')==1
T=T.replace('<script>\nconst POSITIVE', shim+'<script>\nconst POSITIVE',1)
hdr='<div class="sync"><span class="dot" id="syncDot"></span><span id="syncText">Connecting…</span></div>'
assert hdr in T
T=T.replace(hdr, hdr+'\n    <div class="acct"><button class="ghost small" id="workBtn" type="button">Classwork</button><button class="ghost small" id="loginsBtn" type="button">Student logins</button><button class="ghost small" id="impBtn" type="button">Import old data</button><input type="file" id="impFile" accept=".json,application/json" hidden><button class="ghost small" id="outBtn" type="button">Log out</button></div>',1)
extra_css='''
header.book .acct{position:relative;z-index:1;display:flex;gap:6px;flex-wrap:wrap;align-self:flex-start}
#loginsModal .sheet{width:min(720px,100%)}
.lg-tbl{width:100%;border-collapse:collapse;font-size:14px}
.lg-tbl th{text-align:left;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:6px 8px;border-bottom:2px solid var(--line)}
.lg-tbl td{padding:7px 8px;border-bottom:1px solid var(--line)}
.lg-tbl td.pin{font-family:var(--f-num);font-weight:700;font-size:16px;letter-spacing:.08em}
.lg-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.tab.addcls{border-style:dashed;font-weight:700}
.cl-row{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--line)}
#workModal .sheet,#progressModal .sheet{width:min(1100px,100%)}
.pg-card{border:2px solid var(--edge);border-radius:12px;padding:12px;margin:12px 0;background:var(--card)}
.pg-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:6px}.pg-head b{font-size:18px}.pg-head small{margin-left:8px;color:var(--muted)}
.pg-pc{font-weight:800}.pg-pc.hi{color:#1e7a46}.pg-pc.mid{color:#9a6a00}.pg-pc.lo{color:#b3261e}
.pg-mist{margin-top:8px}.pg-mist summary{font-weight:800;cursor:pointer}.pg-mist td{vertical-align:top}
.pg-link{display:inline-flex;align-items:center;text-decoration:none;color:inherit}
@media print{ body.pg-printing > #progressModal:not(#a):not(#b){display:block !important;position:static !important;background:#fff !important;padding:0 !important}
  body.pg-printing #progressModal .sheet{width:100% !important;max-height:none !important;overflow:visible !important;background:#fff;box-shadow:none !important;border:0 !important}
  body.pg-printing > :not(#progressModal){display:none !important} }
.wk-f{display:grid;gap:4px;margin:8px 0;font-weight:700;font-size:14px}.wk-f input{font:inherit;font-weight:400;padding:8px 10px}
.wk-cls{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;font-weight:400}
.wk-qs{display:grid;gap:12px;padding-left:22px}.wk-qs textarea{width:100%;font:inherit;padding:8px}
.wk-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.wk-row input{flex:1;min-width:180px;font:inherit;padding:6px 8px}.wk-row select{font:inherit}
.wk-acts{display:flex;gap:6px;flex-wrap:wrap}.wk-res{overflow-x:auto}.wk-res td{vertical-align:top}
.wk-ok{background:#e3f4e8}.wk-no{background:#fde6e4}.wk-miss td{color:var(--muted)}
.wk-q{margin-top:10px}.wk-q li{margin:4px 0}
@media print{ body.wk-printing > #workModal:not(#a):not(#b){display:block !important;position:static !important;background:#fff !important;padding:0 !important}
  body.wk-printing #workModal .sheet{width:100% !important;max-height:none !important;overflow:visible !important;color:#000;background:#fff;box-shadow:none !important;border:0 !important}
  body.wk-printing > :not(#workModal){display:none !important} body.wk-printing .wk-q{display:block} body.wk-printing details.wk-q > *{display:block} }
.lg-stale{margin:8px 0;padding:10px 12px;border:2px solid #b8860b;border-radius:8px;background:#fff6d6;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.lg-old{color:#b3261e;font-weight:700}
.lg-msg{font-size:13px;color:var(--muted);white-space:pre-line}
@media print{
  body > #loginsModal:not(#a):not(#b){display:block !important;position:static !important;background:#fff !important;padding:0 !important}
  #loginsModal .sheet{width:100% !important;max-height:none !important;overflow:visible !important;color:#000;background:#fff}
}
'''
T=T.replace('</style>', extra_css+'</style>',1) if False else T
# put the css right before the closing of the main style block (line 965 equivalent)
idx=T.find('</style>', T.find('<style>', T.find('<style>')+10))
T=T[:idx]+extra_css+T[idx:]
modal='''
<div class="modal" id="progressModal" hidden><div class="sheet pg-sheet" role="dialog" aria-modal="true" aria-label="Games progress"><div id="pgBody"></div></div></div>
<div class="modal" id="workModal" hidden><div class="sheet wk-sheet" role="dialog" aria-modal="true" aria-label="Classwork"><div id="wkBody"></div></div></div>
<div class="modal" id="classModal" hidden>
  <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="clTitle">
    <h3 id="clTitle">Your classes</h3>
    <p>Add each class you teach, like 7A, 9-B or 10C. Letters, numbers and a dash only, up to 8 characters.</p>
    <div class="lg-bar"><input id="clName" maxlength="8" placeholder="e.g. 7A" autocomplete="off" style="width:140px"><button class="primary" id="clAdd" type="button">Add class</button></div>
    <div class="lg-msg" id="clMsg"></div>
    <div id="clList"></div>
    <div class="acts"><button class="ghost" id="clClose" type="button">Close</button></div>
  </div>
</div>
<div class="modal" id="loginsModal" hidden>
  <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="lgTitle">
    <h3 id="lgTitle">Student logins</h3>
    <p class="noprint">Choose one starting PIN for the class. Every boy logs in with his ID and this PIN once, then he must choose his own PIN. You can always see his current PIN here.</p>
    <div class="lg-bar noprint">
      <label class="fld" style="grid-auto-flow:column;align-items:center;gap:8px"><span>Class</span><select id="lgCls"></select></label>
      <label class="fld" style="grid-auto-flow:column;align-items:center;gap:8px"><span>Starting PIN</span><input id="lgStart" inputmode="numeric" maxlength="6" placeholder="6 digits" autocomplete="off" style="width:110px"></label>
      <button class="primary" id="lgMake" type="button">Create logins for this class</button>
      <button class="ghost" id="lgDemo" type="button">Add 8 demo students</button>
    </div>
    <div class="lg-bar noprint" style="margin-top:6px">
      <button class="ghost" id="lgReset" type="button">Reset PINs for this class</button>
      <button class="ghost" id="lgResetAll" type="button">Reset PINs for all my classes</button>
    </div>
    <div class="lg-msg noprint" id="lgMsg"></div>
    <div id="lgMissing" class="noprint"></div>
    <div id="lgList"></div>
    <div class="acts noprint"><button class="ghost" id="lgPrint" type="button">Print this list</button><button class="ghost" id="lgClose" type="button">Close</button></div>
  </div>
</div>
'''
assert T.count('</body>')==1
T=T.replace('</body>', FONTS+'\n<style>\n'+DESIGN+'\n</style>\n'+modal+'<script type="module" src="teacher.js"></script>\n</body>',1)
btn_old='<button class="ghost" data-act="certPng">Download picture</button></span>'
assert T.count(btn_old)==1
T=T.replace(btn_old,'<button class="ghost" data-act="certPng">Download picture</button><button class="ghost" data-act="certClass">Post to Classroom</button></span>',1)
case_old='case "certPng": pngCert(); break;'
assert T.count(case_old)==1
T=T.replace(case_old,case_old+' case "certClass": certClassroom(); break;',1)
CLS=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'classroom.js')).read()
CLSCSS='''
.cls-panel{margin:12px 0;padding:14px;border:2px solid var(--edge);border-radius:12px;background:var(--card);display:grid;gap:10px}
.cls-panel h4{margin:0}.cls-panel p{margin:0;font-size:14px}
.cls-panel label{display:grid;gap:4px;font-size:13px;font-weight:600}
.cls-panel select,.cls-panel textarea{font:inherit;font-weight:400;width:100%}
.cls-msg{font-size:14px;min-height:1.2em}.cls-msg.bad{color:#b3261e;font-weight:600}
'''
T=T.replace('</body>','<style>'+CLSCSS+'</style>\n<script>\n'+CLS+'\n</script>\n</body>',1)
T=T.replace('</body>',SIG+'</body>',1)
T=rebrand(T)
open(OUT+'/teacher.html','w').write(T)
