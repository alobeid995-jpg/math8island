// Shared Firebase setup for the login, student and teacher pages.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updatePassword }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, onSnapshot, runTransaction, writeBatch, query, where }
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
export const fs = getFirestore(app);
export { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updatePassword,
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, onSnapshot, runTransaction, writeBatch, query, where, initializeApp, getAuth };

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
