// Shared Firebase setup for the login, student and teacher pages.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updatePassword }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc as _getDoc, setDoc as _setDoc, updateDoc as _updateDoc, deleteDoc as _deleteDoc, collection, getDocs as _getDocs, onSnapshot as _onSnapshot, runTransaction as _runTransaction, writeBatch as _writeBatch, query, where }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
import * as FSNS from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// Many school networks block Firestore's default streaming connection, which then takes about a minute to give up.
// Auto-detect switches to plain long-polling within seconds there; on normal networks nothing changes.
export const fs = FSNS.initializeFirestore ? FSNS.initializeFirestore(app, { experimentalAutoDetectLongPolling: true }) : FSNS.getFirestore(app);
export { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updatePassword,
  doc, collection, query, where, initializeApp, getAuth };

// ---- Usage meter: counts the reads and writes THIS device makes, so the owner can see how close the site is to the free daily limit.
// It is an estimate (it counts documents the page asked for), kept on the device and sent along with the "who is online" record.
// The free quota day and month follow Pacific time, because that is when Google resets them.
const pt = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
let M = { d: pt(), m: pt().slice(0, 7), dr: 0, dw: 0, mr: 0, mw: 0 };
try { const o = JSON.parse(localStorage.getItem("mi_meter") || "null"); if (o && typeof o.dr === "number") M = o; } catch {}
let mTimer = 0;
function bump(r, w) {
  const d = pt(); if (M.d !== d) { M.d = d; M.dr = 0; M.dw = 0; } if (M.m !== d.slice(0, 7)) { M.m = d.slice(0, 7); M.mr = 0; M.mw = 0; }
  M.dr += r; M.mr += r; M.dw += w; M.mw += w;
  if (!mTimer) mTimer = setTimeout(() => { mTimer = 0; try { localStorage.setItem("mi_meter", JSON.stringify(M)); } catch {} }, 3000);
}
export const meter = () => { bump(0, 0); return { d: M.d, dr: M.dr, dw: M.dw, m: M.m, mr: M.mr, mw: M.mw }; };
export const getDoc = (...a) => { bump(1, 0); return _getDoc(...a); };
export const getDocs = async (...a) => { const s = await _getDocs(...a); bump(Math.max(1, s.size), 0); return s; };
export const setDoc = (...a) => { bump(0, 1); return _setDoc(...a); };
export const updateDoc = (...a) => { bump(0, 1); return _updateDoc(...a); };
export const deleteDoc = (...a) => { bump(0, 1); return _deleteDoc(...a); };
export const runTransaction = (...a) => { bump(1, 1); return _runTransaction(...a); };
export const writeBatch = (...a) => { const b = _writeBatch(...a); let n = 0; ["set", "update", "delete"].forEach(k => { if (typeof b[k] !== "function") return; const f = b[k].bind(b); b[k] = (...x) => { n++; return f(...x); }; });
  const c = b.commit.bind(b); b.commit = () => { bump(0, n); return c(); }; return b; };
export const onSnapshot = (...a) => {
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
  try { const s = await getDoc(doc(fs, "pinver", pinKey(u))); return s.exists() ? Number(s.data().v) || 0 : 0; } catch { return 0; }
}

export async function profileOf(uid) {
  const s = await getDoc(doc(fs, "users", uid));
  return s.exists() ? s.data() : null;
}

// Waits for the signed-in user (or null) once.
export const whenUser = () => new Promise(res => { const off = onAuthStateChanged(auth, u => { off(); res(u); }); });

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
