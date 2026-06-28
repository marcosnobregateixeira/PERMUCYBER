import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, initializeFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

// Habilita persistência offline robusta para sincronização multi-abas em tempo real
enableMultiTabIndexedDbPersistence(db)
  .then(() => {
    console.log("Persistência offline multi-abas do Firestore ativada com sucesso.");
  })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Persistência do Firestore falhou (múltiplas abas abertas simultaneamente).");
    } else if (err.code === 'unimplemented') {
      console.warn("O navegador não suporta persistência offline do Firestore.");
    } else {
      console.error("Erro ao ativar persistência offline do Firestore:", err);
    }
  });

export const auth = getAuth(app);

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase Connection Verified");
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
// testConnection();
