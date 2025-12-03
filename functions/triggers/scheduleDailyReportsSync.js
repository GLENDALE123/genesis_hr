/**
 * 생산일보 Google Sheets 동기화 스케줄 함수
 * 한국시간(KST) 기준 8:00 AM부터 2시간마다, 다음날 1:00 AM까지 동기화
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onRequest } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const { runDailyReportsSync } = require('../lib/dailyReportsSync');

const googleServiceAccountEmail = defineSecret('GOOGLE_SERVICE_ACCOUNT_EMAIL');
const googlePrivateKey = defineSecret('GOOGLE_PRIVATE_KEY');

// 환경 변수에서 스프레드시트 ID와 시트 이름 가져오기
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1j36qASy8aiOoEaDEkzdjuWtJ2zCx7W-8ord6gheObVc';
const SHEET_NAME = process.env.SHEET_NAME || '생산일보';

/**
 * 동기화 실행 함수 (공통)
 */
async function executeSync() {
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstTime = new Date(now.getTime() + kstOffset);
  
  logger.info('생산일보 자동 동기화 시작', {
    utcTime: now.toISOString(),
    kstTime: kstTime.toISOString(),
    kstHours: kstTime.getUTCHours(),
    spreadsheetId: SPREADSHEET_ID,
    sheetName: SHEET_NAME,
  });

  const result = await runDailyReportsSync({
    spreadsheetId: SPREADSHEET_ID,
    sheetName: SHEET_NAME,
    forceFullSync: false, // 일반 동기화 (needsSheetSync=true 또는 최근 문서만)
    serviceAccountEmail: googleServiceAccountEmail.value(),
    privateKey: googlePrivateKey.value(),
  });

  logger.info('생산일보 자동 동기화 완료', {
    sheetName: result.sheetName,
    inserted: result.inserted,
    updated: result.updated,
    skipped: result.skipped,
    totalReports: result.totalReports,
    kstTime: kstTime.toISOString(),
  });

  return result;
}

/**
 * 8:00 AM부터 2시간마다 실행, 다음날 1:00 AM까지 (8, 10, 12, 14, 16, 18, 20, 22, 0, 1시)
 * cron: "0 1,8,10,12,14,16,18,20,22,0 * * *"
 */
exports.scheduleDailyReportsSync = onSchedule(
  {
    schedule: '0 1,8,10,12,14,16,18,20,22,0 * * *', // 한국시간 1시, 8시, 10시, 12시, 14시, 16시, 18시, 20시, 22시, 0시
    timeZone: 'Asia/Seoul', // 한국시간대 사용
    region: 'asia-northeast3',
    secrets: [googleServiceAccountEmail, googlePrivateKey],
    memory: '512MiB',
    timeoutSeconds: 540,
  },
  async (event) => {
    try {
      await executeSync();
    } catch (error) {
      logger.error('생산일보 자동 동기화 실패:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        spreadsheetId: SPREADSHEET_ID,
        sheetName: SHEET_NAME,
      });
      throw error;
    }
  }
);

/**
 * 스케줄 함수 수동 실행용 HTTP 함수 (테스트용)
 * GET 또는 POST 요청으로 스케줄 함수를 수동으로 실행할 수 있습니다.
 */
exports.testScheduleDailyReportsSync = onRequest(
  {
    region: 'asia-northeast3',
    secrets: [googleServiceAccountEmail, googlePrivateKey],
    memory: '512MiB',
    timeoutSeconds: 540,
  },
  async (request, response) => {
    try {
      logger.info('스케줄 함수 수동 실행 요청:', {
        method: request.method,
        query: request.query,
        body: request.body,
      });

      const result = await executeSync();

      response.json({
        success: true,
        message: '스케줄 함수 실행 완료',
        result: result,
      });
    } catch (error) {
      logger.error('스케줄 함수 수동 실행 실패:', {
        message: error.message,
        stack: error.stack,
      });

      response.status(500).json({
        success: false,
        error: '스케줄 함수 실행 실패',
        message: error.message,
      });
    }
  }
);

