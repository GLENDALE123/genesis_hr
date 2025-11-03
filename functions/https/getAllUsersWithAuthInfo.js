/*
  HTTPS 함수들 - 모든 유저 목록 조회 (Firebase Auth 정보 포함, 관리자 전용)
*/

const { onCall } = require('firebase-functions/v2/https');
const { initializeFirebase } = require('../lib/utils');
const admin = require('firebase-admin');

/**
 * Timestamp 객체를 Date로 변환하는 헬퍼 함수
 */
function convertTimestamp(timestamp) {
  if (!timestamp) return null;
  
  // Firestore Timestamp 객체인 경우
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  
  // 이미 Date 객체인 경우
  if (timestamp instanceof Date) {
    return timestamp;
  }
  
  // ISO 문자열인 경우
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  }
  
  return null;
}

/**
 * 모든 유저 목록을 Firebase Auth 정보와 함께 가져오는 함수 (관리자 전용)
 */
exports.getAllUsersWithAuthInfo = onCall({
  memory: '1GiB', // 메모리 증가 (512MiB -> 1GiB)
  timeoutSeconds: 120, // 타임아웃 증가 (60초 -> 120초)
  region: 'asia-northeast3',
  cors: true
}, async (request) => {
  try {
    const { db } = initializeFirebase();
    
    // 인증 확인
    if (!request.auth) {
      console.error('Authentication required but not provided');
      throw new Error('Unauthorized - Authentication required');
    }
    
    const callerUid = request.auth.uid;
    const databaseId = process.env.FIREBASE_FIRESTORE_DATABASE_ID || 'tms-production';
    console.log(`[getAllUsersWithAuthInfo] Request from user: ${callerUid}, database: ${databaseId}`);
    
    // 호출자가 관리자인지 확인
    try {
      const usersRef = db.collection('users');
      const callerDoc = await usersRef.doc(callerUid).get();
      
      if (!callerDoc.exists) {
        // NOT_FOUND 에러인 경우 더 자세한 정보 제공
        console.error(`[getAllUsersWithAuthInfo] User profile not found:`, {
          uid: callerUid,
          database: databaseId,
          collection: 'users',
          path: `users/${callerUid}`
        });
        throw new Error('Unauthorized - User profile not found in Firestore');
      }
      
      const callerData = callerDoc.data();
      if (!callerData) {
        console.error(`[getAllUsersWithAuthInfo] User document exists but has no data: ${callerUid}`);
        throw new Error('Unauthorized - User profile data is empty');
      }
      
      if (callerData.role !== 'Admin') {
        console.error(`[getAllUsersWithAuthInfo] Non-admin user attempted access:`, {
          uid: callerUid,
          role: callerData.role
        });
        throw new Error('Unauthorized - Admin access required');
      }
      
      console.log(`[getAllUsersWithAuthInfo] Admin access confirmed for: ${callerUid}`);
    } catch (error) {
      // NOT_FOUND 에러인 경우 명확하게 처리
      if (error.code === 5 || error.message?.includes('NOT_FOUND') || error.message?.includes('not found')) {
        console.error('[getAllUsersWithAuthInfo] Permission check failed - User not found:', {
          uid: callerUid,
          database: databaseId,
          errorCode: error.code,
          errorMessage: error.message
        });
        throw new Error('Unauthorized - User profile not found in Firestore. Please ensure your account is properly set up.');
      }
      
      // 기존 권한 관련 에러는 그대로 전달
      if (error.message?.includes('Unauthorized')) {
        console.error('[getAllUsersWithAuthInfo] Permission check failed:', error.message);
        throw error;
      }
      
      // 기타 에러는 상세 정보와 함께 전달
      console.error('[getAllUsersWithAuthInfo] Permission check failed:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw new Error(`Permission check failed: ${error.message || 'Unknown error'}`);
    }
    
    // Firestore에서 모든 유저 프로필 가져오기
    console.log('[getAllUsersWithAuthInfo] Fetching user profiles from Firestore...');
    let usersSnapshot;
    try {
      usersSnapshot = await db.collection('users').get();
      console.log(`[getAllUsersWithAuthInfo] Found ${usersSnapshot.docs.length} user profiles in Firestore`);
    } catch (error) {
      console.error('[getAllUsersWithAuthInfo] Failed to fetch Firestore users:', error);
      throw new Error(`Failed to fetch Firestore users: ${error.message}`);
    }
    
    // Firebase Auth에서 모든 유저 정보를 한 번에 가져오기 (최대 1000명)
    console.log('[getAllUsersWithAuthInfo] Fetching users from Firebase Auth...');
    let authUsersList = [];
    let nextPageToken;
    let pageCount = 0;
    
    try {
      do {
        pageCount++;
        console.log(`[getAllUsersWithAuthInfo] Fetching Auth users page ${pageCount}...`);
        const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
        authUsersList = authUsersList.concat(listUsersResult.users);
        nextPageToken = listUsersResult.pageToken;
        console.log(`[getAllUsersWithAuthInfo] Fetched ${listUsersResult.users.length} users, total: ${authUsersList.length}`);
      } while (nextPageToken);
      
      console.log(`[getAllUsersWithAuthInfo] Total Auth users fetched: ${authUsersList.length}`);
    } catch (error) {
      console.error('[getAllUsersWithAuthInfo] Failed to fetch Auth users:', error);
      throw new Error(`Failed to fetch Auth users: ${error.message}`);
    }
    
    // Auth 유저를 UID로 매핑
    const authUsersMap = new Map();
    authUsersList.forEach(authUser => {
      authUsersMap.set(authUser.uid, authUser);
    });
    
    // Firestore 데이터와 Auth 데이터 병합
    console.log('[getAllUsersWithAuthInfo] Merging Firestore and Auth data...');
    const userProfiles = [];
    for (const docSnapshot of usersSnapshot.docs) {
      try {
        const uid = docSnapshot.id;
        const profileData = docSnapshot.data();
        const authUser = authUsersMap.get(uid);
        
        // Timestamp 변환
        const createdAt = convertTimestamp(profileData.createdAt);
        const updatedAt = convertTimestamp(profileData.updatedAt);
        const lastLoginAt = convertTimestamp(profileData.lastLoginAt);
        
        userProfiles.push({
          uid: uid,
          email: authUser?.email || null,
          displayName: authUser?.displayName || null,
          phoneNumber: authUser?.phoneNumber || null,
          // Firestore에서 가져오는 정보 (role, position, department, 날짜)
          role: profileData.role || 'Member',
          position: profileData.position || null,
          department: profileData.department || null,
          createdAt: createdAt ? createdAt.toISOString() : null,
          updatedAt: updatedAt ? updatedAt.toISOString() : null,
          lastLoginAt: lastLoginAt ? lastLoginAt.toISOString() : null,
        });
      } catch (docError) {
        console.error(`[getAllUsersWithAuthInfo] Error processing user ${docSnapshot.id}:`, docError);
        // 개별 문서 에러는 무시하고 계속 진행
        continue;
      }
    }
    
    // 역할별 정렬 (Admin → Manager → Member)
    userProfiles.sort((a, b) => {
      const roleOrder = { Admin: 0, Manager: 1, Member: 2 };
      const aOrder = roleOrder[a.role] ?? 99;
      const bOrder = roleOrder[b.role] ?? 99;
      return aOrder - bOrder;
    });
    
    console.log(`[getAllUsersWithAuthInfo] Successfully processed ${userProfiles.length} users`);
    return { users: userProfiles };
  } catch (error) {
    // 더 상세한 에러 로깅
    console.error('[getAllUsersWithAuthInfo] Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      details: error.details
    });
    
    // 에러 타입에 따라 적절한 메시지 반환
    if (error.message.includes('Unauthorized')) {
      throw new Error(error.message);
    }
    
    // 다른 에러는 상세 정보와 함께 전달
    throw new Error(`Failed to fetch users: ${error.message || 'Unknown error'}`);
  }
});

