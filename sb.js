// Supabase side of the site. Firebase still does sign-in; the data for the collections listed in SB_COLS lives here.
// The pilot only covers "presence" and "usage". Every call can fail without hurting the page: callers fall back to Firestore.
import { auth } from "./fb.js?v=1122e";

const URL_ = "https://xsbcdapkzynfoouobhav.supabase.co";
const KEY = "sb_publishable_V7TGwwZ1J6CNMypJn8wyig_uHQJRGui";   // public key: safe in the browser, the rules (RLS) do the protecting
const DEFAULT_ON = true;   // pilot proven (presence + usage): on for everybody; a device can still switch it off with localStorage si_sb = "0"

// On for this device when localStorage si_sb = "1"; off when "0"; otherwise the default above.
export function sbOn() {
  try { const v = localStorage.getItem("si_sb"); if (v === "1") return true; if (v === "0") return false; } catch {}
  return DEFAULT_ON;
}

async function call(path, opt = {}) {
  const u = auth.currentUser; if (!u) throw new Error("not signed in");
  const token = await u.getIdToken();
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 9000);
  try {
    const r = await fetch(URL_ + "/rest/v1/docs" + path, { ...opt, signal: ctl.signal,
      headers: { apikey: KEY, Authorization: "Bearer " + token, "Content-Type": "application/json", ...(opt.headers || {}) } });
    if (!r.ok) { const t = await r.text().catch(() => ""); const e = new Error("supabase " + r.status + " " + t.slice(0, 200)); e.status = r.status; throw e; }
    return r.status === 204 ? null : r.json().catch(() => null);
  } finally { clearTimeout(timer); }
}
const enc = encodeURIComponent;

// one document by its Firestore-style path, e.g. "presence/<uid>"; null when it does not exist
export async function sbGet(path) {
  const rows = await call("?path=eq." + enc(path) + "&select=id,data");
  return rows && rows[0] ? rows[0].data : null;
}
// create or replace one document
export async function sbSet(path, data) {
  const seg = path.split("/"), id = seg[seg.length - 1], parent = seg.slice(0, -1).join("/"), col = seg[seg.length - 2];
  await call("?on_conflict=path", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ path, parent, col, id, data, updated_at: new Date().toISOString() }) });
}
// every document of a collection: [{ id, data }]
export async function sbList(parent) {
  return (await call("?parent=eq." + enc(parent) + "&select=id,data&limit=1000")) || [];
}
// Watches a collection by asking again every few seconds (works on school networks that block live connections).
// cb gets the full list each time something changed; returns a function that stops the watching.
export function sbWatch(parent, cb, onErr, every = 15000) {
  let stop = false, timer = 0, last = "";
  const tick = async () => {
    if (stop) return;
    if (document.visibilityState === "visible") {
      try { const rows = await sbList(parent), sig = JSON.stringify(rows); if (sig !== last) { last = sig; cb(rows); } }
      catch (e) { if (onErr) onErr(e); }
    }
    if (!stop) timer = setTimeout(tick, every);
  };
  tick();
  return () => { stop = true; clearTimeout(timer); };
}
