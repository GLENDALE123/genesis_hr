/*
  공통 유틸리티 함수들
*/

const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

// Firebase 초기화는 index.js에서 수행되므로 여기서는 참조만
let db, messaging, FieldValue;

// 지연 초기화 함수
function initializeFirebase() {
  if (!db) {
    db = getFirestore();
    messaging = getMessaging();
    FieldValue = admin.firestore.FieldValue;
    console.log('Firebase initialized:', { 
      hasDb: !!db, 
      hasMessaging: !!messaging, 
      hasFieldValue: !!FieldValue,
      fieldValueType: typeof FieldValue 
    });
  }
  return { db, messaging, FieldValue };
}

// 알림 타입별 제목 생성
function selectTitleByType(type, subType) {
  switch (type) {
    case 'announcement':
      return '공지사항';
    case 'work-schedule':
      return '근무계획';
    case 'production-schedule':
      return '생산일정';
    case 'order':
      return '수주등록';
    case 'production-request':
      return subType ? `생산요청 - ${subType}` : '생산요청';
    case 'shortage-request':
      return '부족분 요청';
    case 'quality':
      return subType ? `품질관리 - ${subType}` : '품질관리';
    case 'quality-issue':
      return '품질이슈';
    case 'jig-request':
      return '지그관리 요청';
    case 'jig-approval':
      return '지그관리 승인';
    case 'user-registration':
      return '신규 사용자 등록';
    case 'user-permission':
      return '사용자 권한 변경';
    case 'master-data':
      return '마스터데이터';
    case 'cooperation-request':
      return '협력 요청';
    // 댓글 알림들
    case 'task-comment':
      return '업무 댓글';
    case 'jig-request-comment':
      return '지그 요청 댓글';
    case 'sample-request-comment':
      return '샘플 요청 댓글';
    case 'sample-status-update':
      return '샘플 상태 업데이트';
    case 'production-request-comment':
      return '생산 요청 댓글';
    case 'quality-issue-comment':
      return '품질 이슈 댓글';
    // 새로 추가된 업무 관련 알림들
    case 'task-confirmation-required':
      return '업무 확인 필요';
    case 'task-confirmation-reminder':
      return '업무 확인 리마인더';
    case 'task-overdue':
      return '업무 지연';
    case 'task-assignment':
      return '업무 할당';
    case 'task-status-change':
      return '업무 상태 변경';
    case 'task-comment':
      return '업무 댓글';
    case 'jig':
      return '지그 관리';
    case 'work':
      return '생산 관리';
    case 'sample':
      return '샘플 관리';
    default:
      return '알림';
  }
}

// Android 채널 ID 생성
function getAndroidChannelIdByTypeAndPriority(type, priority) {
  const p = String(priority || 'normal').toLowerCase();
  const t = String(type || '').toLowerCase();

  if (p === 'urgent' || t === 'shortage-request') return 'urgent';
  if (t === 'quality-issue' || t === 'quality') return 'quality';
  if (t === 'announcement') return 'announcements';
  if (t === 'user-permission' || t === 'user-registration' || t === 'master-data') return 'system';
  if (t === 'jig-request' || t === 'jig-approval' || t === 'jig') return 'operations';
  if (t === 'production-schedule' || t === 'work-schedule' || t === 'order' || t === 'production-request' || t === 'work') return 'operations';
  // 업무 관련 알림들
  if (t.startsWith('task-')) return 'tasks';
  if (t === 'sample') return 'operations';
  return 'operations';
}

// 댓글 알림 메시지 생성 (모든 댓글 타입 지원)
function createCommentNotificationMessage(type, commentAuthor, title, commentText) {
  const commentPreview = commentText.length > 50 
    ? commentText.substring(0, 50) + '...' 
    : commentText;
  
  switch (type) {
    case 'task-comment':
      return `💬 ${commentAuthor}님이 업무에 댓글을 남겼습니다: "${title}"\n"${commentPreview}"`;
    case 'jig-request-comment':
      return `💬 ${commentAuthor}님이 지그 요청에 댓글을 남겼습니다: "${title}"\n"${commentPreview}"`;
    case 'sample-request-comment':
      return `💬 ${commentAuthor}님이 샘플 요청에 댓글을 남겼습니다: "${title}"\n"${commentPreview}"`;
    case 'production-request-comment':
      return `💬 ${commentAuthor}님이 생산 요청에 댓글을 남겼습니다: "${title}"\n"${commentPreview}"`;
    case 'quality-issue-comment':
      return `💬 ${commentAuthor}님이 품질 이슈에 댓글을 남겼습니다: "${title}"\n"${commentPreview}"`;
    default:
      return `💬 ${commentAuthor}님이 댓글을 남겼습니다: "${title}"\n"${commentPreview}"`;
  }
}

// 카테고리 키 생성
function getCategoryKey(type, priority, subType) {
  const p = String(priority || 'normal').toLowerCase();
  const t = String(type || '').toLowerCase();
  const s = String(subType || '').toLowerCase();

  if (p === 'urgent' || t === 'shortage-request') return 'urgent';
  if (t === 'quality-issue' || t === 'quality') {
    if (s === '불합격') return 'urgent';
    return 'quality';
  }
  if (t === 'announcement') return 'announcements';
  if (t === 'user-permission' || t === 'user-registration' || t === 'master-data') return 'system';
  if (t === 'jig-request' || t === 'jig-approval' || t === 'jig') return 'operations';
  if (t === 'production-schedule' || t === 'work-schedule' || t === 'order' || t === 'production-request' || t === 'work') return 'operations';
  // 업무 관련 알림들
  if (t.startsWith('task-')) return 'tasks';
  if (t === 'sample') return 'operations';
  return 'operations';
}

// 딥링크 URL 매핑
function mapUrlByType(type, requestId) {
  const t = String(type || '').toLowerCase();
  const id = encodeURIComponent(String(requestId || ''));
  switch (t) {
    case 'jig-request':
    case 'jig-approval':
    case 'jig':
      return `/jig?requestId=${id}`;
    case 'quality':
    case 'quality-issue':
      return `/quality?orderNumber=${id}`;
    case 'production-schedule':
    case 'work-schedule':
      return `/work?scheduleId=${id}`;
    case 'order':
      return `/work?orderId=${id}`;
    case 'production-request':
    case 'work':
      return `/work?requestId=${id}`;
    case 'announcement':
      return `/notifications?tab=announcements`;
    case 'cooperation-request':
      return `/notifications?tab=announcements`;
    // 업무 관련 알림들
    case 'task-confirmation-required':
    case 'task-confirmation-reminder':
    case 'task-overdue':
    case 'task-assignment':
    case 'task-status-change':
    case 'task-comment':
      return `/work?taskId=${id}`;
    case 'sample':
      return `/sample?sampleId=${id}`;
    // 댓글 알림들
    case 'jig-request-comment':
      return `/jig?requestId=${id}`;
    case 'sample-request-comment':
      return `/sample?sampleId=${id}`;
    case 'production-request-comment':
      return `/work?requestId=${id}`;
    case 'quality-issue-comment':
      return `/quality?issueId=${id}`;
    default:
      return `/notifications`;
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
