// Supabase data layer. It answers the same questions Firestore does (get one document, list/query a collection, write, update, delete, watch),
// for the collections listed in COLS. fb.js sends a call here when the path belongs to one of them; any failure can fall back to Firestore.
// Firebase still does sign-in: its token is the key to this database (the rules there decide who may see what).
const URL_ = "https://xsbcdapkzynfoouobhav.supabase.co";
const KEY = "sb_publishable_V7TGwwZ1J6CNMypJn8wyig_uHQJRGui";   // public key: safe in the browser, the rules (RLS) do the protecting
export const COLS = new Set(["plays", "subs", "work", "workkey", "live", "liveplayers", "msgs", "gmsgs", "groups"]);
// Off until the data has been copied over and checked. Flip to true when the copy is verified. A device can force it: localStorage si_sb2 = "1" (on) or "0" (off).
const DEFAULT_ON = true;
let AUTH = null;
export const setAuth = a => { AUTH = a; };
export function dataOn() {
  try { const v = localStorage.getItem("si_sb2"); if (v === "1") return true; if (v === "0") return false; } catch {}
  return DEFAULT_ON;
}

// Where does a Firestore path live? { col, parent, id } when it is one of ours, otherwise null.
// docs: "plays/x" or "teachers/<tid>/plays/x"; collections: "plays" or "teachers/<tid>/plays".
export function locate(path, isDoc) {
  const s = String(path).split("/").filter(Boolean), n = s.length;
  if (isDoc ? (n !== 2 && n !== 4) : (n !== 1 && n !== 3)) return null;
  if (n >= 3 && s[0] !== "teachers") return null;
  const col = isDoc ? s[n - 2] : s[n - 1];
  if (!COLS.has(col)) return null;
  return { col, parent: isDoc ? s.slice(0, -1).join("/") : s.join("/"), id: isDoc ? s[n - 1] : "", path: s.join("/") };
}

const enc = encodeURIComponent;
async function call(endpoint, opt = {}, tries = 1) {
  const u = AUTH && AUTH.currentUser; if (!u) throw Object.assign(new Error("not signed in"), { code: "unauthenticated" });
  const token = await u.getIdToken();
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 12000);
  try {
    const r = await fetch(URL_ + "/rest/v1/" + endpoint, { ...opt, signal: ctl.signal,
      headers: { apikey: KEY, Authorization: "Bearer " + token, "Content-Type": "application/json", ...(opt.headers || {}) } });
    if (!r.ok) {
      if (r.status >= 500 && tries > 0) return call(endpoint, opt, tries - 1);
      const t = await r.text().catch(() => "");
      const e = new Error("supabase " + r.status + " " + t.slice(0, 200)); e.status = r.status;
      e.code = r.status === 401 || r.status === 403 ? "permission-denied" : r.status === 404 ? "not-found" : "unavailable";
      throw e;
    }
    return r.status === 204 ? null : r.json().catch(() => null);
  } finally { clearTimeout(timer); }
}

