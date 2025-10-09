/*
  라우팅 및 대상 해석 관련 함수들
*/

const { initializeFirebase, chunkArray } = require('./utils');
const { loadRoutingRuleForTypeCached } = require('./cache');

// Resolve audience criteria to a list of user UIDs (최적화된 버전)
async function resolveAudience(audience) {
  try {
    if (!audience || typeof audience !== 'object') return [];
    const { db } = initializeFirebase();
    const { roles, departments, groups, userIds } = audience || {};
    const uidSet = new Set(Array.isArray(userIds) ? userIds.filter(Boolean).map(String) : []);

    // 중복 제거 및 빈 값 필터링
    const uniqueRoles = Array.isArray(roles) ? [...new Set(roles.filter(Boolean).map(String))] : [];
    const uniqueDepartments = Array.isArray(departments) ? [...new Set(departments.filter(Boolean).map(String))] : [];
    const uniqueGroups = Array.isArray(groups) ? [...new Set(groups.filter(Boolean).map(String))] : [];

    const queries = [];
    
    // 역할별 쿼리 (최대 10개씩 'in' 쿼리 사용)
    if (uniqueRoles.length > 0) {
      for (const roleChunk of chunkArray(uniqueRoles, 10)) {
        queries.push(
          db.collection('users').where('role', 'in', roleChunk).get().then((snap) => {
            snap.forEach((doc) => uidSet.add(doc.id));
          }).catch((e) => {
            console.warn('[resolveAudience] role query failed:', e?.message || e);
          })
        );
      }
    }
    
    // 부서별 쿼리
    if (uniqueDepartments.length > 0) {
      for (const depChunk of chunkArray(uniqueDepartments, 10)) {
        queries.push(
          db.collection('users').where('department', 'in', depChunk).get().then((snap) => {
            snap.forEach((doc) => uidSet.add(doc.id));
          }).catch((e) => {
            console.warn('[resolveAudience] department query failed:', e?.message || e);
          })
        );
      }
    }
    
    // 그룹별 쿼리
    if (uniqueGroups.length > 0) {
      for (const groupChunk of chunkArray(uniqueGroups, 10)) {
        queries.push(
          db.collection('users').where('groupName', 'in', groupChunk).get().then((snap) => {
            snap.forEach((doc) => uidSet.add(doc.id));
          }).catch((e) => {
            console.warn('[resolveAudience] group query failed:', e?.message || e);
          })
        );
      }
    }

    await Promise.all(queries);
    return Array.from(uidSet);
  } catch (e) {
    console.error('[resolveAudience] failed:', e?.message || e);
    return [];
  }
}

// Load routing rule for a given notification type (캐시 사용)
async function loadRoutingRuleForType(type) {
  return await loadRoutingRuleForTypeCached(type);
}

module.exports = {
  resolveAudience,
  loadRoutingRuleForType
};
