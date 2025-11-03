/*
  HTTPS 함수들 - 유저 삭제 (관리자 전용)
*/

const { onRequest } = require('firebase-functions/v2/https');
const { initializeFirebase } = require('../lib/utils');

/**
 * 유저 삭제 함수 (관리자 전용)
 * Firebase Auth 계정과 Firestore 문서를 모두 삭제합니다.
 */
exports.deleteUser = onRequest({
  memory: '512MiB',
  timeoutSeconds: 60,
  region: 'asia-northeast3'
}, async (req, res) => {
  try {
    // CORS 설정
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');
    
    // Preflight 요청 처리
    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    const admin = require('firebase-admin');
    const { db } = initializeFirebase();
    
    // Authorization 헤더에서 토큰 가져오기
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, error: 'Unauthorized - Missing token' });
    }

    const token = authHeader.split('Bearer ')[1];
    let callerUid;
    
    try {
      // 토큰 검증
      const decodedToken = await admin.auth().verifyIdToken(token);
      callerUid = decodedToken.uid;
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(401).json({ ok: false, error: 'Unauthorized - Invalid token' });
    }

    // 삭제할 유저 UID
    const { uid } = req.body || {};
    if (!uid) {
      return res.status(400).json({ ok: false, error: 'uid is required' });
    }

    // 자기 자신은 삭제할 수 없음
    if (callerUid === uid) {
      return res.status(400).json({ ok: false, error: 'Cannot delete yourself' });
    }

    // 요청자가 관리자인지 확인
    const callerDoc = await db.collection('users').doc(callerUid).get();
    if (!callerDoc.exists) {
      return res.status(403).json({ ok: false, error: 'Caller user not found' });
    }

    const callerData = callerDoc.data();
    if (callerData.role !== 'Admin') {
      return res.status(403).json({ ok: false, error: 'Only admin can delete users' });
    }

    // 삭제할 유저가 존재하는지 확인
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    // Firebase Auth 계정 삭제
    try {
      await admin.auth().deleteUser(uid);
    } catch (authError) {
      console.error('Firebase Auth 계정 삭제 실패:', authError);
      // Auth 계정이 없어도 Firestore 문서는 삭제 진행
    }

    // Firestore 관련 데이터 삭제
    const batch = db.batch();

    // 1. users/{uid} 문서 삭제
    batch.delete(db.collection('users').doc(uid));

    // 2. users/{uid}/settings 서브컬렉션 삭제
    const settingsSnapshot = await db.collection('users').doc(uid).collection('settings').get();
    settingsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // 3. users/{uid}/inbox 서브컬렉션 삭제
    const inboxSnapshot = await db.collection('users').doc(uid).collection('inbox').get();
    inboxSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // 4. users/{uid}/counters 서브컬렉션 삭제
    const countersSnapshot = await db.collection('users').doc(uid).collection('counters').get();
    countersSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // 5. users/{uid}/fcmTokens 서브컬렉션 삭제
    const tokensSnapshot = await db.collection('users').doc(uid).collection('fcmTokens').get();
    tokensSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // 배치 실행
    await batch.commit();

    // Storage의 프로필 사진도 삭제 (선택사항)
    // 필요시 추가 구현

    return res.json({ ok: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('deleteUser error:', error);
    return res.status(500).json({ 
      ok: false, 
      error: error.message || 'Failed to delete user' 
    });
  }
});

