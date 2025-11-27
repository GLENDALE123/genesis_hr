/**
 * Google 스프레드시트 동기화 함수
 * 서비스 계정을 사용하여 Google Sheets API 호출
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { logger } = require('firebase-functions/v2');
const { google } = require('googleapis');
const admin = require('firebase-admin');

// Secret Manager에서 비밀 정보 정의
const googleServiceAccountEmail = defineSecret('GOOGLE_SERVICE_ACCOUNT_EMAIL');
const googlePrivateKey = defineSecret('GOOGLE_PRIVATE_KEY');

// Google 서비스 계정 인증
const getSheetsClient = async () => {
  try {
    // Secret Manager에서 서비스 계정 정보 읽기
    let serviceAccountEmail = googleServiceAccountEmail.value();
    let privateKey = googlePrivateKey.value();
    
    // 앞뒤 공백 및 줄바꿈 제거
    serviceAccountEmail = serviceAccountEmail.trim();
    privateKey = privateKey.trim();
    
    // 줄바꿈 문자 처리 (여러 형식 지원)
    privateKey = privateKey.replace(/\\n/g, '\n');
    privateKey = privateKey.replace(/\\\\n/g, '\n');
    
    // 디버깅: 이메일과 키 길이만 로그 (보안상 전체 키는 로그하지 않음)
    logger.info('서비스 계정 정보 확인:', {
      email: serviceAccountEmail,
      emailLength: serviceAccountEmail?.length || 0,
      keyLength: privateKey?.length || 0,
      keyStartsWith: privateKey?.substring(0, 30) || 'N/A',
      keyEndsWith: privateKey?.substring(privateKey.length - 30) || 'N/A',
    });

    if (!serviceAccountEmail || !privateKey) {
      throw new Error('Google 서비스 계정 정보가 설정되지 않았습니다.');
    }

    // 개인 키 형식 검증
    if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
      logger.error('개인 키 형식이 올바르지 않습니다:', {
        hasBegin: privateKey.includes('BEGIN PRIVATE KEY'),
        hasEnd: privateKey.includes('END PRIVATE KEY'),
      });
      throw new Error('개인 키 형식이 올바르지 않습니다.');
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: serviceAccountEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    logger.info('GoogleAuth 객체 생성 완료, 클라이언트 가져오기 시작');
    const authClient = await auth.getClient();
    logger.info('인증 클라이언트 생성 완료');
    
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    logger.info('Google Sheets API 클라이언트 생성 완료');

    return sheets;
  } catch (error) {
    logger.error('Google Sheets API 클라이언트 생성 실패:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    throw new HttpsError('internal', `Google Sheets API 인증에 실패했습니다: ${error.message}`);
  }
};

/**
 * 스프레드시트 데이터 읽기
 */
const readSpreadsheetData = async (spreadsheetId, sheetName) => {
  try {
    logger.info('Google Sheets API 클라이언트 생성 시작');
    const sheets = await getSheetsClient();
    logger.info('Google Sheets API 클라이언트 생성 완료');

    // 시트 이름이 없으면 첫 번째 시트 사용
    let range = '';
    if (sheetName) {
      range = `${sheetName}!A:ZZ`;
      logger.info('시트 이름 지정됨:', { sheetName, range });
    } else {
      logger.info('첫 번째 시트 정보 가져오기 시작:', { spreadsheetId });
      // 첫 번째 시트의 이름 가져오기
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId,
      });

      if (!spreadsheet.data.sheets || spreadsheet.data.sheets.length === 0) {
        throw new Error('스프레드시트에 시트가 없습니다.');
      }

      const firstSheet = spreadsheet.data.sheets[0];
      const sheetTitle = firstSheet.properties?.title || 'Sheet1';
      range = `${sheetTitle}!A:ZZ`;
      logger.info('첫 번째 시트 정보 가져오기 완료:', { sheetTitle, range });
    }

    // 데이터 읽기
    logger.info('스프레드시트 데이터 읽기 시작:', { spreadsheetId, range });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const values = response.data.values || [];
    logger.info('스프레드시트 데이터 읽기 완료:', { rowCount: values.length });

    if (values.length === 0) {
      throw new Error('스프레드시트에 데이터가 없습니다.');
    }

    return values;
  } catch (error) {
    logger.error('스프레드시트 데이터 읽기 실패:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      spreadsheetId,
      sheetName,
      stack: error.stack,
    });
    
    // Google API 오류 코드 처리
    if (error.code === 404 || error.message?.includes('NOT_FOUND')) {
      throw new HttpsError('not-found', `스프레드시트를 찾을 수 없습니다. 스프레드시트 ID(${spreadsheetId})를 확인하거나 서비스 계정에 읽기 권한이 있는지 확인해주세요.`);
    }
    
    throw new HttpsError('internal', `스프레드시트 데이터 읽기 실패: ${error.message}`);
  }
};

/**
 * Google 스프레드시트 동기화 함수
 * 클라이언트에서 호출하여 스프레드시트 데이터를 읽고 반환
 */
exports.syncGoogleSheets = onCall(
  {
    region: 'asia-northeast3',
    cors: true,
    allowInvalidHTTPOrigins: true,
    secrets: [googleServiceAccountEmail, googlePrivateKey],
  },
  async (request) => {
    try {
      // 인증 확인
      if (!request.auth) {
        throw new HttpsError('unauthenticated', '인증이 필요합니다.');
      }

      // 클라이언트에서 이미 관리자 권한을 확인했으므로, Functions에서는 인증만 확인
      // 필요시 Firebase Auth 커스텀 클레임으로 권한 확인 가능
      logger.info('스프레드시트 동기화 요청:', {
        uid: request.auth.uid,
        email: request.auth.token?.email,
      });

      const { spreadsheetId, sheetName } = request.data;

      logger.info('스프레드시트 동기화 요청:', {
        spreadsheetId,
        sheetName,
        uid: request.auth.uid,
      });

      if (!spreadsheetId) {
        throw new HttpsError('invalid-argument', '스프레드시트 ID가 필요합니다.');
      }

      // 스프레드시트 데이터 읽기
      const allData = await readSpreadsheetData(spreadsheetId, sheetName);

      if (allData.length === 0) {
        throw new HttpsError('not-found', '스프레드시트에 데이터가 없습니다.');
      }

      // 헤더와 데이터 분리
      const headers = allData[0].map((h) => String(h || '').trim());
      const rows = allData.slice(1).filter((row) => {
        // 빈 행 제외
        return row.some((cell) => String(cell || '').trim() !== '');
      });

      return {
        success: true,
        headers,
        rows: rows.map((row, index) => ({
          rowIndex: index + 2, // 헤더가 1번 행이므로 데이터는 2번부터 시작
          data: row.map((cell) => {
            // 숫자로 변환 가능하면 숫자로, 아니면 문자열로
            const numValue = Number(cell);
            if (!isNaN(numValue) && cell !== '' && String(cell).trim() !== '') {
              return numValue;
            }
            return String(cell || '').trim();
          }),
        })),
      };
  } catch (error) {
    logger.error('Google 스프레드시트 동기화 실패:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      spreadsheetId: request.data?.spreadsheetId,
    });
    if (error instanceof HttpsError) {
      throw error;
    }
    // Google API 오류 처리
    if (error.code === 404 || error.message.includes('NOT_FOUND')) {
      throw new HttpsError('not-found', `스프레드시트를 찾을 수 없습니다. 스프레드시트 ID를 확인하거나 서비스 계정에 읽기 권한이 있는지 확인해주세요.`);
    }
    throw new HttpsError('internal', `동기화 실패: ${error.message}`);
  }
  }
);

