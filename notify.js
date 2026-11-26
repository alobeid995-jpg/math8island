/* Emails from the hubs and the weekly update, sent straight from the site (Brevo through the send-mail function).
   - Notebook / Workbook classwork: students marked Not done or Still working
   - Notebook submission: students marked Not handed in or Missing work
   - Attendance: students marked Late
   - Weekly parent update: "Send now" to the parents and/or the student
   Classic script: it uses the page's own students, cls, bkDate, attDate, attDoc, parentEmails, isGirlCls, sigOf and window.mailSend. */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const E = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const okId = v => /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(String(v || "").trim());
  const stuMail = st => okId(st.enrollment) ? String(st.enrollment).trim().toLowerCase() + "@hawarschool.com" : "";
  const parMail = st => { try { return parentEmails(st); } catch (e) { return []; } };
  const girl = st => { try { return (typeof isGirlSt === "function" ? isGirlSt(st) : isGirlCls(st.cls)); } catch (e) { return false; } };
  const sig = () => { try { return sigOf(); } catch (e) { return "Your Maths teacher"; } };
  const first = n => String(n || "").split(/\s+/)[0];
  const niceDay = d => { try { return new Date(d + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }); } catch (e) { return d; } };

  /* what each kind of email says; {what} is filled per student from his mark */
  const KINDS = {
    wbc: {
      title: "Classwork not finished", pick: { n: "Not done", p: "Still working" },
      what: { n: ["you did not do your classwork in your notebook / workbook", "{name} did not do the classwork in {his} notebook / workbook"],
              p: ["you did not finish your classwork in your notebook / workbook", "{name} did not finish the classwork in {his} notebook / workbook"] },
      subject: "Maths classwork not finished ({date})",
      stu: "Dear {first},\n\nIn the Maths lesson {when}, {what}.\nPlease complete it at home and bring it to class tomorrow.\n\n{sig}",
      par: "Dear Parent,\n\nThis is to let you know that in the Maths lesson {when}, your {child} {what}.\nPlease make sure {he} completes it at home and brings it to class tomorrow.\n\nThank you for your support.\n{sig}"
    },
    books: {
      title: "Notebook not handed in / missing work", pick: { n: "Not handed in", m: "Missing work" },
      what: { n: ["you did not hand in your Maths notebook", "{name} did not hand in {his} Maths notebook"],
              m: ["your Maths notebook was handed in with missing work", "{name}'s Maths notebook was handed in with missing work"] },
      subject: "Maths notebook ({date})",
      stu: "Dear {first},\n\n{When}, {what}.\nPlease complete all the work and bring your notebook to class tomorrow.\n\n{sig}",
      par: "Dear Parent,\n\nThis is to let you know that {when}, your {child} {what}.\nPlease make sure {he} completes the work and brings the notebook to class tomorrow.\n\nThank you for your support.\n{sig}"
    },
    late: {
      title: "Late to class", pick: { l: "Late" },
      what: { l: ["you were late to Maths class", "{name} was late to Maths class"] },
      subject: "Late to Maths class ({date})",
      stu: "Dear {first},\n\n{When}, {what}.\nPlease make sure you arrive on time for every lesson.\n\n{sig}",
      par: "Dear Parent,\n\nThis is to let you know that {when}, your {child} {what}.\nPlease help {him} arrive on time for every lesson.\n\nThank you for your support.\n{sig}"
    }
  };
  const fill = (t, st, k, kind, date, forParent) => {
    const g = girl(st), w = KINDS[kind].what[k][forParent ? 1 : 0];
    const td = (() => { try { return date === todayStr(); } catch (e) { return false; } })(), when = (td ? "today" : "on") + " (" + niceDay(date) + ")";
    const map = { when, When: when[0].toUpperCase() + when.slice(1), first: first(st.name), name: st.name, cls: st.cls, date: niceDay(date), sig: sig(), child: g ? "daughter" : "son", he: g ? "she" : "he", his: g ? "her" : "his", him: g ? "her" : "him" };
    const one = s => s.replace(/\{(\w+)\}/g, (m, x) => (x in map ? map[x] : m));
    return one(t.replace("{what}", one(w)));
  };

  /* who is in the list for this kind, on the day the hub shows */
  function rows(kind) {
    const list = (typeof students !== "undefined" ? students : []).filter(s => s.cls === cls).sort((a, b) => a.name.localeCompare(b.name));
    let day = "", markOf = () => "";
    if (kind === "late") { day = attDate; let m = {}; try { m = attDoc(attDate, cls).m || {}; } catch (e) {} markOf = st => m[st.id] || ""; }
    else { day = bkDate; markOf = st => ((kind === "wbc" ? st.wbc : st.books) || {})[bkDate] || ""; }
    return { day, list: list.map(st => ({ st, k: markOf(st) })).filter(r => KINDS[kind].pick[r.k]) };
  }

  let box = null, cur = null;
  function modal() {
    if (box) return box;
    const st = document.createElement("style");
    st.textContent = `#nmModal .sheet{width:min(720px,100%);max-height:94vh;overflow:auto}
#nmModal .nm-to{display:flex;flex-wrap:wrap;gap:8px 18px;margin:6px 0 10px}#nmModal .nm-to label{display:flex;gap:6px;align-items:center;font-weight:600}
#nmModal .nm-list{display:grid;gap:4px;margin:6px 0 12px;max-height:240px;overflow:auto;border:1px solid var(--line,#d6e2f6);border-radius:12px;padding:8px 10px}
#nmModal .nm-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}#nmModal .nm-row small{color:var(--muted,#5a6b8a)}#nmModal .nm-tag{font-size:12px;font-weight:700;border-radius:99px;padding:1px 8px;background:#fbe6e1;color:#9a2f1a}
#nmModal .nm-tag.p,#nmModal .nm-tag.m,#nmModal .nm-tag.l{background:#fff1c9;color:#6b4a00}
#nmModal textarea{width:100%;box-sizing:border-box;min-height:150px;font:inherit;padding:10px;border:1px solid var(--line,#d6e2f6);border-radius:12px}
#nmModal input.nm-sub{width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid var(--line,#d6e2f6);border-radius:10px;font:inherit}
#nmModal .nm-msg{min-height:1.3em;font-weight:700;margin:8px 0}#nmModal .nm-msg.bad{color:#b3261e}#nmModal .nm-msg.ok{color:#0b7a5a}
#nmModal h4{margin:12px 0 4px}#nmModal .nm-hint{font-size:13px;color:var(--muted,#5a6b8a);margin:0 0 4px}`;
    document.head.appendChild(st);
    box = document.createElement("div"); box.className = "modal"; box.id = "nmModal"; box.hidden = true;
    box.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="nmTitle"><div id="nmBody"></div></div>';
    document.body.appendChild(box);
    box.addEventListener("click", e => { if (e.target === box || e.target.closest("[data-nmx=close]")) { box.hidden = true; return; } if (e.target.closest("[data-nmx=send]")) send(); });
    box.addEventListener("change", e => { if (e.target.dataset && e.target.dataset.nmto) { cur.to[e.target.dataset.nmto] = e.target.checked; paint(true); } if (e.target.dataset && e.target.dataset.nmsid) { e.target.checked ? cur.off.delete(e.target.dataset.nmsid) : cur.off.add(e.target.dataset.nmsid); } });
    box.addEventListener("input", e => { if (e.target.id === "nmStu") cur.stu = e.target.value; if (e.target.id === "nmPar") cur.par = e.target.value; if (e.target.id === "nmSub") cur.sub = e.target.value; });
    return box;
  }
  function paint(keepMsg) {
    const K = KINDS[cur.kind], msg = keepMsg ? ($("nmMsgBox") || {}).innerHTML || "" : "";
    $("nmBody").innerHTML = `<h3 id="nmTitle">Email: ${E(K.title)} · ${E(cls)} · ${E(niceDay(cur.day))}</h3>
      ${cur.list.length ? `<div class="nm-to"><b>Send to:</b><label><input type="checkbox" data-nmto="stu" ${cur.to.stu ? "checked" : ""}> The student (school email)</label><label><input type="checkbox" data-nmto="par" ${cur.to.par ? "checked" : ""}> The parents</label></div>
      <div class="nm-list">${cur.list.map(r => { const sm = stuMail(r.st), pm = parMail(r.st), miss = [cur.to.stu && !sm ? "no student ID" : "", cur.to.par && !pm.length ? "no parent email saved" : ""].filter(Boolean).join(", ");
        return `<label class="nm-row"><input type="checkbox" data-nmsid="${E(r.st.id)}" ${cur.off.has(r.st.id) ? "" : "checked"}><b>${E(r.st.name)}</b><span class="nm-tag ${E(r.k)}">${E(K.pick[r.k])}</span>${miss ? `<small>(${E(miss)})</small>` : ""}</label>`; }).join("")}</div>
      <label><b>Subject</b><input class="nm-sub" id="nmSub" maxlength="140" value="${E(cur.sub)}"></label>
      ${cur.to.stu ? `<h4>Message to the student</h4><p class="nm-hint">{first} = first name, {when} = today or the day you chose, {what} = what happened (filled in for each student).</p><textarea id="nmStu">${E(cur.stu)}</textarea>` : ""}
      ${cur.to.par ? `<h4>Message to the parents</h4><p class="nm-hint">{name} = full name, {child} = son or daughter, {he} / {his} / {him} change by themselves for girls' classes, {what} is filled in for each student.</p><textarea id="nmPar">${E(cur.par)}</textarea>` : ""}`
      : `<p>Nobody in ${E(cls)} is marked ${Object.values(K.pick).map(E).join(" or ")} on ${E(niceDay(cur.day))}. Mark the students first, then press this button again.</p>`}
      <p class="nm-msg" id="nmMsgBox" role="status">${msg}</p>
      <div class="acts">${cur.list.length ? `<button class="primary" type="button" data-nmx="send">Send emails</button>` : ""}<button class="ghost" type="button" data-nmx="close">Close</button></div>`;
  }
  const say = (t, cls2) => { const m = $("nmMsgBox"); if (m) { m.textContent = t; m.className = "nm-msg" + (cls2 ? " " + cls2 : ""); } };
  async function sendItems(items) {
    let sent = 0, failed = [];
    for (let i = 0; i < items.length; i += 40) { const r = await window.mailSend(items.slice(i, i + 40)); sent += r.sent || 0; failed = failed.concat(r.failed || []); }
    return { sent, failed };
  }
  async function send() {
    if (!window.mailSend) return say("Email is not available on this page.", "bad");
    if (!cur.to.stu && !cur.to.par) return say("Choose the student, the parents, or both.", "bad");
    const items = [], skipped = [];
    cur.list.filter(r => !cur.off.has(r.st.id)).forEach(r => {
      const subj = fill(cur.sub, r.st, r.k, cur.kind, cur.day, false);
      let any = false;
      if (cur.to.stu) { const a = stuMail(r.st); if (a) { items.push({ to: a, subject: subj, text: fill(cur.stu, r.st, r.k, cur.kind, cur.day, false) }); any = true; } }
      if (cur.to.par) parMail(r.st).forEach(a => { items.push({ to: a, subject: subj, text: fill(cur.par, r.st, r.k, cur.kind, cur.day, true) }); any = true; });
      if (!any) skipped.push(first(r.st.name));
    });
    if (!items.length) return say("No email address for the chosen students." + (skipped.length ? " (" + skipped.join(", ") + ")" : ""), "bad");
    if (!confirm("Send " + items.length + " email" + (items.length === 1 ? "" : "s") + " now?")) return;
    const btn = box.querySelector("[data-nmx=send]"); if (btn) btn.disabled = true;
    say("Sending…");
    try {
      const r = await sendItems(items);
      say("Sent " + r.sent + " of " + items.length + "." + (skipped.length ? " No address for: " + skipped.join(", ") + "." : "") + (r.failed.length ? " Failed: " + r.failed.map(f => f.to).join(", ") : ""), r.failed.length ? "bad" : "ok");
    } catch (e) { say(e.message || String(e), "bad"); }
    if (btn) btn.disabled = false;
  }
  window.openNotify = function (kind) {
    if (!KINDS[kind]) return;
    const K = KINDS[kind], r = rows(kind);
    cur = { kind, day: r.day, list: r.list, off: new Set(), to: { stu: true, par: false }, sub: K.subject, stu: K.stu, par: K.par };
    modal(); paint(); box.hidden = false;
  };
  document.addEventListener("click", e => { const b = e.target.closest("[data-nm]"); if (b) window.openNotify(b.dataset.nm); });

  /* ---------- weekly parent update: send it straight from here ---------- */
  function weekly() {
    const m = $("emailModal"); if (!m || $("wkSend")) return;
    const acts = m.querySelector(".acts"); if (!acts) return;
    const row = document.createElement("div"); row.id = "wkSendRow";
    row.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;margin:10px 0 4px"><b>Send it from here to:</b>
      <label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="wkToPar" checked> <span id="wkParLbl">Parents</span></label>
      <label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="wkToStu"> <span id="wkStuLbl">Student</span></label>
      <button class="primary" type="button" id="wkSend">Send now</button></div><p id="wkMsg" class="nm-msg" role="status" style="min-height:1.3em;font-weight:700;margin:4px 0"></p>`;
    acts.before(row);
    $("wkSend").addEventListener("click", async () => {
      const st = (typeof students !== "undefined" ? students : []).find(s => s.id === window.__emailSid), msg = $("wkMsg");
      const sayW = (t, bad) => { msg.textContent = t; msg.style.color = bad ? "#b3261e" : "#0b7a5a"; };
      if (!st) return sayW("Open the email from a student first.", true);
      if (!window.mailSend) return sayW("Email is not available on this page.", true);
      const to = []; if ($("wkToPar").checked) parMail(st).forEach(a => to.push(a)); if ($("wkToStu").checked && stuMail(st)) to.push(stuMail(st));
      if (!to.length) return sayW($("wkToPar").checked && !parMail(st).length ? "No parent email is saved for this student." : "Choose who to send it to.", true);
      if (!confirm("Send this email to " + to.join(", ") + "?")) return;
      const b = $("wkSend"); b.disabled = true; sayW("Sending…");
      // the text starts with a "Subject: ..." line: that becomes the email's subject and is taken out of the body
      let text = $("emailText").value, subject = ($("emailTitle").textContent || "Weekly update").replace(/^Weekly update · /, "Weekly Maths update · ");
      const sm = text.match(/^\s*Subject:\s*(.+)\n+/i); if (sm) { subject = sm[1].trim(); text = text.slice(sm[0].length); }
      try { const r = await window.mailSend(to.map(a => ({ to: a, subject, text })));
        sayW("Sent to " + (r.sent || 0) + " of " + to.length + "." + (r.failed && r.failed.length ? " Failed: " + r.failed.map(f => f.to).join(", ") : ""), !!(r.failed && r.failed.length)); }
      catch (e) { sayW(e.message || String(e), true); }
      b.disabled = false;
    });
  }
  window.__weeklyFill = function (st) {
    weekly(); window.__emailSid = st.id;
    const pm = parMail(st), sm = stuMail(st), msg = $("wkMsg"); if (msg) msg.textContent = "";
    $("wkParLbl").textContent = pm.length ? "Parents (" + pm.join(", ") + ")" : "Parents (no email saved)"; $("wkToPar").checked = !!pm.length; $("wkToPar").disabled = !pm.length;
    $("wkStuLbl").textContent = sm ? "Student (" + sm + ")" : "Student (no ID saved)"; $("wkToStu").disabled = !sm; if (!sm) $("wkToStu").checked = false;
  };
})();
