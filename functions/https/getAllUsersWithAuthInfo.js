/*
  HTTPS 함수들 - 모든 유저 목록 조회 (Firebase Auth 정보 포함, 관리자 전용)
*/

const { onCall } = require('firebase-functions/v2/https');
const { initializeFirebase } = require('../lib/utils');

/**
 * 모든 유저 목록을 Firebase Auth 정보와 함께 가져오는 함수 (관리자 전용)
 */
exports.getAllUsersWithAuthInfo = onCall({
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
    
    // Firestore에서 모든 유저 프로필 가져오기
    const usersSnapshot = await db.collection('users').get();
    
    // Firebase Auth에서 모든 유저 정보를 한 번에 가져오기 (최대 1000명)
    let authUsersList = [];
    let nextPageToken;
    
    do {
      const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
      authUsersList = authUsersList.concat(listUsersResult.users);
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);
    
    // Auth 유저를 UID로 매핑
    const authUsersMap = new Map();
    authUsersList.forEach(authUser => {
      authUsersMap.set(authUser.uid, authUser);
    });
    
    // Firestore 데이터와 Auth 데이터 병합
    const userProfiles = [];
    for (const docSnapshot of usersSnapshot.docs) {
      const uid = docSnapshot.id;
      const profileData = docSnapshot.data();
      const authUser = authUsersMap.get(uid);
      
      // Firebase Auth에서 가져온 정보만 사용 (email, displayName, phoneNumber)
      // Firestore에는 role, position, department, 날짜 정보만 저장됨
      const createdAt = profileData.createdAt?.toDate ? profileData.createdAt.toDate() : null;
      const updatedAt = profileData.updatedAt?.toDate ? profileData.updatedAt.toDate() : null;
      const lastLoginAt = profileData.lastLoginAt?.toDate ? profileData.lastLoginAt.toDate() : null;
      
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
    }
    
    // 역할별 정렬 (Admin → Manager → Member)
    userProfiles.sort((a, b) => {
      const roleOrder = { Admin: 0, Manager: 1, Member: 2 };
      return roleOrder[a.role] - roleOrder[b.role];
    });
    
    return { users: userProfiles };
  } catch (error) {
    console.error('getAllUsersWithAuthInfo error:', error);
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
});

