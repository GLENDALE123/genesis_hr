/*
  사용자 데이터 동기화 분석 함수
  Firestore와 Firebase Auth 간의 사용자 정보 불일치를 분석합니다.
*/

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { initializeFirebase } = require('../lib/utils');
const { valuesDiffer, parseDisplayNameAndPosition, normalizePhoneNumber, denormalizePhoneNumber } = require('./utils');

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
 * 분석 함수
 */
exports.analyzeUserSync = onRequest({
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
    
    // 3. 분석 수행
    const analysis = {
      totalAuthUsers: authUsers.length,
      totalFirestoreUsers: firestoreUsers.size,
      matchedUsers: 0,
      mismatches: {
        displayName: { count: 0, details: [] },
        email: { count: 0, details: [] },
        photoURL: { count: 0, details: [] },
        phoneNumber: { count: 0, details: [] },
      },
      matches: {
        displayName: { count: 0, details: [] },
        email: { count: 0, details: [] },
        photoURL: { count: 0, details: [] },
        phoneNumber: { count: 0, details: [] },
      },
      missingInFirestore: [],
      missingInAuth: [],
    };
    
    // 삭제 대상 UID 목록
    const DELETE_TARGET_UIDS = [
      'Zyc6Kea9CJh2b37lLValzMaWIvw1',  // fhlajf@naver.com - 이현석
      'tjIEDmd0KBOWKt24z2aci4snCs33',  // qyh96190727@gmail.com - 임정애
      'uD8wr4sK3DdzQmBt1eouemuedno2',  // alwn2440@gmail.com - 김성균직장
      'wr3hxywGxCeghiR6SsrHud7W3YC3',  // linzhengai0727@gmail.com - 임정애
    ];
    
    for (const authUser of authUsers) {
      const firestoreUser = firestoreUsers.get(authUser.uid);
      
      if (!firestoreUser) {
        analysis.missingInFirestore.push({
          uid: authUser.uid,
          email: authUser.email,
          authDisplayName: authUser.displayName,
          shouldDelete: DELETE_TARGET_UIDS.includes(authUser.uid),
        });
        continue;
      }
      
      analysis.matchedUsers++;
      
      // displayName 비교 및 position 분리 제안
      if (valuesDiffer(firestoreUser.displayName, authUser.displayName)) {
        // 분리 가능한 displayName 찾기 (Firestore 또는 Auth 중 값이 있는 것)
        const sourceDisplayName = firestoreUser.displayName || authUser.displayName;
        const parsed = parseDisplayNameAndPosition(sourceDisplayName);
        
        analysis.mismatches.displayName.count++;
        analysis.mismatches.displayName.details.push({
          uid: authUser.uid,
          email: authUser.email,
          firestore: firestoreUser.displayName || null,
          auth: authUser.displayName || null,
          suggestedName: parsed.name,
          suggestedPosition: parsed.position,
        });
      } else {
        // 일치하는 경우에도 position 분리 제안 추가
        const sourceDisplayName = firestoreUser.displayName || authUser.displayName;
        const parsed = parseDisplayNameAndPosition(sourceDisplayName);
        
        analysis.matches.displayName.count++;
        analysis.matches.displayName.details.push({
          uid: authUser.uid,
          email: authUser.email,
          value: sourceDisplayName || null,
          suggestedName: parsed.name,
          suggestedPosition: parsed.position,
        });
      }
      
      // email 비교 (일치 여부만 확인)
      if (firestoreUser.email !== authUser.email) {
        analysis.mismatches.email.count++;
        analysis.mismatches.email.details.push({
          uid: authUser.uid,
          firestoreEmail: firestoreUser.email,
          authEmail: authUser.email,
        });
      } else {
        // 일치하는 경우
        analysis.matches.email.count++;
        analysis.matches.email.details.push({
          uid: authUser.uid,
          email: authUser.email || firestoreUser.email || null,
        });
      }
      
      // photoURL 비교
      if (valuesDiffer(firestoreUser.photoURL, authUser.photoURL)) {
        analysis.mismatches.photoURL.count++;
        analysis.mismatches.photoURL.details.push({
          uid: authUser.uid,
          email: authUser.email,
          firestore: firestoreUser.photoURL || null,
          auth: authUser.photoURL || null,
        });
      } else {
        // 일치하는 경우
        analysis.matches.photoURL.count++;
        analysis.matches.photoURL.details.push({
          uid: authUser.uid,
          email: authUser.email,
          value: firestoreUser.photoURL || authUser.photoURL || null,
        });
      }
      
      // phoneNumber 비교 (Firestore.contact vs Auth.phoneNumber)
      // 정규화해서 비교해야 함 (Firestore: "010-1234-5678" vs Auth: "+821012345678")
      const firestorePhone = firestoreUser.contact || null;
      const authPhone = authUser.phoneNumber || null;
      
      // 정규화해서 비교
      const normalizedFirestorePhone = firestorePhone ? normalizePhoneNumber(firestorePhone) : null;
      const normalizedAuthPhone = authPhone || null; // Auth phoneNumber는 이미 +82 형식
      
      // 둘 다 null이면 일치로 간주
      if (!normalizedFirestorePhone && !normalizedAuthPhone) {
        // 둘 다 null이면 일치 (카운트는 안 함)
      } else if (!normalizedFirestorePhone || !normalizedAuthPhone) {
        // 하나만 있는 경우 불일치
        analysis.mismatches.phoneNumber.count++;
        analysis.mismatches.phoneNumber.details.push({
          uid: authUser.uid,
          email: authUser.email,
          firestore: firestorePhone,
          auth: authPhone,
        });
      } else if (normalizedFirestorePhone !== normalizedAuthPhone) {
        // 정규화된 값이 다른 경우 불일치
        analysis.mismatches.phoneNumber.count++;
        analysis.mismatches.phoneNumber.details.push({
          uid: authUser.uid,
          email: authUser.email,
          firestore: firestorePhone,
          auth: authPhone,
        });
      } else {
        // 정규화된 값이 같은 경우 일치
        analysis.matches.phoneNumber.count++;
        analysis.matches.phoneNumber.details.push({
          uid: authUser.uid,
          email: authUser.email,
          value: firestorePhone || authPhone || null,
        });
      }
    }
    
    // Firestore에만 있는 사용자 (Auth에 없음)
    for (const [uid, firestoreUser] of firestoreUsers) {
      const authUser = authUsers.find(u => u.uid === uid);
      if (!authUser) {
        analysis.missingInAuth.push({
          uid,
          email: firestoreUser.email,
          displayName: firestoreUser.displayName,
        });
      }
    }
    
    return res.json({
      ok: true,
      analysis,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('analyzeUserSync error:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || '분석 중 오류가 발생했습니다.',
    });
  }
});

