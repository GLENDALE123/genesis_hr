/**
 * Product Summary Service
 * product-summary 컬렉션을 관리하는 서비스
 * packaging-reports와 quality-inspections 변경 시 자동으로 캐시 업데이트
 */

const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// tms-production 데이터베이스 사용 (지연 초기화)
function getDb() {
  const databaseId = process.env.FIREBASE_FIRESTORE_DATABASE_ID || 'tms-production';
  return getFirestore(admin.app(), databaseId);
}

/**
 * 제품 고유 ID 생성
 * supplier+productName+partName+specification 조합
 */
function generateProductId(supplier, productName, partName, specification) {
  const safeKey = `${supplier}_${productName}_${partName}_${specification || ''}`
    .replace(/[^a-zA-Z0-9가-힣_]/g, '')
    .replace(/\s+/g, '_');
  return safeKey;
}

/**
 * packaging-reports에서 영향받는 제품 ID 목록 추출
 */
function extractProductIdsFromReport(report) {
  const productIds = new Set();
  
  // 필수 필드 확인 (supplier, partName, specification 모두 필수)
  if (!report.supplier || !report.partName || !report.specification) {
    return Array.from(productIds);
  }

  const orderNumbers = report.orderNumbers || [];
  const productNames = report.productName 
    ? report.productName.split(',').map(name => name.trim()).filter(Boolean)
    : [];

  // 발주번호와 제품명이 모두 있는 경우
  if (orderNumbers.length > 0 && productNames.length > 0) {
    const maxLength = Math.max(orderNumbers.length, productNames.length);
    
    for (let i = 0; i < maxLength; i++) {
      const productName = productNames[i] || productNames[0] || report.productName || '';
      
      if (!productName) continue;

      const productId = generateProductId(
        report.supplier,
        productName,
        report.partName,
        report.specification
      );
      productIds.add(productId);
    }
  } else {
    // 발주번호나 제품명이 없는 경우
    if (!report.productName) {
      return Array.from(productIds);
    }

    const productId = generateProductId(
      report.supplier,
      report.productName,
      report.partName,
      report.specification
    );
    productIds.add(productId);
  }

  return Array.from(productIds);
}

/**
 * quality-inspections에서 영향받는 제품 ID 목록 추출
 */
function extractProductIdsFromInspection(inspection) {
  const productIds = new Set();
  
  if (!inspection.supplier || !inspection.productName || !inspection.partName) {
    return Array.from(productIds);
  }

  const productId = generateProductId(
    inspection.supplier,
    inspection.productName,
    inspection.partName,
    inspection.specification || ''
  );
  productIds.add(productId);

  return Array.from(productIds);
}

/**
 * 특정 제품의 product-summary 업데이트
 * @param productId 제품 ID
 * @param reportIds 변경된 packaging-reports 문서 ID 배열
 * @param inspectionIds 변경된 quality-inspections 문서 ID 배열
 * @param updateFields 업데이트할 필드만 지정 (부분 업데이트 최적화)
 */
