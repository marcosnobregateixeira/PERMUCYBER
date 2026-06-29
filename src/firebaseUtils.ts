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
  try {
    // Only check if 'militares' is empty as the primary source of truth.
    // If it is populated, it means the database is already seeded and we skip other checks,
    // saving up to 5 complete collection getDocs operations per load!
    const militaresSnap = await getDocs(collections.militares);
    if (militaresSnap.empty) {
      console.log("Banco Firestore vazio detectado. Semeando dados iniciais para sincronização...");
      for (const m of militares) {
        await setDoc(doc(db, 'militares', m.id), sanitizeForFirestore(m));
      }
      for (const e of escalas) {
        await setDoc(doc(db, 'escalas', e.id), sanitizeForFirestore(e));
      }
      for (const p of permutas) {
        await setDoc(doc(db, 'permutas', p.id), sanitizeForFirestore(p));
      }
      for (const a of alertas) {
        await setDoc(doc(db, 'alertas', a.id), sanitizeForFirestore(a));
      }
      for (const l of logs) {
        await setDoc(doc(db, 'logs', l.id), sanitizeForFirestore(l));
      }
      for (const chat of messages) {
        await setDoc(doc(db, 'messages', chat.id), sanitizeForFirestore(chat));
      }
      console.log("Semeadura inicial concluída com sucesso.");
    } else {
      console.log("Banco de dados já possui registros ativos. Sincronização em tempo real operacional.");
      try {
        await deleteDoc(doc(db, 'militares', 'M-102'));
        await deleteDoc(doc(db, 'militares', 'M-202'));
        await deleteDoc(doc(db, 'escalas', 'E-05'));
      } catch (e) {
        console.warn("Erro ao tentar limpar registros antigos das nuvens:", e);
      }
    }
  } catch (err) {
    console.warn("Aviso de rede: Falha temporária ao checar/semear dados ( offline ou limite de cota). Prosseguindo via cache:", err);
  }
};
