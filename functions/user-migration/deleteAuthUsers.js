/*
  Firebase Auth 사용자 삭제 함수
  Admin 권한으로 특정 사용자들을 Firebase Auth에서 삭제합니다.
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
 * Firebase Auth 사용자 삭제 함수
 */
exports.deleteAuthUsers = onRequest({
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
    
    const { uids, dryRun = false } = req.body;
    
    if (!uids || !Array.isArray(uids) || uids.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'uids 배열이 필요합니다.',
      });
    }
    
    const results = {
      totalRequested: uids.length,
      deleted: 0,
      errors: [],
    };
    
    // 각 사용자 삭제 시도
    for (const uid of uids) {
      try {
        // 사용자 정보 조회 (확인용)
        const userRecord = await admin.auth().getUser(uid);
        
        if (!dryRun) {
          // 실제 삭제
          await admin.auth().deleteUser(uid);
          console.log(`✅ 사용자 삭제 완료: ${userRecord.email || uid}`);
        } else {
          console.log(`[DRY RUN] 삭제 예정: ${userRecord.email || uid}`);
        }
        
        results.deleted++;
      } catch (error) {
        const errorMessage = error.message || String(error);
        results.errors.push({
          uid,
          error: errorMessage,
        });
        console.error(`❌ 사용자 삭제 실패 [${uid}]:`, errorMessage);
      }
    }
    
    return res.json({
      ok: true,
      dryRun,
      results,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('deleteAuthUsers error:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || '삭제 중 오류가 발생했습니다.',
    });
  }
});