async function updateProductSummary(productId, reportIds = [], inspectionIds = [], updateFields = null) {
  try {
    const db = getDb();
    const productSummaryRef = db.collection('product-summary').doc(productId);
    const productSummaryDoc = await productSummaryRef.get();
    const existingData = productSummaryDoc.data() || {};

    let reports = [];
    let inspections = [];

    // packaging-reports에서 제품 정보 수집
    if (reportIds.length > 0) {
      // 특정 리포트만 조회 (증분 업데이트)
      const reportsQuery = getDb().collection('packaging-reports')
        .where(admin.firestore.FieldPath.documentId(), 'in', reportIds.slice(0, 10)); // Firestore 'in' 쿼리는 최대 10개
      
      const reportsSnapshot = await reportsQuery.get();
      reports = reportsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // 10개 이상인 경우 추가 조회
      if (reportIds.length > 10) {
        for (let i = 10; i < reportIds.length; i += 10) {
          const batch = reportIds.slice(i, i + 10);
          const batchQuery = getDb().collection('packaging-reports')
            .where(admin.firestore.FieldPath.documentId(), 'in', batch);
          const batchSnapshot = await batchQuery.get();
          const batchReports = batchSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          reports = reports.concat(batchReports);
        }
      }
    } else {
      // 전체 조회 (초기 구축 또는 전체 재계산)
      // productId에서 정보 추출 시도
      const parts = productId.split('_');
      if (parts.length >= 4 && existingData) {
        // 기존 문서가 있으면 해당 정보로 조회
        const reportsQuery = getDb().collection('packaging-reports')
          .where('supplier', '==', existingData.supplier || '')
          .where('partName', '==', existingData.partName || '')
          .where('specification', '==', existingData.specification || '')
          .orderBy('workDate', 'desc')
          .limit(2000);
        
        const reportsSnapshot = await reportsQuery.get();
        reports = reportsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } else {
        // 문서가 없으면 전체 조회 (초기 구축)
        const reportsQuery = getDb().collection('packaging-reports')
          .orderBy('workDate', 'desc')
          .limit(2000);
        
        const reportsSnapshot = await reportsQuery.get();
        reports = reportsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }
    }

    // quality-inspections에서 제품 정보 수집
    if (inspectionIds.length > 0) {
      // 특정 검사만 조회 (증분 업데이트)
      const inspectionsQuery = getDb().collection('quality-inspections')
        .where(admin.firestore.FieldPath.documentId(), 'in', inspectionIds.slice(0, 10));
      
      const inspectionsSnapshot = await inspectionsQuery.get();
      inspections = inspectionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // 10개 이상인 경우 추가 조회
      if (inspectionIds.length > 10) {
        for (let i = 10; i < inspectionIds.length; i += 10) {
          const batch = inspectionIds.slice(i, i + 10);
          const batchQuery = getDb().collection('quality-inspections')
            .where(admin.firestore.FieldPath.documentId(), 'in', batch);
          const batchSnapshot = await batchQuery.get();
          const batchInspections = batchSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          inspections = inspections.concat(batchInspections);
        }
      }
    } else {
      // 전체 조회 (초기 구축 또는 전체 재계산)
      if (existingData) {
        // 기존 문서가 있으면 해당 정보로 조회
        const inspectionsQuery = getDb().collection('quality-inspections')
          .where('supplier', '==', existingData.supplier || '')
          .where('productName', '==', existingData.productName || '')
          .where('partName', '==', existingData.partName || '')
          .orderBy('createdAt', 'desc')
          .limit(2000);
        
        const inspectionsSnapshot = await inspectionsQuery.get();
        inspections = inspectionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } else {
        // 문서가 없으면 전체 조회 (초기 구축)
        const inspectionsQuery = getDb().collection('quality-inspections')
          .orderBy('createdAt', 'desc')
          .limit(2000);
        
        const inspectionsSnapshot = await inspectionsQuery.get();
        inspections = inspectionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }
    }

    // 제품 정보 추출 (기존 로직과 동일)
    const productData = {
      latestJig: undefined,
      latestJigDate: undefined,
      latestUndercoatData: undefined,
      latestTopcoatData: undefined,
      personnelCounts: [],
      latestLineRatio: undefined,
      rpmValues: [],
      sourceReportIds: [],
      sourceInspectionIds: []
    };

    let supplier, productName, partName, specification;

    // packaging-reports에서 제품 정보 및 최신 도료 정보 수집
    reports.forEach(report => {
      if (!report.supplier || !report.partName || !report.specification) {
        return;
      }

      // 기본 정보 설정 (첫 번째 리포트에서)
      if (!supplier) {
        supplier = report.supplier;
        partName = report.partName;
        specification = report.specification;
      }

      // 발주번호별로 제품 분리
      const orderNumbers = report.orderNumbers || [];
      const productNames = report.productName 
        ? report.productName.split(',').map(name => name.trim()).filter(Boolean)
        : [];

      if (orderNumbers.length > 0 && productNames.length > 0) {
        const maxLength = Math.max(orderNumbers.length, productNames.length);
        for (let i = 0; i < maxLength; i++) {
          const pName = productNames[i] || productNames[0] || report.productName || '';
          if (!pName) continue;

          if (!productName) {
            productName = pName;
          }

          // 최신 하도데이터 업데이트
          if (report.processConditions?.undercoat?.conditions && !productData.latestUndercoatData) {
            productData.latestUndercoatData = report.processConditions.undercoat.conditions;
          }

          // 최신 상도데이터 업데이트
          if (report.processConditions?.topcoat?.conditions && !productData.latestTopcoatData) {
            productData.latestTopcoatData = report.processConditions.topcoat.conditions;
          }

          // 평균작업인원 계산용 데이터 수집
          if (typeof report.personnelCount === 'number' && report.personnelCount >= 0) {
            productData.personnelCounts.push(report.personnelCount);
          }

          // 최근 비율(스핀들비율) 업데이트
          if (!productData.latestLineRatio && report.lineRatio && report.lineRatio.trim() !== '') {
            productData.latestLineRatio = report.lineRatio.trim();
          }

          if (!productData.sourceReportIds.includes(report.id)) {
            productData.sourceReportIds.push(report.id);
          }
        }
      } else {
        if (!report.productName) {
          return;
        }

        if (!productName) {
          productName = report.productName;
        }

        // 최신 하도데이터 업데이트
        if (report.processConditions?.undercoat?.conditions && !productData.latestUndercoatData) {
          productData.latestUndercoatData = report.processConditions.undercoat.conditions;
        }

        // 최신 상도데이터 업데이트
        if (report.processConditions?.topcoat?.conditions && !productData.latestTopcoatData) {
          productData.latestTopcoatData = report.processConditions.topcoat.conditions;
        }

        // 평균작업인원 계산용 데이터 수집
        if (typeof report.personnelCount === 'number' && report.personnelCount >= 0) {
          productData.personnelCounts.push(report.personnelCount);
        }

        // 최근 비율(스핀들비율) 업데이트
        if (!productData.latestLineRatio && report.lineRatio && report.lineRatio.trim() !== '') {
          productData.latestLineRatio = report.lineRatio.trim();
        }

        if (!productData.sourceReportIds.includes(report.id)) {
          productData.sourceReportIds.push(report.id);
        }
      }
    });

    // quality-inspections에서 최신 지그 정보 및 RPM 정보 수집
    inspections.forEach(inspection => {
      if (!inspection.supplier || !inspection.productName || !inspection.partName) {
        return;
      }

      // 최신 지그 정보 업데이트
      let inspectionDate = inspection.inspectionDate || '';
      if (!inspectionDate && inspection.createdAt) {
        if (typeof inspection.createdAt === 'string') {
          inspectionDate = inspection.createdAt;
        } else if (inspection.createdAt && typeof inspection.createdAt === 'object' && 'toISOString' in inspection.createdAt) {
          inspectionDate = inspection.createdAt.toISOString();
        } else if (inspection.createdAt && typeof inspection.createdAt.toDate === 'function') {
          inspectionDate = inspection.createdAt.toDate().toISOString();
        }
      }
      
      const jigInfo = [
        inspection.jigUsed,
        inspection.jigUsed1,
        inspection.jigUsed2,
        inspection.internalJigLower,
        inspection.internalJigUpper
      ].filter(Boolean).join(', ');

      if (jigInfo) {
        // 기존 지그 정보가 없거나, 현재 검사가 더 최신인 경우 업데이트
        if (!productData.latestJig) {
          productData.latestJig = jigInfo;
          if (inspectionDate) {
            productData.latestJigDate = inspectionDate;
          }
        } else {
          // 날짜 비교하여 최신 정보로 업데이트
          const existingDate = productData.latestJigDate || '';
          if (inspectionDate && (!existingDate || inspectionDate > existingDate)) {
            productData.latestJig = jigInfo;
            productData.latestJigDate = inspectionDate;
          }
        }
      }

      // 평균 작업속도(RPM) 계산용 데이터 수집 (공정검사에서만)
      if (inspection.inspectionType === 'inProcess' && inspection.processLines && inspection.processLines.length > 0) {
        inspection.processLines.forEach(processLine => {
          if (processLine.lineSpeed) {
            const lineSpeedStr = String(processLine.lineSpeed).trim();
            const cleanedSpeed = lineSpeedStr.replace(/[^\d.]/g, '');
            const rpm = parseFloat(cleanedSpeed);
            if (!isNaN(rpm) && rpm > 0) {
              productData.rpmValues.push(rpm);
            }
          }
        });
      }

      if (!productData.sourceInspectionIds.includes(inspection.id)) {
        productData.sourceInspectionIds.push(inspection.id);
      }
    });

    // 집계 계산
    const averagePersonnelCount = productData.personnelCounts.length > 0
      ? Math.round(productData.personnelCounts.reduce((sum, count) => sum + count, 0) / productData.personnelCounts.length * 10) / 10
      : undefined;

    const averageRPM = productData.rpmValues.length > 0
      ? Math.round(productData.rpmValues.reduce((sum, rpm) => sum + rpm, 0) / productData.rpmValues.length * 10) / 10
      : undefined;

    // 부분 업데이트 최적화: 변경된 필드만 업데이트
    const updateData = {};
    
    // 기본 정보는 항상 포함 (문서가 없을 경우)
    if (!productSummaryDoc.exists) {
      updateData.id = productId;
      updateData.supplier = supplier || '';
      updateData.productName = productName || '';
      updateData.partName = partName || '';
      updateData.specification = specification || '';
    }
    
    // 업데이트할 필드가 지정된 경우 (부분 업데이트)
    if (updateFields) {
      if (updateFields.includes('latestJig') && productData.latestJig !== undefined) {
        updateData.latestJig = productData.latestJig || null;
      }
      if (updateFields.includes('latestJigDate') && productData.latestJigDate !== undefined) {
        updateData.latestJigDate = productData.latestJigDate || null;
      }
      if (updateFields.includes('latestUndercoatData') && productData.latestUndercoatData !== undefined) {
        updateData.latestUndercoatData = productData.latestUndercoatData || null;
      }
      if (updateFields.includes('latestTopcoatData') && productData.latestTopcoatData !== undefined) {
        updateData.latestTopcoatData = productData.latestTopcoatData || null;
      }
      if (updateFields.includes('averagePersonnelCount') && averagePersonnelCount !== undefined) {
        updateData.averagePersonnelCount = averagePersonnelCount || null;
      }
      if (updateFields.includes('latestLineRatio') && productData.latestLineRatio !== undefined) {
        updateData.latestLineRatio = productData.latestLineRatio || null;
      }
      if (updateFields.includes('averageRPM') && averageRPM !== undefined) {
        updateData.averageRPM = averageRPM || null;
      }
      if (updateFields.includes('sourceReportIds')) {
        updateData.sourceReportIds = productData.sourceReportIds;
      }
      if (updateFields.includes('sourceInspectionIds')) {
        updateData.sourceInspectionIds = productData.sourceInspectionIds;
      }
    } else {
      // 전체 업데이트 (기존 로직)
      updateData.latestJig = productData.latestJig || null;
      updateData.latestJigDate = productData.latestJigDate || null;
      updateData.latestUndercoatData = productData.latestUndercoatData || null;
      updateData.latestTopcoatData = productData.latestTopcoatData || null;
      updateData.averagePersonnelCount = averagePersonnelCount || null;
      updateData.latestLineRatio = productData.latestLineRatio || null;
      updateData.averageRPM = averageRPM || null;
      updateData.sourceReportIds = productData.sourceReportIds;
      updateData.sourceInspectionIds = productData.sourceInspectionIds;
    }
    
    // lastUpdated는 항상 업데이트
    updateData.lastUpdated = admin.firestore.FieldValue.serverTimestamp();
    
    // null 값 제거
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === null || updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    // 부분 업데이트: updateDoc 사용 (set 대신)
    if (productSummaryDoc.exists) {
      await productSummaryRef.update(updateData);
    } else {
      await productSummaryRef.set(updateData, { merge: true });
    }

    return { ...existingData, ...updateData };
  } catch (error) {
    console.error(`Error updating product summary for ${productId}:`, error);
    throw error;
  }
}

