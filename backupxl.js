// "Backup (Excel)": one click, one .xlsx file with a sheet for everything about the teacher's students.
// It reads (never changes) the data of the signed-in teacher's own folder. PINs are not included.
import { getDocs, bcol } from "./fb.js?v=1122g";
import { gradeData } from "./teacherwork.js?v=1122g";

const loadXl = () => window.ExcelJS ? Promise.resolve() : new Promise((res, rej) => { const sc = document.createElement("script"); sc.src = "exceljs.min.js?v=1122g"; sc.onload = res; sc.onerror = () => rej(new Error("Could not load the Excel library")); document.head.appendChild(sc); });
const rd = async name => { try { return (await getDocs(bcol(name))).docs.map(d => ({ id: d.id, ...d.data() })); } catch { return []; } };
const dt = t => { const n = typeof t === "number" ? t : Date.parse(t); return n ? new Date(n).toLocaleString("en-GB", { timeZone: "Asia/Bahrain", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""; };
const dOnly = t => { const n = typeof t === "number" ? t : Date.parse(t); return n ? new Date(n).toLocaleDateString("en-GB", { timeZone: "Asia/Bahrain", day: "2-digit", month: "short", year: "numeric" }) : (t || ""); };
const num = v => (typeof v === "number" && isFinite(v)) ? v : (v === undefined || v === null || v === "" ? "" : Number(v) || 0);

export async function downloadBackup(btn) {
  const old = btn ? btn.textContent : ""; if (btn) { btn.disabled = true; btn.textContent = "Preparing…"; }
  try {
    await loadXl();
    const [students, logins, work, subsRaw, plays, msgs, cup, att, hw, tests, sotw, parents, meta] = await Promise.all(
      ["students", "logins", "work", "subs", "plays", "msgs", "cup", "att", "hw", "tests", "sotw", "parents", "meta"].map(rd));
    let gd = { works: [], subs: [] }; try { gd = await gradeData(); } catch {}
    const byId = new Map(students.map(s => [s.id, s]));
    const nameOf = id => (byId.get(id) || {}).name || id, clsOf = id => (byId.get(id) || {}).cls || "";
    const sorted = [...students].sort((a, b) => String(a.cls).localeCompare(String(b.cls)) || String(a.name).localeCompare(String(b.name)));

    const wb = new ExcelJS.Workbook(); wb.creator = "Student Island"; wb.created = new Date();
    const NAVY = "FF1F3A6E";
    const sheet = (name, heads, rows, widths) => {
      const ws = wb.addWorksheet(name.slice(0, 31), { views: [{ state: "frozen", ySplit: 1 }] });
      ws.addRow(heads);
      const h = ws.getRow(1); h.height = 22;
      h.eachCell(c => { c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } }; c.alignment = { vertical: "middle", wrapText: true }; });
      rows.forEach(r => ws.addRow(r));
      (widths || []).forEach((w, i) => { ws.getColumn(i + 1).width = w; });
      if (rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: heads.length } };
      return ws;
    };

    sheet("Students", ["Class", "Name", "ID", "XP (this month)", "Carried XP", "Spent XP", "Wallet", "Items owned", "Purchases", "Created"],
      sorted.map(s => [s.cls, s.name, s.enrollment || s.id, num(s.xp), num(s.carry), num(s.spent), Math.max(0, (Number(s.xp) || 0) + (Number(s.carry) || 0) - (Number(s.spent) || 0)), (s.owned || []).length, num(s.buys), dOnly(s.createdAt)]),
      [8, 28, 16, 14, 12, 11, 10, 12, 11, 14]);

    const xp = [];
    sorted.forEach(s => [...(s.hist || []), ...(s.log || [])].forEach(e => xp.push([s.cls, s.name, dt(e.at), e.title || "", num(e.xp), e.kind === "neg" ? "Negative" : "Positive", e.other || "", e.at])));
    xp.sort((a, b) => String(a[0]).localeCompare(String(b[0])) || String(a[1]).localeCompare(String(b[1])) || (Date.parse(a[7]) || 0) - (Date.parse(b[7]) || 0));
    sheet("XP log", ["Class", "Student", "Date", "Activity", "XP", "Type", "Other student"], xp.map(r => r.slice(0, 7)), [8, 28, 20, 36, 8, 11, 24]);

    const item = k => { try { return (typeof shopItem === "function" && shopItem(k) && (shopItem(k).name || shopItem(k).title)) || k; } catch { return k; } };
    const sp = []; sorted.forEach(s => (s.sp || []).forEach(e => sp.push([s.cls, s.name, dt(e.at), ({ buy: "Bought", request: "Requested", done: "Delivered", refund: "Refunded" })[e.t] || e.t || "", item(e.k), num(e.price)])));
    sheet("Shop activity", ["Class", "Student", "Date", "Action", "Item", "Price (XP)"], sp, [8, 28, 20, 12, 30, 12]);

    const cats = new Set(); cup.forEach(c => Object.keys(c.cats || {}).forEach(k => cats.add(k)));
    const ct = k => { try { return (typeof CUP_CATS !== "undefined" && CUP_CATS.find(x => x.key === k) || {}).title || k; } catch { return k; } };
    sheet("Class cup", ["Week", "Class", ...[...cats].map(ct)], cup.sort((a, b) => String(a.week).localeCompare(String(b.week)) || String(a.cls).localeCompare(String(b.cls))).map(c => [c.week, c.cls, ...[...cats].map(k => num((c.cats || {})[k]) || 0)]), [14, 8]);

    const AT = { p: "Present", l: "Late", a: "Absent", s: "Absent, in school" };
    const ar = []; att.forEach(d => Object.entries(d.m || {}).forEach(([sid, st]) => ar.push([d.date || String(d.id).split("_")[0], d.cls || clsOf(sid), nameOf(sid), AT[st] || st])));
    ar.sort((a, b) => String(a[0]).localeCompare(String(b[0])) || String(a[1]).localeCompare(String(b[1])) || String(a[2]).localeCompare(String(b[2])));
    sheet("Attendance", ["Date", "Class", "Student", "Status"], ar, [14, 8, 28, 20]);

    const HW = { d: "Done", l: "Late", x: "Excused" }, hr = [];
    hw.forEach(h => students.filter(s => s.cls === h.cls).forEach(s => hr.push([h.title, h.cls, h.due || "", s.name, HW[(h.done || {})[s.id]] || "Missing"])));
    sheet("Homework", ["Homework", "Class", "Due", "Student", "Status"], hr, [30, 8, 14, 28, 12]);

    const tr = []; tests.forEach(t => students.filter(s => s.cls === t.cls).forEach(s => { const v = (t.scores || {})[s.id]; tr.push([t.title, t.cls, t.date || "", s.name, v === undefined || v === "" ? "" : num(v), num(t.max), v === undefined || v === "" || !t.max ? "" : Math.round(100 * Number(v) / Number(t.max))]); }));
    sheet("Tests and marks", ["Test", "Class", "Date", "Student", "Score", "Out of", "%"], tr, [30, 8, 14, 28, 9, 9, 7]);

    const ws = work.filter(w => !["material", "announcement", "funpark", "liveopen", "remind", "mylessons"].includes(w.kind) && Array.isArray(w.questions));
    sheet("Worksheets", ["Title", "Classes", "Created", "Open", "Graded", "Questions", "Test mode"], ws.sort((a, b) => (a.created || 0) - (b.created || 0)).map(w => [w.title, (w.classes || []).join(", "), dt(w.created), w.open === false ? "Closed" : "Open", w.graded ? "Yes" : "No", (w.questions || []).length, w.test && w.test.on ? "Yes" : ""]), [34, 16, 20, 9, 9, 10, 10]);

    const wt = new Map(gd.works.map(w => [w.id, w.title])), subAt = new Map(subsRaw.map(x => [x.wid + "|" + x.sid, x.at]));
    sheet("Worksheet marks", ["Worksheet", "Class", "Student", "Handed in", "Right", "Out of", "%"],
      gd.subs.filter(x => x.n > 0).map(x => [wt.get(x.wid) || x.wid, clsOf(x.sid), nameOf(x.sid), dt(subAt.get(x.wid + "|" + x.sid)), x.right, x.n, Math.round(100 * x.right / x.n)]).sort((a, b) => String(a[0]).localeCompare(String(b[0])) || String(a[2]).localeCompare(String(b[2]))),
      [34, 8, 28, 20, 8, 8, 7]);

    sheet("Game results", ["Student", "Class", "Game", "Right", "Wrong", "Date"],
      plays.filter(p => p.sid).map(p => [nameOf(p.sid), clsOf(p.sid), p.g || "", num(p.r), num(p.w), dt(p.u || p.t)]).sort((a, b) => String(a[1]).localeCompare(String(b[1])) || String(a[0]).localeCompare(String(b[0]))),
      [28, 8, 28, 8, 8, 20]);

    sheet("Messages", ["Student", "Class", "From", "Message", "Date"],
      msgs.map(m => [m.name || nameOf(m.sid), m.cls || clsOf(m.sid), m.from === "student" ? "Student" : "Teacher", m.text || "", dt(m.at), m.at || 0]).sort((a, b) => String(a[1]).localeCompare(String(b[1])) || String(a[0]).localeCompare(String(b[0])) || a[5] - b[5]).map(r => r.slice(0, 5)),
      [26, 8, 10, 70, 20]);

    sheet("Student of the week", ["Class", "Student", "Week", "Paid"], sotw.map(s => [s.cls || s.id, nameOf(s.sid), s.week || "", s.paid ? "Yes" : "No"]), [8, 28, 14, 8]);

    sheet("Parents", ["Class", "Student", "Father email", "Mother email"],
      sorted.map(s => { const r = parents.find(p => p.id === s.id) || parents.find(p => p.id === String(s.enrollment || "").trim()) || {}; return [s.cls, s.name, r.f || "", r.m || ""]; }).filter(r => r[2] || r[3]), [8, 28, 34, 34]);

    sheet("Logins", ["Class", "Student", "Login ID", "Still on starting PIN"], logins.map(l => [l.cls || clsOf(l.id), l.name || nameOf(l.id), l.username || l.id, l.first === true ? "Yes" : "No"]).sort((a, b) => String(a[0]).localeCompare(String(b[0])) || String(a[1]).localeCompare(String(b[1]))), [8, 28, 18, 20]);

    sheet("Monthly XP resets", ["Month", "Date", "Students reset"], meta.filter(m => String(m.id).startsWith("xpreset_")).map(m => [m.month || String(m.id).slice(8), dt(m.at), num(m.students)]), [12, 20, 14]);

    const buf = await wb.xlsx.writeBuffer();
    const a = document.createElement("a"), day = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
    a.href = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    a.download = "Student-Island-backup-" + day + ".xlsx"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    if (btn) btn.textContent = "Done";
  } catch (e) { alert("Could not make the backup: " + (e.message || e)); if (btn) btn.textContent = old; }
  finally { if (btn) { btn.disabled = false; setTimeout(() => { btn.textContent = old; }, 2500); } }
}
