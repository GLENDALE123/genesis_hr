import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { runDailyReportsSync } = require('../functions/lib/dailyReportsSync');
const admin = require('../functions/node_modules/firebase-admin');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.resolve(
  __dirname,
  '../hs-jig-b2093-firebase-adminsdk-fbsvc-fa25ed9be6.json'
);
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

const spreadsheetId =
  process.env.SPREADSHEET_ID ||
  '1j36qASy8aiOoEaDEkzdjuWtJ2zCx7W-8ord6gheObVc';
const sheetName = process.env.SHEET_NAME || '생산일보';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'hs-jig-b2093',
});

async function main() {
  try {
    console.log('Running force full sync directly through shared logic...');
    const result = await runDailyReportsSync({
      spreadsheetId,
      sheetName,
      forceFullSync: true,
      serviceAccountEmail:
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || serviceAccount.client_email,
      privateKey:
        process.env.GOOGLE_PRIVATE_KEY || serviceAccount.private_key,
    });

    console.log('Force full sync success:');
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Force full sync failed:', error);
    process.exit(1);
  }
}

main();

