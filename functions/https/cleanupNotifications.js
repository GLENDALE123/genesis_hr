/*
  알림 데이터 정리 함수들
*/

const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeFirebase, chunkArray } = require('../lib/utils');

// 매일 새벽 2시에 오래된 알림 정리 (스케줄러)
exports.cleanupOldNotifications = onSchedule({
  schedule: '0 2 * * *', // 매일 새벽 2시
  timeZone: 'Asia/Seoul',
  memory: '1GiB',
  timeoutSeconds: 540 // 9분
}, async (event) => {
  console.log('[cleanupOldNotifications] Starting scheduled cleanup...');
  
  try {
    const { db } = initializeFirebase();
    const now = new Date();
    
    // 30일 이전 알림 삭제
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    let totalDeleted = 0;
    let hasMore = true;
    
    // 메인 알림 컬렉션 정리
    console.log('[cleanupOldNotifications] Cleaning main notifications collection...');
    while (hasMore) {
      const snapshot = await db.collection('notifications')
        .where('createdAt', '<', thirtyDaysAgo)
        .orderBy('createdAt', 'asc') // 오래된 순으로 정렬
        .limit(400)
        .get();
      
      if (snapshot.empty) {
        hasMore = false;
        break;
      }
      
      const batch = db.batch();
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      totalDeleted += snapshot.size;
      
      console.log(`[cleanupOldNotifications] Deleted ${snapshot.size} notifications from main collection`);
      
      // 400개 미만이면 마지막 배치
      if (snapshot.size < 400) {
        hasMore = false;
      }
      
      // 다음 배치 전 잠시 대기 (과부하 방지)
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    // 사용자 인박스 정리
    console.log('[cleanupOldNotifications] Cleaning user inboxes...');
    const usersSnapshot = await db.collection('users').get();
    let inboxDeleted = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      let userHasMore = true;
      
      while (userHasMore) {
        const inboxSnapshot = await db.collection('users').doc(userId)
          .collection('inbox')
          .where('createdAt', '<', thirtyDaysAgo)
          .orderBy('createdAt', 'asc') // 오래된 순으로 정렬
          .limit(400)
          .get();
        
        if (inboxSnapshot.empty) {
          userHasMore = false;
          break;
        }
        
        const batch = db.batch();
        inboxSnapshot.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
        inboxDeleted += inboxSnapshot.size;
        
        // 400개 미만이면 마지막 배치
        if (inboxSnapshot.size < 400) {
          userHasMore = false;
        }
        
        // 다음 배치 전 잠시 대기
        if (userHasMore) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
    
    console.log(`[cleanupOldNotifications] Cleanup completed. Main: ${totalDeleted}, Inbox: ${inboxDeleted}`);
    
    // 정리 통계를 로그로 기록
    await db.collection('system-logs').doc('notification-cleanup').set({
      lastCleanup: new Date(),
      mainNotificationsDeleted: totalDeleted,
      inboxNotificationsDeleted: inboxDeleted,
      cleanupDate: thirtyDaysAgo,
      totalDeleted: totalDeleted + inboxDeleted
    }, { merge: true });
    
  } catch (error) {
    console.error('[cleanupOldNotifications] Cleanup failed:', error);
    
    // 오류 로그 저장
    const { db } = initializeFirebase();
    await db.collection('system-logs').doc('notification-cleanup-error').set({
      lastError: new Date(),
      error: error.message || String(error),
      stack: error.stack
    }, { merge: true });
  }
});

// 수동 정리 엔드포인트 (관리자용)
exports.cleanupNotificationsManual = onRequest({
  memory: '1GiB',
  timeoutSeconds: 540
}, async (req, res) => {
  try {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(204).send('');
    
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }
    
    const { days = 30, adminToken } = req.body || {};
    
    // 간단한 관리자 토큰 검증 (실제 환경에서는 더 강력한 인증 필요)
    if (adminToken !== 'admin-cleanup-2024') {
      return res.status(403).json({ ok: false, error: 'Unauthorized' });
    }
    
    const { db } = initializeFirebase();
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    
    let totalDeleted = 0;
    let hasMore = true;
    
    // 메인 알림 컬렉션 정리
    while (hasMore) {
      const snapshot = await db.collection('notifications')
        .where('createdAt', '<', cutoffDate)
        .orderBy('createdAt', 'asc') // 오래된 순으로 정렬
        .limit(400)
        .get();
      
      if (snapshot.empty) {
        hasMore = false;
        break;
      }
      
      const batch = db.batch();
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      totalDeleted += snapshot.size;
      
      if (snapshot.size < 400) {
        hasMore = false;
      }
      
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    // 사용자 인박스 정리
    const usersSnapshot = await db.collection('users').get();
    let inboxDeleted = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      let userHasMore = true;
      
      while (userHasMore) {
        const inboxSnapshot = await db.collection('users').doc(userId)
          .collection('inbox')
          .where('createdAt', '<', cutoffDate)
          .orderBy('createdAt', 'asc') // 오래된 순으로 정렬
          .limit(400)
          .get();
        
        if (inboxSnapshot.empty) {
          userHasMore = false;
          break;
        }
        
        const batch = db.batch();
        inboxSnapshot.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
        inboxDeleted += inboxSnapshot.size;
        
        if (inboxSnapshot.size < 400) {
          userHasMore = false;
        }
        
        if (userHasMore) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
    
    const result = {
      ok: true,
      message: `Cleanup completed successfully`,
      mainNotificationsDeleted: totalDeleted,
      inboxNotificationsDeleted: inboxDeleted,
      totalDeleted: totalDeleted + inboxDeleted,
      cutoffDate: cutoffDate.toISOString(),
      cleanupDays: days
    };
    
    console.log('[cleanupNotificationsManual] Manual cleanup completed:', result);
    return res.json(result);
    
  } catch (error) {
    console.error('[cleanupNotificationsManual] Manual cleanup failed:', error);
    return res.status(500).json({ 
      ok: false, 
      error: error.message || String(error) 
    });
  }
});

// 알림 통계 조회
exports.getNotificationStats = onRequest(async (req, res) => {
  try {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(204).send('');
    
    const { db } = initializeFirebase();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    
    // 전체 알림 개수
    const totalSnapshot = await db.collection('notifications').get();
    const totalCount = totalSnapshot.size;
    
    // 최근 7일 알림 개수
    const recentSnapshot = await db.collection('notifications')
      .where('createdAt', '>=', sevenDaysAgo)
      .get();
    const recentCount = recentSnapshot.size;
    
    // 30일 이전 알림 개수 (정리 대상)
    const oldSnapshot = await db.collection('notifications')
      .where('createdAt', '<', thirtyDaysAgo)
      .get();
    const oldCount = oldSnapshot.size;
    
    // 사용자별 인박스 통계
    const usersSnapshot = await db.collection('users').get();
    let totalInboxCount = 0;
    let totalUnreadCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      
      // 인박스 개수
      const inboxSnapshot = await db.collection('users').doc(userId)
        .collection('inbox').get();
      totalInboxCount += inboxSnapshot.size;
      
      // 미읽음 개수
      const unreadSnapshot = await db.collection('users').doc(userId)
        .collection('counters').doc('unread').get();
      if (unreadSnapshot.exists) {
        totalUnreadCount += unreadSnapshot.data()?.count || 0;
      }
    }
    
    const stats = {
      ok: true,
      mainNotifications: {
        total: totalCount,
        recent7Days: recentCount,
        olderThan30Days: oldCount
      },
      userInboxes: {
        totalNotifications: totalInboxCount,
        totalUnread: totalUnreadCount,
        totalUsers: usersSnapshot.size
      },
      cleanupRecommendation: {
        shouldCleanup: oldCount > 1000,
        estimatedSavings: oldCount,
        message: oldCount > 1000 ? 
          `정리 권장: ${oldCount}개의 오래된 알림이 있습니다.` : 
          '현재 정리할 알림이 적습니다.'
      }
    };
    
    return res.json(stats);
    
  } catch (error) {
    console.error('[getNotificationStats] Failed to get stats:', error);
    return res.status(500).json({ 
      ok: false, 
      error: error.message || String(error) 
    });
  }
});
