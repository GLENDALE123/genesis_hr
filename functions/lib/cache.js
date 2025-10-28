/*
  캐싱 및 성능 최적화 유틸리티
*/

const { initializeFirebase, chunkArray } = require('./utils');

// 간단한 메모리 캐시
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5분

// 캐시된 데이터 가져오기
function getCached(key) {
  const item = cache.get(key);
  if (!item) return null;
  
  if (Date.now() - item.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  
  return item.data;
}

// 캐시에 데이터 저장
function setCached(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

// 라우팅 규칙 캐시된 로드
async function loadRoutingRuleForTypeCached(type) {
  const cacheKey = `routing_rule_${type}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  
  try {
    if (!type) return null;
    const { db } = initializeFirebase();
    const doc = await db.collection('settings').doc('notification-routing').get();
    if (!doc.exists) return null;
    
    const data = doc.data() || {};
    const rules = data.rules || {};
    const rule = rules[type];
    
    if (!rule || typeof rule !== 'object') return null;
    
    setCached(cacheKey, rule);
    return rule;
  } catch (e) {
    console.error('[loadRoutingRuleForTypeCached] failed:', e?.message || e);
    return null;
  }
}

// 사용자 프로필 캐시된 로드 (배치)
async function loadUserProfilesCached(uids) {
  if (!Array.isArray(uids) || !uids.length) return new Map();
  
  const { db } = initializeFirebase();
  const result = new Map();
  const uncachedUids = [];
  
  // 캐시에서 먼저 확인
  for (const uid of uids) {
    const cached = getCached(`user_${uid}`);
    if (cached) {
      result.set(uid, cached);
    } else {
      uncachedUids.push(uid);
    }
  }
  
  // 캐시되지 않은 것들만 DB에서 조회
  if (uncachedUids.length > 0) {
    const chunks = chunkArray(uncachedUids, 10);
    for (const chunk of chunks) {
      const snap = await db.collection('users').where('__name__', 'in', chunk).get();
      snap.forEach(doc => {
        const data = doc.data();
        result.set(doc.id, data);
        setCached(`user_${doc.id}`, data);
      });
    }
  }
  
  return result;
}

// 캐시 정리 (메모리 관리)
function clearExpiredCache() {
  const now = Date.now();
  for (const [key, item] of cache.entries()) {
    if (now - item.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
}

// 주기적 캐시 정리 (5분마다) - 실행 환경 가드
function initCacheJanitor() {
  try {
    // Cloud Functions 에뮬레이터 또는 장기 실행 프로세스에서만 활성화
    const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true' || process.env.FIREBASE_EMULATOR_HUB;
    const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
    if (isNode && (isEmulator || process.env.ENABLE_CACHE_JANITOR === 'true')) {
      setInterval(clearExpiredCache, 5 * 60 * 1000);
    }
  } catch (e) {
    // noop
  }
}

module.exports = {
  getCached,
  setCached,
  loadRoutingRuleForTypeCached,
  loadUserProfilesCached,
  clearExpiredCache,
  initCacheJanitor
};
