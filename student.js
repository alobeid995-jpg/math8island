import { auth, fs, doc, getDoc, onSnapshot, updateDoc, signOut, updatePassword, whenUser, profileOf } from "./fb.js";
import { initWork } from "./stuwork.js";

const sub = (t, n) => t.split("{n}").join(n);
let me = null, ref = null, shopCat = "frame", confirmId = "", pickerOpen = false, seeds = [], loaded = false;
const newSeeds = () => { seeds = Array.from({ length: 18 }, () => (Math.random() * 4294967295) >>> 0); };

function fromDoc(snap) {
  const v = snap.data() || {};
  return { id: snap.id, name: String(v.name || "Student"), cls: String(v.cls || ""), xp: Number(v.xp) || 0,
    log: Array.isArray(v.log) ? v.log : [], avatar: typeof v.avatar === "number" ? v.avatar : undefined, ...readShop(v) };
}

async function start() {
  const u = await whenUser();
  if (!u) { location.href = "index.html"; return; }
  const p = await profileOf(u.uid);
  if (!p) { await signOut(auth); location.href = "index.html"; return; }
  if (p.role === "teacher") { location.href = "teacher.html"; return; }
  ref = p.tid ? doc(fs, "teachers", p.tid, "students", p.sid) : doc(fs, "students", p.sid);
  // First login with the class starting PIN: the student must choose his own PIN before anything else.
  const lref = p.tid ? doc(fs, "teachers", p.tid, "logins", p.sid) : doc(fs, "logins", p.sid);
  let lg = null; try { const s = await getDoc(lref); lg = s.exists() ? s.data() : null; } catch {}
  if (lg && lg.first === true) { await choosePin(u, lref, String(lg.pin || "")); }
  onSnapshot(doc(fs, "shop", "prices"), s => { if (s.exists()) { applyPrices(s.data().prices); render(); } }, () => {});   // prices the owner sets
  onSnapshot(ref, snap => { loaded = true; me = snap.exists() ? fromDoc(snap) : null; render(); },
    () => { loaded = true; me = null; render(); });
  initWork(p, () => me, toast).catch(() => {});
}

function choosePin(u, lref, startPin) {
  return new Promise(done => {
    $("outBtn").hidden = true;
    $("app").innerHTML = `<section class="card pinset"><h3>Choose your own PIN</h3>
      <p>This is your first login. Pick a new 6-digit PIN that only you know. You will use it every time you log in.</p>
      <label for="np1">New PIN</label><input id="np1" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" placeholder="6 digits">
      <label for="np2">Type it again</label><input id="np2" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" placeholder="6 digits">
      <p class="pinmsg" id="npMsg" role="alert"></p>
      <button class="primary" id="npGo" type="button">Save my PIN</button></section>`;
    const say = t => { $("npMsg").textContent = t; };
    $("np2").onkeydown = e => { if (e.key === "Enter") $("npGo").click(); };
    $("npGo").onclick = async () => {
      const a = $("np1").value.trim(), b = $("np2").value.trim();
      if (!/^\d{6}$/.test(a)) return say("The PIN must be exactly 6 digits.");
      if (a !== b) return say("The two PINs are not the same. Try again.");
      if (a === startPin) return say("Choose a PIN that is different from the class PIN.");
      if (/^(\d)\1{5}$/.test(a) || "0123456789".includes(a) || "9876543210".includes(a)) return say("That PIN is too easy to guess. Choose another one.");
      $("npGo").disabled = true; say("Saving…");
      try {
        await updatePassword(u, a);
        try { await updateDoc(lref, { pin: a, first: false }); } catch {}
        $("outBtn").hidden = false; toast("Your new PIN is saved. Remember it!"); done();
      } catch (e) {
        $("npGo").disabled = false;
        say(e && e.code === "auth/requires-recent-login" ? "Please log out and log in again, then choose your PIN." : "Could not save. Check your internet and try again.");
      }
    };
  });
}

async function save(patch, okMsg) {
  try { await updateDoc(ref, patch); if (okMsg) toast(okMsg); }
  catch (e) { toast(e && e.code === "permission-denied" ? "That did not work. Ask your teacher if the shop is ready." : "Could not save. Check your internet."); }
}

function card(st, it) {
  const have = st.owned.includes(it.id), on = have && eqOf(st)[it.cat] === it.id, wallet = walletOf(st);
  let act;
  if (have) act = on ? `<button class="ghost small" data-act="eq" data-item="${it.id}" data-off="1">Equipped ✓ Remove</button>` : `<button class="primary small" data-act="eq" data-item="${it.id}">Equip</button>`;
  else if (confirmId === it.id) act = `<div class="sconf"><span>Buy for ${it.price} XP?</span><span class="sbtns"><button class="plus small" data-act="buy" data-item="${it.id}">Yes</button><button class="ghost small" data-act="noBuy">No</button></span></div>`;
  else if (wallet < it.price) act = `<button class="ghost small" disabled>Need ${it.price - wallet} more</button>`;
  else act = `<button class="plus small" data-act="ask" data-item="${it.id}">Buy</button>`;
  return `<div class="sitem${on ? " eq" : ""}"><div class="prev">${shopPreview(it, st)}</div><b>${esc(it.name)}</b><span class="pr">${it.price} XP${have ? " · owned" : ""}</span>${act}</div>`;
}

