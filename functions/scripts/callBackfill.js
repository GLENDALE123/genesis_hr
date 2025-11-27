const path = require('path');
const admin = require('firebase-admin');

const serviceAccount = require(path.resolve(__dirname, '../../public/hs-jig-b2093-firebase-adminsdk-fbsvc-fa25ed9be6.json'));

const API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyB4nSpGhucC0NR57Zpu_syg86sjdFtLtaU';
const CALLABLE_URL = 'https://asia-northeast3-hs-jig-b2093.cloudfunctions.net/backfillThumbnails';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
}

async function getIdToken(uid) {
  const customToken = await admin.auth().createCustomToken(uid);
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: customToken,
      returnSecureToken: true
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to exchange custom token: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.idToken;
}

async function callBackfill(data) {
  const idToken = await getIdToken('cli-backfill');

  const response = await fetch(CALLABLE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
      Origin: 'https://hs-jig-b2093.web.app'
    },
    body: JSON.stringify({ data })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Callable failed: ${response.status} ${text}`);
  }

  return response.json();
}

(async () => {
  try {
    const payload = {
      folderPath: process.env.BACKFILL_FOLDER || 'quality-issues/',
      maxFiles: Number(process.env.BACKFILL_MAX_FILES || 50),
      collectionName: process.env.BACKFILL_COLLECTION || 'quality-issues'
    };

    const result = await callBackfill(payload);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();

