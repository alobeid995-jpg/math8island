/* Post a certificate straight to Google Classroom.
   Runs on the teacher page only. Sign-in uses Google Identity Services; the picture is saved to the
   teacher's own Drive (drive.file = only files this app creates) and attached to a Classroom announcement. */
(function () {
  const CLIENT_ID = "967568200224-lpm2l7guc4mov90e2nekf992nfic1qc8.apps.googleusercontent.com";
  const SCOPES = "https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.announcements https://www.googleapis.com/auth/drive.file";
  let tok = null, exp = 0, gisPromise = null;

  /* load the Google sign-in library early, so the sign-in popup can open straight from a tap */
  function loadGis() {
    if (gisPromise) return gisPromise;
    gisPromise = new Promise((res, rej) => {
      if (window.google && google.accounts && google.accounts.oauth2) return res();
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client"; s.async = true;
      s.onload = () => res();
      s.onerror = () => { gisPromise = null; rej(new Error("Couldn't load Google sign-in. Check the internet and try again.")); };
      document.head.appendChild(s);
    });
    return gisPromise;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => loadGis().catch(() => {}));
  else loadGis().catch(() => {});

  function signedIn() { return !!tok && Date.now() < exp - 60000; }
  function getToken() {
    if (signedIn()) return Promise.resolve(tok);
    return loadGis().then(() => new Promise((res, rej) => {
      const c = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID, scope: SCOPES,
        callback: r => {
          if (r.error) return rej(new Error(r.error === "access_denied" ? "Permission was not given." : (r.error_description || r.error)));
          tok = r.access_token; exp = Date.now() + (Number(r.expires_in) || 3600) * 1000; res(tok);
        },
        error_callback: e => rej(new Error(e && e.type === "popup_closed" ? "The sign-in window was closed." : e && e.type === "popup_failed_to_open" ? "The browser blocked the sign-in window. Allow pop-ups for this site and try again." : "Sign-in failed."))
      });
      c.requestAccessToken();
    }));
  }

  function friendly(status, msg) {
    const m = String(msg || "");
    if (status === 401) { tok = null; return "Your Google sign-in expired. Tap the button again."; }
    if (status === 403) return "Google said no" + (m ? " (" + m + ")" : "") + ". If your school blocks outside apps, ask the IT team to allow Math Island in the Google Admin console.";
    if (status === 404) return "That class was not found in Google Classroom.";
    if (status === 429) return "Too many requests. Wait a minute and try again.";
    return m || "Google returned an error (" + status + ").";
  }
  async function call(url, opt) {
    const t = await getToken();
    const r = await fetch(url, { ...opt, headers: { Authorization: "Bearer " + t, ...((opt && opt.headers) || {}) } });
    if (!r.ok) { let m = ""; try { const j = await r.json(); m = (j.error && j.error.message) || ""; } catch {} throw new Error(friendly(r.status, m)); }
    return r.json();
  }

  async function listCourses() {
    const out = []; let page = "";
    do {
      const j = await call("https://classroom.googleapis.com/v1/courses?teacherId=me&courseStates=ACTIVE&pageSize=100" + (page ? "&pageToken=" + encodeURIComponent(page) : ""));
      (j.courses || []).forEach(c => out.push({ id: c.id, name: c.name || "(no name)", section: c.section || "" }));
      page = j.nextPageToken || "";
    } while (page);
    return out;
  }

  async function uploadPicture(blob, filename) {
    const b = "mathkn" + Math.random().toString(36).slice(2);
    const body = new Blob([
      "--" + b + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" + JSON.stringify({ name: filename, mimeType: "image/png" }) +
      "\r\n--" + b + "\r\nContent-Type: image/png\r\n\r\n", blob, "\r\n--" + b + "--"
    ]);
    return call("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name", { method: "POST", headers: { "Content-Type": "multipart/related; boundary=" + b }, body });
  }

  async function announce(courseId, fileId, text, draft) {
    return call("https://classroom.googleapis.com/v1/courses/" + encodeURIComponent(courseId) + "/announcements", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, state: draft ? "DRAFT" : "PUBLISHED", materials: [{ driveFile: { driveFile: { id: fileId } } }] })
    });
  }

  window.MathknClassroom = { getToken, signedIn, listCourses, uploadPicture, announce };
})();

