/**
 * 제품명 및 발주처 대소문자 정규화 함수
 * packaging-reports 컬렉션의 supplier와 productName 필드의 알파벳을 대문자로 통일
 */

const { onRequest } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

/**
 * 문자열에서 알파벳만 대문자로 변환 (한글, 숫자, 특수문자는 유지)
 * 예: "60g줄기세포크림" → "60G줄기세포크림"
 */
function normalizeAlphabets(str) {
  if (!str || typeof str !== 'string') {
    return str;
  }
  
  return str.replace(/[A-Za-z]/g, (match) => {
    return match.toUpperCase();
  });
}

/**
 * 제품명 및 발주처 정규화 함수
 * 
 * 사용법:
 * POST /normalizeProductNames
 * Body: { "dryRun": true } // true면 실제 업데이트 없이 미리보기만
 */
exports.normalizeProductNames = onRequest(
  {
    cors: true,
    maxInstances: 1, // 동시 실행 방지
  },
  async (req, res) => {
    try {
      const dryRun = req.body?.dryRun !== false; // 기본값은 true (안전을 위해)
      const databaseId = process.env.FIREBASE_FIRESTORE_DATABASE_ID || 'tms-production';
      
      // Firebase Admin SDK 초기화 확인
      if (!admin.apps.length) {
        admin.initializeApp();
      }
      
      // getFirestore를 사용하여 명시적으로 데이터베이스 지정
      const db = getFirestore(admin.app(), databaseId);
      
      logger.info(`[normalizeProductNames] 시작 - dryRun: ${dryRun}, database: ${databaseId}`);
      
      // packaging-reports 컬렉션의 모든 문서 조회
      const reportsRef = db.collection('packaging-reports');
      const snapshot = await reportsRef.get();
      
      if (snapshot.empty) {
        logger.info('[normalizeProductNames] 조회된 문서가 없습니다.');
        return res.status(200).json({
          success: true,
          message: '조회된 문서가 없습니다.',
          stats: {
            total: 0,
            updated: 0,
            skipped: 0,
            dryRun
          }
        });
      }
      
      logger.info(`[normalizeProductNames] 총 ${snapshot.size}개 문서 조회`);
      
      const stats = {
        total: snapshot.size,
        updated: 0,
        skipped: 0,
        changes: [] // 변경 내역
      };
      
      const BATCH_SIZE = 500; // Firestore 배치 제한
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const updates = {};
        let hasChanges = false;
        
        // supplier 정규화
        if (data.supplier) {
          const normalizedSupplier = normalizeAlphabets(data.supplier);
          if (normalizedSupplier !== data.supplier) {
            updates.supplier = normalizedSupplier;
            hasChanges = true;
            stats.changes.push({
              docId: doc.id,
              field: 'supplier',
              before: data.supplier,
              after: normalizedSupplier
            });
          }
        }
        
        // productName 정규화
        if (data.productName) {
          const normalizedProductName = normalizeAlphabets(data.productName);
          if (normalizedProductName !== data.productName) {
            updates.productName = normalizedProductName;
            hasChanges = true;
            stats.changes.push({
              docId: doc.id,
              field: 'productName',
              before: data.productName,
              after: normalizedProductName
            });
          }
        }
        
        if (hasChanges) {
          stats.updated++;
        } else {
          stats.skipped++;
        }
      });
      
      // 실제 업데이트 실행
      if (!dryRun && stats.updated > 0) {
        const batches = [];
        let currentBatch = db.batch();
        let currentBatchCount = 0;
        
        // 변경이 필요한 문서들만 배치에 추가
        snapshot.forEach((doc) => {
          const data = doc.data();
          const updates = {};
          let hasChanges = false;
          
          if (data.supplier) {
            const normalizedSupplier = normalizeAlphabets(data.supplier);
            if (normalizedSupplier !== data.supplier) {
              updates.supplier = normalizedSupplier;
              hasChanges = true;
            }
          }
          
          if (data.productName) {
            const normalizedProductName = normalizeAlphabets(data.productName);
            if (normalizedProductName !== data.productName) {
              updates.productName = normalizedProductName;
              hasChanges = true;
            }
          }
          
          if (hasChanges) {
            updates.updatedAt = FieldValue.serverTimestamp();
            const docRef = reportsRef.doc(doc.id);
            currentBatch.update(docRef, updates);
            currentBatchCount++;
            
            // 배치 크기 제한 도달 시 커밋하고 새 배치 시작
            if (currentBatchCount >= BATCH_SIZE) {
              batches.push(currentBatch);
              currentBatch = db.batch();
              currentBatchCount = 0;
            }
          }
        });
        
        // 마지막 배치 추가
        if (currentBatchCount > 0) {
          batches.push(currentBatch);
        }
        
        // 모든 배치 실행
        logger.info(`[normalizeProductNames] ${batches.length}개 배치 실행 중...`);
        for (let i = 0; i < batches.length; i++) {
          await batches[i].commit();
          logger.info(`[normalizeProductNames] 배치 ${i + 1}/${batches.length} 완료`);
        }
        
        logger.info(`[normalizeProductNames] 모든 배치 완료 - ${stats.updated}개 문서 업데이트`);
      }
      
      const result = {
        success: true,
        message: dryRun 
          ? '미리보기 모드: 실제 업데이트는 수행되지 않았습니다. dryRun: false로 설정하여 실제 업데이트를 실행하세요.'
          : `${stats.updated}개 문서가 성공적으로 업데이트되었습니다.`,
        stats: {
          total: stats.total,
          updated: stats.updated,
          skipped: stats.skipped,
          dryRun
        }
      };
      
      // dryRun 모드일 때만 변경 내역 상세 정보 포함 (너무 많으면 제한)
      if (dryRun && stats.changes.length > 0) {
        result.sampleChanges = stats.changes.slice(0, 20); // 처음 20개만 샘플로
        if (stats.changes.length > 20) {
          result.message += ` (변경 내역 샘플 20개만 표시, 총 ${stats.changes.length}개 변경 예정)`;
        }
      }
      
      logger.info(`[normalizeProductNames] 완료 - ${JSON.stringify(result.stats)}`);
      
      return res.status(200).json(result);
      
    } catch (error) {
      logger.error('[normalizeProductNames] 오류 발생:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

