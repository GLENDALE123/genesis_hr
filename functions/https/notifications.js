/*
  HTTPS 함수들 - 알림 관리
*/

const { onRequest } = require('firebase-functions/v2/https');
const { initializeFirebase, chunkArray } = require('../lib/utils');
const { 
  selectTitleByType, 
  getAndroidChannelIdByTypeAndPriority, 
  getCategoryKey, 
  mapUrlByType 
} = require('../lib/utils');
const { 
  upsertInboxAndCountersForUids, 
  collectTokensForTargets 
} = require('../lib/notifications');
const { resolveAudience, loadRoutingRuleForType } = require('../lib/routing');

// 사용자별 미읽음 카운트 조회
exports.getUnreadCount = onRequest({
  memory: '256MiB',
  timeoutSeconds: 30,
  region: 'asia-northeast3'
}, async (req, res) => {
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

    const uid = String((req.method === 'POST' ? req.body?.uid : req.query?.uid) || '');
    if (!uid) return res.status(400).json({ ok: false, error: 'uid required' });
    const { db } = initializeFirebase();
    const doc = await db.collection('users').doc(uid).collection('counters').doc('unread').get();
    const count = (doc.exists && doc.data()?.count) || 0;
    return res.json({ ok: true, count });
  } catch (e) {
    console.error('getUnreadCount error', e);
    return res.status(500).json({ ok: false, error: e && e.message ? e.message : String(e) });
  }
});

// 개별 알림 읽음 처리 및 카운트 감소
exports.markNotificationRead = onRequest({
  memory: '256MiB',
  timeoutSeconds: 30,
  region: 'asia-northeast3'
}, async (req, res) => {
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
    const { uid, inboxId } = req.body || {};
    if (!uid || !inboxId) return res.status(400).json({ ok: false, error: 'uid and inboxId required' });

    const { FieldValue } = require('firebase-admin/firestore');
    const { db } = initializeFirebase();
    const inboxRef = db.collection('users').doc(uid).collection('inbox').doc(String(inboxId));
    const counterRef = db.collection('users').doc(uid).collection('counters').doc('unread');
    
    await db.runTransaction(async (tx) => {
      const inboxSnap = await tx.get(inboxRef);
      if (!inboxSnap.exists) return;
      const wasRead = Boolean(inboxSnap.data()?.read);
      if (!wasRead) {
        tx.update(inboxRef, { read: true });
        tx.set(counterRef, { count: FieldValue.increment(-1) }, { merge: true });
      }
    });
    
    return res.json({ ok: true });
  } catch (e) {
    console.error('markNotificationRead error', e);
    return res.status(500).json({ ok: false, error: e && e.message ? e.message : String(e) });
  }
});

// 여러 알림을 일괄 읽음 처리 (성능 최적화)
exports.markNotificationsReadBulk = onRequest({
  memory: '512MiB',  // Bulk 작업이므로 더 많은 메모리
  timeoutSeconds: 60,
  region: 'asia-northeast3'
}, async (req, res) => {
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
    const { uid, inboxIds } = req.body || {};
    if (!uid || !Array.isArray(inboxIds) || inboxIds.length === 0) {
      return res.status(400).json({ ok: false, error: 'uid and inboxIds[] required' });
    }

    const { FieldValue } = require('firebase-admin/firestore');
    const { db } = initializeFirebase();
    const now = new Date();
    const counterRef = db.collection('users').doc(String(uid)).collection('counters').doc('unread');
    
    // Firestore의 'in' 쿼리는 최대 30개까지만 지원하므로 chunk로 나누어 처리
    const CHUNK_SIZE = 30;
    const chunks = chunkArray(inboxIds, CHUNK_SIZE);
    
    let totalMarkCount = 0;
    const inboxRef = db.collection('users').doc(String(uid)).collection('inbox');
    
    // 각 chunk를 병렬로 처리
    const chunkPromises = chunks.map(async (chunk) => {
      // 쿼리로 미읽음 알림만 가져오기 (read: false)
      const snapshot = await inboxRef
        .where('__name__', 'in', chunk.map(id => String(id)))
        .where('read', '==', false)
        .get();
      
      return snapshot.docs;
    });
    
    const allDocArrays = await Promise.all(chunkPromises);
    const allUnreadDocs = allDocArrays.flat();
    
    // Firestore batch는 최대 500개까지 가능
    const BATCH_SIZE = 500;
    const batchChunks = chunkArray(allUnreadDocs, BATCH_SIZE);
    
    for (const batchDocs of batchChunks) {
      const batch = db.batch();
      batchDocs.forEach((doc) => {
        batch.update(doc.ref, { read: true });
      });
      
      totalMarkCount = totalMarkCount + batchDocs.length;
      
      // 카운터 업데이트는 마지막 batch에만 포함
      if (batchChunks[batchChunks.length - 1] === batchDocs && totalMarkCount > 0) {
        batch.set(counterRef, { count: FieldValue.increment(-totalMarkCount) }, { merge: true });
      }
      
      await batch.commit();
    }
    
    // 카운터만 업데이트가 필요한 경우 (모든 batch가 비어있는 경우)
    if (totalMarkCount > 0 && batchChunks.length === 0) {
      await counterRef.set({ count: FieldValue.increment(-totalMarkCount) }, { merge: true });
    }
    
    return res.json({ ok: true, marked: totalMarkCount });
  } catch (e) {
    console.error('markNotificationsReadBulk error', e);
    return res.status(500).json({ ok: false, error: e && e.message ? e.message : String(e) });
  }
});


// 모바일 단말에서 FCM 토큰을 등록하기 위한 엔드포인트
exports.registerMobileToken = onRequest({
  memory: '256MiB',
  timeoutSeconds: 30,
  region: 'asia-northeast3'
}, async (req, res) => {
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
    const { token, platform, uid } = req.body || {};
    if (!token || !platform) return res.status(400).json({ ok: false, error: 'token and platform are required' });

    const normalizedPlatform = String(platform).toLowerCase();
    if (!['android', 'ios', 'web'].includes(normalizedPlatform)) {
      return res.status(400).json({ ok: false, error: 'invalid platform' });
    }

    const { db } = initializeFirebase();
    const ownerUid = uid ? String(uid) : 'mobile-anonymous';
    const ref = db.collection('users').doc(ownerUid).collection('fcmTokens').doc(String(token));
    await ref.set({
      token: String(token),
      platform: normalizedPlatform,
      enabled: true,
      userAgent: req.get('User-Agent') || 'rn-app',
      language: 'ko',
      updatedAt: new Date(),
      createdAt: new Date(),
    }, { merge: true });

    return res.json({ ok: true });
  } catch (e) {
    console.error('registerMobileToken error', e);
    return res.status(500).json({ ok: false, error: e && e.message ? e.message : String(e) });
  }
});
