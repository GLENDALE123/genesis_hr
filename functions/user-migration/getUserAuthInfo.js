/*
  Firebase Auth 사용자 정보 조회 함수
  특정 사용자의 Firebase Auth 정보를 조회합니다.
*/

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { initializeFirebase } = require('../lib/utils');

/**
 * Admin 권한 확인
 */
async function checkAdminAuth(authToken) {
  if (!authToken) {
    throw new Error('인증 토큰이 필요합니다.');
  }
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(authToken);
    const { db } = initializeFirebase();
    
    // 사용자 프로필에서 role 확인
    const userProfile = await db.collection('users').doc(decodedToken.uid).get();
    if (!userProfile.exists) {
      throw new Error('사용자 프로필을 찾을 수 없습니다.');
    }
    
    const role = userProfile.data()?.role;
    if (role !== 'Admin') {
      throw new Error('Admin 권한이 필요합니다.');
    }
    
    return decodedToken;
  } catch (error) {
    throw new Error(`인증 실패: ${error.message}`);
  }
}

/**
 * Firebase Auth 사용자 정보 조회 함수
 */
exports.getUserAuthInfo = onRequest({
  memory: '512MiB',
  timeoutSeconds: 300,
  region: 'asia-northeast3'
}, async (req, res) => {
  try {
    // CORS 설정
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }
    
    // Admin 권한 확인
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '') || req.body?.token;
    
    try {
      await checkAdminAuth(token);
    } catch (authError) {
      return res.status(403).json({ 
        ok: false, 
        error: authError.message 
      });
    }
    
    const { uid, email } = req.body;
    
    if (!uid && !email) {
      return res.status(400).json({
        ok: false,
        error: 'uid 또는 email이 필요합니다.',
      });
    }
    
    try {
      let userRecord;
      if (uid) {
        userRecord = await admin.auth().getUser(uid);
      } else {
        userRecord = await admin.auth().getUserByEmail(email);
      }
      
      return res.json({
        ok: true,
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName || null,
          photoURL: userRecord.photoURL || null,
          phoneNumber: userRecord.phoneNumber || null,
          emailVerified: userRecord.emailVerified || false,
          disabled: userRecord.disabled || false,
          metadata: {
            creationTime: userRecord.metadata.creationTime,
            lastSignInTime: userRecord.metadata.lastSignInTime || null,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return res.status(404).json({
        ok: false,
        error: `사용자를 찾을 수 없습니다: ${error.message}`,
      });
    }
    
  } catch (error) {
    console.error('getUserAuthInfo error:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || '조회 중 오류가 발생했습니다.',
    });
  }
});

