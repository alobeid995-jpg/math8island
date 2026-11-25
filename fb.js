// Shared Firebase setup for the login, student and teacher pages.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updatePassword }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc as _getDoc, setDoc as _setDoc, updateDoc as _updateDoc, deleteDoc as _deleteDoc, collection, getDocs as _getDocs, onSnapshot as _onSnapshot, runTransaction as _runTransaction, writeBatch as _writeBatch, query as _query, where as _where }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { setAuth, dataOn, locate, getOne, getMany, setOne, patchOne, removeMany, watch as sbWatchRows, watchDoc as sbWatchDoc, pinVersion } from "./sbdata.js?v=1123s";

export const firebaseConfig = {
  apiKey: "AIzaSyC6dnkpj0L_S-em_9ibWKjglvQcf8Q3iXM",
  authDomain: "math8island.firebaseapp.com",
  projectId: "math8island",
  storageBucket: "math8island.firebasestorage.app",
  messagingSenderId: "967568200224",
  appId: "1:967568200224:web:5a1687cd57ce112e8d2245"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
setAuth(auth);
import * as FSNS from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// Many school networks block Firestore's default streaming connection, which then takes about a minute to give up.
// Auto-detect switches to plain long-polling within seconds there; on normal networks nothing changes.
export const fs = FSNS.initializeFirestore ? FSNS.initializeFirestore(app, { experimentalAutoDetectLongPolling: true }) : FSNS.getFirestore(app);
export { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updatePassword,
  doc, collection, initializeApp, getAuth };

// ---- Usage meter: counts the reads and writes THIS device makes, so the owner can see how close the site is to the free daily limit.
// It is an estimate (it counts documents the page asked for), kept on the device and sent along with the "who is online" record.
// The free quota day and month follow Pacific time, because that is when Google resets them.
const pt = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
const zero = () => ({ d: pt(), m: pt().slice(0, 7), dr: 0, dw: 0, mr: 0, mw: 0 });
const readStore = () => { try { const o = JSON.parse(localStorage.getItem("mi_meter") || "null"); if (o && typeof o.dr === "number") return o; } catch {} return zero(); };
// Several pages of one device (student page, games inside it) count at the same time. Each one keeps only what it counted since its last save
// and ADDS that to the stored total, so one page never overwrites the others' counts.
let P = { r: 0, w: 0 }, mTimer = 0;
function roll(o) { const d = pt(); if (o.d !== d) { o.d = d; o.dr = 0; o.dw = 0; } if (o.m !== d.slice(0, 7)) { o.m = d.slice(0, 7); o.mr = 0; o.mw = 0; } return o; }
function flush() {
  mTimer = 0; const o = roll(readStore());
  o.dr += P.r; o.mr += P.r; o.dw += P.w; o.mw += P.w; P = { r: 0, w: 0 };
  try { localStorage.setItem("mi_meter", JSON.stringify(o)); } catch {}
  return o;
}
function bump(r, w) { P.r += r; P.w += w; if (!mTimer) mTimer = setTimeout(flush, 3000); }
addEventListener("pagehide", () => { if (P.r || P.w) flush(); });
export const meter = () => { const o = flush(); return { d: o.d, dr: o.dr, dw: o.dw, m: o.m, mr: o.mr, mw: o.mw }; };
// ---- Supabase routing ----
// Documents of the collections in sbdata.js (plays, subs, work, workkey, live, liveplayers, msgs, gmsgs, groups) live in Supabase once dataOn() is true.
// Everything else stays in Firestore. The page code does not change: it keeps calling these same functions.
export const where = (f, o, v) => { const c = _where(f, o, v); c.__w = [f, o, v]; return c; };
export const query = (ref, ...cs) => {
  const q = _query(ref, ...cs), b = ref.__sb || { path: ref.path, wh: [], other: false };
  q.__sb = { path: b.path, wh: [...b.wh, ...cs.filter(c => c && c.__w).map(c => c.__w)], other: b.other || cs.some(c => !(c && c.__w)) };
  return q;
};
const docLoc = ref => (dataOn() && ref && ref.type === "document") ? locate(ref.path, true) : null;
const colLoc = ref => {
  if (!dataOn() || !ref) return null;
  if (ref.__sb) return ref.__sb.other ? null : (() => { const l = locate(ref.__sb.path, false); return l && { ...l, wh: ref.__sb.wh }; })();
  if (ref.type === "collection") { const l = locate(ref.path, false); return l && { ...l, wh: [] }; }
  return null;
};
const mkDoc = (path, id, data) => ({ id, ref: { path, id }, exists: () => data != null, data: () => data == null ? undefined : data, get: k => data == null ? undefined : data[k], metadata: { fromCache: false, hasPendingWrites: false } });
const mkSnap = (parent, rows, changes) => {
  const docs = rows.map(r => mkDoc(parent + "/" + r.id, r.id, r.data));
  return { docs, size: docs.length, empty: !docs.length, forEach: f => docs.forEach(f), docChanges: () => changes || docs.map((d, i) => ({ type: "added", doc: d, oldIndex: -1, newIndex: i })), metadata: { fromCache: false, hasPendingWrites: false } };
};
const clean = d => JSON.parse(JSON.stringify(d));

export const getDoc = (ref, ...a) => {
  const l = docLoc(ref);
  if (l) return getOne(l.path).then(d => mkDoc(l.path, l.id, d));
  bump(1, 0); return _getDoc(ref, ...a);
};
export const rawGetDocs = _getDocs;   // straight from Firestore, never routed (the copy and backup pages use it)
export const getDocs = async (q, ...a) => {
  const l = colLoc(q);
  if (l) return mkSnap(l.parent, await getMany(l.parent, l.wh));
  const s = await _getDocs(q, ...a); bump(Math.max(1, s.size), 0); return s;
};
export const setDoc = (ref, data, opt) => {
  const l = docLoc(ref);
  if (l) return setOne(l.path, clean(data), !!(opt && opt.merge));
  bump(0, 1); return _setDoc(ref, data, opt);
};
export const updateDoc = (ref, ...a) => {
  const l = docLoc(ref);
  if (l) return patchOne(l.path, clean(a[0]));
  bump(0, 1); return _updateDoc(ref, ...a);
};
export const deleteDoc = ref => {
  const l = docLoc(ref);
  if (l) return removeMany([l.path]);
  bump(0, 1); return _deleteDoc(ref);
};
export const runTransaction = (...a) => { bump(1, 1); return _runTransaction(...a); };
export const writeBatch = (...a) => { const b = _writeBatch(...a); let n = 0;
  ["set", "update", "delete"].forEach(k => { if (typeof b[k] !== "function") return; const f = b[k].bind(b);
    b[k] = (ref, ...x) => { if (docLoc(ref)) throw new Error("batch writes are not supported for " + ref.path); n++; return f(ref, ...x); }; });
  const c = b.commit.bind(b); b.commit = () => { bump(0, n); return c(); }; return b; };
export const onSnapshot = (...a) => {
  const dl = docLoc(a[0]);
  if (dl) {
    const i = a.findIndex((x, k) => k > 0 && typeof x === "function"), ok = a[i], bad = typeof a[i + 1] === "function" ? a[i + 1] : null;
    return sbWatchDoc(dl.path, dl.col, d => ok(mkDoc(dl.path, dl.id, d)), bad);
  }
  const l = colLoc(a[0]);
  if (l) {
    const i = a.findIndex((x, k) => k > 0 && typeof x === "function"), ok = a[i], bad = typeof a[i + 1] === "function" ? a[i + 1] : null;
    let prev = null;
    return sbWatchRows(l.parent, l.col, l.wh, rows => {
      const cur = new Map(rows.map(r => [r.id, r])), ch = [];
      const snap = mkSnap(l.parent, rows, ch);
      rows.forEach((r, k) => { const o = prev && prev.get(r.id); if (!o) ch.push({ type: "added", doc: snap.docs[k], oldIndex: -1, newIndex: k }); else if (JSON.stringify(o.data) !== JSON.stringify(r.data)) ch.push({ type: "modified", doc: snap.docs[k], oldIndex: k, newIndex: k }); });
      if (prev) prev.forEach((o, id) => { if (!cur.has(id)) ch.push({ type: "removed", doc: mkDoc(l.parent + "/" + id, id, o.data), oldIndex: -1, newIndex: -1 }); });
      prev = cur; ok(snap);
    }, bad);
  }
  const i = a.findIndex(x => typeof x === "function"); let first = true;
  if (i >= 0) { const f = a[i]; a[i] = s => { try { bump(first ? Math.max(1, s.size || 1) : Math.max(1, (s.docChanges ? s.docChanges().length : 1)), 0); } catch { bump(1, 0); } first = false; return f(s); }; }
  return _onSnapshot(...a);
};

// Each teacher works inside his own folder of the database: teachers/<his uid>/students, .../cup, and so on.
// The owner (admin) keeps the original top-level folders, so his existing data needs no moving.
let BASE = [];
export const setBase = parts => { BASE = parts; };
export const bcol = (...seg) => collection(fs, ...BASE, ...seg);
export const bdoc = (...seg) => doc(fs, ...BASE, ...seg);

// Students log in with their ID + PIN. Firebase wants an email, so we build one from the ID.
// When a teacher resets a student's PIN, the student gets a fresh login (version v): <id>.r<v>@math8island.app.
// The public "pinver" list says which version an ID is on (it holds only that number).
export const pinKey = u => String(u).trim().toLowerCase().replace(/\s+/g, "").replace(/\//g, "_");
export const emailFor = (u, v = 0) => String(u).trim().toLowerCase().replace(/\s+/g, "") + (v ? ".r" + v : "") + "@math8island.app";
export async function loginVersion(u) {
  if (locate("pinver/x", true)) return pinVersion(pinKey(u));
  try { const s = await getDoc(doc(fs, "pinver", pinKey(u))); return s.exists() ? Number(s.data().v) || 0 : 0; } catch { return 0; }
}

export async function profileOf(uid) {
  const s = await getDoc(doc(fs, "users", uid));
  return s.exists() ? s.data() : null;
}

// Waits for the signed-in user (or null) once.
export const whenUser = () => new Promise(res => { const off = onAuthStateChanged(auth, u => { off(); res(u); }); });

import * as AUTHNS from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
// Password reset link: only reaches a real inbox when the account was made with a real email address.
export const resetPassword = email => { if (!AUTHNS.sendPasswordResetEmail) throw new Error("not supported"); return AUTHNS.sendPasswordResetEmail(auth, email); };
// A signed-in teacher adds or changes her real email. Firebase mails a link to the new address; once she opens it, the account uses that email.
export async function changeEmail(newEmail, password) {
  const u = auth.currentUser; if (!u || !AUTHNS.verifyBeforeUpdateEmail) throw new Error("not supported");
  await AUTHNS.reauthenticateWithCredential(u, AUTHNS.EmailAuthProvider.credential(u.email, password));
  await AUTHNS.verifyBeforeUpdateEmail(u, newEmail);
}
export function friendlyError(e) {
  const c = (e && e.code) || "";
  if (c.includes("invalid-credential") || c.includes("wrong-password") || c.includes("user-not-found") || c.includes("invalid-email")) return "ID or PIN is not correct.";
  if (c.includes("too-many-requests")) return "Too many tries. Wait a few minutes and try again.";
  if (c.includes("network")) return "No internet connection.";
  if (c.includes("permission-denied")) return "Not allowed. Check the invite code.";
  if (c.includes("email-already-in-use")) return "This email already has an account.";
  if (c.includes("weak-password")) return "Password must be at least 6 characters.";
  return "Something went wrong (" + (c || e) + ").";
}
