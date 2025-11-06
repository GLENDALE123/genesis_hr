import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Platform, StyleSheet, View, BackHandler, Alert, Linking, ToastAndroid } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import notifee, { AndroidImportance, AndroidStyle } from '@notifee/react-native';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { WebView } from 'react-native-webview';

const DEFAULT_URL = 'https://hs-jig-b2093.web.app';
// 프로덕션 Functions 연결
const FUNCTIONS_BASE = 'https://asia-northeast3-hs-jig-b2093.cloudfunctions.net';

// 설정 캐싱 (메모리 누수 방지)
const settingsCache = new Map<string, { settings: any; timestamp: number }>();
const CACHE_DURATION = 60000; // 1분
const MAX_CACHE_SIZE = 100; // 최대 캐시 크기

// 채널 그룹 및 채널 정의 (웹 프로젝트 기준)
const CHANNEL_GROUPS = [
  {
    id: 'production-center',
    name: '생산센터',
    channels: [
      { id: 'production-request', name: '생산관리부 요청사항' },
      { id: 'shortage-request', name: '부족분 신청' },
      { id: 'production-schedule', name: '생산일정 변경' },
      { id: 'daily-report', name: '생산일보 상태 변경' },
    ]
  },
  {
    id: 'sample-center',
    name: '샘플센터',
    channels: [
      { id: 'sample-status', name: '샘플 요청 상태 변경' },
      { id: 'sample-request', name: '샘플 요청' },
    ]
  },
  {
    id: 'jig-center',
    name: '지그센터',
    channels: [
      { id: 'jig-request', name: '지그 요청 등록' },
      { id: 'jig-receive', name: '지그 입고 처리' },
    ]
  },
  {
    id: 'quality-center',
    name: '품질센터',
    channels: [
      { id: 'quality-issue-created', name: '품질이슈 등록' },
      { id: 'quality-issue-status', name: '품질이슈 상태 변경' },
    ]
  },
  {
    id: 'comment-mention',
    name: '댓글',
    channels: [
      { id: 'comment-mention', name: '댓글' },
    ]
  },
  {
    id: 'announcement',
    name: '공지사항',
    channels: [
      { id: 'announcement', name: '공지사항' },
    ]
  },
  {
    id: 'work-schedule',
    name: '근무계획',
    channels: [
      { id: 'work-schedule', name: '근무계획' },
    ]
  }
];

// 타입-채널 매핑 함수 (Functions 타입 → 설정 채널 이름)
function mapNotificationTypeToChannel(type: string): string {
  const typeMapping: Record<string, string> = {
    'quality-issue': 'quality-issue-created',
  };
  return typeMapping[type] || type;
}

// Firestore에서 사용자 설정 로드 (캐싱 + ok 필드 제거)
async function getUserSettings(uid: string): Promise<any | null> {
  try {
    // 캐시 확인
    const cached = settingsCache.get(uid);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return cached.settings;
    }
    
    const response = await fetch(`${FUNCTIONS_BASE}/getUserSettings?uid=${encodeURIComponent(uid)}`);
    if (response.ok) {
      const data = await response.json();
      // ok 필드 제거하고 실제 설정 데이터만 반환
      const { ok, ...settings } = data;
      
      // 캐시 크기 제한 (메모리 누수 방지)
      if (settingsCache.size >= MAX_CACHE_SIZE) {
        const firstKey = settingsCache.keys().next().value;
        if (firstKey) {
          settingsCache.delete(firstKey);
        }
      }
      
      settingsCache.set(uid, { settings, timestamp: Date.now() });
      return settings;
    }
    return null;
  } catch (error) {
    console.error('설정 로드 실패:', error);
    return null;
  }
}

// 배지 카운트 업데이트 함수 (중복 제거)
async function updateBadgeCount(uid: string): Promise<void> {
  try {
    const res = await fetch(`${FUNCTIONS_BASE}/getUnreadCount?uid=${encodeURIComponent(uid)}`);
    const json = await res.json();
    const count = Number(json?.count || 0);
    await notifee.setBadgeCount(count);
  } catch (err) {
    console.error('❌ 배지 카운트 업데이트 실패:', err);
  }
}

