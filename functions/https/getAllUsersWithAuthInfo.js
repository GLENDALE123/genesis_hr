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
    // Firebase 초기화 (에러 처리 포함)
    let db;
    try {
      const firebaseInit = initializeFirebase();
      db = firebaseInit.db;
      if (!db) {
        throw new Error('Firestore database instance is null');
      }
      console.log('[getAllUsersWithAuthInfo] Firebase initialized successfully');
    } catch (initError) {
      console.error('[getAllUsersWithAuthInfo] Firebase initialization failed:', {
        message: initError.message,
        stack: initError.stack,
        code: initError.code
      });
      throw new Error(`Firebase initialization failed: ${initError.message || 'Unknown error'}`);
    }
    
    // 인증 확인
    if (!request.auth) {
      console.error('[getAllUsersWithAuthInfo] Authentication required but not provided');
      throw new Error('Unauthorized - Authentication required');
    }
    
    const callerUid = request.auth.uid;
    const databaseId = process.env.FIREBASE_FIRESTORE_DATABASE_ID || 'tms-production';
    console.log(`[getAllUsersWithAuthInfo] Request from user: ${callerUid}, database: ${databaseId}`);
    
    // 호출자가 인증된 사용자인지 확인 (모든 인증된 사용자 허용)
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
      
      // 모든 인증된 사용자가 사용자 목록을 볼 수 있도록 허용 (채팅 기능을 위해)
      // Admin만 필요한 경우는 클라이언트에서 추가 필터링
      console.log(`[getAllUsersWithAuthInfo] Access confirmed for: ${callerUid}, role: ${callerData.role || 'Member'}`);
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
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      code: error.code,
      details: error.details,
      name: error.name,
      timestamp: new Date().toISOString()
    };
    
    console.error('[getAllUsersWithAuthInfo] Error details:', errorDetails);
    
    // Firebase Functions v2 onCall은 에러를 자동으로 처리하지만,
    // 명시적으로 에러를 throw하여 클라이언트에 전달
    const errorMessage = error.message || 'Unknown error occurred';
    
    // 에러 타입에 따라 적절한 메시지 반환
    if (errorMessage.includes('Unauthorized') || errorMessage.includes('permission')) {
      // 권한 관련 에러는 그대로 전달
      throw new Error(errorMessage);
    }
    
    // 기타 에러는 상세 정보와 함께 전달
    // Firebase Functions는 자동으로 500 에러로 변환하므로,
    // 여기서는 명확한 메시지만 제공
    const finalErrorMessage = `Failed to fetch users: ${errorMessage}`;
    console.error('[getAllUsersWithAuthInfo] Throwing error:', finalErrorMessage);
    throw new Error(finalErrorMessage);
  }
});

