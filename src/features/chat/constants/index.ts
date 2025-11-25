/**
 * 채팅 관련 상수
 */

/**
 * Firestore 컬렉션 이름
 */
export const CHAT_COLLECTIONS = {
  ROOMS: 'chat',
  MESSAGES: 'messages',
  TYPING: 'typing',
  USER_STATUS: 'user-status',
} as const;

/**
 * 메시지 제한
 */
export const MESSAGE_LIMITS = {
  MAX_TEXT_LENGTH: 5000,
  MAX_ATTACHMENTS: 10,
  MAX_ATTACHMENT_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
} as const;

/**
 * 메시지 페이지네이션 설정
 */
export const MESSAGE_PAGINATION = {
  INITIAL_BATCH: 60,
  OLDER_PAGE_SIZE: 40,
} as const;

/**
 * 채팅방 제한
 */
export const CHAT_ROOM_LIMITS = {
  MAX_PARTICIPANTS: 100,
  MAX_NAME_LENGTH: 50,
} as const;

/**
 * 타이핑 인디케이터 설정
 */
export const TYPING_INDICATOR = {
  TIMEOUT: 3000, // 3초 동안 타이핑 없으면 제거
  UPDATE_INTERVAL: 1000, // 1초마다 업데이트
} as const;

/**
 * 스크롤 설정
 */
export const SCROLL_CONFIG = {
  DEBOUNCE_DELAY: 100, // 스크롤 이벤트 디바운스 지연 시간
  SCROLL_THRESHOLD: 100, // 하단에서 100px 이내면 하단에 있는 것으로 간주
} as const;

