/**
 * Product Summary 초기 구축 스크립트
 * 기존 packaging-reports와 quality-inspections 데이터로 product-summary 컬렉션 초기 구축
 * 
 * 사용법:
 * node functions/scripts/initializeProductSummary.js
 * 또는
 * firebase functions:shell에서 직접 호출
 */

const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const productSummaryService = require('../lib/productSummaryService');

// Firebase Admin SDK 초기화
if (!admin.apps.length) {
  admin.initializeApp();
}

// tms-production 데이터베이스 사용
const databaseId = process.env.FIREBASE_FIRESTORE_DATABASE_ID || 'tms-production';
const db = getFirestore(admin.app(), databaseId);

/**
 * 모든 제품의 product-summary 초기 구축
 */
async function initializeProductSummary() {
  try {
    console.log('🚀 Product Summary 초기 구축 시작...');

    // 1. packaging-reports에서 모든 제품 ID 추출 (전체 데이터 조회)
    // 데이터가 많으면 배치로 나누어 처리
    let lastDoc = null;
    const allReports = [];
    
    while (true) {
      let query = db.collection('packaging-reports')
        .orderBy('workDate', 'desc')
        .limit(1000);
      
      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }
      
      const batch = await query.get();
      
      if (batch.empty) break;
      
      allReports.push(...batch.docs);
      lastDoc = batch.docs[batch.docs.length - 1];
      
      console.log(`📦 packaging-reports 조회 중: ${allReports.length}개...`);
    }
    
    const reportsSnapshot = { docs: allReports };

    const productIds = new Set();
    const reportIdsByProduct = new Map();

    reportsSnapshot.docs.forEach(doc => {
      const report = { id: doc.id, ...doc.data() };
      const ids = productSummaryService.extractProductIdsFromReport(report);
      
      ids.forEach(productId => {
        productIds.add(productId);
        if (!reportIdsByProduct.has(productId)) {
          reportIdsByProduct.set(productId, []);
        }
        reportIdsByProduct.get(productId).push(report.id);
      });
    });

    console.log(`📦 ${productIds.size}개의 고유 제품 발견`);

    // 2. quality-inspections에서 제품 ID 추출 (전체 데이터 조회)
    let lastInspectionDoc = null;
    const allInspections = [];
    
    while (true) {
      let query = db.collection('quality-inspections')
        .orderBy('createdAt', 'desc')
        .limit(1000);
      
      if (lastInspectionDoc) {
        query = query.startAfter(lastInspectionDoc);
      }
      
      const batch = await query.get();
      
      if (batch.empty) break;
      
      allInspections.push(...batch.docs);
      lastInspectionDoc = batch.docs[batch.docs.length - 1];
      
      console.log(`🔍 quality-inspections 조회 중: ${allInspections.length}개...`);
    }
    
    const inspectionsSnapshot = { docs: allInspections };

    const inspectionIdsByProduct = new Map();

    inspectionsSnapshot.docs.forEach(doc => {
      const inspection = { id: doc.id, ...doc.data() };
      const ids = productSummaryService.extractProductIdsFromInspection(inspection);
      
      ids.forEach(productId => {
        productIds.add(productId);
        if (!inspectionIdsByProduct.has(productId)) {
          inspectionIdsByProduct.set(productId, []);
        }
        inspectionIdsByProduct.get(productId).push(inspection.id);
      });
    });

    console.log(`🔍 ${inspectionsSnapshot.size}개의 품질검사 데이터 처리`);

    // 3. 각 제품별로 product-summary 생성/업데이트
    const productIdsArray = Array.from(productIds);
    let successCount = 0;
    let errorCount = 0;

    console.log(`\n📝 ${productIdsArray.length}개의 제품 summary 생성 중...`);

    // 모든 리포트와 검사 데이터를 메모리에 로드 (초기 구축 시 효율성 향상)
    const allReportsData = allReports.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    const allInspectionsData = allInspections.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`📊 전체 데이터: packaging-reports ${allReportsData.length}개, quality-inspections ${allInspectionsData.length}개`);

    // 배치 처리 (한 번에 최대 10개씩)
    const batchSize = 10;
    for (let i = 0; i < productIdsArray.length; i += batchSize) {
      const batch = productIdsArray.slice(i, i + batchSize);
      
      const promises = batch.map(async (productId) => {
        try {
          const reportIds = reportIdsByProduct.get(productId) || [];
          const inspectionIds = inspectionIdsByProduct.get(productId) || [];
          
          // reportIds와 inspectionIds가 있으면 사용, 없으면 전체 데이터에서 필터링
          if (reportIds.length > 0 && inspectionIds.length > 0) {
            await productSummaryService.updateProductSummary(
              productId,
              reportIds,
              inspectionIds
            );
          } else {
            // 전체 데이터에서 해당 제품과 관련된 데이터만 필터링
            const productReports = allReportsData.filter(report => {
              const ids = productSummaryService.extractProductIdsFromReport(report);
              return ids.includes(productId);
            });
            const productInspections = allInspectionsData.filter(inspection => {
              const ids = productSummaryService.extractProductIdsFromInspection(inspection);
              return ids.includes(productId);
            });
            
            const filteredReportIds = productReports.map(r => r.id);
            const filteredInspectionIds = productInspections.map(i => i.id);
            
            await productSummaryService.updateProductSummary(
              productId,
              filteredReportIds,
              filteredInspectionIds
            );
          }
          
          successCount++;
          if (successCount % 50 === 0) {
            console.log(`  진행: ${successCount}/${productIdsArray.length}`);
          }
        } catch (error) {
          console.error(`  ❌ 제품 ${productId} 처리 실패:`, error.message);
          errorCount++;
        }
      });

      await Promise.all(promises);
    }

    console.log(`\n✅ 초기 구축 완료!`);
    console.log(`   성공: ${successCount}개`);
    console.log(`   실패: ${errorCount}개`);
    console.log(`   총 제품 수: ${productIdsArray.length}개`);

  } catch (error) {
    console.error('❌ 초기 구축 실패:', error);
    throw error;
  }
}

// 스크립트 직접 실행 시
if (require.main === module) {
  initializeProductSummary()
    .then(() => {
      console.log('\n✨ 모든 작업이 완료되었습니다.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 오류 발생:', error);
      process.exit(1);
    });
}

module.exports = { initializeProductSummary };

