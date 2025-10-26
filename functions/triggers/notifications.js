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
  region: 'asia-northeast3'
}, async (event) => {
  const { messaging } = initializeFirebase();
  const snap = event.data;
  const n = (snap && snap.data()) || {};
  console.log('[onNotificationCreated] begin', { id: event.params.notificationId, type: n.type, hasTargetUsers: Array.isArray(n.targetUsers) && n.targetUsers.length > 0 });
  const title = n.title || '알림'; // 클라이언트 title 그대로 사용
  const body = typeof n.message === 'string' ? n.message : '';
  const targetUsers = Array.isArray(n.targetUsers) ? n.targetUsers : [];
  const notifId = event.params.notificationId;

  const data = {
    type: String(n.type || ''),
    subType: String(n.subType || ''),
    requestId: String(n.requestId || ''),
    priority: String(n.priority || ''),
    actionRequired: String(Boolean(n.actionRequired)),
    url: mapUrlByType(n.type, n.requestId),
    inboxId: String(notifId || ''),
    title: String(title || ''),
    body: String(body || ''),
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
      for (const tokens of chunkArray(androidDocs.map((d) => d.id), 500)) {
        const response = await messaging.sendEachForMulticast({
          tokens,
          notification: { title: String(title), body: String(body) },
          data: { ...data, tag: categoryKey, title: String(title), body: String(body), channelId: String(channelId) },
          android: { priority: 'high', notification: { channelId: String(channelId), icon: 'ic_notification', color: '#FF3B30' } },
        });
        successCount += response.successCount;
        failureCount += response.failureCount;
      }
      return { successCount, failureCount };
    })(),
  ]);
  
  if (iosDocs.length) {
    console.log(`Skipping ${iosDocs.length} iOS tokens (APNs not configured).`);
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
