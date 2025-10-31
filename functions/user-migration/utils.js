/*
  사용자 동기화 마이그레이션 유틸리티
*/

/**
 * Firestore contact 필드를 Firebase Auth phoneNumber 형식으로 변환
 * @param {string} contact - Firestore의 contact 필드
 * @returns {string|null} Firebase Auth phoneNumber 형식 또는 null
 */
function normalizePhoneNumber(contact) {
  if (!contact) return null;
  
  // 모든 공백, 하이픈, 괄호 제거
  let cleaned = String(contact).replace(/[\s\-()]/g, '').trim();
  
  if (!cleaned) return null;
  
  // 이미 +로 시작하면 그대로 사용 (검증만 수행)
  if (cleaned.startsWith('+')) {
    // +82로 시작하는 경우만 처리
    if (cleaned.startsWith('+82')) {
      const rest = cleaned.substring(3);
      // 나머지가 9자리 또는 10자리 숫자여야 함 (010... = 10자리, 02... = 9자리)
      if (/^\d{9,10}$/.test(rest)) {
        return cleaned;
      }
    } else {
      // 다른 국가 코드는 검증만 수행
      if (/^\+\d{10,15}$/.test(cleaned)) {
        return cleaned;
      }
    }
    // 형식이 맞지 않으면 null
    return null;
  }
  
  // 한국 번호 처리 (0으로 시작)
  if (cleaned.startsWith('0')) {
    const rest = cleaned.substring(1);
    // 나머지가 9자리 또는 10자리 숫자여야 함
    // 예: 01012345678 (11자리) -> 1012345678 (10자리) -> +821012345678
    // 예: 0212345678 (10자리) -> 212345678 (9자리) -> +82212345678
    if (/^\d{9,10}$/.test(rest)) {
      return '+82' + rest;
    }
  }
  
  // 0으로 시작하지 않지만 10자리 또는 11자리 숫자인 경우
  if (/^\d{10,11}$/.test(cleaned)) {
    // 11자리면 0으로 시작하는 것으로 간주
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
      return '+82' + cleaned.substring(1);
    }
    // 10자리면 그냥 +82 추가 (하지만 일반적이지 않음, 경고)
    if (cleaned.length === 10) {
      console.warn(`⚠️ 전화번호 형식 의심: ${contact} -> 10자리 숫자, +82 추가함`);
      return '+82' + cleaned;
    }
  }
  
  // 형식이 맞지 않으면 null 반환 (업데이트하지 않음)
  console.warn(`⚠️ 전화번호 형식 변환 실패: ${contact} -> ${cleaned}`);
  return null;
}

/**
 * Firebase Auth phoneNumber를 Firestore contact 형식으로 변환
 * @param {string} phoneNumber - Firebase Auth의 phoneNumber
 * @returns {string|null} Firestore contact 형식 또는 null
 */
function denormalizePhoneNumber(phoneNumber) {
  if (!phoneNumber) return null;
  
  // +82로 시작하면 0으로 변환
  const cleaned = String(phoneNumber).replace(/\s+/g, '').trim();
  if (cleaned.startsWith('+82')) {
    return '0' + cleaned.substring(3);
  }
  
  return cleaned;
}

/**
 * 두 값이 다른지 확인 (null/undefined 처리)
 */
function valuesDiffer(value1, value2) {
  const v1 = value1 || null;
  const v2 = value2 || null;
  
  if (v1 === v2) return false;
  if (v1 === null && v2 !== null) return true;
  if (v1 !== null && v2 === null) return true;
  
  return String(v1).trim() !== String(v2).trim();
}

module.exports = {
  normalizePhoneNumber,
  denormalizePhoneNumber,
  valuesDiffer,
};

