/**
 * 모바일 토큰 등록 함수
 * FCM 토큰을 Firestore에 저장하여 알림 전송 대상으로 등록
 */

const { onRequest } = require('firebase-functions/v2/https');
const { initializeFirebase } = require('../lib/utils');

exports.registerMobileToken = onRequest(async (req, res) => {
  // CORS 설정
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { uid, platform, token, deviceInfo } = req.body;

    // 필수 필드 검증
    if (!uid || !platform || !token) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields: uid, platform, token'
      });
    }

    // Firebase 초기화
    const { db, FieldValue } = initializeFirebase();

    // 토큰 정보 생성
    const tokenData = {
      uid,
      platform,
      token,
      deviceInfo: deviceInfo || {},
      createdAt: FieldValue ? FieldValue.serverTimestamp() : new Date(),
      updatedAt: FieldValue ? FieldValue.serverTimestamp() : new Date(),
      isActive: true
    };

    // Firestore에 토큰 저장
    const tokenRef = db.collection('mobileTokens').doc(`${uid}_${platform}`);
    await tokenRef.set(tokenData, { merge: true });
    res.status(200).json({
      ok: true,
      message: 'Token registered successfully',
      tokenId: tokenRef.id
    });

  } catch (error) {
    console.error('❌ [registerMobileToken] 토큰 등록 실패:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});
