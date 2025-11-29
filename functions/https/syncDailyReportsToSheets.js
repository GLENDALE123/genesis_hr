const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { logger } = require('firebase-functions/v2');

const { runDailyReportsSync } = require('../lib/dailyReportsSync');

const googleServiceAccountEmail = defineSecret('GOOGLE_SERVICE_ACCOUNT_EMAIL');
const googlePrivateKey = defineSecret('GOOGLE_PRIVATE_KEY');

exports.syncDailyReportsToSheetsV3 = onRequest(
  {
    region: 'asia-northeast3',
    secrets: [googleServiceAccountEmail, googlePrivateKey],
    memory: '512MiB',
    timeoutSeconds: 540,
  },
  async (req, res) => {
    // CORS 설정 - 모든 origin 허용
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');

    // Preflight 요청 처리
    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }

    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed. Only POST is supported.',
      });
    }

    try {
      const body = req.body || {};
      const {
        spreadsheetId,
        sheetName = '생산일보',
        forceFullSync = false,
      } = body;

      if (!spreadsheetId || typeof spreadsheetId !== 'string') {
        return res.status(400).json({
          success: false,
          error: '스프레드시트 ID가 필요합니다.',
        });
      }

      if (!sheetName || typeof sheetName !== 'string') {
        return res.status(400).json({
          success: false,
          error: '시트 이름이 필요합니다.',
        });
      }

      const result = await runDailyReportsSync({
        spreadsheetId,
        sheetName,
        forceFullSync: Boolean(forceFullSync),
        serviceAccountEmail: googleServiceAccountEmail.value(),
        privateKey: googlePrivateKey.value(),
      });

      logger.info('생산일보 동기화 완료', {
        sheetName: result.sheetName,
        inserted: result.inserted,
        updated: result.updated,
        skipped: result.skipped,
        totalReports: result.totalReports,
      });

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('생산일보 Google Sheets 동기화 실패:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
      });

      return res.status(500).json({
        success: false,
        error: `동기화 실패: ${error.message}`,
      });
    }
  }
);

