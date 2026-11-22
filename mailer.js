// Email students (school address = student ID + @hawarschool.com) through the teacher's own Google Apps Script.
// Settings live in the teacher's own folder (settings/email), so students can never read the link or the token.
import { getDoc, getDocs, setDoc, bcol, bdoc } from "./fb.js?v=1122n";
import { sendMail } from "./sbdata.js?v=1122n";

const SITE = "https://mathkn.fun";
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let cfg = null;
export async function mailCfg(force) {
  if (cfg && !force) return cfg;
  try { const s = await getDoc(bdoc("settings", "email")); cfg = s.exists() ? s.data() : {}; } catch { cfg = {}; }
  return cfg;
}
const ready = c => !!c;
const okId = v => /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(String(v || "").trim());

async function post(c, items) { return sendMail(items, c.from || "Student Island", c.reply || ""); }
async function students(classes) {
  const all = (await getDocs(bcol("students"))).docs.map(d => ({ id: d.id, ...d.data() }));
  return all.filter(s => classes.includes(s.cls));
}
// Sends one personal email per student. make(student) returns { subject, text }. Reports how many went, who was skipped, and how many are left today.
export async function sendTo(list, make) {
  const c = await mailCfg(); if (!ready(c)) throw new Error("Email is not set up yet (Tools > Email students).");
  const items = [], skipped = [];
  list.forEach(s => { const id = String(s.enrollment || "").trim(); if (!okId(id)) { skipped.push(s.name || s.id); return; } const m = make(s); items.push({ to: id.toLowerCase() + "@hawarschool.com", subject: m.subject, text: m.text }); });
  let sent = 0, failed = [], remaining = null;
  for (let i = 0; i < items.length; i += 40) { const j = await post(c, items.slice(i, i + 40)); sent += j.sent; failed = failed.concat(j.failed || []); remaining = j.remaining; }
  return { sent, skipped, failed, remaining };
}
const sig = c => "\n\n" + (c.from || "Your maths teacher");
const hello = s => "Hello " + String(s.name || "").split(/\s+/)[0] + ",\n\n";

// send ready-made items [{to, subject, text, attachment?:{name,content(base64)}}]; any valid address (parents too)
export async function sendRaw(items) { const c = await mailCfg(); return post(c, items); }

// called after a worksheet or announcement is saved; does nothing unless the teacher turned automatic emails on
export async function autoMail(kind, classes, title, extra) {
  try {
    const c = await mailCfg(); if (!ready(c) || !c.auto || !classes || !classes.length) return null;
    const list = await students(classes);
    const subj = kind === "work" ? "New worksheet: " + title : "Announcement: " + (title || "from your teacher");
    return await sendTo(list, s => ({ subject: subj, text: hello(s) + (kind === "work" ? "You have a new worksheet in Student Island: " + title + "." + (extra ? "\n" + extra : "") + "\nLog in and open Classwork to do it." : (extra || "You have a new announcement in Student Island.")) + "\n\nOpen Student Island: " + SITE + sig(c) }));
  } catch (e) { console.warn("auto mail", e); return null; }
}

