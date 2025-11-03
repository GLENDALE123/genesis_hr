/*
  HTTPS 함수들 - 유저 Firebase Auth 정보 업데이트 (관리자 전용)
*/

const { onCall } = require('firebase-functions/v2/https');
const { initializeFirebase } = require('../lib/utils');

/**
 * 한국 전화번호를 Firebase Auth 형식 (+821012345678)으로 변환
 */
function normalizeToFirebaseAuthPhone(phoneNumber) {
  if (!phoneNumber) return null;
  
  // 모든 공백, 하이픈, 괄호 제거
  let cleaned = String(phoneNumber).replace(/[\s\-()]/g, '').trim();
  
  if (!cleaned) return null;
  
  // 이미 +로 시작하면 그대로 사용
  if (cleaned.startsWith('+')) {
    if (cleaned.startsWith('+82')) {
      const rest = cleaned.substring(3);
      if (/^\d{9,10}$/.test(rest)) {
        return cleaned;
      }
    } else {
      if (/^\+\d{10,15}$/.test(cleaned)) {
        return cleaned;
      }
    }
    return null;
  }
  
  // 한국 번호 처리 (0으로 시작)
  if (cleaned.startsWith('0')) {
    const rest = cleaned.substring(1);
    if (/^\d{9,10}$/.test(rest)) {
      return '+82' + rest;
    }
  }
  
  // 0으로 시작하지 않지만 10자리 또는 11자리 숫자인 경우
  if (/^\d{10,11}$/.test(cleaned)) {
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
      return '+82' + cleaned.substring(1);
    }
    if (cleaned.length === 10) {
      return '+82' + cleaned;
    }
  }
  
  return null;
}

/**
 * 유저 Firebase Auth 정보 업데이트 함수 (관리자 전용)
 */
exports.updateUserAuthInfo = onCall({
  memory: '512MiB',
  timeoutSeconds: 60,
  region: 'asia-northeast3',
  cors: true
}, async (request) => {
  try {
    const admin = require('firebase-admin');
    const { db } = initializeFirebase();
    
    // 인증 확인
    if (!request.auth) {
      throw new Error('Unauthorized - Authentication required');
    }
    
    const callerUid = request.auth.uid;
    const { uid, updates } = request.data || {};
    
    if (!uid || !updates) {
      throw new Error('Invalid request - uid and updates are required');
    }
    
    // 호출자가 관리자인지 확인
    try {
      const callerDoc = await db.collection('users').doc(callerUid).get();
      if (!callerDoc.exists) {
        throw new Error('Unauthorized - User profile not found');
      }
      
      const callerData = callerDoc.data();
      if (callerData.role !== 'Admin') {
        throw new Error('Unauthorized - Admin access required');
      }
    } catch (error) {
      console.error('Permission check failed:', error);
      throw new Error('Unauthorized - Permission denied');
    }
    
    // Firebase Auth 정보 업데이트
    const authUpdates = {};
    
    if (updates.displayName !== undefined) {
      authUpdates.displayName = updates.displayName || null;
    }
    
    if (updates.phoneNumber !== undefined) {
      if (updates.phoneNumber) {
        // 한국 전화번호를 Firebase Auth 형식으로 변환
        const normalizedPhone = normalizeToFirebaseAuthPhone(updates.phoneNumber);
        if (normalizedPhone) {
          authUpdates.phoneNumber = normalizedPhone;
        }
      } else {
        // 전화번호 제거는 불가능하므로 경고만
        console.warn('⚠️ Firebase Auth에서는 phoneNumber를 null로 설정할 수 없습니다.');
      }
    }
    
    if (updates.email !== undefined && updates.email) {
      // 이메일 변경은 별도의 verify 과정이 필요하므로 여기서는 업데이트하지 않음
      // 필요시 별도 함수로 구현
      console.warn('⚠️ Email 변경은 별도 프로세스가 필요합니다.');
    }
    
    // Firebase Auth 프로필 업데이트
    if (Object.keys(authUpdates).length > 0) {
      await admin.auth().updateUser(uid, authUpdates);
    }
    
    return { success: true };
  } catch (error) {
    console.error('updateUserAuthInfo error:', error);
    throw new Error(`Failed to update user auth info: ${error.message}`);
  }
});