// ---- filters: the same few shapes the site uses ----
const fld = f => { if (!/^\w+$/.test(f)) throw new Error("unsupported field " + f); return f; };
function filterQS(wh) {
  const out = [];
  for (const [f, op, v] of wh || []) {
    fld(f);
    if (op === "==" || op === "array-contains") out.push("data=cs." + enc(JSON.stringify({ [f]: op === "==" ? v : [v] })));
    else if (op === "in") out.push("data->>" + f + "=in.(" + v.map(x => '"' + String(x).replace(/["\\]/g, "\\$&") + '"').join(",") + ")");
    else if (op === ">" || op === ">=" || op === "<" || op === "<=") out.push("data->" + f + "=" + ({ ">": "gt", ">=": "gte", "<": "lt", "<=": "lte" })[op] + "." + enc(JSON.stringify(v)));
    else throw new Error("unsupported operator " + op);
  }
  return out;
}

// ---- reads ----
export async function getOne(path) {
  const rows = await call("docs?path=eq." + enc(path) + "&select=id,data");
  return rows && rows[0] ? rows[0].data : null;
}
// every document of a collection that matches the filters: [{ id, data }]  (read in pages of 1000)
export async function getMany(parent, wh) {
  const qs = ["parent=eq." + enc(parent), ...filterQS(wh), "select=id,data", "order=path"];
  let all = [];
  for (let off = 0; off < 20000; off += 1000) {
    const rows = (await call("docs?" + qs.join("&") + "&limit=1000&offset=" + off)) || [];
    all = all.concat(rows); if (rows.length < 1000) break;
  }
  return all;
}

// ---- writes ----
export async function setOne(path, data, merge) {
  const l = locate(path, true);
  if (merge) { await call("rpc/doc_merge", { method: "POST", body: JSON.stringify({ p: path, d: data }) }); return; }
  await call("docs?on_conflict=path", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ path, parent: l.parent, col: l.col, id: l.id, data, updated_at: new Date().toISOString() }) });
}
export async function setMany(items, ignoreExisting) {   // [{ path, data }]; ignoreExisting: keep a row that is already there
  if (!items.length) return;
  const rows = items.map(({ path, data }) => { const l = locate(path, true); return { path, parent: l.parent, col: l.col, id: l.id, data, updated_at: new Date().toISOString() }; });
  await call("docs?on_conflict=path", { method: "POST", headers: { Prefer: (ignoreExisting ? "resolution=ignore-duplicates" : "resolution=merge-duplicates") + ",return=minimal" }, body: JSON.stringify(rows) });
}
export async function patchOne(path, patch) {
  const n = await call("rpc/doc_patch", { method: "POST", body: JSON.stringify({ p: path, d: patch }) });
  if (!n) throw Object.assign(new Error("No document to update: " + path), { code: "not-found" });
}
export async function removeMany(paths) {
  for (let i = 0; i < paths.length; i += 50) {
    const part = paths.slice(i, i + 50);
    await call("docs?path=in.(" + part.map(p => '"' + p.replace(/["\\]/g, "\\$&") + '"').join(",") + ")", { method: "DELETE", headers: { Prefer: "return=minimal" } });
  }
}

// ---- watching: ask again every few seconds (school networks often block live connections) ----
// Live quiz screens ask more often, the rest is relaxed. cb gets every row each time something changed.
const EVERY = { live: 4000, liveplayers: 3000, plays: 8000, msgs: 8000, gmsgs: 8000, groups: 12000 };
export function watch(parent, col, wh, cb, onErr) {
  let stop = false, timer = 0, last = null;
  const every = EVERY[col] || 15000;
  const tick = async () => {
    if (stop) return;
    if (document.visibilityState === "visible") {
      try { const rows = await getMany(parent, wh), sig = JSON.stringify(rows); if (sig !== last) { last = sig; if (!stop) cb(rows); } }
      catch (e) { if (onErr && !stop) onErr(e); }
    }
    if (!stop) timer = setTimeout(tick, every);
  };
  const wake = () => { if (document.visibilityState === "visible" && !stop) { clearTimeout(timer); tick(); } };
  document.addEventListener("visibilitychange", wake);
  tick();
  return () => { stop = true; clearTimeout(timer); document.removeEventListener("visibilitychange", wake); };
}

// ---- who is who (the "people" table): the rules need to know a person's role, teacher and class ----
// These calls never throw: a failure here must not stop a teacher from creating a login or moving a student.
const stamp = r => ({ ...r, updated_at: new Date().toISOString() });
export let peopleErr = "";
export async function peopleSet(rows) {
  rows = rows.map(r => ({ uid: r.uid, role: r.role, sid: r.sid ?? null, tid: r.tid ?? "", cls: r.cls ?? null }));
  try { if (rows.length) await call("people?on_conflict=uid", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(rows.map(stamp)) }); return true; }
  catch (e) { peopleErr = String(e.message || e); console.warn("people sync", e); return false; }
}
export async function peopleDel(uid) {
  try { await call("people?uid=eq." + enc(uid), { method: "DELETE", headers: { Prefer: "return=minimal" } }); return true; } catch (e) { console.warn("people delete", e); return false; }
}
export async function peopleGet(tid) {   // the students of one teacher ("" = the owner's own)
  try { return (await call("people?role=eq.student&tid=eq." + enc(tid) + "&select=uid,sid,cls&limit=1000")) || []; } catch { return null; }
}
export async function peopleCls(sid, tid, cls) {
  try { await call("people?role=eq.student&sid=eq." + enc(sid) + "&tid=eq." + enc(tid), { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ cls, updated_at: new Date().toISOString() }) }); return true; }
  catch (e) { console.warn("people class", e); return false; }
}
export async function claimTeacher(code) {   // a new teacher, right after the sign-up; the invite code is checked inside the database
  try { await call("rpc/claim_teacher", { method: "POST", body: JSON.stringify({ code }) }); return true; } catch (e) { console.warn("claim teacher", e); return false; }
}

// counts per collection folder, read straight from the database (owner page uses it to compare with Firestore)
export async function countDocs() {
  const out = {};
  for (let off = 0; off < 100000; off += 1000) {
    const rows = (await call("docs?select=parent&order=path&limit=1000&offset=" + off)) || [];
    rows.forEach(r => { out[r.parent] = (out[r.parent] || 0) + 1; }); if (rows.length < 1000) break;
  }
  return out;
}