function render() {
  const app = $("app");
  if (!loaded) { app.innerHTML = `<div class="empty"><h2>Loading…</h2></div>`; return; }
  if (!me) { app.innerHTML = `<div class="empty"><h2>Your record was not found</h2>Ask your teacher to check your login.</div>`; return; }
  const st = me, lv = level(st.xp), into = Math.max(0, st.xp - (lv - 1) * LEVEL_XP), pct = Math.min(100, into / LEVEL_XP * 100);
  const picker = pickerOpen ? `<section class="picker"><b>Pick a new look</b>
      <div class="pk-grid">${seeds.map(s => `<button class="pk" type="button" data-act="setAv" data-seed="${s}" aria-label="Use this avatar">${avatarHTML({ id: st.id, avatar: s, eq: st.eq }, "")}</button>`).join("")}</div>
      <div class="pk-acts"><button class="ghost" data-act="moreAv" type="button">Show more</button><button class="ghost" data-act="closeAv" type="button">Close</button></div></section>` : "";
  const items = shopList(shopCat);
  const recent = st.log.slice(-8).reverse();
  $("app").innerHTML = `
    <section class="card">
      <div class="who2">${avatarHTML(st, "xl")}<div>
        <div class="nm2">${nameHTML(st)}${titleTag(st)}</div>
        <div class="lvl">Class ${esc(st.cls)} · Level ${lv}</div>
        <div class="wallet"><b>${walletOf(st)}</b> XP to spend<small>earned ${st.xp}${st.carry ? " · carried " + st.carry : ""} · spent ${st.spent || 0}</small></div>
        <button class="primary small" data-act="openAv" type="button" style="margin-top:8px">Change my avatar</button>
      </div></div>
      <div><div class="bar" aria-label="Progress to level ${lv + 1}"><i style="width:${pct}%"></i></div><div class="barlbl"><span>${into}/${LEVEL_XP} XP</span><span>Level ${lv + 1}</span></div></div>
      ${picker}
    </section>
    <section class="card"><h3>XP Shop</h3>
      <div class="shop-tabs">${SHOP_CATS.map(c => `<button class="shop-tab" data-act="cat" data-cat="${c.key}" aria-pressed="${c.key === shopCat}">${c.label}</button>`).join("")}</div>
      ${shopCat === "skin" ? tierBar("tier") : ""}
      <div class="shop-grid">${items.map(it => card(st, it)).join("")}</div>
    </section>
    <section class="card"><h3>My latest XP</h3>
      ${recent.length ? `<div class="log">${recent.map(e => `<div class="ent ${e.xp >= 0 ? "pos" : "neg"}"><span>${esc(e.title || "")}</span><span>${e.xp > 0 ? "+" : ""}${e.xp}</span></div>`).join("")}</div>` : `<div class="none">No XP yet. Earn some in class!</div>`}
    </section>`;
}

document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b || !me) return;
  const a = b.dataset.act, id = b.dataset.item, it = id && shopItem(id);
  if (a === "tier") { setTier(b.dataset.tier); confirmId = ""; render(); }
  if (a === "cat") { shopCat = b.dataset.cat; confirmId = ""; render(); }
  else if (a === "ask") { confirmId = id; render(); }
  else if (a === "noBuy") { confirmId = ""; render(); }
  else if (a === "buy" && it) {
    if (me.owned.includes(it.id) || walletOf(me) < it.price) return;
    confirmId = "";
    save({ owned: [...me.owned, it.id], eq: { ...eqOf(me), [it.cat]: it.id }, spent: (me.spent || 0) + it.price, buys: (me.buys || 0) + 1, lastBuy: it.id,
      sp: [...(me.sp || []), { t: "buy", k: it.id, price: it.price, at: Date.now() }].slice(-200) }, `You bought ${it.name}!`);
  }
  else if (a === "eq" && it && me.owned.includes(it.id)) save({ eq: { ...eqOf(me), [it.cat]: b.dataset.off ? "" : it.id } });
  else if (a === "openAv") { newSeeds(); pickerOpen = true; render(); }
  else if (a === "moreAv") { newSeeds(); render(); }
  else if (a === "closeAv") { pickerOpen = false; render(); }
  else if (a === "setAv") { pickerOpen = false; render(); save({ avatar: Number(b.dataset.seed) }, "New avatar saved"); }
});
$("outBtn").onclick = async () => { await signOut(auth); location.href = "index.html"; };
function toast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 2600); }
render();
start();
