import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, query, where, Timestamp, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Militar, Escala, Alerta, Permuta, BlockchainLog, ChatMessage } from './types';

// Recursively removes all undefined fields so that Firestore does not crash
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === undefined) {
    return null as any;
  }
  if (obj === null) {
    return null as any;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item)) as any;
  }
  if (typeof obj === 'object') {
    if (obj instanceof Date) {
      return obj;
    }
    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      const val = (obj as any)[key];
      if (val !== undefined) {
        newObj[key] = sanitizeForFirestore(val);
      }
    }
    return newObj;
  }
  return obj;
}

export const collections = {
  militares: collection(db, 'militares'),
  escalas: collection(db, 'escalas'),
  permutas: collection(db, 'permutas'),
  alertas: collection(db, 'alertas'),
  logs: collection(db, 'logs'),
  messages: collection(db, 'messages'),
  backups: collection(db, 'backups'),
};

// Seed utility to initialize Firestore if empty or missing profiles
export const seedInitialData = async (
  militares: Militar[],
  escalas: Escala[],
  permutas: Permuta[],
  alertas: Alerta[],
  logs: BlockchainLog[],
  messages: ChatMessage[]
) => {
  // Ensure every default militar exists in the Firestore database
  for (const m of militares) {
    const mRef = doc(db, 'militares', m.id);
    const mSnap = await getDoc(mRef);
    if (!mSnap.exists()) {
      await setDoc(mRef, sanitizeForFirestore(m));
    }
  }

  const escalasSnap = await getDocs(collections.escalas);
  if (escalasSnap.empty) {
    for (const e of escalas) { await setDoc(doc(db, 'escalas', e.id), sanitizeForFirestore(e)); }
  }

  const permutasSnap = await getDocs(collections.permutas);
  if (permutasSnap.empty) {
    for (const p of permutas) { await setDoc(doc(db, 'permutas', p.id), sanitizeForFirestore(p)); }
  }

  const alertasSnap = await getDocs(collections.alertas);
  if (alertasSnap.empty) {
    for (const a of alertas) { await setDoc(doc(db, 'alertas', a.id), sanitizeForFirestore(a)); }
  }

  const logsSnap = await getDocs(collections.logs);
  if (logsSnap.empty) {
    for (const l of logs) { await setDoc(doc(db, 'logs', l.id), sanitizeForFirestore(l)); }
  }

  const messagesSnap = await getDocs(collections.messages);
  if (messagesSnap.empty) {
    for (const chat of messages) { await setDoc(doc(db, 'messages', chat.id), sanitizeForFirestore(chat)); }
  }
};
