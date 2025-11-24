/**
 * 비밀번호 암호화/복호화 유틸리티
 * 
 * 주의: 이 암호화는 로컬 저장용으로만 사용되며, 완전한 보안을 보장하지 않습니다.
 * Base64 인코딩을 사용한 간단한 방식으로, 실제 프로덕션 환경에서는
 * 서버 사이드 암호화나 더 강력한 암호화 방식을 사용하는 것이 권장됩니다.
 */

/**
 * Base64 인코딩을 사용한 간단한 암호화
 * 주의: 이는 실제 암호화가 아닌 인코딩이며, 보안 수준이 낮습니다.
 * 로컬 스토리지에 평문 비밀번호를 직접 저장하는 것보다는 낫지만,
 * 완전한 보안을 위해서는 서버 사이드 암호화가 필요합니다.
 */
export const encryptPassword = (password: string): string => {
  try {
    // Base64 인코딩 (실제 암호화 아님, 주의 필요)
    return btoa(password);
  } catch (error) {
    console.error('❌ [Encryption] 비밀번호 암호화 실패:', error);
    throw new Error('비밀번호 암호화에 실패했습니다.');
  }
};

/**
 * Base64 디코딩을 사용한 복호화
 */
export const decryptPassword = (encryptedPassword: string): string => {
  try {
    // Base64 디코딩
    return atob(encryptedPassword);
  } catch (error) {
    console.error('❌ [Encryption] 비밀번호 복호화 실패:', error);
    throw new Error('비밀번호 복호화에 실패했습니다.');
  }
};
