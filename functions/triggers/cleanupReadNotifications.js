/*
  Scheduled Function - 읽은 알림 자동 정리
  매일 자정(한국 시간 00:00)에 실행되어 3일 이상 된 읽은 알림 삭제
*/

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeFirebase, chunkArray } = require('../lib/utils');
const { logNotificationEvent, createPerformanceTimer } = require('../lib/logging');

// 매일 자정 실행 (한국 시간: 00:00)
exports.cleanupReadNotifications = onSchedule({
  schedule: '0 0 * * *',  // 매일 00:00 (UTC+0)
  timeZone: 'Asia/Seoul',  // 한국 시간대
  retryCount: 3,           // 실패 시 3번 재시도
  memory: '512MiB',        // 메모리 할당
  timeoutSeconds: 540,     // 9분 타임아웃
}, async (event) => {
  const timer = createPerformanceTimer('cleanupReadNotifications');
  
  try {
    console.log('[Cleanup] 읽은 알림 정리 시작...');
    
    const { db } = initializeFirebase();
    
    // 3일 전 날짜 계산
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    logNotificationEvent('cleanup_start', {
      cutoffDate: threeDaysAgo.toISOString(),
      schedule: '0 0 * * *'
    });
    
    // 모든 사용자의 inbox 컬렉션 조회
    const usersSnapshot = await db.collection('users').get();
    
    let totalDeleted = 0;
    let processedUsers = 0;
    const BATCH_SIZE = 500;
    
    // 각 사용자별로 처리
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      
      try {
        // 3일 이상 된 읽은 알림 조회
        const inboxSnapshot = await db
          .collection('users')
          .doc(userId)
          .collection('inbox')
          .where('read', '==', true)
          .where('createdAt', '<=', threeDaysAgo)
          .get();
        
        if (inboxSnapshot.empty) {
          continue;
        }
        
        // Batch로 삭제 (500개씩)
        const docs = inboxSnapshot.docs;
        const batchChunks = chunkArray(docs, BATCH_SIZE);
        
        for (const chunk of batchChunks) {
          const batch = db.batch();
          chunk.forEach((doc) => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          totalDeleted += chunk.length;
        }
        
        processedUsers++;
        console.log(`[Cleanup] User ${userId}: ${docs.length}개 알림 삭제`);
        
      } catch (userError) {
        console.error(`[Cleanup] User ${userId} 처리 실패:`, userError);
        // 개별 사용자 실패는 무시하고 계속 진행
      }
    }
    
    const duration = timer.end({
      totalDeleted,
      processedUsers,
      totalUsers: usersSnapshot.docs.length,
      cutoffDate: threeDaysAgo.toISOString()
    });
    
    logNotificationEvent('cleanup_success', {
      totalDeleted,
      processedUsers,
      totalUsers: usersSnapshot.docs.length,
      duration,
      cutoffDate: threeDaysAgo.toISOString()
    });
    
    console.log(`[Cleanup] 완료: ${totalDeleted}개 알림 삭제 (${processedUsers}/${usersSnapshot.docs.length} 사용자 처리, ${duration}ms)`);
    
  } catch (error) {
    timer.end({ error: error?.message || String(error) });
    console.error('[Cleanup] 읽은 알림 정리 실패:', error);
    throw error; // 재시도를 위해 에러 던지기
  }
});

