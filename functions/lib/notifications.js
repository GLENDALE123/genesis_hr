/*
  알림 관련 핵심 로직 함수들
*/

const { initializeFirebase, chunkArray } = require('./utils');

// 사용자 인박스 및 카운터 업데이트 (최적화된 버전)
async function upsertInboxAndCountersForUids(uids, notifId, payload, title, body, categoryKey) {
  if (!uids.length) return;
  
  const { db, FieldValue } = initializeFirebase();
  const MAX_WRITES_PER_BATCH = 400; // 안전 마진
  const now = FieldValue.serverTimestamp();
  
  // 미리 데이터 준비 (메모리 효율성)
  const inboxData = {
    id: String(notifId),
    type: String(payload.type || ''),
    subType: String(payload.subType || ''),
    requestId: String(payload.requestId || ''),
    title: String(title || ''),
    body: String(body || ''),
    categoryKey: String(categoryKey || ''),
    read: false,
    createdAt: now,
    updatedAt: now,
  };
  
  const counterData = { 
    count: FieldValue.increment(1), 
    updatedAt: now 
  };

  // 배치별로 처리
  for (const uidChunk of chunkArray(uids, Math.floor(MAX_WRITES_PER_BATCH / 2))) {
    const batch = db.batch();
    
    for (const uid of uidChunk) {
      const inboxRef = db.collection('users').doc(uid).collection('inbox').doc(String(notifId));
      batch.set(inboxRef, inboxData, { merge: true });
      
      const counterRef = db.collection('users').doc(uid).collection('counters').doc('unread');
      batch.set(counterRef, counterData, { merge: true });
    }
    
    await batch.commit();
  }
}

// 실패한 토큰을 일괄 비활성화
async function disableFailedTokens(tokens) {
  try {
    if (!tokens || !tokens.length) return;
    const { db } = initializeFirebase();
    const unique = Array.from(new Set(tokens.filter(Boolean)));
    for (const tokenChunk of chunkArray(unique, 10)) {
      const snap = await db
        .collectionGroup('fcmTokens')
        .where('token', 'in', tokenChunk)
        .get();
      if (snap.empty) continue;
      let batch = db.batch();
      let writes = 0;
      snap.forEach((doc) => {
        batch.set(doc.ref, { enabled: false, disabledReason: 'invalid-or-not-registered' }, { merge: true });
        writes++;
        if (writes >= 400) {
          batch.commit();
          batch = db.batch();
          writes = 0;
        }
      });
      if (writes > 0) await batch.commit();
    }
  } catch (e) {
    console.error('[disableFailedTokens] cleanup failed', e && e.message ? e.message : e);
  }
}

// 대상 사용자들의 FCM 토큰 수집 (최적화된 버전)
async function collectTokensForTargets(targetUsers) {
  const { db } = initializeFirebase();
  const tokenDocs = [];
  
  if (Array.isArray(targetUsers) && targetUsers.length > 0) {
    // 병렬 처리로 성능 향상
    const chunks = chunkArray(targetUsers, 10); // 10개씩 묶어서 처리
    const snapPromises = chunks.map(chunk =>
      Promise.all(
        chunk.map(uid =>
          db.collection('users')
            .doc(uid)
            .collection('fcmTokens')
            .where('enabled', '==', true)
            .get()
            .catch(() => null)
        )
      )
    );
    
    const snapChunks = await Promise.all(snapPromises);
    snapChunks.forEach(snapArray => {
      snapArray.forEach(snap => {
        if (snap) snap.forEach(doc => tokenDocs.push(doc));
      });
    });
  } else {
    // 전체 브로드캐스트 (최후 수단)
    try {
      const snap = await db
        .collectionGroup('fcmTokens')
        .where('enabled', '==', true)
        .limit(1000) // 안전장치: 최대 1000개만
        .get();
      snap.forEach(doc => tokenDocs.push(doc));
    } catch (e) {
      console.error('[collectTokensForTargets] collectionGroup failed:', e?.message || e);
    }
  }
  
  // 중복 제거 (토큰 기준)
  const tokenMap = new Map();
  tokenDocs.forEach(doc => {
    const token = doc.id;
    if (!tokenMap.has(token)) {
      tokenMap.set(token, doc);
    }
  });
  
  return Array.from(tokenMap.values());
}

