import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import config from './firebase-applet-config.json' assert { type: 'json' };

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function clearLogs() {
  const snap = await getDocs(collection(db, 'logs'));
  for (const document of snap.docs) {
    await deleteDoc(doc(db, 'logs', document.id));
  }
  console.log('Logs cleared successfully');
}

clearLogs().catch(console.error);
