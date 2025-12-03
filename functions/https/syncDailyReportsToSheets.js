const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { logger } = require('firebase-functions/v2');

const { runDailyReportsSync } = require('../lib/dailyReportsSync');
const { initializeFirebase } = require('../lib/utils');

const googleServiceAccountEmail = defineSecret('GOOGLE_SERVICE_ACCOUNT_EMAIL');
const googlePrivateKey = defineSecret('GOOGLE_PRIVATE_KEY');

exports.syncDailyReportsToSheets = onCall(
  {
    region: 'asia-northeast3',
    cors: true,
    secrets: [googleServiceAccountEmail, googlePrivateKey],
    memory: '512MiB',
    timeoutSeconds: 540,
  },
  async (request) => {
    try {
      if (request.auth?.uid) {
      const { db } = initializeFirebase();
      const callerDoc = await db.collection('users').doc(request.auth.uid).get();
      if (!callerDoc.exists) {
        throw new HttpsError('permission-denied', '사용자 정보를 찾을 수 없습니다.');
      }
      }

      const spreadsheetId = request.data?.spreadsheetId;
      const sheetName = request.data?.sheetName || '생산일보';
      const forceFullSync = Boolean(request.data?.forceFullSync);

      const result = await runDailyReportsSync({
        spreadsheetId,
        sheetName,
        forceFullSync,
        serviceAccountEmail: googleServiceAccountEmail.value(),
        privateKey: googlePrivateKey.value(),
      });

      return result;
    } catch (error) {
      logger.error('생산일보 Google Sheets 동기화 실패:', {
        message: error.message,
        stack: error.stack,
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError('internal', `동기화 실패: ${error.message}`);
    }
  }
);

exports.syncDailyReportsToSheetsV3 = onRequest(
  {
    region: 'asia-northeast3',
    cors: true,
    secrets: [googleServiceAccountEmail, googlePrivateKey],
    memory: '512MiB',
    timeoutSeconds: 540,
  },
  async (request, response) => {
    try {
      const spreadsheetId = request.body?.spreadsheetId || request.query?.spreadsheetId;
      const sheetName = request.body?.sheetName || request.query?.sheetName || '생산일보';
      const forceFullSync = Boolean(request.body?.forceFullSync || request.query?.forceFullSync);

      const result = await runDailyReportsSync({
        spreadsheetId,
        sheetName,
        forceFullSync,
        serviceAccountEmail: googleServiceAccountEmail.value(),
        privateKey: googlePrivateKey.value(),
      });

      response.json(result);
    } catch (error) {
      logger.error('생산일보 Google Sheets 동기화 실패:', {
        message: error.message,
        stack: error.stack,
      });

      response.status(500).json({
        error: '동기화 실패',
        message: error.message,
      });
    }
  }
);

