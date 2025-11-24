/*
  Scheduled Function - 새벽 1시 자동 로그아웃
  매일 새벽 1시(한국 시간 01:00)에 실행되어 모든 활성 세션을 삭제
  클라이언트는 세션 변경을 감지하여 자동 로그아웃 처리
*/

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeFirebase, chunkArray } = require('../lib/utils');
const { logNotificationEvent, createPerformanceTimer } = require('../lib/logging');

// 매일 새벽 1시 실행 (한국 시간: 01:00)
exports.autoLogoutAt1AM = onSchedule({
  schedule: '0 1 * * *',  // 매일 01:00 (UTC+0 기준, timeZone으로 조정)
  timeZone: 'Asia/Seoul',  // 한국 시간대
  retryCount: 3,           // 실패 시 3번 재시도
  memory: '512MiB',        // 메모리 할당
  timeoutSeconds: 540,     // 9분 타임아웃
  region: 'asia-northeast3',
}, async (event) => {
  const timer = createPerformanceTimer('autoLogoutAt1AM');
  
  try {
    const { db } = initializeFirebase();
    
    // 한국 시간대의 현재 시간 확인
    const now = new Date();
    const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const koreaHour = koreaTime.getHours();
    
    logNotificationEvent('auto_logout_start', {
      koreaTime: koreaTime.toISOString(),
      koreaHour,
      schedule: '0 1 * * *'
    });
    
    // 1시가 아니면 실행하지 않음 (안전장치)
    if (koreaHour !== 1) {
      console.log(`[AutoLogout] 현재 한국 시간이 1시가 아님 (${koreaHour}시) - 스킵`);
      return;
    }
    
    let totalDeleted = 0;
    let processedUsers = 0;
    const BATCH_SIZE = 500;
    
    // 모든 사용자의 세션 조회
    const usersSnapshot = await db.collection('users').get();
    
    // 각 사용자별로 처리
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      
      try {
        // 각 플랫폼별 세션 조회 (web, electron, mobile)
        // 세션 경로: users/{uid}/sessions/{platform}
        const platforms = ['web', 'electron', 'mobile'];
        
        for (const platform of platforms) {
          const sessionRef = db
            .collection('users')
            .doc(userId)
            .collection('sessions')
            .doc(platform);
          
          const sessionDoc = await sessionRef.get();
          
          if (sessionDoc.exists) {
            // 세션 삭제
            await sessionRef.delete();
            totalDeleted++;
            console.log(`[AutoLogout] 세션 삭제: ${userId}/${platform}`);
          }
        }
        
        processedUsers++;
      } catch (userError) {
        console.error(`[AutoLogout] User ${userId} 처리 실패:`, userError);
        // 개별 사용자 실패는 무시하고 계속 진행
      }
    }
    
    const duration = timer.end({
      totalDeleted,
      processedUsers,
      totalUsers: usersSnapshot.docs.length,
      koreaTime: koreaTime.toISOString()
    });
    
    logNotificationEvent('auto_logout_success', {
      totalDeleted,
      processedUsers,
      totalUsers: usersSnapshot.docs.length,
      duration,
      koreaTime: koreaTime.toISOString()
    });
    
    console.log(`[AutoLogout] 완료: ${totalDeleted}개 세션 삭제, ${processedUsers}명 사용자 처리`);
  } catch (error) {
    timer.end({ error: error?.message || String(error) });
    console.error('[AutoLogout] 자동 로그아웃 실패:', error);
    throw error; // 재시도를 위해 에러 던지기
  }
});