/**
 * packaging-reports 변경 시 영향받는 제품들 업데이트
 * 배치 처리 모드: 큐에 추가 (debouncing)
 * 즉시 처리 모드: 바로 업데이트
 */
async function updateProductSummariesFromReport(reportId, reportData, useQueue = true) {
  try {
    const productIds = extractProductIdsFromReport(reportData);
    
    if (productIds.length === 0) {
      return;
    }

    if (useQueue) {
      // 배치 처리: 큐에 추가
      const productSummaryQueue = require('./productSummaryQueue');
      const enqueuePromises = productIds.map(productId =>
        productSummaryQueue.enqueueProductId(productId, 'report', reportId)
      );
      await Promise.all(enqueuePromises);
      console.log(`Queued ${productIds.length} product summaries from report ${reportId}`);
    } else {
      // 즉시 처리: 바로 업데이트
      const updatePromises = productIds.map(productId => 
        updateProductSummary(productId, [reportId], [])
      );
      await Promise.all(updatePromises);
      console.log(`Updated ${productIds.length} product summaries from report ${reportId}`);
    }
  } catch (error) {
    console.error(`Error updating product summaries from report ${reportId}:`, error);
    throw error;
  }
}

/**
 * quality-inspections 변경 시 영향받는 제품들 업데이트
 * 배치 처리 모드: 큐에 추가 (debouncing)
 * 즉시 처리 모드: 바로 업데이트
 * 부분 업데이트: quality-inspections 관련 필드만 업데이트
 */
