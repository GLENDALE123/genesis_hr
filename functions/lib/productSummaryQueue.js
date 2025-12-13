/**
 * Product Summary Queue Service
 * 배치 처리 및 debouncing을 위한 큐 관리
 * 짧은 시간 내 여러 변경사항을 모아서 한 번에 처리
 */

const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// tms-production 데이터베이스 사용 (지연 초기화)
function getDb() {
  const databaseId = process.env.FIREBASE_FIRESTORE_DATABASE_ID || 'tms-production';
  return getFirestore(admin.app(), databaseId);
}

const QUEUE_COLLECTION = 'product-summary-queue';
const BATCH_DELAY_MS = 5000; // 5초 대기
const MAX_BATCH_SIZE = 500; // 최대 배치 크기

/**
 * 제품 ID를 큐에 추가 (중복 제거)
 */
async function enqueueProductId(productId, sourceType, sourceId) {
  try {
    const db = getDb();
    const queueRef = db.collection(QUEUE_COLLECTION).doc(productId);
    const queueDoc = await queueRef.get();
    
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    if (queueDoc.exists) {
      // 이미 큐에 있으면 업데이트 (최신 정보로)
      const existingData = queueDoc.data();
      const sources = existingData.sources || [];
      
      // 같은 source가 이미 있으면 업데이트, 없으면 추가
      const sourceIndex = sources.findIndex(s => 
        s.type === sourceType && s.id === sourceId
      );
      
      if (sourceIndex >= 0) {
        sources[sourceIndex] = { type: sourceType, id: sourceId, addedAt: now };
      } else {
        sources.push({ type: sourceType, id: sourceId, addedAt: now });
      }
      
      await queueRef.update({
        sources: sources,
        lastUpdated: now,
        processed: false
      });
    } else {
      // 새로 추가
      await queueRef.set({
        productId: productId,
        sources: [{ type: sourceType, id: sourceId, addedAt: now }],
        addedAt: now,
        lastUpdated: now,
        processed: false,
        scheduledFor: admin.firestore.Timestamp.fromMillis(
          Date.now() + BATCH_DELAY_MS
        )
      });
    }
    
    return true;
  } catch (error) {
    console.error(`Error enqueueing product ${productId}:`, error);
    throw error;
  }
}

/**
 * 큐에서 처리할 항목들을 가져오기
 */
async function getPendingQueueItems(limit = MAX_BATCH_SIZE) {
  try {
    const db = getDb();
    const now = admin.firestore.Timestamp.now();
    
    const query = db.collection(QUEUE_COLLECTION)
      .where('processed', '==', false)
      .where('scheduledFor', '<=', now)
      .orderBy('scheduledFor', 'asc')
      .limit(limit);
    
    const snapshot = await query.get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting pending queue items:', error);
    throw error;
  }
}

/**
 * 큐 항목을 처리 완료로 표시
 */
async function markAsProcessed(productId) {
  try {
    const db = getDb();
    const queueRef = db.collection(QUEUE_COLLECTION).doc(productId);
    await queueRef.update({
      processed: true,
      processedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error(`Error marking ${productId} as processed:`, error);
    throw error;
  }
}

/**
 * 큐 항목 삭제 (처리 완료 후 정리)
 */
async function deleteQueueItem(productId) {
  try {
    const db = getDb();
    const queueRef = db.collection(QUEUE_COLLECTION).doc(productId);
    await queueRef.delete();
  } catch (error) {
    console.error(`Error deleting queue item ${productId}:`, error);
    // 삭제 실패는 치명적이지 않으므로 무시
  }
}

/**
 * 오래된 처리 완료 항목 정리 (30일 이상)
 */
async function cleanupOldQueueItems() {
  try {
    const db = getDb();
    const thirtyDaysAgo = admin.firestore.Timestamp.fromMillis(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    );
    
    const query = db.collection(QUEUE_COLLECTION)
      .where('processed', '==', true)
      .where('processedAt', '<', thirtyDaysAgo)
      .limit(500);
    
    const snapshot = await query.get();
    
    const deletePromises = snapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);
    
    return snapshot.size;
  } catch (error) {
    console.error('Error cleaning up old queue items:', error);
    return 0;
  }
}

module.exports = {
  enqueueProductId,
  getPendingQueueItems,
  markAsProcessed,
  deleteQueueItem,
  cleanupOldQueueItems,
  BATCH_DELAY_MS,
  MAX_BATCH_SIZE
};

