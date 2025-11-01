/*
  사용자 데이터 동기화 마이그레이션 함수
  Firestore와 Firebase Auth 간의 사용자 정보를 동기화합니다.
*/

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { initializeFirebase } = require('../lib/utils');
const { normalizePhoneNumber, denormalizePhoneNumber, valuesDiffer, parseDisplayNameAndPosition } = require('./utils');

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
 * 마이그레이션 실행 함수
 */
exports.migrateUserSync = onRequest({
  memory: '1GiB',
  timeoutSeconds: 540, // 9분 (최대 10분)
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
    
    // 1. Firebase Auth의 모든 사용자 조회
    const authUsers = [];
    let nextPageToken;
    
    do {
      const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
      authUsers.push(...listUsersResult.users);
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);
    
    // 2. Firestore users 컬렉션의 모든 사용자 조회
    const firestoreUsersSnapshot = await db.collection('users').get();
    const firestoreUsers = new Map();
    
    firestoreUsersSnapshot.forEach(doc => {
      const data = doc.data();
      firestoreUsers.set(doc.id, data);
    });
    
    const results = {
      totalUsers: authUsers.length,
      processed: 0,
      updated: {
        auth: { displayName: 0, photoURL: 0, phoneNumber: 0 },
        firestore: { displayName: 0, photoURL: 0, position: 0 },
      },
      skipped: 0,
      errors: [],
    };
    
    // 3. 배치 처리 (50명씩)
    const BATCH_SIZE = 50;
    for (let i = 0; i < authUsers.length; i += BATCH_SIZE) {
      const batch = authUsers.slice(i, i + BATCH_SIZE);
      
      await Promise.allSettled(batch.map(async (authUser) => {
        const firestoreUser = firestoreUsers.get(authUser.uid);
        
        if (!firestoreUser) {
          results.skipped++;
          return;
        }
        
        try {
          results.processed++;
          
          // displayName 처리: 이름과 직급 분리
          const sourceDisplayName = firestoreUser.displayName || authUser.displayName;
          const parsed = parseDisplayNameAndPosition(sourceDisplayName);
          
          // Firestore → Firebase Auth 동기화
          const authUpdates = {};
          let needsAuthUpdate = false;
          
          // displayName: Auth에는 직급 제거된 이름만 저장
          if (parsed.name && valuesDiffer(parsed.name, authUser.displayName)) {
            authUpdates.displayName = parsed.name;
            needsAuthUpdate = true;
          }
          
          // photoURL
          if (firestoreUser.photoURL && 
              valuesDiffer(firestoreUser.photoURL, authUser.photoURL)) {
            authUpdates.photoURL = firestoreUser.photoURL;
            needsAuthUpdate = true;
          }
          
          // phoneNumber (Firestore.contact → Auth.phoneNumber)
          // Firestore에 contact가 있고 Auth에 없거나 다르면 업데이트
          if (firestoreUser.contact) {
            const normalizedPhone = normalizePhoneNumber(firestoreUser.contact);
            // normalizedPhone이 null이 아니고, Auth의 phoneNumber와 다르거나 Auth에 없으면 업데이트
            if (normalizedPhone) {
              const currentAuthPhone = authUser.phoneNumber || null;
              if (valuesDiffer(normalizedPhone, currentAuthPhone)) {
                authUpdates.phoneNumber = normalizedPhone;
                needsAuthUpdate = true;
              }
            }
          }
          
          if (needsAuthUpdate && !dryRun) {
            try {
              await admin.auth().updateUser(authUser.uid, authUpdates);
              
              if (authUpdates.displayName) results.updated.auth.displayName++;
              if (authUpdates.photoURL) results.updated.auth.photoURL++;
              if (authUpdates.phoneNumber) results.updated.auth.phoneNumber++;
            } catch (updateError) {
              // phoneNumber 업데이트 실패 시 에러 정보 저장하되 계속 진행
              const errorMessage = updateError.message || String(updateError);
              results.errors.push({
                uid: authUser.uid,
                email: authUser.email,
                error: `업데이트 실패: ${errorMessage}`,
              });
              console.error(`❌ [${authUser.email || authUser.uid}] 업데이트 실패:`, errorMessage);
              // 에러가 발생해도 다른 사용자 처리는 계속 진행
            }
          } else if (needsAuthUpdate && dryRun) {
            // Dry run 모드에서는 카운트만 증가
            if (authUpdates.displayName) results.updated.auth.displayName++;
            if (authUpdates.photoURL) results.updated.auth.photoURL++;
            if (authUpdates.phoneNumber) results.updated.auth.phoneNumber++;
          }
          
          // Firebase Auth → Firestore 동기화
          const firestoreUpdates = {};
          let needsFirestoreUpdate = false;
          
          // displayName: Firestore에는 원본 유지 (수정하지 않음)
          // position: 분리된 직급만 새 필드로 추가
          if (parsed.position !== undefined && parsed.position !== firestoreUser.position) {
            firestoreUpdates.position = parsed.position;
            needsFirestoreUpdate = true;
          }
          
          // photoURL
          if (authUser.photoURL && 
              valuesDiffer(authUser.photoURL, firestoreUser.photoURL)) {
            firestoreUpdates.photoURL = authUser.photoURL;
            needsFirestoreUpdate = true;
          }
          
          if (needsFirestoreUpdate) {
            firestoreUpdates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
            
            if (!dryRun) {
              await db.collection('users').doc(authUser.uid).update(firestoreUpdates);
            }
            
            if (firestoreUpdates.displayName) results.updated.firestore.displayName++;
            if (firestoreUpdates.photoURL) results.updated.firestore.photoURL++;
            if (firestoreUpdates.position !== undefined) results.updated.firestore.position++;
          }
          
        } catch (error) {
          results.errors.push({
            uid: authUser.uid,
            email: authUser.email,
            error: error.message,
          });
        }
      }));
    }
    
    return res.json({
      ok: true,
      dryRun,
      results,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('migrateUserSync error:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || '마이그레이션 중 오류가 발생했습니다.',
    });
  }
});

