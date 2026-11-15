/* Save + Submit bar for a classwork page.
   The classwork page runs inside a "package" page (graphpkg.html). The package page owns the database; this file only talks to it with messages.

   How to use it in a new classwork page (see CLASSWORK-SAVE-SUBMIT.md):
     <script src="cwkeep.js"></script>
     CWKeep.init({
       id: "g42-ws",                       // the worksheet id (same one the package page uses)
       getState: () => ({ ... }),          // everything the student has done so far (plain JSON)
       setState: (state, submitted) => {}, // put it back on the page
       isComplete: () => true,             // optional: has he finished everything?
       summary: () => "1 of 2 finished",   // optional: shown in the Submit question
       onLock: (at) => {}                  // optional: the page is now view only (submitted)
     });
   Save   = a checkpoint. He can close the page and carry on later, here or at home.
   Submit = finished. The work is kept, the page becomes view only, and he can always open it again to see his solved worksheet. */
(function () {
  var o = null, bar, msg, saveB, subB, locked = false;
  var css = ".cwk-bar{position:fixed;left:0;right:0;bottom:0;z-index:60;display:flex;flex-wrap:wrap;gap:10px;justify-content:center;align-items:center;padding:10px 14px;background:#fff;border-top:2px solid #cfd6e4;box-shadow:0 -4px 14px rgba(0,0,0,.08);font:600 15px system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#13213f}" +
    ".cwk-bar button{font:inherit;font-weight:800;border-radius:999px;padding:9px 20px;border:2px solid #13213f;background:#fff;color:#13213f;cursor:pointer}" +
    ".cwk-bar button.go{background:#15803d;border-color:#15803d;color:#fff}.cwk-bar button:disabled{opacity:.5;cursor:default}" +
    ".cwk-msg{min-width:140px;text-align:center}.cwk-msg.ok{color:#15803d}.cwk-msg.bad{color:#b91c1c}" +
    ".cwk-bar.done{background:#dcfce7;border-top-color:#16a34a}body.cwk-pad{padding-bottom:84px}";
  function when(t) { return new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
  function post(x) { try { parent.postMessage(Object.assign({ cwk: 1, id: o.id }, x), location.origin); } catch (e) {} }
  function say(t, kind) { if (msg) { msg.textContent = t || ""; msg.className = "cwk-msg" + (kind ? " " + kind : ""); } }
  function build() {
    var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    bar = document.createElement("div"); bar.className = "cwk-bar"; bar.hidden = true;
    bar.innerHTML = '<button type="button" class="sv">💾 Save my work</button><span class="cwk-msg">Save to carry on later. Submit when you are finished.</span><button type="button" class="go sb">✅ Submit</button>';
    document.body.appendChild(bar); document.body.classList.add("cwk-pad");
    saveB = bar.querySelector(".sv"); subB = bar.querySelector(".sb"); msg = bar.querySelector(".cwk-msg");
    var pend = null;
    function wait(what) { clearTimeout(pend); pend = setTimeout(function () { saveB.disabled = subB.disabled = false; say("No answer from the page. Refresh it and try again.", "bad"); }, 8000); }
    saveB.onclick = function () { if (locked) return; saveB.disabled = true; say("Saving\u2026"); wait(); post({ op: "save", state: o.getState() }); };
    var ask = null;
    subB.onclick = function () {
      if (locked) return;
      if (!ask) {   // first tap: ask in the page (browser pop-ups are blocked inside frames on some tablets)
        var s = o.summary ? o.summary() : "", full = o.isComplete ? o.isComplete() : true;
        subB.textContent = "\u2705 Yes, submit"; saveB.textContent = "Not yet"; saveB.onclick = function () { ask = null; subB.textContent = "\u2705 Submit"; saveB.textContent = "\ud83d\udcbe Save my work"; saveB.onclick = doSave; say("Save to carry on later. Submit when you are finished."); };
        ask = { full: full };
        say((full ? "Submit your work now?" : "Not everything is finished yet" + (s ? " (" + s + ")" : "") + ". Submit anyway?") + " You cannot change your answers after this.");
        return;
      }
      var full2 = ask.full; ask = null; subB.textContent = "\u2705 Submit"; saveB.textContent = "\ud83d\udcbe Save my work"; saveB.onclick = doSave;
      subB.disabled = saveB.disabled = true; say("Submitting\u2026"); wait();
      post({ op: "submit", state: o.getState(), complete: !!full2 });
    };
    var doSave = saveB.onclick;
    window.__cwClear = function () { clearTimeout(pend); };
  }
  function lock(at) {
    locked = true; document.documentElement.classList.add("cw-locked");
    if (saveB) saveB.hidden = true; if (subB) subB.hidden = true;
    if (bar) bar.className = "cwk-bar done"; say("✅ Submitted" + (at ? " on " + when(at) : "") + ". This is your solved worksheet. You can look at it, but not change it.", "ok");
    if (o.onLock) o.onLock(at);
  }
  window.addEventListener("message", function (e) {
    var d = e.data;
    if (e.origin !== location.origin || !o || !d || d.cwk !== 1 || d.id !== o.id) return;
    if (window.__cwClear) window.__cwClear();
    if (d.op === "load") {
      if (d.teacher) return;                       // a teacher looking at the page: no bar
      bar.hidden = false;
      if (d.state) { try { o.setState(d.state, !!d.submitted); } catch (er) {} if (!d.submitted) say("Your saved work from " + when(d.at) + " is back. Carry on.", "ok"); }
      if (d.submitted) lock(d.at);
    }
    if (d.op === "saved") {
      saveB.disabled = false; subB.disabled = false;
      say(d.ok ? (d.where === "cloud" ? "💾 Saved " + when(d.at) + ". You can carry on at home." : "💾 Saved on this device only (" + when(d.at) + "). Tell your teacher the online save is not working yet.") : "Could not save. Try again.", d.ok ? "ok" : "bad");
    }
    if (d.op === "submitted") {
      if (d.ok) lock(d.at); else { saveB.disabled = false; subB.disabled = false; say("Could not submit. Check your internet and try again.", "bad"); }
    }
  });
  window.CWKeep = {
    init: function (opts) {
      o = opts;
      if (window.parent === window) return;        // opened on its own (not inside the package page): nothing to save to
      var go = function () { build(); var n = 0, t = setInterval(function () { if (!bar.hidden || ++n > 12) return clearInterval(t); post({ op: "hello" }); }, 1000); post({ op: "hello" }); };
      if (document.body) go(); else document.addEventListener("DOMContentLoaded", go);
    }
  };
})();