/* ---------- the panel inside the certificate window ---------- */
function certPngBlob() {
  return new Promise((res, rej) => {
    const svg = certSVG(cert), url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" })), img = new Image();
    img.onload = () => {
      try {
        const cv = document.createElement("canvas"); cv.width = 2000; cv.height = 1400;
        const cx = cv.getContext("2d"); cx.fillStyle = "#fffdf4"; cx.fillRect(0, 0, 2000, 1400);
        cx.drawImage(img, 0, 0, 2000, 1400); URL.revokeObjectURL(url);
        cv.toBlob(b => b ? res(b) : rej(new Error("Couldn't make the picture.")), "image/png");
      } catch (e) { rej(e); }
    };
    img.onerror = () => rej(new Error("Couldn't make the picture."));
    img.src = url;
  });
}

function clsMsg(html, bad) { const m = $("clsMsg"); if (m) { m.innerHTML = html; m.className = "cls-msg" + (bad ? " bad" : ""); } }
function clsStore(k, v) { try { if (v === undefined) return localStorage.getItem("mathkn." + k); localStorage.setItem("mathkn." + k, v); } catch { return null; } }

function certClassroom() {
  if (!cert) return;
  let p = $("clsPanel");
  if (p) { p.hidden = !p.hidden; if (!p.hidden) p.scrollIntoView({ block: "nearest", behavior: "smooth" }); return; }
  p = document.createElement("div"); p.id = "clsPanel"; p.className = "cls-panel";
  const anchor = $("certSave") || $("certPrev"); anchor.after(p);
  clsRender(); p.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

async function clsRender() {
  const p = $("clsPanel"); if (!p) return;
  const C = window.MathknClassroom, st = students.find(s => s.id === cert.sid);
  if (!C.signedIn()) {
    p.innerHTML = `<h4>Post to Google Classroom</h4>
      <p>Sign in once with your school Google account. Math Island only gets to see your class list and to post what you send. Google will ask you to allow it.</p>
      <div class="sbtns"><button class="primary" type="button" id="clsSign">Sign in with Google</button></div><div id="clsMsg" class="cls-msg"></div>`;
    $("clsSign").onclick = async () => {
      clsMsg("Waiting for Google…");
      try { await C.getToken(); clsRender(); } catch (e) { clsMsg(esc(e.message), true); }
    };
    return;
  }
  p.innerHTML = `<h4>Post to Google Classroom</h4><div id="clsMsg" class="cls-msg">Loading your classes…</div>`;
  let courses;
  try { courses = await C.listCourses(); } catch (e) { clsMsg(esc(e.message), true); return; }
  if (!courses.length) { clsMsg("No active classes found in your Google Classroom.", true); return; }
  const last = clsStore("course." + st.cls) || clsStore("course"), guess = courses.find(c => c.id === last) || courses.find(c => (c.name + " " + c.section).toUpperCase().includes(String(st.cls).toUpperCase())) || courses[0];
  const text = cert.title + "\nCongratulations to " + st.name + (cert.reason ? ", " + cert.reason : "") + ".";
  p.innerHTML = `<h4>Post to Google Classroom</h4>
    <label>Class<select id="clsCourse">${courses.map(c => `<option value="${esc(c.id)}" ${c.id === guess.id ? "selected" : ""}>${esc(c.name)}${c.section ? " · " + esc(c.section) : ""}</option>`).join("")}</select></label>
    <label>Message<textarea id="clsText" rows="3" maxlength="1500">${esc(text)}</textarea></label>
    <label>When<select id="clsState"><option value="now">Post now</option><option value="draft">Save as draft (I will check it in Classroom first)</option></select></label>
    <div class="sbtns"><button class="primary" type="button" id="clsPost">Post certificate</button></div><div id="clsMsg" class="cls-msg"></div>`;
  $("clsPost").onclick = async () => {
    const btn = $("clsPost"), courseId = $("clsCourse").value, courseName = $("clsCourse").selectedOptions[0].textContent, draft = $("clsState").value === "draft", msg = $("clsText").value.trim(), c0 = cert;
    btn.disabled = true;
    try {
      await C.getToken();                       /* first, so a sign-in window opens straight from the tap */
      clsMsg("Making the picture…"); const blob = await certPngBlob();
      clsMsg("Saving it to your Drive…"); const f = await C.uploadPicture(blob, "Certificate - " + st.name + ".png");
      clsMsg("Posting to " + esc(courseName) + "…"); const a = await C.announce(courseId, f.id, msg, draft);
      clsStore("course." + st.cls, courseId); clsStore("course", courseId);
      if (cert === c0) issueCert();
      const link = a.alternateLink ? ` <a href="${esc(a.alternateLink)}" target="_blank" rel="noopener">Open in Classroom</a>` : "";
      clsMsg((draft ? "Saved as a draft in " : "Posted to ") + "<b>" + esc(courseName) + "</b>." + link);
      btn.textContent = "Post again";
    } catch (e) { clsMsg(esc(e.message), true); }
    btn.disabled = false;
  };
}
