/**
 * 전화번호 유틸리티 함수
 */

/**
 * 전화번호 자동 포맷팅
 * @param value - 입력된 전화번호 (숫자 + 하이픈)
 * @returns 포맷팅된 전화번호 (예: 010-1234-5678)
 */
export const formatPhoneNumber = (value: string): string => {
  // 숫자만 추출
  const numbers = value.replace(/[^\d]/g, '');
  
  // 최대 11자리까지만 허용
  const limitedNumbers = numbers.slice(0, 11);
  
  // 길이에 따라 포맷팅
  if (limitedNumbers.length <= 3) {
    return limitedNumbers;
  } else if (limitedNumbers.length <= 7) {
    // 010-1234 형식
    return `${limitedNumbers.slice(0, 3)}-${limitedNumbers.slice(3)}`;
  } else {
    // 010-1234-5678 형식
    return `${limitedNumbers.slice(0, 3)}-${limitedNumbers.slice(3, 7)}-${limitedNumbers.slice(7)}`;
  }
};

/**
 * 전화번호 유효성 검증
 * @param phoneNumber - 전화번호
 * @returns 유효 여부
 */
export const validatePhoneNumber = (phoneNumber: string): boolean => {
  const numbers = phoneNumber.replace(/[^\d]/g, '');
  
  // 10자리 또는 11자리 숫자
  if (numbers.length !== 10 && numbers.length !== 11) {
    return false;
  }
  
  // 010, 011, 016, 017, 018, 019로 시작하는지 확인
  const validPrefixes = ['010', '011', '016', '017', '018', '019'];
  const prefix = numbers.slice(0, 3);
  
  return validPrefixes.includes(prefix);
};

/**
 * 전화번호에서 숫자만 추출
 * @param phoneNumber - 전화번호
 * @returns 숫자만 포함된 문자열
 */
export const extractPhoneNumbers = (phoneNumber: string): string => {
  return phoneNumber.replace(/[^\d]/g, '');
};

/**
 * 한국 전화번호를 Firebase Auth 형식 (+821012345678)으로 변환
 * @param phoneNumber - 한국 전화번호 (예: 010-1234-5678, 01012345678)
 * @returns Firebase Auth 형식 (+821012345678) 또는 null
 */
export const normalizeToFirebaseAuthPhone = (phoneNumber: string | null | undefined): string | null => {
  if (!phoneNumber) return null;
  
  // 모든 공백, 하이픈, 괄호 제거
  let cleaned = String(phoneNumber).replace(/[\s\-()]/g, '').trim();
  
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
    // 10자리면 그냥 +82 추가 (하지만 일반적이지 않음)
    if (cleaned.length === 10) {
      return '+82' + cleaned;
    }
  }
  
  // 형식이 맞지 않으면 null 반환 (업데이트하지 않음)
  return null;
};

