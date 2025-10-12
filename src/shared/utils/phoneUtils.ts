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

