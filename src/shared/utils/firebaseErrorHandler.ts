/**
 * Firebase 에러를 분석하고 사용자 친화적인 메시지를 반환하는 유틸리티
 */

interface FirebaseErrorInfo {
  message: string;
  isNetworkError: boolean;
  isPermissionError: boolean;
  isDataError: boolean;
}

/**
 * Firebase 에러 코드를 사용자 친화적인 메시지로 변환
 */
export const getFirebaseErrorMessage = (error: any): FirebaseErrorInfo => {
  const errorMessage = error?.message || '';
  const errorCode = error?.code || '';

  // 네트워크 관련 에러
  const networkErrors = [
    'unavailable',
    'deadline-exceeded',
    'network',
    'Failed to fetch',
    'NetworkError',
    'ERR_NETWORK',
    'ERR_INTERNET_DISCONNECTED'
  ];

  // 권한 관련 에러
  const permissionErrors = [
    'permission-denied',
    'unauthenticated',
    'PERMISSION_DENIED'
  ];

  // 데이터 관련 에러
  const dataErrors = [
    'invalid-argument',
    'invalid data',
    'Unsupported field value',
    'undefined'
  ];

  const isNetworkError = networkErrors.some(err => 
    errorMessage.toLowerCase().includes(err.toLowerCase()) ||
    errorCode.toLowerCase().includes(err.toLowerCase())
  );

  const isPermissionError = permissionErrors.some(err => 
    errorMessage.toLowerCase().includes(err.toLowerCase()) ||
    errorCode.toLowerCase().includes(err.toLowerCase())
  );

  const isDataError = dataErrors.some(err => 
    errorMessage.toLowerCase().includes(err.toLowerCase()) ||
    errorCode.toLowerCase().includes(err.toLowerCase())
  );

  let message = '';

  if (isNetworkError) {
    message = '네트워크 연결을 확인해주세요. 인터넷 연결이 불안정합니다.';
  } else if (isPermissionError) {
    message = '권한이 없습니다. 관리자에게 문의하세요.';
  } else if (isDataError) {
    message = '입력 데이터를 확인해주세요. 빈 필드나 잘못된 값이 있을 수 있습니다.';
  } else if (errorMessage) {
    message = `오류: ${errorMessage}`;
  } else {
    message = '알 수 없는 오류가 발생했습니다.';
  }

  return {
    message,
    isNetworkError,
    isPermissionError,
    isDataError
  };
};

/**
 * 네트워크 연결 상태 확인
 */
export const checkNetworkConnection = (): boolean => {
  if (typeof window === 'undefined') return true;
  return navigator.onLine;
};