// 알림 읽음 처리 함수 (중복 제거)
async function markNotificationAsRead(uid: string, inboxId: string): Promise<void> {
  try {
    const response = await fetch(`${FUNCTIONS_BASE}/markNotificationRead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, inboxId })
    });
    
    if (!response.ok) {
      throw new Error(`읽음 처리 실패: ${response.status}`);
    }
    
    // 배지 업데이트
    await updateBadgeCount(uid);
  } catch (err) {
    console.error('❌ 알림 읽음 처리 실패:', err);
  }
}

// 웹 프로젝트와 동일한 알림 허용 체크
function isNotificationAllowed(
  settings: any,
  notificationType: string,
  timestamp?: Date
): boolean {
  if (!settings || !settings.notifications) {
    return true; // 설정이 없으면 기본적으로 허용
  }

  // 1. 전체 알림 OFF면 차단
  if (!settings.notifications.enabled) {
    return false;
  }

  // 2. 채널별 설정 확인
  const channel = mapNotificationTypeToChannel(notificationType);
  if (settings.notifications.channels && settings.notifications.channels[channel] === false) {
    return false;
  }

  // 3. 시간대 제한 확인
  if (settings.notifications.schedule && settings.notifications.schedule.enabled) {
    const now = timestamp || new Date();
    const day = now.getDay(); // 0: 일요일, 6: 토요일
    const isWeekend = day === 0 || day === 6;
    
    const scheduleConfig = isWeekend 
      ? settings.notifications.schedule.weekends
      : settings.notifications.schedule.weekdays;
    
    if (!scheduleConfig.enabled) {
      return false;
    }
    
    const hour = now.getHours();
    const minute = now.getMinutes();
    const currentTime = hour * 60 + minute;

    const [startHour, startMin] = scheduleConfig.startTime.split(':').map(Number);
    const [endHour, endMin] = scheduleConfig.endTime.split(':').map(Number);
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (currentTime < startTime || currentTime > endTime) {
      return false;
    }
  }

  return true;
}

// 네이티브 알림 권한 상태를 Firestore에 저장
async function syncNotificationPermission(uid: string, authorized: boolean): Promise<void> {
  try {
    await fetch(`${FUNCTIONS_BASE}/syncNotificationPermission`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, authorized, platform: Platform.OS }),
    });
  } catch (error) {
    console.error('권한 동기화 실패:', error);
  }
}

async function registerForPushNotificationsAsync(uid?: string): Promise<string | null> {
  try {
    // Android 채널 그룹 및 채널 설정
    if (Platform.OS === 'android') {
      // 채널 그룹 생성
      for (const group of CHANNEL_GROUPS) {
        await notifee.createChannelGroup({
          id: group.id,
          name: group.name,
        });
      }
      
      // 각 그룹에 속한 채널 생성
      for (const group of CHANNEL_GROUPS) {
        for (const channel of group.channels) {
          await notifee.createChannel({
            id: channel.id,
            name: channel.name,
            groupId: group.id,
            importance: AndroidImportance.HIGH,
            sound: 'default',
            vibrationPattern: [300, 200, 300, 200],
            bypassDnd: true,
          });
        }
      }
    }

    // notifee 알림 권한 필수 요청
    const notifeeSettings = await notifee.requestPermission();
    
    if (notifeeSettings.authorizationStatus !== 1) {
      // 권한이 거부된 경우
      Alert.alert(
        '알림 권한 필요',
        '알림을 받으려면 알림 권한이 필요합니다. 설정에서 알림 권한을 허용해주세요.',
        [
          { text: '취소', style: 'cancel' },
          { 
            text: '설정 열기', 
            onPress: () => {
              if (Platform.OS === 'android') {
                Linking.openSettings();
              } else {
                Linking.openURL('app-settings:');
              }
            }
          },
        ]
      );
      
      // 권한 상태 동기화
      if (uid) {
        await syncNotificationPermission(uid, false);
      }
      
      return null;
    }

    // FCM 권한 요청
    const authStatus = await messaging().requestPermission();
    const fcmEnabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED || 
                      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    
    if (fcmEnabled && notifeeSettings.authorizationStatus === 1) {
      console.log('✅ FCM 및 notifee 권한 모두 허용됨');
      
      // 권한 상태 동기화
      if (uid) {
        await syncNotificationPermission(uid, true);
      }
    } else {
      console.log('❌ 권한 거부됨 - FCM:', fcmEnabled, 'notifee:', notifeeSettings.authorizationStatus);
      
      // 권한 상태 동기화
      if (uid) {
        await syncNotificationPermission(uid, false);
      }
    }
    
    // FCM 토큰 요청
    const token = await messaging().getToken();
    if (token) {
      console.log('🔑 FCM 토큰 등록 성공:', token.substring(0, 20) + '...');
      console.log('🔑 FCM 토큰 전체 길이:', token.length);
    } else {
      console.error('❌ FCM 토큰 등록 실패: 토큰이 null입니다');
    }
    
    return token;
  } catch (error) {
    console.log('토큰 등록 실패:', error);
    return null;
  }
}

async function registerTokenToServer(token: string, uid?: string) {
  try {
    const platform = Platform.OS === 'android' ? 'android' : 'ios';
    const payload: any = { token, platform };
    if (uid) payload.uid = uid;
    
    console.log('📤 토큰 서버 등록 시작');
    console.log('📤 토큰 (처음 20자):', token.substring(0, 20) + '...');
    console.log('📤 플랫폼:', platform);
    console.log('📤 UID:', uid || '없음');
    console.log('📤 Functions URL:', `${FUNCTIONS_BASE}/registerMobileToken`);
    
    const res = await fetch(`${FUNCTIONS_BASE}/registerMobileToken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    console.log('📥 응답 상태:', res.status);
    
    // 응답 텍스트를 먼저 확인
    const responseText = await res.text();
    
    // JSON 파싱 시도
    if (responseText) {
      try {
        const json = JSON.parse(responseText);
        if (json.ok) {
          console.log('✅ 토큰 서버 등록 성공:', json);
        } else {
          console.error('❌ 토큰 서버 등록 실패:', json);
        }
      } catch (parseError) {
        console.error('❌ JSON 파싱 실패:', parseError);
        console.log('📥 원본 응답:', responseText);
      }
    } else {
      console.warn('⚠️ 빈 응답 수신');
    }
    
    if (!res.ok) {
      console.error('❌ HTTP 오류:', res.status, res.statusText);
    }
  } catch (e) {
    console.error('❌ 토큰 서버 등록 에러:', e);
  }
}

const App: React.FC = () => {
  const [uid, setUid] = useState<string | null>(null);
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backPressCountRef = useRef<number>(0);

  // 초기 알림 권한 요청 및 리스너 설정
  useEffect(() => {
    let isMounted = true;
    let unsubscribeBackground: (() => void) | null = null;
    let unsubscribe: (() => void) | null = null;
    let unsubscribeNotification: (() => void) | null = null;
    let initialNotificationHandle: Promise<FirebaseMessagingTypes.RemoteMessage | null> | null = null;

    // 앱 시작 시 네이티브 알림 권한 필수 요청 및 즉시 동기화
    const currentUid = uid; // 클로저로 안전하게 캡처
    console.log('=== FCM 토큰 등록 시작 ===');
    
    // 권한 상태 즉시 확인 및 동기화 (uid가 없어도 실행)
    notifee.getNotificationSettings().then(async (settings) => {
      const isAuthorized = settings.authorizationStatus === 1;
      if (currentUid) {
        await syncNotificationPermission(currentUid, isAuthorized);
        console.log('✅ 알림 권한 상태 동기화:', isAuthorized ? '허용됨' : '거부됨');
      }
    });
    
    registerForPushNotificationsAsync(currentUid || undefined).then((token) => {
      if (isMounted && token) {
        console.log('✅ FCM Device Token 성공:', token);
        console.log('✅ 토큰 길이:', token.length);
        setDeviceToken(token);
        // UID가 있을 때만 서버에 등록 (없으면 나중에 uid가 설정되면 자동으로 등록됨)
        if (currentUid) {
          console.log('📤 초기 토큰 등록 (UID 있음):', currentUid);
          registerTokenToServer(token, currentUid);
        } else {
          console.log('⏳ UID가 없어서 토큰 등록 대기 (UID 설정되면 자동 등록)');
        }
      } else if (!isMounted) {
        console.log('❌ FCM token not available (unmounted)');
      }
    }).catch((error) => {
      if (isMounted) {
        console.error('❌ FCM 토큰 등록 실패:', error);
      }
    });

    // 백그라운드 알림 리스너
    unsubscribeBackground = messaging().onNotificationOpenedApp((remoteMessage) => {
      if (!isMounted) return;
      
      console.log('📱 백그라운드 알림 클릭됨:', remoteMessage);
      try {
        const data: any = remoteMessage?.data || {};
        const url = typeof data.url === 'string' ? data.url : null;
        const inboxId = typeof data.inboxId === 'string' ? data.inboxId : null;
        const messageUid = currentUid; // 클로저로 캡처된 uid 사용
        
        // 딥링크 처리
        if (url && webViewRef.current) {
          console.log('🔗 백그라운드 알림 딥링크 URL:', url);
          const escapedUrl = url.replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\$/g, '\\$');
          const baseUrl = DEFAULT_URL;
          webViewRef.current.injectJavaScript(`
            (function() {
              const url = "${escapedUrl}";
              const baseUrl = "${baseUrl}";
              console.log('🔗 딥링크 처리 시작 (백그라운드):', url);
              
              if (!url || url === '#') {
                console.log('⚠️ 유효하지 않은 URL');
                return;
              }
              
              // Next.js 라우터 사용 시도
              if (typeof window !== 'undefined' && window.next && window.next.router) {
                try {
                  console.log('✅ Next.js 라우터 사용');
                  window.next.router.push(url);
                  return;
                } catch (e) {
                  console.error('❌ Next.js 라우터 실패:', e);
                }
              }
              
              // 커스텀 이벤트로 라우터 호출 시도
              if (typeof window !== 'undefined' && window.dispatchEvent) {
                try {
                  const event = new CustomEvent('react-native-navigate', { detail: { url } });
                  window.dispatchEvent(event);
                  console.log('✅ 커스텀 이벤트 전송');
                  setTimeout(() => {
                    const fullUrl = url.startsWith('/') ? baseUrl + url : url;
                    if (window.location.href !== fullUrl) {
                      console.log('🔄 폴백: window.location.href 사용');
                      window.location.href = fullUrl;
                    }
                  }, 100);
                  return;
                } catch (e) {
                  console.error('❌ 커스텀 이벤트 실패:', e);
                }
              }
              
              // 폴백: 전체 URL로 이동
              const fullUrl = url.startsWith('/') ? baseUrl + url : url;
              console.log('🔄 폴백: window.location.href 사용:', fullUrl);
              if (window.location.href !== fullUrl) {
                window.location.href = fullUrl;
              }
            })();
            true;
          `);
        }
        
        // 읽음 처리
        if (inboxId && messageUid) {
          markNotificationAsRead(messageUid, inboxId);
        }
      } catch (error) {
        console.error('❌ 백그라운드 알림 클릭 처리 실패:', error);
      }
    });

    // 앱 종료 상태에서 알림 클릭
    initialNotificationHandle = messaging().getInitialNotification().then((remoteMessage) => {
      if (!isMounted || !remoteMessage) return null;
      
      console.log('📱 앱 종료 상태에서 알림 클릭됨:', remoteMessage);
      try {
        const data: any = remoteMessage?.data || {};
        const url = typeof data.url === 'string' ? data.url : null;
        const inboxId = typeof data.inboxId === 'string' ? data.inboxId : null;
        const messageUid = currentUid; // 클로저로 캡처된 uid 사용
        
        // 딥링크 처리 (웹뷰 로딩 대기)
        if (url && webViewRef.current) {
          console.log('🔗 앱 종료 상태 딥링크 URL:', url);
          setTimeout(() => {
            if (!isMounted || !webViewRef.current) return;
            const escapedUrl = url.replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\$/g, '\\$');
            const baseUrl = DEFAULT_URL;
            webViewRef.current.injectJavaScript(`
              (function() {
                const url = "${escapedUrl}";
                const baseUrl = "${baseUrl}";
                console.log('🔗 딥링크 처리 시작 (앱 종료):', url);
                
                if (!url || url === '#') {
                  console.log('⚠️ 유효하지 않은 URL');
                  return;
                }
                
                // Next.js 라우터 사용 시도
                if (typeof window !== 'undefined' && window.next && window.next.router) {
                  try {
                    console.log('✅ Next.js 라우터 사용');
                    window.next.router.push(url);
                    return;
                  } catch (e) {
                    console.error('❌ Next.js 라우터 실패:', e);
                  }
                }
                
                // 커스텀 이벤트로 라우터 호출 시도
                if (typeof window !== 'undefined' && window.dispatchEvent) {
                  try {
                    const event = new CustomEvent('react-native-navigate', { detail: { url } });
                    window.dispatchEvent(event);
                    console.log('✅ 커스텀 이벤트 전송');
                    setTimeout(() => {
                      const fullUrl = url.startsWith('/') ? baseUrl + url : url;
                      if (window.location.href !== fullUrl) {
                        console.log('🔄 폴백: window.location.href 사용');
                        window.location.href = fullUrl;
                      }
                    }, 100);
                    return;
                  } catch (e) {
                    console.error('❌ 커스텀 이벤트 실패:', e);
                  }
                }
                
                // 폴백: 전체 URL로 이동
                const fullUrl = url.startsWith('/') ? baseUrl + url : url;
                console.log('🔄 폴백: window.location.href 사용:', fullUrl);
                if (window.location.href !== fullUrl) {
                  window.location.href = fullUrl;
                }
              })();
              true;
            `);
          }, 1000);
        }
        
        // 읽음 처리
        if (inboxId && messageUid) {
          markNotificationAsRead(messageUid, inboxId);
        }
      } catch (error) {
        console.error('❌ 앱 종료 상태 알림 클릭 처리 실패:', error);
      }
      
      return remoteMessage;
    });

    // 포그라운드 수신 리스너
    unsubscribe = messaging().onMessage(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
      console.log('🔔 ========== 포그라운드 메시지 핸들러 호출됨 ==========');
      console.log('🔔 포그라운드 메시지 수신:', JSON.stringify(remoteMessage, null, 2));
      
      if (!isMounted) {
        console.log('⚠️ 컴포넌트가 마운트되지 않음, 알림 처리 중단');
        return;
      }
      
      try {
        const data: any = remoteMessage?.data || {};
        const notification = remoteMessage?.notification || {};
        
        console.log('📦 데이터:', data);
        console.log('📦 알림:', notification);
        
        // notification 필드가 있으면 그것을 사용, 없으면 data에서 추출
        const title = String(notification?.title || data?.title || '알림');
        const body = String(notification?.body || data?.body || '');
        const type = String(data.type || '');
        const inboxId = typeof data.inboxId === 'string' ? data.inboxId : null;
        
        console.log('📝 추출된 정보:', { title, body, type, inboxId });

        // 설정 기반 알림 필터링 (캐싱 사용)
        const messageUid = currentUid; // 클로저로 안전하게 캡처
        console.log('👤 현재 UID:', messageUid);
        if (messageUid) {
          const settings = await getUserSettings(messageUid);
          console.log('⚙️ 사용자 설정:', settings);
          if (settings && !isNotificationAllowed(settings, type, new Date())) {
            console.log('⚠️ 알림 필터링됨 (설정에서 차단):', type);
            return;
          }
        } else {
          console.log('⚠️ UID가 없어서 설정 필터링 스킵');
        }
        
        // 알림 타입에 맞는 채널 ID 매핑 (Functions에서 보낸 channelId 우선 사용)
        const channelId = String(data.channelId || mapNotificationTypeToChannel(type));
        
        // centerInfo 추출 (배지 정보)
        const centerInfo = String(data.centerInfo || data.requestType || data.category || '');
        const subtitle = String(data.subtitle || data.productName || '');
        const senderName = String(data.senderName || '시스템');
        const senderAvatar = String(data.senderAvatar || '');
        
        // 알림 타입 감지 (navigation.ts의 ROUTE_ICONS 로직 참고)
        const getNotificationTypeCategory = (titleText: string, notificationType: string): string => {
          // 댓글/멘션
          if (titleText?.includes('댓글 :') || titleText?.includes('멘션 :') || 
              notificationType?.includes('comment') || notificationType?.includes('mention')) {
            return 'comment';
          }
          // 공지사항
          if (titleText?.includes('공지사항') || notificationType === 'announcement') {
            return 'announcement';
          }
          // 근무계획
          if (titleText?.includes('근무계획') || notificationType === 'work-schedule') {
            return 'work-schedule';
          }
          // 생산일정
          if (titleText?.includes('생산일정') || notificationType === 'production-schedule') {
            return 'production-schedule';
          }
          // 생산일보
          if (titleText?.includes('생산일보') || notificationType === 'daily-report') {
            return 'daily-report';
          }
          // 생산관리부
          if (titleText?.includes('생산관리부') && !titleText?.includes('댓글 :') || 
              notificationType === 'production-request') {
            return 'production-request';
          }
          // 부족분
          if (titleText?.includes('부족분') || notificationType === 'shortage-request') {
            return 'shortage-request';
          }
          // 품질이슈
          if (titleText?.includes('품질이슈') || notificationType?.includes('quality')) {
            return 'quality-issue';
          }
          // 샘플
          if (titleText?.includes('샘플') || notificationType?.includes('sample')) {
            return 'sample';
          }
          // 지그
          if (titleText?.includes('지그') || notificationType?.includes('jig')) {
            return 'jig';
          }
          return 'default';
        };
        
        const notificationCategory = getNotificationTypeCategory(title, type);
        
        // 긴급건 여부 확인 (NotificationPanel 로직 참고)
        const isUrgent = centerInfo === '부족분 신청' || 
                        centerInfo === '품질이슈 등록' || 
                        centerInfo === '품질이슈 상태 변경' ||
                        centerInfo?.includes('생산관리부') ||
                        title?.includes('부족분') ||
                        title?.includes('품질이슈') ||
                        title?.includes('생산관리부');
        
        // 알림 색상 설정 (navigation.ts의 아이콘 색상 참고)
        // 긴급건은 빨간색, 댓글은 파란색, 샘플은 보라색 등
        const getNotificationColor = (category: string, isUrgentFlag: boolean): string => {
          if (isUrgentFlag) return '#EF4444'; // 빨간색 - 긴급
          switch (category) {
            case 'comment':
            case 'announcement':
            case 'production-request':
              return '#3B82F6'; // 파란색
            case 'work-schedule':
            case 'sample':
              return '#8B5CF6'; // 보라색
            case 'production-schedule':
            case 'daily-report':
              return '#10B981'; // 초록색
            case 'shortage-request':
              return '#F97316'; // 주황색
            case 'quality-issue':
              return '#EF4444'; // 빨간색
            case 'jig':
              return '#6366F1'; // 인디고
            default:
              return '#3B82F6'; // 기본 파란색
          }
        };
        
        const notificationColor = getNotificationColor(notificationCategory, isUrgent);
        
        // 알림 타입별 진동 패턴 설정 (navigation.ts의 중요도 참고)
        const getVibrationPattern = (category: string, isUrgentFlag: boolean): number[] => {
          if (isUrgentFlag) {
            // 긴급건: 강한 진동 (3번 진동)
            return [400, 200, 400, 200, 400, 200];
          }
          
          switch (category) {
            case 'shortage-request':
            case 'quality-issue':
            case 'production-request':
              // 긴급 알림: 강한 진동 (2번 진동)
              return [350, 200, 350, 200];
              
            case 'comment':
            case 'announcement':
              // 댓글/공지사항: 부드러운 진동 (1번)
              return [200, 100,200, 100];
              
            case 'work-schedule':
            case 'sample':
            case 'jig':
              // 근무계획/샘플/지그: 보통 진동 (2번)
              return [300, 150, 300, 150];
              
            case 'production-schedule':
            case 'daily-report':
              // 생산일정/생산일보: 보통 진동 (1번 강하게)
              return [250, 100];
              
            default:
              // 기본: 보통 진동
              return [300, 200];
          }
        };
        
        const vibrationPattern = getVibrationPattern(notificationCategory, isUrgent);
        
        // BigText 본문 구성 (NotificationPanel 스타일 참고)
        // 형식: [centerInfo 배지] \n 발신자명: 서브타이틀 \n 본문
        let bigTextBody = '';
        if (centerInfo && !centerInfo.includes('댓글')) {
          bigTextBody += `[${centerInfo}] `;
        }
        if (senderName.toLowerCase() !== '시스템' && senderName) {
          bigTextBody += `${senderName}: `;
        }
        if (subtitle) {
          bigTextBody += `${subtitle}\n`;
        }
        bigTextBody += body;
        
        // BigText 스타일 적용하여 긴 텍스트 표시
        const notificationPayload = {
          title: title, // 이모지 제거, 깨끗한 제목만 표시
          subtitle: subtitle || undefined, // 서브타이틀 별도 표시
          body: body, // 접힌 상태에서는 짧은 본문만
          android: {
            channelId: channelId,
            importance: AndroidImportance.HIGH,
            style: {
              type: AndroidStyle.BIGTEXT as AndroidStyle.BIGTEXT,
              text: bigTextBody, // 확장 상태에서는 전체 정보 표시
            },
            pressAction: { id: 'default' },
            smallIcon: 'ic_notification', // 타입별 아이콘은 색상으로 구분
            largeIcon: senderAvatar || 'ic_launcher', // 아바타 이미지 또는 앱 아이콘
            color: notificationColor, // navigation.ts의 아이콘 색상과 유사하게 타입별 색상 적용
            sound: 'default',
            vibrationPattern: vibrationPattern, // 타입별 맞춤 진동 패턴
            showTimestamp: true,
            groupId: channelId, // 같은 채널 알림 그룹화
            groupSummary: false,
          },
          data: { 
            inboxId: inboxId || '', 
            uid: messageUid || '',
            type: type,
            category: notificationCategory,
            centerInfo: centerInfo,
            subtitle: subtitle,
            senderName: senderName,
            senderAvatar: senderAvatar,
            url: data.url || '',
          },
        };
        
        console.log('📤 notifee 알림 표시 시도:', JSON.stringify(notificationPayload, null, 2));
        
        await notifee.displayNotification(notificationPayload);
        
        console.log('✅ 포그라운드 알림 표시 완료:', title);

        // 포그라운드 알림은 자동 읽음 처리하지 않음 (웹 프로젝트와 동일하게 사용자 클릭 시에만 읽음 처리)
      } catch (error) {
        console.error('❌ 알림 표시 실패:', error);
        console.error('❌ 에러 상세:', error instanceof Error ? error.stack : error);
      }
    });

    // 알림 클릭 리스너
    unsubscribeNotification = notifee.onForegroundEvent(({ type, detail }) => {
      if (!isMounted || type !== 1) return; // PRESS 타입만 처리
      
      try {
        const data: any = detail?.notification?.data || {};
        const inboxId = typeof data.inboxId === 'string' ? data.inboxId : null;
        const url = typeof data.url === 'string' ? data.url : null;
        const messageUid = currentUid; // 클로저로 캡처된 uid 사용
        
        // 딥링크 처리
        if (url && webViewRef.current) {
          console.log('🔗 포그라운드 알림 딥링크 URL:', url);
          const escapedUrl = url.replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\$/g, '\\$');
          const baseUrl = DEFAULT_URL;
          webViewRef.current.injectJavaScript(`
            (function() {
              const url = "${escapedUrl}";
              const baseUrl = "${baseUrl}";
              console.log('🔗 딥링크 처리 시작 (포그라운드):', url);
              
              if (!url || url === '#') {
                console.log('⚠️ 유효하지 않은 URL');
                return;
              }
              
              // Next.js 라우터 사용 시도
              if (typeof window !== 'undefined' && window.next && window.next.router) {
                try {
                  console.log('✅ Next.js 라우터 사용');
                  window.next.router.push(url);
                  return;
                } catch (e) {
                  console.error('❌ Next.js 라우터 실패:', e);
                }
              }
              
              // 커스텀 이벤트로 라우터 호출 시도
              if (typeof window !== 'undefined' && window.dispatchEvent) {
                try {
                  const event = new CustomEvent('react-native-navigate', { detail: { url } });
                  window.dispatchEvent(event);
                  console.log('✅ 커스텀 이벤트 전송');
                  setTimeout(() => {
                    const fullUrl = url.startsWith('/') ? baseUrl + url : url;
                    if (window.location.href !== fullUrl) {
                      console.log('🔄 폴백: window.location.href 사용');
                      window.location.href = fullUrl;
                    }
                  }, 100);
                  return;
                } catch (e) {
                  console.error('❌ 커스텀 이벤트 실패:', e);
                }
              }
              
              // 폴백: 전체 URL로 이동
              const fullUrl = url.startsWith('/') ? baseUrl + url : url;
              console.log('🔄 폴백: window.location.href 사용:', fullUrl);
              if (window.location.href !== fullUrl) {
                window.location.href = fullUrl;
              }
            })();
            true;
          `);
        }
        
        // 읽음 처리
        if (inboxId && messageUid) {
          markNotificationAsRead(messageUid, inboxId);
        }
      } catch (error) {
        console.error('❌ 알림 클릭 처리 실패:', error);
      }
    });

    // Cleanup 함수
    return () => {
      isMounted = false;
      if (unsubscribeBackground) unsubscribeBackground();
      if (unsubscribe) unsubscribe();
      if (unsubscribeNotification) unsubscribeNotification();
    };
  }, [uid]); // ✅ uid를 의존성에 추가

  // 배지 카운트 동기화 (uid 변경 시 + 주기적)
  useEffect(() => {
    if (!uid) return;
    
    // 초기 배지 카운트 설정
    updateBadgeCount(uid);
    
    // 주기적으로 배지 카운트 동기화 (웹에서 읽음 처리한 경우 대비)
    const interval = setInterval(() => {
      updateBadgeCount(uid);
    }, 30000); // 30초마다
    
    return () => clearInterval(interval);
  }, [uid]);

  // deviceToken 등록 (중복 방지) - UID가 설정되면 자동으로 토큰 등록
  useEffect(() => {
    if (deviceToken && uid) {
      console.log('📤 UID 설정됨, 토큰 서버 등록:', uid);
      registerTokenToServer(deviceToken, uid);
    }
  }, [deviceToken, uid]);

  // uid 변경 시 권한 재확인 (토큰 등록은 위의 useEffect에서 처리)
  useEffect(() => {
    if (!uid) return;
    
    // 권한 상태 즉시 동기화
    notifee.getNotificationSettings().then(settings => {
      const isAuthorized = settings.authorizationStatus === 1;
      syncNotificationPermission(uid, isAuthorized);
      console.log('✅ uid 변경 시 권한 동기화:', isAuthorized ? '허용됨' : '거부됨');
    });
    
    // 토큰이 없으면 새로 등록 (토큰이 있으면 위의 useEffect에서 자동으로 등록됨)
    if (!deviceToken) {
      registerForPushNotificationsAsync(uid).then((token) => {
        if (token) {
          setDeviceToken(token);
          // setDeviceToken이 호출되면 위의 useEffect에서 자동으로 서버 등록됨
        }
      });
    }
  }, [uid]); // deviceToken 제거 (무한 루프 방지)

  // 앱 종료 처리 (토스트 표시 또는 실제 종료)
  const handleAppExit = useCallback(() => {
    if (backPressCountRef.current === 0) {
      // 첫 번째 뒤로가기: 토스트 표시
      if (Platform.OS === 'android') {
        ToastAndroid.show('한 번 더 누르면 앱이 종료됩니다', ToastAndroid.SHORT);
      }
      backPressCountRef.current = 1;
      
      // 2초 후 카운트 리셋
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
      }
      exitTimerRef.current = setTimeout(() => {
        backPressCountRef.current = 0;
        exitTimerRef.current = null;
      }, 2000);
      
      return true; // 이벤트 처리됨
    } else {
      // 두 번째 뒤로가기: 앱 종료
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      backPressCountRef.current = 0;
      return false; // 앱 종료
    }
  }, []);

  // Android 뒤로가기 버튼 처리
  useEffect(() => {
    const backAction = () => {
      // 두 번째 뒤로가기 (토스트 표시 후 2초 이내): 앱 종료
      if (backPressCountRef.current === 1) {
        if (exitTimerRef.current) {
          clearTimeout(exitTimerRef.current);
          exitTimerRef.current = null;
        }
        backPressCountRef.current = 0;
        return false; // 앱 종료
      }

      if (!webViewRef.current) {
        // WebView가 없으면 앱 종료 처리
        return handleAppExit();
      }

      // 웹뷰에서 모달/시트 닫기 및 뒤로가기 처리
      // JavaScript로 모든 것을 한 번에 처리하고 결과를 postMessage로 전송
      webViewRef.current.injectJavaScript(`
        (function() {
          let handled = false;
          
          // 1. 모달/시트가 열려있으면 먼저 닫기
          if (typeof window.closeModalIfOpen === 'function') {
            const modalWasOpen = window.closeModalIfOpen();
            if (modalWasOpen) {
              handled = true; // 모달이 닫혔으므로 처리 완료
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'modal-closed'
                }));
              }
            }
          }
          
          // 2. 모달이 없었으면 WebView 뒤로가기 가능 여부 확인
          if (!handled) {
            if (window.history.length > 1) {
              // 뒤로가기 가능: postMessage로 요청
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'go-back'
                }));
              }
              handled = true;
            } else {
              // 뒤로가기 불가능: 처리할 것이 없음
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'nothing-to-handle'
                }));
              }
            }
          }
        })();
      `);
      
      // JavaScript 실행은 비동기이므로 항상 true 반환 (이벤트 처리됨)
      // 실제 처리는 JavaScript에서 postMessage로 응답하여 수행됨
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => {
      backHandler.remove();
      // 컴포넌트 언마운트 시 타이머 정리
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      backPressCountRef.current = 0;
    };
  }, [handleAppExit]);

  return (
    <SafeAreaView style={styles.safeArea}>
    <View style={styles.container}>
        <WebView
          ref={webViewRef}
          source={{ uri: DEFAULT_URL }}
          startInLoadingState
          allowsBackForwardNavigationGestures
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={["*"]}
          mixedContentMode="always"
          setSupportMultipleWindows={false}
          injectedJavaScript={`
            (function() {
              // ReactNativeWebView 객체 주입 (웹에서 사용할 수 있도록)
              // React Native WebView는 자동으로 window.ReactNativeWebView를 주입하지만
              // 확실하게 하기 위해 추가 주입
              if (typeof window !== 'undefined') {
                const originalPostMessage = window.ReactNativeWebView?.postMessage || 
                  ((data) => {
                    // 폴백: 일반 postMessage 사용
                    window.postMessage(data, '*');
                  });
                window.ReactNativeWebView = {
                  postMessage: originalPostMessage
                };
              }
            })();
            true;
          `}
          onNavigationStateChange={(navState) => {
            // 웹뷰의 뒤로가기 가능 상태 업데이트
            setCanGoBack(navState.canGoBack);
          }}
          onMessage={useCallback((event: any) => {
            try {
              const data = event.nativeEvent.data;
              if (!data) return;
              
              const payload = JSON.parse(data);
              
              // 인증 정보
              if (payload && payload.type === 'auth') {
                setUid(payload.uid || null);
              }
              
              // 배지 카운트 업데이트 요청
              if (payload && payload.type === 'notification-badge-update' && uid) {
                updateBadgeCount(uid);
              }
              
              // 웹뷰 뒤로가기 요청 (모달이 없을 때)
              if (payload && payload.type === 'go-back' && webViewRef.current && canGoBack) {
                webViewRef.current.goBack();
                // 뒤로가기 처리 완료 - 타이머 취소
                if (exitTimerRef.current) {
                  clearTimeout(exitTimerRef.current);
                  exitTimerRef.current = null;
                }
                backPressCountRef.current = 0;
              }
              
              // 모달이 닫혔다는 응답
              if (payload && payload.type === 'modal-closed') {
                // 모달 닫기 완료 - 타이머 취소
                if (exitTimerRef.current) {
                  clearTimeout(exitTimerRef.current);
                  exitTimerRef.current = null;
                }
                backPressCountRef.current = 0;
              }
              
              // 처리할 것이 없다는 응답 (모달도 없고 뒤로가기도 불가능)
              if (payload && payload.type === 'nothing-to-handle') {
                // 첫 번째 뒤로가기: 토스트 표시
                if (backPressCountRef.current === 0) {
                  if (Platform.OS === 'android') {
                    ToastAndroid.show('한 번 더 누르면 앱이 종료됩니다', ToastAndroid.SHORT);
                  }
                  backPressCountRef.current = 1;
                  
                  // 2초 후 카운트 리셋
                  if (exitTimerRef.current) {
                    clearTimeout(exitTimerRef.current);
                  }
                  exitTimerRef.current = setTimeout(() => {
                    backPressCountRef.current = 0;
                    exitTimerRef.current = null;
                  }, 2000);
                }
                // 두 번째 뒤로가기는 backAction에서 처리됨
              }
            } catch (error) {
              console.error('❌ onMessage 파싱 실패:', error);
            }
          }, [uid, canGoBack, handleAppExit])}
          onShouldStartLoadWithRequest={(request) => {
            return true;
          }}
          style={styles.webview}
      />
    </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default App;