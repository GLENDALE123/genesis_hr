/*
  HTTPS 함수들 - 알림 생성
*/

const { onRequest } = require('firebase-functions/v2/https');
const { 
  chunkArray,
  selectTitleByType, 
  getAndroidChannelIdByTypeAndPriority, 
  getCategoryKey, 
  mapUrlByType,
  initializeFirebase
} = require('../lib/utils');
const { 
  upsertInboxAndCountersForUids, 
  collectTokensForTargets,
  sendToTokenDocs
} = require('../lib/notifications');
const { resolveAudience, loadRoutingRuleForType } = require('../lib/routing');
const { logNotificationEvent, createPerformanceTimer, logError } = require('../lib/logging');

// 클라이언트에서 알림 생성 요청 처리 (최적화된 버전)
exports.createNotification = onRequest(async (req, res) => {
  const timer = createPerformanceTimer('createNotification');
  
  try {
    // CORS 설정 강화
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.set('Access-Control-Max-Age', '3600');
    
    // Preflight 요청 처리
    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }

    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
    
    const body = req.body || {};
    const { message, requestId, type, subType, priority, targetUsers, actionRequired, relatedData, audience, ignoreRouting } = body;

    if (!message || !requestId || !type) {
      return res.status(400).json({ ok: false, error: 'message, requestId, type are required' });
    }

    // Firebase 초기화
    const { db, messaging, FieldValue } = initializeFirebase();

    // 중복 알림 방지를 위한 고유 키 생성
    const duplicateKey = `${type}-${requestId}-${JSON.stringify(targetUsers || [])}`;
    const duplicateCacheKey = `notification_${duplicateKey}`;
    
    // 5초 내에 같은 알림이 생성되었는지 확인 (Redis 또는 메모리 캐시 사용 가능)
    // 간단한 메모리 캐시로 구현
    if (!global.notificationCache) {
      global.notificationCache = new Map();
    }
    
    const now = Date.now();
    const lastSent = global.notificationCache.get(duplicateCacheKey);
    if (lastSent && (now - lastSent) < 5000) {
      console.log(`[createNotification] 중복 알림 방지: ${duplicateKey}`);
      return res.json({ ok: true, id: 'duplicate-prevented', sent: 'duplicate-prevented' });
    }
    
    // 중복 방지 키 저장
    global.notificationCache.set(duplicateCacheKey, now);
    
    // 5분 후 자동 제거
    setTimeout(() => {
      global.notificationCache.delete(duplicateCacheKey);
    }, 5 * 60 * 1000);

    logNotificationEvent('create_start', {
      type,
      subType,
      priority,
      hasTargetUsers: Array.isArray(targetUsers) && targetUsers.length > 0,
      hasAudience: !!audience,
      ignoreRouting: !!ignoreRouting
    });

    // Firestore에 알림 저장 및 FCM 푸시 발송
    const notifId = db.collection('notifications').doc().id; // Generate ID
    const title = selectTitleByType(type, subType);
    const bodyText = String(message || '');
    const categoryKey = getCategoryKey(type, priority, subType);

    const data = {
      type: String(type || ''),
      subType: String(subType || ''),
      requestId: String(requestId || ''),
      priority: String(priority || ''),
      actionRequired: String(Boolean(actionRequired)),
      url: mapUrlByType(type, requestId),
      inboxId: String(notifId || ''),
      title: String(title || ''),
      body: String(bodyText || ''),
    };

    // Resolve target users from audience and targetUsers
    let resolvedTargetUsers = Array.isArray(targetUsers) ? [...targetUsers] : [];
    if (audience) {
      const audienceUids = await resolveAudience(audience);
      if (audienceUids.length) {
        const merged = new Set(resolvedTargetUsers.map(String));
        audienceUids.forEach((u) => merged.add(String(u)));
        resolvedTargetUsers = Array.from(merged);
      }
    }

    // If no explicit targets and not ignoring routing, try to load routing rule
    if (!resolvedTargetUsers.length && !ignoreRouting) {
      const rule = await loadRoutingRuleForType(type);
      if (rule) {
        const ruleAudience = rule.audience || {};
        const ruleUserIds = Array.isArray(ruleAudience.userIds) ? ruleAudience.userIds : [];
        const audienceUids = await resolveAudience(ruleAudience);
        const merged = new Set(resolvedTargetUsers.map(String));
        ruleUserIds.forEach((u) => merged.add(String(u)));
        audienceUids.forEach((u) => merged.add(String(u)));
        resolvedTargetUsers = Array.from(merged);
        
        // Check urgentOnly rule
        if (rule.format && rule.format.urgentOnly && String(priority || '').toLowerCase() !== 'urgent') {
          console.log('[createNotification] skipped by urgentOnly rule');
          return res.json({ ok: true, id: notifId, sent: 'skipped-non-urgent' });
        }
      }
    }

    // 사용자별 inbox에 알림 저장
    const metadata = {
      senderName: relatedData?.senderName || '시스템'
    };
    
    // senderAvatar가 있을 때만 추가 (undefined 방지)
    if (relatedData?.senderAvatar) {
      metadata.senderAvatar = relatedData.senderAvatar;
    }
    
    const notificationDoc = {
      id: notifId,
      type: String(type || ''),
      subType: String(subType || ''),
      message: String(message || ''),
      title: String(title || ''),
      body: String(bodyText || ''),
      requestId: String(requestId || ''),
      priority: String(priority || 'normal'),
      actionRequired: Boolean(actionRequired || false),
      relatedData: relatedData || {},
      createdAt: FieldValue ? FieldValue.serverTimestamp() : new Date(),
      read: false,
      metadata
    };

    // 각 사용자의 inbox에 알림 저장 (배치 처리)
    const batch = db.batch();
    for (const userId of resolvedTargetUsers) {
      const inboxRef = db.collection('users').doc(userId).collection('inbox').doc(notifId);
      batch.set(inboxRef, notificationDoc);
    }
    await batch.commit();
    
    console.log(`[createNotification] Notification saved to ${resolvedTargetUsers.length} user inboxes:`, notifId);

    const tokenDocs = await collectTokensForTargets(resolvedTargetUsers);

    // Platform-specific sending
    const webDocs = tokenDocs.filter((d) => (String((d.data() || {}).platform || 'web').toLowerCase()) === 'web');
    const androidDocs = tokenDocs.filter((d) => (String((d.data() || {}).platform || '').toLowerCase()) === 'android');
    const iosDocs = tokenDocs.filter((d) => (String((d.data() || {}).platform || '').toLowerCase()) === 'ios');

    // Collect recipient UIDs
    const recipientUidsSet = new Set();
    tokenDocs.forEach((doc) => {
      const parent = doc.ref.parent && doc.ref.parent.parent;
      if (parent && parent.id) recipientUidsSet.add(parent.id);
    });
    const recipientUids = Array.from(recipientUidsSet);

    // Send FCM messages
    const results = await Promise.all([
      (async () => {
        if (!webDocs.length) return null;
        const tag = getCategoryKey(type, priority, subType);
        return await sendToTokenDocs(webDocs, { title, body: bodyText }, { ...data, tag });
      })(),
      (async () => {
        if (!androidDocs.length) return null;
        const channelId = getAndroidChannelIdByTypeAndPriority(type, priority);
        const categoryKey = getCategoryKey(type, priority, subType);
        let successCount = 0;
        let failureCount = 0;
        for (const tokens of chunkArray(androidDocs.map((d) => d.id), 500)) {
          const response = await messaging.sendEachForMulticast({
            tokens,
            notification: { title: String(title), body: String(bodyText) },
            data: { ...data, tag: categoryKey, title: String(title), body: String(bodyText), channelId: String(channelId) },
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

    // Update user inboxes and counters
    try {
      await upsertInboxAndCountersForUids(recipientUids, notifId, data, title, bodyText, categoryKey);
    } catch (e) {
      console.error('Inbox upsert failed:', e);
    }

    const duration = timer.end({
      notifId,
      type,
      targetCount: resolvedTargetUsers.length,
      tokenCount: tokenDocs.length,
      recipientCount: recipientUids.length,
      results
    });

    logNotificationEvent('create_success', {
      notifId,
      type,
      targetCount: resolvedTargetUsers.length,
      tokenCount: tokenDocs.length,
      recipientCount: recipientUids.length,
      duration,
      results
    });

    return res.json({ ok: true, id: notifId, sent: 'direct' });
  } catch (e) {
    timer.end({ error: e?.message || String(e) });
    logError('createNotification', e, {
      type: req.body?.type,
      requestId: req.body?.requestId
    });
    return res.status(500).json({ ok: false, error: e && e.message ? e.message : String(e) });
  }
});
