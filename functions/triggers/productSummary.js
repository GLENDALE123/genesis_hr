/**
 * Product Summary Triggers
 * packaging-reports와 quality-inspections 변경 시 product-summary 자동 업데이트
 */

const { onDocumentWritten, logger } = require('firebase-functions/v2/firestore');
const productSummaryService = require('../lib/productSummaryService');

/**
 * packaging-reports 변경 시 product-summary 업데이트
 */
exports.onPackagingReportChange = onDocumentWritten(
  {
    document: 'packaging-reports/{reportId}',
    database: process.env.FIREBASE_FIRESTORE_DATABASE_ID || 'tms-production',
    region: 'asia-northeast3'
  },
  async (event) => {
    try {
      const reportId = event.params.reportId;
      const beforeData = event.data.before?.data();
      const afterData = event.data.after?.data();

      // 삭제된 경우
      if (!afterData && beforeData) {
        // 삭제된 리포트의 제품들 재계산 (해당 리포트 제외)
        await productSummaryService.updateProductSummariesFromReport(reportId, beforeData);
        logger.info(`Product summaries updated after report deletion: ${reportId}`);
        return;
      }

      // 생성 또는 업데이트된 경우
      if (afterData) {
        // 캐시 무효화 전략: 변경사항이 집계에 영향을 주는지 확인
        // 영향 없는 변경은 스킵 (예: 메모만 변경)
        const hasRelevantChanges = 
          beforeData?.supplier !== afterData.supplier ||
          beforeData?.productName !== afterData.productName ||
          beforeData?.partName !== afterData.partName ||
          beforeData?.specification !== afterData.specification ||
          JSON.stringify(beforeData?.processConditions) !== JSON.stringify(afterData.processConditions) ||
          beforeData?.personnelCount !== afterData.personnelCount ||
          beforeData?.lineRatio !== afterData.lineRatio;
        
        if (hasRelevantChanges || !beforeData) {
          await productSummaryService.updateProductSummariesFromReport(reportId, afterData);
          logger.info(`Product summaries updated from report: ${reportId}`);
        } else {
          logger.info(`Skipped product summary update for report ${reportId} (no relevant changes)`);
        }
      }
    } catch (error) {
      logger.error(`Error in onPackagingReportChange for ${event.params.reportId}:`, error);
      // 에러가 발생해도 원본 데이터는 이미 저장되었으므로, 다음 업데이트 시 재시도됨
    }
  }
);

/**
 * quality-inspections 변경 시 product-summary 업데이트
 */
exports.onQualityInspectionChange = onDocumentWritten(
  {
    document: 'quality-inspections/{inspectionId}',
    database: process.env.FIREBASE_FIRESTORE_DATABASE_ID || 'tms-production',
    region: 'asia-northeast3'
  },
  async (event) => {
    try {
      const inspectionId = event.params.inspectionId;
      const beforeData = event.data.before?.data();
      const afterData = event.data.after?.data();

      // 삭제된 경우
      if (!afterData && beforeData) {
        // 삭제된 검사의 제품들 재계산 (해당 검사 제외)
        await productSummaryService.updateProductSummariesFromInspection(inspectionId, beforeData);
        logger.info(`Product summaries updated after inspection deletion: ${inspectionId}`);
        return;
      }

      // 생성 또는 업데이트된 경우
      if (afterData) {
        // 캐시 무효화 전략: 변경사항이 집계에 영향을 주는지 확인
        // 영향 없는 변경은 스킵 (예: 메모만 변경)
        const hasRelevantChanges = 
          beforeData?.supplier !== afterData.supplier ||
          beforeData?.productName !== afterData.productName ||
          beforeData?.partName !== afterData.partName ||
          beforeData?.specification !== afterData.specification ||
          beforeData?.jigUsed !== afterData.jigUsed ||
          beforeData?.jigUsed1 !== afterData.jigUsed1 ||
          beforeData?.jigUsed2 !== afterData.jigUsed2 ||
          beforeData?.internalJigLower !== afterData.internalJigLower ||
          beforeData?.internalJigUpper !== afterData.internalJigUpper ||
          JSON.stringify(beforeData?.processLines) !== JSON.stringify(afterData.processLines);
        
        if (hasRelevantChanges || !beforeData) {
          await productSummaryService.updateProductSummariesFromInspection(inspectionId, afterData);
          logger.info(`Product summaries updated from inspection: ${inspectionId}`);
        } else {
          logger.info(`Skipped product summary update for inspection ${inspectionId} (no relevant changes)`);
        }
      }
    } catch (error) {
      logger.error(`Error in onQualityInspectionChange for ${event.params.inspectionId}:`, error);
      // 에러가 발생해도 원본 데이터는 이미 저장되었으므로, 다음 업데이트 시 재시도됨
    }
  }
);

