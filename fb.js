// Shared Firebase setup for the login, student and teacher pages.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, onSnapshot, runTransaction, writeBatch }
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
export { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, onSnapshot, runTransaction, writeBatch, initializeApp, getAuth };

// Students log in with their ID + PIN. Firebase wants an email, so we build one from the ID.
export const emailFor = u => String(u).trim().toLowerCase().replace(/\s+/g, "") + "@math8island.app";

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
