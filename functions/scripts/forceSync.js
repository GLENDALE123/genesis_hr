const admin = require('firebase-admin');

const SERVICE_ACCOUNT = require('../../hs-jig-b2093-firebase-adminsdk-fbsvc-fa25ed9be6.json');

const API_KEY =
  process.env.FIREBASE_API_KEY ||
  'AIzaSyB4nSpGhucC0NR57Zpu_syg86sjdFtLtaU';
const CALLABLE_URL =
  'https://asia-northeast3-hs-jig-b2093.cloudfunctions.net/syncDailyReportsToSheets';
const TARGET_UID =
  process.env.SYNC_ADMIN_UID || 'DuKB1P9hVaeEbJIy81i6eCHAV3B2';

const SPREADSHEET_ID =
  process.env.SPREADSHEET_ID ||
  '1j36qASy8aiOoEaDEkzdjuWtJ2zCx7W-8ord6gheObVc';
const SHEET_NAME = process.env.SHEET_NAME || '생산일보';

admin.initializeApp({
  credential: admin.credential.cert(SERVICE_ACCOUNT),
  projectId: 'hs-jig-b2093',
});

async function getIdToken(uid) {
  const customToken = await admin.auth().createCustomToken(uid);
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: customToken,
        returnSecureToken: true,
      }),
    }
  );

  const json = await response.json();
  if (!response.ok) {
    throw new Error(
      `Failed to exchange custom token: ${json.error?.message || 'Unknown error'}`
    );
  }

  return json.idToken;
}

async function callSyncFunction(idToken) {
  const response = await fetch(CALLABLE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      data: {
        spreadsheetId: SPREADSHEET_ID,
        sheetName: SHEET_NAME,
        forceFullSync: true,
      },
    }),
  });

  const raw = await response.text();
  let json;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Callable request returned non-JSON response: ${raw.slice(0, 200)}`
    );
  }
  if (!response.ok) {
    throw new Error(
      `Callable request failed: ${json.error?.message || 'Unknown error'}`
    );
  }

  if (json.error) {
    throw new Error(json.error.message || 'Callable returned an error.');
  }

  return json.result || json;
}

async function main() {
  try {
    console.log('Requesting ID token...');
    const idToken = await getIdToken(TARGET_UID);
    console.log('ID token acquired. Calling sync function...');
    const result = await callSyncFunction(idToken);
    console.log('Force full sync completed successfully:');
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Force full sync failed:', error.message);
    process.exit(1);
  }
}

main();

