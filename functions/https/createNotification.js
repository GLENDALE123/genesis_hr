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
exports.createNotification = onRequest({
  memory: '512MiB',  // 메모리 증가 (기본 256MB → 512MB)
  timeoutSeconds: 60,  // 타임아웃 60초
  concurrency: 80,  // 동시 실행 인스턴스 수
  region: 'asia-northeast3'  // 한국 리전
}, async (req, res) => {
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
    const { body: bodyText, requestId, type, subType, priority, targetUsers, actionRequired, relatedData, audience, ignoreRouting, senderName, senderUid, senderAvatar, subtitle, centerInfo, title } = body;

    // 디버깅을 위한 로그 추가
    if (!bodyText || !requestId || !type) {
      return res.status(400).json({ ok: false, error: 'body, requestId, type are required' });
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

    const data = {
      type: String(type || ''),
      subType: String(subType || ''),
      requestId: String(requestId || ''),
      priority: String(priority || ''),
      actionRequired: String(Boolean(actionRequired)),
      url: mapUrlByType(type, requestId, subType),
      inboxId: String(notifId || ''),
      title: String(title || ''),  // 클라이언트에서 받은 title 그대로 사용
      body: String(bodyText || ''),  // 클라이언트에서 받은 body 그대로 사용
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
          return res.json({ ok: true, id: notifId, sent: 'skipped-non-urgent' });
        }
      }
    }

    // 메타데이터 구성 (실제 표시에 사용되는 필드만)
    const metadata = {
      senderName: senderName || relatedData?.senderName || '시스템',
      senderUid: senderUid || relatedData?.senderUid || ''
    };
    
    // 선택적 필드들 (값이 있을 때만 추가)
    if (senderAvatar || relatedData?.senderAvatar) {
      metadata.senderAvatar = senderAvatar || relatedData.senderAvatar;
    }
    
    // centerInfo (요청 타입) - 알림 중앙에 표시
    if (centerInfo || subType) {
      metadata.centerInfo = String(centerInfo || subType);
    }
    
    // supplier - 발주처 정보
    if (relatedData?.supplier) {
      metadata.supplier = String(relatedData.supplier);
    }
    
    const link = mapUrlByType(type, requestId, subType);
    
    // 최소 필드만 저장하는 알림 문서 (클라이언트 타임스탬프 사용)
    const createdAtTimestamp = Date.now();
    const notificationDoc = {
      id: notifId,
      type: String(type || ''),
      title: String(title || ''),
      subtitle: String(subtitle || ''),  // subtitle 최상위 레벨에 추가
      body: String(bodyText || ''),
      link: String(link || '/dashboard'),
      createdAt: createdAtTimestamp, // 클라이언트 타임스탬프 (RTT 제거)
      read: false,
      metadata
    };

    // 최적화: 여러 배치로 나눠서 병렬 처리 (20명씩 2개 배치)
    const WRITE_BATCH_SIZE = 20;
    const userChunks = [];
    for (let i = 0; i < resolvedTargetUsers.length; i += WRITE_BATCH_SIZE) {
      userChunks.push(resolvedTargetUsers.slice(i, i + WRITE_BATCH_SIZE));
    }
    
    const [_, tokenDocs] = await Promise.all([
      // 1. Firestore 인박스 저장 (여러 배치 병렬 실행)
      Promise.all(userChunks.map(async (chunk) => {
        const batch = db.batch();
        
        for (const userId of chunk) {
          // 인박스에 알림 저장만 수행 (카운터는 백그라운드로)
          const inboxRef = db.collection('users').doc(userId).collection('inbox').doc(notifId);
          batch.set(inboxRef, notificationDoc);
        }
        
        // 배치 commit
        await batch.commit();
      })).then(() => {
        // 카운터 업데이트는 백그라운드로 처리 (비동기)
        setImmediate(() => {
          const counterBatch = db.batch();
          for (const userId of resolvedTargetUsers) {
            const counterRef = db.collection('users').doc(userId).collection('counters').doc('unread');
            counterBatch.set(counterRef, { 
              count: FieldValue.increment(1)
            }, { merge: true });
          }
          counterBatch.commit().catch(err => {
            console.error('[createNotification] Counter update failed:', err);
          });
        });
      }),
      
      // 2. FCM 토큰 수집 (병렬 실행)
      collectTokensForTargets(resolvedTargetUsers)
    ]);

    // 클라이언트에 즉시 응답 (인박스 저장 완료)
    const inboxDuration = timer.end({
      notifId,
      type,
      targetCount: resolvedTargetUsers.length,
      phase: 'inbox_saved'
    });

    logNotificationEvent('inbox_saved', {
      notifId,
      type,
      targetCount: resolvedTargetUsers.length,
      duration: inboxDuration
    });

    // 응답 먼저 반환
    res.json({ ok: true, id: notifId, sent: 'direct', duration: inboxDuration });

    // FCM 전송은 백그라운드로 처리 (토큰은 이미 수집됨)
    (async () => {
      try {
        const fcmTimer = createPerformanceTimer('fcm_send');

        // Platform-specific sending (토큰은 이미 수집된 상태)
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

        // Send FCM messages (병렬 실행)
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
        }

        const fcmDuration = fcmTimer.end({
          notifId,
          type,
          tokenCount: tokenDocs.length,
          recipientCount: recipientUids.length,
          results
        });

        logNotificationEvent('fcm_sent', {
          notifId,
          type,
          tokenCount: tokenDocs.length,
          recipientCount: recipientUids.length,
          fcmDuration,
          results
        });
      } catch (e) {
        logError('fcm_background_send', e, {
          notifId,
          type
        });
      }
    })();

    return;
  } catch (e) {
    timer.end({ error: e?.message || String(e) });
    logError('createNotification', e, {
      type: req.body?.type,
      requestId: req.body?.requestId
    });
    return res.status(500).json({ ok: false, error: e && e.message ? e.message : String(e) });
  }
});
