/*
  Firebase Functions 메인 진입점
  모든 함수들을 모듈별로 분리하여 관리
*/

const { setGlobalOptions, onRequest, logger } = require('firebase-functions/v2');
const admin = require('firebase-admin');

// Firebase Admin SDK 초기화
if (!admin.apps.length) {
  admin.initializeApp();
}

// Gen2 global options (한국 사용자를 위해 asia-northeast3 사용)
setGlobalOptions({ region: 'asia-northeast3' });

// 사용하지 않는 import 경고 방지
logger.info('Firebase Functions initialized');

// Firestore 트리거들
const notificationTriggers = require('./triggers/notifications');

// Storage 트리거들
const imageTriggers = require('./triggers/imageOptimization');

// Scheduled 트리거들
const cleanupTriggers = require('./triggers/cleanupReadNotifications');

// HTTPS 함수들
const notificationHttps = require('./https/notifications');
const createNotificationHttps = require('./https/createNotification');
const registerMobileTokenHttps = require('./https/registerMobileToken');
const getUnreadNotificationsHttps = require('./https/getUnreadNotifications');

// 모든 함수들을 export
module.exports = {
  // 트리거
  ...notificationTriggers,
  ...imageTriggers,
  ...cleanupTriggers,
  
  // HTTPS 함수들
  ...notificationHttps,
  ...createNotificationHttps,
  ...registerMobileTokenHttps,
  ...getUnreadNotificationsHttps,
};

