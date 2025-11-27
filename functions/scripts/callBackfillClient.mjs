import path from 'node:path';
import { createRequire } from 'node:module';
import admin from 'firebase-admin';
import { initializeApp as initClient } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
const API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyB4nSpGhucC0NR57Zpu_syg86sjdFtLtaU';
const CALLABLE_URL =
  process.env.CALLABLE_URL ||
  'https://backfillthumbnails-6263cf2n2a-du.a.run.app';

const require = createRequire(import.meta.url);
const serviceAccount = require(path.resolve('public/hs-jig-b2093-firebase-adminsdk-fbsvc-fa25ed9be6.json'));

const firebaseConfig = {
  apiKey: API_KEY,
  authDomain: 'hs-jig-b2093.firebaseapp.com',
  projectId: 'hs-jig-b2093'
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
}

async function runBackfill() {
  const customToken = await admin.auth().createCustomToken('cli-backfill');

  const clientApp = initClient(firebaseConfig, 'cli-backfill');
  const auth = getAuth(clientApp);
  const credential = await signInWithCustomToken(auth, customToken);
  const user = credential.user;
  const idToken = user ? await user.getIdToken(true) : null;
  if (!idToken) {
    throw new Error('Failed to obtain ID token');
  }

  const decoded = await admin.auth().verifyIdToken(idToken);
  console.log('Authenticated as UID:', decoded.uid);

  const payload = {
    folderPath: process.env.BACKFILL_FOLDER || 'quality-issues/',
    maxFiles: Number(process.env.BACKFILL_MAX_FILES || 50),
    collectionName: process.env.BACKFILL_COLLECTION || 'quality-issues'
  };

  const response = await fetch(CALLABLE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
      Origin: 'https://hs-jig-b2093.web.app',
      Referer: 'https://hs-jig-b2093.web.app/'
    },
    body: JSON.stringify({ data: payload })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Callable failed: ${response.status} ${text}`);
  }

  const result = await response.json();
  console.log(JSON.stringify(result, null, 2));
}

runBackfill().catch((error) => {
  console.error(error);
  process.exit(1);
});