// ---- the window ----
let box = null;
export async function openMail() {
  const c = await mailCfg(true);
  const classes = [...new Set((await getDocs(bcol("students"))).docs.map(d => d.data().cls).filter(Boolean))].sort();
  const works = (await getDocs(bcol("work"))).docs.map(d => ({ id: d.id, ...d.data() })).filter(w => Array.isArray(w.questions)).sort((a, b) => (b.created || 0) - (a.created || 0));
  const subs = (await getDocs(bcol("subs"))).docs.map(d => d.data());
  box = document.createElement("div"); box.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99999;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:20px";
  const chk = classes.map(k => `<label style="margin-right:12px"><input type="checkbox" class="mlCls" value="${esc(k)}"> ${esc(k)}</label>`).join("");
  box.innerHTML = `<div style="background:#fff;color:#111;max-width:640px;width:100%;border-radius:14px;padding:18px 20px;font:15px/1.5 system-ui,sans-serif">
    <div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0">Email students</h2><button type="button" id="mlClose" class="ghost">Close</button></div>
    <p id="mlStatus" style="color:#555;margin:6px 0 10px">${ready(c) ? "Ready to send." : ""}</p>
    <details style="margin:8px 0"><summary><b>Setup</b></summary>
      <p style="font-size:13px;color:#555">Emails are sent from the Student Island address. Students see your name and replies go to the address you give.</p>
      <label>Your name in the emails<br><input id="mlFrom" style="width:100%" value="${esc(c.from || "")}" placeholder="Mr. Khalid"></label>
      <label>Replies go to<br><input id="mlReply" style="width:100%" value="${esc(c.reply || "")}" placeholder="your school email"></label>
      <label style="display:block;margin:8px 0"><input type="checkbox" id="mlAuto" ${c.auto ? "checked" : ""}> Email students automatically when I post a new worksheet or announcement</label>
      <button type="button" id="mlSave" class="primary">Save setup</button>
    </details>
    <div style="margin:10px 0"><b>Send a test email to yourself</b><br><input id="mlTest" placeholder="your @hawarschool.com" style="width:260px"> <button type="button" id="mlTestGo" class="primary">Send test</button></div>
    <hr style="margin:14px 0">
    <h3 style="margin:0 0 6px">Email a class</h3>
    <div style="margin:6px 0">${chk || "No classes yet."}</div>
    <input id="mlSubj" style="width:100%;margin:4px 0" placeholder="Subject">
    <textarea id="mlText" rows="4" style="width:100%" placeholder="Message (each student gets it with his name on top)"></textarea>
    <button type="button" id="mlSend" class="primary" style="margin-top:6px">Send</button>
    <hr style="margin:14px 0">
    <h3 style="margin:0 0 6px">Remind who has not handed in</h3>
    <select id="mlWork" style="width:100%">${works.map(w => `<option value="${esc(w.id)}">${esc(w.title || "Worksheet")} (${esc((w.classes || []).join(", "))})</option>`).join("") || "<option value=''>No worksheets</option>"}</select>
    <button type="button" id="mlRemind" class="primary" style="margin-top:6px">Remind them</button>
    <p id="mlMsg" style="margin:12px 0 0;font-weight:600"></p></div>`;
  document.body.appendChild(box);
  const say = t => { $("mlMsg").textContent = t; };
  const rep = r => `Sent ${r.sent}` + (r.skipped.length ? `, skipped ${r.skipped.length} without a valid student ID` : "") + (r.failed.length ? `, ${r.failed.length} failed (${r.failed[0].error})` : "") + (r.remaining != null ? `. Emails left today: ${r.remaining}.` : ".");
  $("mlClose").onclick = () => { box.remove(); box = null; };
  $("mlSave").onclick = async () => {
    const n = { from: $("mlFrom").value.trim(), reply: $("mlReply").value.trim(), auto: $("mlAuto").checked };
    try { await setDoc(bdoc("settings", "email"), n); cfg = n; say("Saved."); $("mlStatus").textContent = "Saved."; } catch (e) { say("Could not save (" + (e.code || e.message) + ")."); }
  };
  $("mlTestGo").onclick = async () => {
    const to = $("mlTest").value.trim().toLowerCase(), id = to.replace(/@hawarschool\.com$/, "");
    if (!okId(id) || !to.endsWith("@hawarschool.com")) return say("Type a @hawarschool.com address.");
    try { say("Sending…"); say(rep(await sendTo([{ name: "test", enrollment: id }], () => ({ subject: "Student Island test", text: "This is a test email from Student Island. It works." })))); } catch (e) { say("Could not send: " + e.message); }
  };
  $("mlSend").onclick = async () => {
    const cls = [...box.querySelectorAll(".mlCls:checked")].map(x => x.value), subject = $("mlSubj").value.trim(), text = $("mlText").value.trim();
    if (!cls.length) return say("Choose at least one class."); if (!subject || !text) return say("Write a subject and a message.");
    if (!confirm("Send this email to every student in " + cls.join(", ") + "?")) return;
    try { say("Sending…"); const c2 = await mailCfg(); say(rep(await sendTo(await students(cls), s => ({ subject, text: hello(s) + text + "\n\nStudent Island: " + SITE + sig(c2) })))); } catch (e) { say("Could not send: " + e.message); }
  };
  $("mlRemind").onclick = async () => {
    const w = works.find(x => x.id === $("mlWork").value); if (!w) return say("Choose a worksheet.");
    const done = new Set(subs.filter(x => x.wid === w.id).map(x => x.sid));
    const list = (await students(w.classes || [])).filter(s => !done.has(s.id));
    if (!list.length) return say("Everybody has handed this in.");
    if (!confirm(list.length + " student(s) have not handed in. Send them a reminder?")) return;
    try { say("Sending…"); const c2 = await mailCfg(); say(rep(await sendTo(list, s => ({ subject: "Reminder: " + (w.title || "worksheet"), text: hello(s) + "A reminder that you have not handed in \"" + (w.title || "the worksheet") + "\" yet. Please log in to Student Island and finish it." + "\n\nStudent Island: " + SITE + sig(c2) })))); } catch (e) { say("Could not send: " + e.message); }
  };
}
