/**
 * Firestore 유틸리티 함수
 * Firestore는 undefined 값을 허용하지 않으므로 저장 전에 처리해야 함
 */

/**
 * 객체에서 undefined 값을 제거하는 함수
 * Firestore에 저장하기 전에 사용
 * 
 * @param obj - undefined 값이 포함될 수 있는 객체
 * @returns undefined 필드가 제거된 객체
 * 
 * @example
 * const data = { name: 'test', icon: undefined, description: 'desc' };
 * const cleaned = removeUndefinedFields(data);
 * // 결과: { name: 'test', description: 'desc' }
 */
export const removeUndefinedFields = <T extends Record<string, any>>(
  obj: T
): Partial<T> => {
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

/**
 * 중첩된 객체에서 undefined 값을 null로 변환하는 함수
 * 배열과 중첩 객체를 재귀적으로 처리
 * 
 * @param obj - undefined 값이 포함될 수 있는 객체 또는 배열
 * @returns undefined가 null로 변환된 객체 또는 배열
 * 
 * @example
 * const data = { name: 'test', icon: undefined, nested: { value: undefined } };
 * const cleaned = cleanUndefinedValues(data);
 * // 결과: { name: 'test', icon: null, nested: { value: null } }
 */
export const cleanUndefinedValues = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return null;
  }

  if (Array.isArray(obj)) {
    return obj.map(cleanUndefinedValues);
  }

  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) {
        cleaned[key] = null;
      } else {
        cleaned[key] = cleanUndefinedValues(value);
      }
    }
    return cleaned;
  }

  return obj;
};

