# Turns Khalid's standalone 9S Island page into island9s.html for Math Island.
# Run again with each new version of the page:  python3 build_island.py <his file> <out file>
import sys, re
src, out = sys.argv[1], sys.argv[2]
t = open(src, encoding="utf-8").read()
def rep(a, b, n=1):
    global t
    c = t.count(a)
    if c != n: sys.exit(f"build_island: expected {n} of {a[:60]!r}, found {c}")
    t = t.replace(a, b)

# 1. answers go to Math Island (a stand-in for the artifact database, ready before the games start)
rep('<head>\n', '''<head>
<script>window.MI = true; window.MI_EMBED = /[#&]g=/.test(location.hash); window.__islandDb = new Promise(r => { window.__resolveIsland = r; }); window.claude = { use: async n => (await window.__islandDb)(n) };</script>
''')
# 2. record each mistake: the question and what happened
rep('function track(ok) {\n  if (!curPlay) return;\n  if (ok) curPlay.r++; else curPlay.w++;',
    'function track(ok, info) {\n  if (!curPlay) return;\n  if (ok) curPlay.r++; else { curPlay.w++; if (info) curPlay.m = (curPlay.m || []).concat([{ q: info.q || "", a: info.a || "", at: Date.now() }]).slice(-20); }')
rep("curPlay = curStudent ? {", "curPlay = curStudent && window.MI_MODE !== 'teacher' ? {")
rep("bad(t) { if (done) return; mistakes++; track(false);", "bad(t) { if (done) return; mistakes++; track(false, { q: plain(say), a: plain(t) });")
rep("miss++; track(false);", "miss++; track(false, { q: 'Memory pairs', a: 'Turned over two cards that do not match' });")
rep("const esc = (s) =>", "const plain = (s) => { const d = document.createElement('div'); d.innerHTML = String(s || '').replace(/<span class=\"fr[^\"]*\"><span>(.*?)<\\/span><span class=\"b\"><\\/span><span>(.*?)<\\/span><\\/span>/g, ' $1/$2 '); return d.textContent.replace(/\\s+/g, ' ').trim(); };\nconst esc = (s) =>")
# 3. keep mistakes when syncing and merging
rep("{ s: p.s, g: p.g, l: p.l, r: p.r, w: p.w, t: p.t, u: p.u }", "{ s: p.s, g: p.g, l: p.l, r: p.r, w: p.w, t: p.t, u: p.u, m: p.m || [] }")
rep("plays[p.i] = { i: p.i, s: p.s, g: p.g, l: p.l, r: +p.r || 0, w: +p.w || 0, t: +p.t || 0, u: +p.u || 0, y: p.y || 0 };",
    "plays[p.i] = { i: p.i, s: p.s, g: p.g, l: p.l, r: +p.r || 0, w: +p.w || 0, t: +p.t || 0, u: +p.u || 0, y: p.y || 0, m: p.m || [] };")
rep("Object.assign(plays[p.i], { r: +p.r, w: +p.w, u: +p.u });", "Object.assign(plays[p.i], { r: +p.r, w: +p.w, u: +p.u, m: p.m || plays[p.i].m || [] });")
# 4. teacher results: list of mistakes per student, and in the Excel file
rep("const rows = [['Student', 'Game', 'Lesson', 'Level', 'Right', 'Wrong', 'Percent right', 'Started', 'Last answer']];",
    "const rows = [['Student', 'Game', 'Lesson', 'Level', 'Right', 'Wrong', 'Percent right', 'Started', 'Last answer', 'Mistakes (question -> what he was told)']];")
rep("pct(p.r, p.w) ?? '', new Date(p.t).toISOString(), p.u ? new Date(p.u).toISOString() : '']);",
    "pct(p.r, p.w) ?? '', new Date(p.t).toISOString(), p.u ? new Date(p.u).toISOString() : '', (p.m || []).map(x => x.q + ' -> ' + x.a).join(' | ')]);")
rep("<table><thead><tr><th>Game</th><th>Right</th><th>Correct / all</th><th>Plays</th></tr></thead><tbody>${rows}</tbody></table></article>`);",
    "<table><thead><tr><th>Game</th><th>Right</th><th>Correct / all</th><th>Plays</th></tr></thead><tbody>${rows}</tbody></table>${mistakesHTML(ST.id)}</article>`);")
rep("function results() {", """function mistakesHTML(sid) {
  const list = Object.values(plays).filter(p => p.s === sid).flatMap(p => (p.m || []).map(x => ({ ...x, g: p.g, l: p.l }))).sort((a, b) => b.at - a.at).slice(0, 40);
  if (!list.length) return '';
  return `<details class="mist"><summary>Mistakes (${list.length}${list.length === 40 ? ', newest' : ''})</summary><table><thead><tr><th>When</th><th>Game</th><th>Question</th><th>What he was told</th></tr></thead><tbody>${list.map(x => `<tr><td>${dstr(x.at)}</td><td>${esc(gameTitle(x.g))}<small>Level ${x.l}</small></td><td>${esc(x.q)}</td><td>${esc(x.a)}</td></tr>`).join('')}</tbody></table></details>`;
}
function results() {""")
rep(".rcard{", ".mist{margin-top:10px}.mist summary{font-weight:800;cursor:pointer}.mist td{vertical-align:top;font-weight:600;font-size:14px}\n.mi-student #swbtn{display:none!important}\n#miBack{position:fixed;left:10px;bottom:10px;z-index:50}.mi-embed #miBack{display:none!important}\n.rcard{")
# 5. text, start-up and hooks for the adapter
rep("Stars and answers are saved on this device for your teac", "Stars are saved on this device. Your answers go to your teac")
rep("function home() {\n  if (!curStudent) { who(); return; }", "function home() {\n  if (window.MI_EMBED) { try { parent.postMessage('mi-close', location.origin); } catch (e) {} return; }\n  if (!curStudent) { who(); return; }")
rep("/*T2*/\nhome();", """/*T2*/
function setStudent(id) { const ST = STUDENTS.find(x => x.id === id); if (!ST) return false; curStudent = id; curGroup = ST.group; document.body.classList.toggle('big', ST.group === 'g2'); return true; }
function openGame(id) { const g = GAMES.find(x => x.id === id); if (g) levelSelect(g); else message('Game not found', 'Ask your teacher.'); }
function message(h, p) { setBack(null); mount(html(`<section><h1>${esc(h)}</h1><p class="lead">${esc(p)}</p></section>`)); }
window.__island = { chooseStudent, who, results, message, setStudent, openGame };
if (window.MI) mount(html('<section><p class="lead">Loading…</p></section>')); else home();""")
rep("</html>", """<button class="btn small alt" id="miBack" type="button">Back to Math Island</button>
<script type="module" src="island.js"></script>
</html>""")
rep("<title>9S Island</title>", "<title>My classwork · Math Island</title>")
rep("      <span>9S Island</span>", "      <span>My classwork</span>")
open(out, "w", encoding="utf-8").write(t)
print("ok", out)
