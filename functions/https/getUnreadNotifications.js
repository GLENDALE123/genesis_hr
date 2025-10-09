/**
 * 미읽은 알림 조회 함수
 * Tauri 앱이 폴링하여 새 알림을 확인
 */

const { onRequest } = require('firebase-functions/v2/https');
const { initializeFirebase } = require('../lib/utils');

exports.getUnreadNotifications = onRequest(async (req, res) => {
  // CORS 설정
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { uid } = req.query;

    if (!uid) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required parameter: uid'
      });
    }

    console.log('📬 [getUnreadNotifications] 미읽은 알림 조회:', uid);

    // Firebase 초기화
    const { db } = initializeFirebase();

    // 미읽은 알림 조회 (최근 10개)
    const snapshot = await db
      .collection('notifications')
      .where('targetUsers', 'array-contains', uid)
      .where('read', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const notifications = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        title: data.title,
        body: data.body,
        sender_name: data.relatedData?.senderName || '시스템',
        sender_avatar: data.relatedData?.senderAvatar,
        type: data.type || 'info',
        data: data.relatedData || {},
        createdAt: data.createdAt
      });
    });

    console.log(`✅ [getUnreadNotifications] ${notifications.length}개의 미읽은 알림 발견`);

    res.status(200).json({
      ok: true,
      notifications
    });

  } catch (error) {
    console.error('❌ [getUnreadNotifications] 조회 실패:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});