// FCM 메시지 전송 (notification 포함, 재시도 로직 포함)
async function sendToTokenDocs(tokenDocs, notification, data, options = {}) {
  if (!tokenDocs.length) return { successCount: 0, failureCount: 0 };
  const { messaging } = initializeFirebase();
  const tokens = tokenDocs.map((d) => d.id);
  let successCount = 0;
  let failureCount = 0;
  const failedTokens = [];
  const retryableTokens = [];
  const maxRetries = options.maxRetries || 2;
  const retryDelay = options.retryDelay || 1000; // 1초

  // 초기 전송 시도
  for (const batchTokens of chunkArray(tokens, 500)) {
    const response = await messaging.sendEachForMulticast({
      tokens: batchTokens,
      notification,
      data,
    });
    successCount += response.successCount;
    failureCount += response.failureCount;

    // 응답 분석 및 분류
    response.responses.forEach((res, idx) => {
      if (!res.success) {
        const err = res.error;
        const token = batchTokens[idx];
        
        if (err && err.code) {
          // 영구 실패 토큰 (비활성화 필요)
          if (
            err.code.includes('registration-token-not-registered') ||
            err.code.includes('invalid-argument') ||
            err.code.includes('invalid-registration-token')
          ) {
            failedTokens.push(token);
          }
          // 재시도 가능한 에러
          else if (
            err.code.includes('unavailable') ||
            err.code.includes('deadline-exceeded') ||
            err.code.includes('internal')
          ) {
            retryableTokens.push(token);
          }
          // 기타 에러는 실패로 처리
          else {
            failedTokens.push(token);
          }
        }
      }
    });
  }

  // 재시도 로직
  if (retryableTokens.length > 0 && maxRetries > 0) {
    console.log(`[sendToTokenDocs] Retrying ${retryableTokens.length} tokens (attempt 1/${maxRetries})`);
    
    // 재시도 전 대기
    await new Promise(resolve => setTimeout(resolve, retryDelay));
    
    const retryResponse = await messaging.sendEachForMulticast({
      tokens: retryableTokens,
      notification,
      data,
    });
    
    successCount += retryResponse.successCount;
    failureCount += retryResponse.failureCount;
    
    // 재시도 후에도 실패한 토큰들 처리
    retryResponse.responses.forEach((res, idx) => {
      if (!res.success) {
        const token = retryableTokens[idx];
        failedTokens.push(token);
      }
    });
  }

  // 실패한 토큰 비활성화
  if (failedTokens.length) {
    console.log(`[sendToTokenDocs] Disabling ${failedTokens.length} failed tokens`);
    await disableFailedTokens(failedTokens);
  }
  
  return { successCount, failureCount, retriedCount: retryableTokens.length };
}

// FCM 메시지 전송 (data만)
async function sendDataOnlyToTokenDocs(tokenDocs, data, options = {}) {
  if (!tokenDocs.length) return { successCount: 0, failureCount: 0 };
  const { messaging } = initializeFirebase();
  const tokens = tokenDocs.map((d) => d.id);
  let successCount = 0;
  let failureCount = 0;
  const failedTokens = [];

  for (const batchTokens of chunkArray(tokens, 500)) {
    const response = await messaging.sendEachForMulticast({
      tokens: batchTokens,
      data,
      ...options,
    });
    successCount += response.successCount;
    failureCount += response.failureCount;

    response.responses.forEach((res, idx) => {
      if (!res.success) {
        const err = res.error;
        const token = batchTokens[idx];
        if (
          err &&
          err.code &&
          (
            err.code.includes('registration-token-not-registered') ||
            err.code.includes('invalid-argument')
          )
        ) {
          failedTokens.push(token);
        }
      }
    });
  }
  if (failedTokens.length) await disableFailedTokens(failedTokens);
  return { successCount, failureCount };
}

module.exports = {
  upsertInboxAndCountersForUids,
  disableFailedTokens,
  collectTokensForTargets,
  sendToTokenDocs,
  sendDataOnlyToTokenDocs
};
