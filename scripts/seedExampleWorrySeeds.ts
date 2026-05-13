import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs';
import path from 'node:path';
import { exampleWorrySeedFixtures } from '../src/services/exampleWorries/exampleSeedFixtures';

const clientConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firestoreDatabaseId = '(default)';
if (fs.existsSync(clientConfigPath)) {
  const clientConfig = JSON.parse(fs.readFileSync(clientConfigPath, 'utf-8'));
  firestoreDatabaseId = clientConfig.firestoreDatabaseId || '(default)';
}

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT is required for the dev/admin seed script.');
}

if (getApps().length === 0) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
}

const db = getFirestore(firestoreDatabaseId);

for (const seed of exampleWorrySeedFixtures) {
  await db.collection('exampleWorrySeeds').doc(seed.id).set({
    content: seed.content,
    categories: seed.categories,
    status: seed.status,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

console.log(`Seeded ${exampleWorrySeedFixtures.length} example worry seeds.`);
