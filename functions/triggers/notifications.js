/*
  Firestore 트리거 함수들
*/

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { 
  initializeFirebase,
  getAndroidChannelIdByTypeAndPriority, 
  getCategoryKey, 
  mapUrlByType,
  chunkArray
} = require('../lib/utils');
const { 
  upsertInboxAndCountersForUids, 
  collectTokensForTargets, 
  sendToTokenDocs 
} = require('../lib/notifications');
const { logNotificationEvent, logError, logNotificationStats } = require('../lib/logging');

// 새 알림 문서 생성 시 FCM 발송
exports.onNotificationCreated = onDocumentCreated({
  document: 'notifications/{notificationId}',
  database: process.env.FIREBASE_FIRESTORE_DATABASE_ID || 'tms-production',
  region: 'asia-northeast3'
}, async (event) => {
  const { messaging } = initializeFirebase();
  const snap = event.data;
  const n = (snap && snap.data()) || {};
  const title = n.title || '알림'; // 클라이언트 title 그대로 사용
  const body = typeof n.message === 'string' ? n.message : '';
  const targetUsers = Array.isArray(n.targetUsers) ? n.targetUsers : [];
  const notifId = event.params.notificationId;

  // relatedData에서 메타데이터 추출 (NotificationPanel 참고)
  const relatedData = n.relatedData || {};
  const metadata = n.metadata || {};
  
  const data = {
    type: String(n.type || ''),
    subType: String(n.subType || ''),
    requestId: String(n.requestId || ''),
    priority: String(n.priority || ''),
    actionRequired: String(Boolean(n.actionRequired)),
    url: mapUrlByType(n.type, n.requestId, n.subType),
    inboxId: String(notifId || ''),
    title: String(title || ''),
    body: String(body || ''),
    // NotificationPanel 및 Electron 커스텀 알림 스타일을 위한 메타데이터 추가
    centerInfo: String(metadata.centerInfo || n.centerInfo || n.subType || ''),
    subtitle: String(metadata.subtitle || n.subtitle || relatedData.productName || ''),
    senderName: String(relatedData.senderName || metadata.senderName || '시스템'),
    senderAvatar: String(relatedData.senderAvatar || metadata.senderAvatar || ''),
    category: String(metadata.category || ''),
    requestType: String(metadata.requestType || n.requestType || ''),
  };

  const tokenDocs = await collectTokensForTargets(targetUsers);
  logNotificationEvent('token_collection', { 
    notificationId: notifId,
    type: n.type,
    targetUsersCount: targetUsers.length,
    tokenDocsCount: tokenDocs.length 
  });
  
  // 플랫폼별 분기: web은 notification 포함, android는 data-only, ios는 현재 스킵(APNs 미사용)
  const webDocs = tokenDocs.filter((d) => (String((d.data() || {}).platform || 'web').toLowerCase()) === 'web');
  const androidDocs = tokenDocs.filter((d) => (String((d.data() || {}).platform || '').toLowerCase()) === 'android');
  const iosDocs = tokenDocs.filter((d) => (String((d.data() || {}).platform || '').toLowerCase()) === 'ios');

  // 수신 대상 사용자 UID 수집(토큰 문서 부모의 users/{uid})
  const recipientUidsSet = new Set();
  tokenDocs.forEach((doc) => {
    const parent = doc.ref.parent && doc.ref.parent.parent;
    if (parent && parent.id) recipientUidsSet.add(parent.id);
  });
  const recipientUids = Array.from(recipientUidsSet);

  const results = await Promise.all([
    (async () => {
      if (!webDocs.length) return null;
      const tag = getCategoryKey(n.type, n.priority, n.subType);
      return await sendToTokenDocs(webDocs, { title, body }, { ...data, tag });
    })(),
    (async () => {
      if (!androidDocs.length) return null;
      const channelId = getAndroidChannelIdByTypeAndPriority(n.type, n.priority);
      const categoryKey = getCategoryKey(n.type, n.priority, n.subType);
      let successCount = 0;
      let failureCount = 0;
      
      // Android는 data-only 메시지로 전송 (백그라운드 핸들러가 호출되도록)
      // notification 필드가 있으면 시스템이 자동으로 알림을 표시하고 백그라운드 핸들러가 호출되지 않음
      // 따라서 data-only로 전송하여 앱의 백그라운드 핸들러가 notifee로 알림을 표시하도록 함
      for (const tokens of chunkArray(androidDocs.map((d) => d.id), 500)) {
        const response = await messaging.sendEachForMulticast({
          tokens,
          // notification 필드 제거 - React Native Firebase 백그라운드 핸들러가 작동하도록
          // data 필드만 포함하여 앱이 직접 알림을 표시하도록 함
          data: { 
            ...data, 
            tag: categoryKey, 
            title: String(title), 
            body: String(body), 
            channelId: String(channelId) 
          },
          android: { 
            priority: 'high',
            // data-only 메시지는 앱이 백그라운드 핸들러에서 처리
          },
        });
        successCount += response.successCount;
        failureCount += response.failureCount;
        
        // 실패한 토큰 처리
        if (response.failureCount > 0) {
          const failedTokens = [];
          response.responses.forEach((res, idx) => {
            if (!res.success) {
              const err = res.error;
              if (err && err.code && (
                err.code.includes('registration-token-not-registered') ||
                err.code.includes('invalid-registration-token')
              )) {
                failedTokens.push(tokens[idx]);
              }
            }
          });
          if (failedTokens.length > 0) {
            const { disableFailedTokens } = require('../lib/notifications');
            await disableFailedTokens(failedTokens);
          }
        }
      }
      return { successCount, failureCount };
    })(),
  ]);
  
  if (iosDocs.length) {
  }

  // 사용자별 인박스/카운트 업데이트
  try {
    const categoryKey = getCategoryKey(n.type, n.priority, n.subType);
    await upsertInboxAndCountersForUids(recipientUids, notifId, data, title, body, categoryKey);
    
    // 통계 로깅
    const totalSent = (results[0]?.successCount || 0) + (results[1]?.successCount || 0);
    const totalFailed = (results[0]?.failureCount || 0) + (results[1]?.failureCount || 0);
    
    logNotificationStats({
      notificationId: notifId,
      type: n.type,
      totalSent,
      successCount: totalSent,
      failureCount: totalFailed,
      recipientCount: recipientUids.length,
      platformBreakdown: {
        web: webDocs.length,
        android: androidDocs.length,
        ios: iosDocs.length
      }
    });
  } catch (e) {
    logError('inbox_upsert', e, { notificationId: notifId, type: n.type });
  }
  
  logNotificationEvent('fcm_sent', { 
    notificationId: notifId,
    type: n.type,
    results 
  });
});
