/*
  공통 유틸리티 함수들
*/

const admin = require('firebase-admin');
const { getFirestore, FieldValue: FirestoreFieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

// Firebase 초기화는 index.js에서 수행되므로 여기서는 참조만
let db, messaging, FieldValue;

// 지연 초기화 함수
function initializeFirebase() {
  if (!db) {
    db = getFirestore();
    messaging = getMessaging();
    FieldValue = FirestoreFieldValue;
    console.log('Firebase initialized:', { 
      hasDb: !!db, 
      hasMessaging: !!messaging, 
      hasFieldValue: !!FieldValue,
      fieldValueType: typeof FieldValue 
    });
  }
  return { db, messaging, FieldValue };
}

/**
 * 알림 타입별 제목 생성
 * @param {string} type - 알림 타입
 * @param {string} subType - 알림 서브타입
 * @returns {string} 알림 제목
 */
function selectTitleByType(type, subType) {
  switch (type) {
    // ==================== 생산 관리 ====================
    case 'production-request':
      return '생산관리부 요청사항';
    case 'production-request-comment':
      return '생산관리부 요청사항';
    case 'shortage-request':
      return '부족분 신청';
    case 'production-schedule':
      return '생산일정';
    case 'production-daily-report':
      return '생산일보';
    
    // ==================== 샘플 관리 ====================
    case 'sample-request':
      return '샘플 요청';
    
    // ==================== 댓글/멘션 ====================
    case 'comment-mention':
      return '댓글';
    
    // ==================== 시스템 ====================
    case 'announcement':
      return '공지사항';
    
    default:
      return '알림';
  }
}

/**
 * Android 채널 ID 생성
 * @param {string} type - 알림 타입
 * @param {string} priority - 우선순위
 * @returns {string} Android 채널 ID
 */
function getAndroidChannelIdByTypeAndPriority(type, priority) {
  const p = String(priority || 'normal').toLowerCase();
  const t = String(type || '').toLowerCase();

  if (p === 'urgent') return 'urgent';
  if (t === 'announcement') return 'announcements';
  if (t.includes('production') || t.includes('shortage')) return 'operations';
  if (t.includes('comment') || t.includes('mention')) return 'operations';
  
  return 'system';
}

/**
 * 댓글 알림 메시지 생성 (사용하지 않음 - CommentsService에서 직접 생성)
 * @deprecated
 */
function createCommentNotificationMessage(type, commentAuthor, title, commentText) {
  const commentPreview = commentText.length > 50 
    ? commentText.substring(0, 50) + '...' 
    : commentText;
  
  return `💬 ${commentAuthor}님이 댓글을 남겼습니다: "${title}"\n"${commentPreview}"`;
}

/**
 * 카테고리 키 생성
 * @param {string} type - 알림 타입
 * @param {string} priority - 우선순위
 * @param {string} subType - 서브타입
 * @returns {string} 카테고리 키
 */
function getCategoryKey(type, priority, subType) {
  const p = String(priority || 'normal').toLowerCase();
  const t = String(type || '').toLowerCase();

  if (p === 'urgent') return 'urgent';
  if (t === 'announcement') return 'announcements';
  if (t.includes('production')) return 'production';
  if (t.includes('shortage')) return 'shortage';
  if (t.includes('comment') || t.includes('mention')) return 'comments';
  
  return 'system';
}

// 딥링크 URL 매핑
/**
 * 알림 타입별 딥링크 URL 생성
 * @param {string} type - 알림 타입
 * @param {string} requestId - 요청 ID
 * @returns {string} 딥링크 URL
 */
function mapUrlByType(type, requestId, subType) {
  const t = String(type || '').toLowerCase();
  const s = String(subType || '').toLowerCase();
  const id = encodeURIComponent(String(requestId || ''));
  
  switch (t) {
    // ==================== 생산 관리 ====================
    case 'production-request':
    case 'production-request-comment':
      return `/production/management?requestId=${id}`;
    
    case 'shortage-request':
      return `/production/shortage-management?requestId=${id}`;
    
    case 'production-daily-report':
    case 'daily-report':
      return `/production/daily-report`;
    
    case 'production-schedule':
      return `/production/schedule`;

    // ==================== 공지/근무 ====================
    case 'announcement':
      return `/announcements`;
    case 'work-schedule':
      return `/work-schedule`;

    // ==================== 품질 이슈 ====================
    case 'quality-issue':
    case 'quality-issue-status':
      return `/quality/issues?issueId=${id}`;
    
    // ==================== 샘플센터 ====================
    case 'sample-status':
    case 'sample-request':
      return `/sample?requestId=${id}`;
    
    // ==================== 댓글/멘션 ====================
    case 'comment-mention':
      if (s === 'jig') return `/jig/management?requestId=${id}`;
      if (s === 'sample') return `/sample?requestId=${id}`;
      return `/production/management?requestId=${id}`;
    
    // ==================== 기타 ====================
    default:
      return `/dashboard`;
  }
}

// 배열을 청크로 분할
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

module.exports = {
  initializeFirebase,
  selectTitleByType,
  getAndroidChannelIdByTypeAndPriority,
  getCategoryKey,
  mapUrlByType,
  chunkArray,
  createCommentNotificationMessage,
  // 직접 export도 지원 (하위 호환성)
  get db() { return db; },
  get messaging() { return messaging; },
  get FieldValue() { return FieldValue; }
};
