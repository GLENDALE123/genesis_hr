/**
 * @format
 */

import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidStyle } from '@notifee/react-native';
import { Platform } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// 채널 그룹 및 채널 정의 (App.tsx와 동일)
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

// 타입-채널 매핑 함수
function mapNotificationTypeToChannel(type) {
  const typeMapping = {
    'quality-issue': 'quality-issue-created',
  };
  return typeMapping[type] || type;
}

// 백그라운드 메시지 핸들러 등록 (앱이 종료되거나 백그라운드에 있을 때)
// 이 핸들러는 반드시 index.js의 최상위 레벨에 있어야 합니다.
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('📱 ========== 백그라운드 메시지 핸들러 호출됨 ==========');
  console.log('📱 백그라운드 메시지 수신:', JSON.stringify(remoteMessage, null, 2));
  console.log('📱 remoteMessage.data:', remoteMessage?.data);
  console.log('📱 remoteMessage.notification:', remoteMessage?.notification);
  
  try {
    console.log('📱 백그라운드 핸들러 시작');
    // Android 채널 초기화
    if (Platform.OS === 'android') {
      for (const group of CHANNEL_GROUPS) {
        await notifee.createChannelGroup({
          id: group.id,
          name: group.name,
        });
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

    const data = remoteMessage?.data || {};
    const notification = remoteMessage?.notification || {};
    
    // Data-only 메시지 처리 (베스트 프랙티스)
    // notification 필드가 없으므로 data 필드에서 모든 정보 추출
    const title = notification?.title || data?.title || '알림';
    const body = notification?.body || data?.body || '';
    const type = String(data?.type || '');
    // Functions에서 보낸 channelId 우선 사용, 없으면 타입 매핑
    const channelId = String(data?.channelId || mapNotificationTypeToChannel(type) || 'default');
    
    const centerInfo = String(data?.centerInfo || data?.requestType || data?.category || '');
    const subtitle = String(data?.subtitle || data?.productName || '');
    const senderName = String(data?.senderName || '시스템');
    const senderAvatar = String(data?.senderAvatar || '');
    
    // BigText 본문 구성
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
    
    console.log('📤 백그라운드 notifee 알림 표시 시도:', { title, body, channelId });
    
    // Data-only 메시지이므로 notifee로 커스텀 알림 표시
    // 이렇게 하면 모든 상황(종료, 백그라운드, 포그라운드)에서 일관된 알림 표시 가능
    const notificationId = await notifee.displayNotification({
      title: title,
      subtitle: subtitle || undefined,
      body: body,
      android: {
        channelId: channelId,
        importance: AndroidImportance.HIGH,
        style: {
          type: AndroidStyle.BIGTEXT,
          text: bigTextBody,
        },
        pressAction: { id: 'default' },
        smallIcon: 'ic_notification',
        largeIcon: senderAvatar || 'ic_launcher',
        color: '#3B82F6',
        sound: 'default',
        vibrationPattern: [300, 200, 300, 200],
        showTimestamp: true,
        groupId: channelId,
        groupSummary: false,
      },
      data: {
        inboxId: data?.inboxId || '',
        type: type,
        url: data?.url || '',
      },
    });
    
    console.log('✅ 백그라운드 알림 표시 완료:', { title, notificationId });
  } catch (error) {
    console.error('❌ 백그라운드 알림 표시 실패:', error);
    console.error('❌ 에러 상세:', error instanceof Error ? error.stack : error);
  }
});

AppRegistry.registerComponent(appName, () => App);
