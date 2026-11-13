// Gives the teacher page the same "db" calls the Claude version used, but backed by Firebase.
import { fs, bdoc, bcol, getDoc, setDoc, updateDoc, deleteDoc, getDocs, onSnapshot, runTransaction } from "./fb.js?v=1112l";

const mapErr = e => { const err = new Error(e && e.message || "db error"); err.code = e && e.code === "permission-denied" ? "invalid_argument" : (e && e.code) || "unknown"; return err; };
const guard = p => p.catch(e => { throw mapErr(e); });

function wrapDoc(ref) {
  const snapWrap = s => ({ id: s.id, exists: s.exists(), data: () => s.data(), metadata: s.metadata });
  return {
    id: ref.id, path: ref.path,
    get: () => guard(getDoc(ref).then(snapWrap)),
    set: d => guard(setDoc(ref, d)),
    update: d => guard(updateDoc(ref, d)),
    delete: () => guard(deleteDoc(ref)),
    // One open screen at a time hands out the weekly bonus: a short "lease" kept on the doc.
    acquire: ({ holder, ttlMs }) => guard(runTransaction(fs, async tx => {
      const s = await tx.get(ref), d = s.exists() ? s.data() : {}, now = Date.now();
      if (d.leaseUntil && d.leaseUntil > now && d.holder !== holder) return { acquired: false };
      tx.set(ref, { ...d, holder, leaseUntil: now + (ttlMs || 60000) });
      return { acquired: true };
    }))
  };
}

export const db = {
  doc: path => wrapDoc(bdoc(...path.split("/"))),
  collection: name => {
    const col = bcol(name);
    return {
      path: name,
      doc: id => wrapDoc(bdoc(name, id)),
      get: () => guard(getDocs(col)),
      onSnapshot: (ok, bad) => onSnapshot(col, { includeMetadataChanges: true }, ok, e => bad && bad(mapErr(e)))
    };
  }
};
