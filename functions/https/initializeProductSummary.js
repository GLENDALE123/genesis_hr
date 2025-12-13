/**
 * Product Summary 초기 구축 HTTPS 함수
 * 기존 packaging-reports와 quality-inspections 데이터로 product-summary 컬렉션 초기 구축
 * 
 * 사용법:
 * POST https://[region]-[project-id].cloudfunctions.net/initializeProductSummary
 * Body: { "force": false } // force가 true면 기존 데이터도 재구축
 */

const { onRequest, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions/v2');
const { initializeProductSummary } = require('../scripts/initializeProductSummary');

exports.initializeProductSummary = onRequest(
  {
    region: 'asia-northeast3',
    cors: true,
    memory: '1GiB',
    timeoutSeconds: 540, // 9분 (초기 구축은 시간이 걸릴 수 있음)
    maxInstances: 1, // 동시 실행 방지
  },
  async (request, response) => {
    try {
      // CORS 설정
      response.set('Access-Control-Allow-Origin', '*');
      response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      // Preflight 요청 처리
      if (request.method === 'OPTIONS') {
        return response.status(204).send('');
      }

      // POST만 허용
      if (request.method !== 'POST') {
        return response.status(405).json({
          success: false,
          error: 'Method not allowed. Use POST.',
        });
      }

      const force = Boolean(request.body?.force || request.query?.force);

      logger.info('Product Summary 초기 구축 시작', { force });

      // 초기 구축 실행
      await initializeProductSummary();

      logger.info('Product Summary 초기 구축 완료');

      response.json({
        success: true,
        message: 'Product Summary 초기 구축이 완료되었습니다.',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Product Summary 초기 구축 실패:', {
        message: error.message,
        stack: error.stack,
      });

      response.status(500).json({
        success: false,
        error: '초기 구축 실패',
        message: error.message,
      });
    }
  }
);





