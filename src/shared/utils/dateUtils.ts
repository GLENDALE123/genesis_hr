/**
 * 날짜 관련 유틸리티 함수들
 * 
 * @description
 * Firestore Timestamp 변환 등 날짜 관련 공통 함수 제공
 */

// ============================================================================
// Firestore Timestamp 변환
// ============================================================================

/**
 * Firestore Timestamp나 다양한 날짜 형식을 JavaScript Date 객체로 안전하게 변환
 * 
 * @param dateField - Firestore Timestamp, Date, ISO string 등
 * @returns Date 객체
 * 
 * @example
 * const date = toDate(firestoreTimestamp);
 * const date = toDate(new Date());
 * const date = toDate('2023-01-01T00:00:00.000Z');
 */
export const toDate = (dateField: any): Date => {
  if (!dateField) return new Date();
  
  // Firestore Timestamp (toDate 메서드 있음)
  if (typeof dateField.toDate === 'function') {
    return dateField.toDate();
  }
  
  // JavaScript Date 객체
  if (dateField instanceof Date) {
    return dateField;
  }
  
  // ISO string
  if (typeof dateField === 'string') {
    return new Date(dateField);
  }
  
  // 기본값
  return new Date();
};

/**
 * Firestore Timestamp를 ISO string으로 변환
 * 
 * @param dateField - Firestore Timestamp, Date, ISO string 등
 * @returns ISO string
 * 
 * @example
 * const isoString = toISOString(firestoreTimestamp);
 */
export const toISOString = (dateField: any): string => {
  return toDate(dateField).toISOString();
};

/**
 * 날짜를 로컬 날짜 문자열로 변환 (타임존 오프셋 제거)
 * 
 * @param date - Date 객체 (기본값: 현재 시간)
 * @returns YYYY-MM-DD 형식의 문자열
 * 
 * @example
 * const localDateString = getLocalDateString();
 * // => "2023-01-01"
 */
export const getLocalDateString = (date: Date = new Date()): string => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

/**
 * 날짜 범위 검증
 * 
 * @param startDate - 시작 날짜
 * @param endDate - 종료 날짜
 * @returns 유효성 여부
 */
export const isValidDateRange = (startDate: Date, endDate: Date): boolean => {
  return startDate <= endDate;
};

/**
 * 날짜 포맷팅 (한국어)
 * 
 * @param date - Date 객체
 * @returns 포맷된 문자열 (예: "2023년 1월 1일")
 */
export const formatDateKorean = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}년 ${month}월 ${day}일`;
};

/**
 * 날짜 포맷팅 (시간 포함)
 * 
 * @param date - Date 객체
 * @returns 포맷된 문자열 (예: "2023-01-01 12:00:00")
 */
export const formatDateTime = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};