async function updateProductSummariesFromInspection(inspectionId, inspectionData, useQueue = true) {
  try {
    const productIds = extractProductIdsFromInspection(inspectionData);
    
    if (productIds.length === 0) {
      return;
    }

    // quality-inspections 변경 시 업데이트할 필드 (부분 업데이트 최적화)
    const updateFields = [
      'latestJig',
      'latestJigDate',
      'averageRPM',
      'sourceInspectionIds'
    ];

    if (useQueue) {
      // 배치 처리: 큐에 추가
      const productSummaryQueue = require('./productSummaryQueue');
      const enqueuePromises = productIds.map(productId =>
        productSummaryQueue.enqueueProductId(productId, 'inspection', inspectionId)
      );
      await Promise.all(enqueuePromises);
      console.log(`Queued ${productIds.length} product summaries from inspection ${inspectionId}`);
    } else {
      // 즉시 처리: 병렬 처리 최적화 (최대 10개씩)
      const MAX_CONCURRENT = 10;
      for (let i = 0; i < productIds.length; i += MAX_CONCURRENT) {
        const batch = productIds.slice(i, i + MAX_CONCURRENT);
        const updatePromises = batch.map(productId => 
          updateProductSummary(productId, [], [inspectionId], updateFields)
        );
        await Promise.all(updatePromises);
      }
      console.log(`Updated ${productIds.length} product summaries from inspection ${inspectionId} (partial update, parallel processing)`);
    }
  } catch (error) {
    console.error(`Error updating product summaries from inspection ${inspectionId}:`, error);
    throw error;
  }
}

