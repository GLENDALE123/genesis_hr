/**
 * Product Summary Queue Processor
 * 주기적으로 큐를 처리하여 배치 업데이트 수행
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger } = require('firebase-functions/v2');
const productSummaryService = require('../lib/productSummaryService');
const productSummaryQueue = require('../lib/productSummaryQueue');

/**
 * 큐 처리 스케줄러 (매 10초마다 실행)
 */
exports.processProductSummaryQueue = onSchedule(
  {
    schedule: '*/1 * * * *', // 매 1분마다 (Cloud Scheduler는 초 단위 미지원)
    timeZone: 'Asia/Seoul',
    region: 'asia-northeast3',
    memory: '512MiB',
    timeoutSeconds: 540,
  },
  async (event) => {
    try {
      logger.info('Processing product summary queue...');
      
      // 큐 배치 처리
      const result = await productSummaryService.processQueueBatch();
      
      logger.info(`Queue processed: ${result.processed} succeeded, ${result.errors} failed`);
      
      // 오래된 큐 항목 정리 (주기적으로)
      if (Math.random() < 0.1) { // 10% 확률로 정리 실행
        const cleaned = await productSummaryQueue.cleanupOldQueueItems();
        if (cleaned > 0) {
          logger.info(`Cleaned up ${cleaned} old queue items`);
        }
      }
      
      return result;
    } catch (error) {
      logger.error('Error processing product summary queue:', error);
      throw error;
    }
  }
);

