/*
  Firestore에서 phoneNumber 필드 일괄 삭제 함수
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
 * Firestore phoneNumber 필드 일괄 삭제 함수
 */
exports.removePhoneNumberFromFirestore = onRequest({
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
    
    const { db } = initializeFirebase();
    const dryRun = req.body?.dryRun === true;
    
    // users 컬렉션의 모든 문서 조회
    const usersSnapshot = await db.collection('users').get();
    
    const results = {
      totalUsers: usersSnapshot.size,
      processed: 0,
      removed: 0,
      skipped: 0,
      errors: [],
    };
    
    // 배치 처리 (500개씩 - Firestore 배치 제한)
    const BATCH_SIZE = 500;
    const batches = [];
    let currentBatch = db.batch();
    let batchCount = 0;
    
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      
      // phoneNumber 필드가 있는 경우에만 삭제
      if (userData.phoneNumber !== undefined) {
        results.processed++;
        
        if (!dryRun) {
          currentBatch.update(doc.ref, {
            phoneNumber: admin.firestore.FieldValue.delete(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          
          batchCount++;
          
          // 배치 크기 제한 도달 시 실행
          if (batchCount >= BATCH_SIZE) {
            batches.push(currentBatch.commit());
            currentBatch = db.batch();
            batchCount = 0;
          }
        }
        
        results.removed++;
      } else {
        results.skipped++;
      }
    }
    
    // 마지막 배치 실행
    if (batchCount > 0 && !dryRun) {
      batches.push(currentBatch.commit());
    }
    
    // 모든 배치 실행
    if (!dryRun && batches.length > 0) {
      try {
        await Promise.all(batches);
      } catch (batchError) {
        results.errors.push({
          error: `배치 처리 실패: ${batchError.message}`,
        });
      }
    }
    
    return res.json({
      ok: true,
      dryRun,
      results,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('removePhoneNumberFromFirestore error:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || '삭제 중 오류가 발생했습니다.',
    });
  }
});