/**
 * 큐에서 배치로 제품 summaries 업데이트
 */
async function processQueueBatch() {
  try {
    const productSummaryQueue = require('./productSummaryQueue');
    const items = await productSummaryQueue.getPendingQueueItems();
    
    if (items.length === 0) {
      return { processed: 0, errors: 0 };
    }
    
    console.log(`Processing ${items.length} queue items...`);
    
    let processed = 0;
    let errors = 0;
    
    // 각 큐 항목 처리
    for (const item of items) {
      try {
        // sources에서 reportIds와 inspectionIds 추출
        const reportIds = item.sources
          .filter(s => s.type === 'report')
          .map(s => s.id);
        const inspectionIds = item.sources
          .filter(s => s.type === 'inspection')
          .map(s => s.id);
        
        // 제품 summary 업데이트
        await updateProductSummary(item.productId, reportIds, inspectionIds);
        
        // 처리 완료 표시
        await productSummaryQueue.markAsProcessed(item.productId);
        
        // 큐 항목 삭제 (선택사항 - 정리용)
        await productSummaryQueue.deleteQueueItem(item.productId);
        
        processed++;
      } catch (error) {
        console.error(`Error processing queue item ${item.productId}:`, error);
        errors++;
        // 에러가 발생해도 다음 항목 계속 처리
      }
    }
    
    console.log(`Queue batch processed: ${processed} succeeded, ${errors} failed`);
    
    return { processed, errors };
  } catch (error) {
    console.error('Error processing queue batch:', error);
    throw error;
  }
}

module.exports = {
  generateProductId,
  extractProductIdsFromReport,
  extractProductIdsFromInspection,
  updateProductSummary,
  updateProductSummariesFromReport,
  updateProductSummariesFromInspection,
  processQueueBatch
};

