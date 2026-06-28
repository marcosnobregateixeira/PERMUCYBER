import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { readFileSync } from 'fs';

const config = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function clearLogs() {
  const snap = await getDocs(collection(db, 'logs'));
  let deleted = 0;
  for (const document of snap.docs) {
    await deleteDoc(doc(db, 'logs', document.id));
    deleted++;
  }
  console.log(`Logs cleared successfully. Deleted ${deleted} logs.`);
  process.exit(0);
}

clearLogs().catch(console.error);
