const { BrowserWindow, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { URL } = require('url');

class NotificationWindow {
  constructor() {
    this.currentWindow = null; // 현재 표시 중인 알림 윈도우
    this.currentOnClick = null; // 현재 알림의 onClick 콜백
    this.queue = []; // 대기 중인 알림 큐
    this.notificationHeight = 150; // 알림 높이 (120px → 150px로 증가)
    this.notificationWidth = 350; // 알림 너비 (400px → 350px로 감소)
    this.avatarCache = new Map(); // 아바타 이미지 캐시
    this.maxCacheSize = 50; // 최대 캐시 크기 (메모리 누수 방지)
  }

  /**
   * 이미지를 다운로드하여 Base64로 변환 (캐시 사용)
   */
  async downloadImage(url) {
    try {
      if (this.avatarCache.has(url)) {
        console.log('📦 [NotificationWindow] 캐시된 이미지 사용:', url);
        return this.avatarCache.get(url);
      }

      console.log('⬇️ [NotificationWindow] 이미지 다운로드 시작:', url);

      const urlObj = new URL(url);
      const protocol = urlObj.protocol === 'https:' ? https : http;

      return new Promise((resolve, reject) => {
        const request = protocol.get(url, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`HTTP ${response.statusCode}`));
            return;
          }

          const chunks = [];
          response.on('data', (chunk) => chunks.push(chunk));
          response.on('end', () => {
            const buffer = Buffer.concat(chunks);
            const base64 = buffer.toString('base64');
            const dataUrl = `data:${response.headers['content-type'] || 'image/jpeg'};base64,${base64}`;

            // 캐시 크기 제한 (메모리 누수 방지)
            if (this.avatarCache.size >= this.maxCacheSize) {
              // 가장 오래된 항목 제거 (LRU 방식)
              const firstKey = this.avatarCache.keys().next().value;
              this.avatarCache.delete(firstKey);
              console.log('🗑️ [NotificationWindow] 캐시 크기 제한, 오래된 항목 제거:', firstKey);
            }

            this.avatarCache.set(url, dataUrl);
            console.log('✅ [NotificationWindow] 이미지 다운로드 완료:', url);
            resolve(dataUrl);
          });
        });

        request.on('error', (error) => {
          console.error('❌ [NotificationWindow] 이미지 다운로드 실패:', error);
          reject(error);
        });

        request.setTimeout(5000, () => {
          request.destroy();
          reject(new Error('다운로드 타임아웃'));
        });
      });
    } catch (error) {
      console.error('❌ [NotificationWindow] 이미지 다운로드 오류:', error);
      return null;
    }
  }

  /**
   * 알림 클릭 이벤트 처리 (외부에서 호출)
   */
  handleClick() {
    if (this.currentOnClick) {
      console.log('🖱️ [NotificationWindow] 알림 클릭 - onClick 콜백 실행');
      this.currentOnClick();
      this.closeNotification(this.currentWindow);
    } else {
      console.warn('⚠️ [NotificationWindow] onClick 콜백이 없습니다');
    }
  }

  /**
   * 커스텀 알림 윈도우 생성 (큐 방식)
   */
  createNotification(options) {
    console.log('🔔 [NotificationWindow] createNotification 호출:', { title: options.title });

    // 현재 표시 중인 알림이 있으면 큐에 추가
    if (this.currentWindow && !this.currentWindow.isDestroyed()) {
      console.log('⏳ [NotificationWindow] 현재 알림 표시 중, 큐에 추가');
      this.queue.push(options);
      console.log(`📋 [NotificationWindow] 큐 크기: ${this.queue.length}`);
      return;
    }

    // 현재 알림이 없으면 바로 표시
    this.showNotification(options);
  }

  /**
   * 알림 윈도우 표시
   */
  async showNotification(options) {
    try {
      const { title, subtitle, body, icon, onClick, soundEnabled = true } = options;

      console.log('🔔 [NotificationWindow] 알림 표시:', { title, subtitle, body });

      // 아바타 이미지 다운로드 (HTTP URL인 경우)
      let processedSenderAvatar = options.senderAvatar;
      if (options.senderAvatar && options.senderAvatar.startsWith('http')) {
        console.log('🔄 [NotificationWindow] 아바타 이미지 다운로드 중...');
        processedSenderAvatar = await this.downloadImage(options.senderAvatar);
        if (!processedSenderAvatar) {
          console.warn('⚠️ [NotificationWindow] 아바타 다운로드 실패, 원본 URL 사용');
          processedSenderAvatar = options.senderAvatar;
        }
      }

      // 작업 영역 가져오기 (작업 표시줄 제외)
      const workArea = screen.getPrimaryDisplay().workArea;
      console.log('📐 [NotificationWindow] 작업 영역:', workArea);

      // 알림 위치 계산 (우하단, 작업 표시줄 고려)
      const margin = 10; // 화면 가장자리 여백
      const x = workArea.x + workArea.width - this.notificationWidth - margin;
      const y = workArea.y + workArea.height - this.notificationHeight - margin;
      console.log('📍 [NotificationWindow] 알림 위치:', { x, y });

      // 알림 윈도우 생성
      console.log('🪟 [NotificationWindow] BrowserWindow 생성 시작...');
      const notificationWindow = new BrowserWindow({
        width: this.notificationWidth,
        height: this.notificationHeight,
        x: x,
        y: y,
        frame: false,
        transparent: true,
        opacity: 1.0, // 전체 윈도우 100% 불투명도 (완전 불투명)
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        movable: false,
        minimizable: false,
        maximizable: false,
        closable: false,
        focusable: false,
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, 'notification-preload.js'),
          webSecurity: false,  // 외부 이미지 로딩 허용
          allowRunningInsecureContent: true,  // HTTPS가 아닌 콘텐츠 허용
          experimentalFeatures: true  // 실험적 기능 활성화
        }
      });

      // 현재 윈도우 및 onClick 콜백 설정
      this.currentWindow = notificationWindow;
      this.currentOnClick = onClick;
      console.log('📝 [NotificationWindow] 현재 윈도우 및 onClick 설정 완료');

      // HTML 로드 (URL에 데이터 전달)
      // 소리는 main.js에서 재생되므로 soundEnabled는 전달하지 않아도 됨
      const dataToSend = {
        title,
        subtitle: options.subtitle,  // ✅ 서브타이틀 추가
        body,
        icon: icon || path.join(__dirname, '../public/favicon.ico'),
        senderName: options.senderName,
        senderAvatar: processedSenderAvatar,  // ✅ 처리된 아바타 사용
        timestamp: options.timestamp || new Date().toISOString(),
        centerInfo: options.centerInfo,  // ✅ 중앙 정보 추가
        metadata: options.metadata || {}  // ✅ metadata 추가
      };
      
      console.log('📤 [NotificationWindow] HTML로 전달할 데이터:', dataToSend);
      const notificationData = encodeURIComponent(JSON.stringify(dataToSend));

      const htmlPath = path.join(__dirname, 'notification.html');
      const fullUrl = `file://${htmlPath}?data=${notificationData}`;
      console.log('🔗 [NotificationWindow] HTML 로드:', fullUrl.substring(0, 200) + '...');

    notificationWindow.loadURL(fullUrl);

    // 윈도우 준비되면 표시
    notificationWindow.once('ready-to-show', () => {
      console.log('✅ [NotificationWindow] 윈도우 준비 완료, 표시 시작');
      
      // 단순하게 바로 표시 (CSS 애니메이션 사용)
      notificationWindow.show();
    });

    // 7초 후 자동 닫기
    setTimeout(() => {
      console.log('⏰ [NotificationWindow] 7초 경과, 알림 닫기 시작');
      this.closeNotification(notificationWindow);
    }, 7000);

    // 클릭 이벤트 처리
    if (onClick) {
      notificationWindow.webContents.on('will-navigate', (event, url) => {
        event.preventDefault();
        onClick();
        this.closeNotification(notificationWindow);
      });
    }

      // 윈도우 닫힐 때 정리 (closeNotification에서 이미 처리됨)
      notificationWindow.on('closed', () => {
        console.log('🚪 [NotificationWindow] 윈도우 closed 이벤트 발생');
        
        // 수동 닫기 등 예외 상황 대비 (closeNotification 미호출 시)
        if (this.currentWindow === notificationWindow) {
          console.log('⚠️ [NotificationWindow] 예외 상황: closeNotification 미호출, 직접 처리');
          this.currentWindow = null;
          this.currentOnClick = null;
          this.showNextNotification();
        }
      });

      console.log('✅ [NotificationWindow] 커스텀 알림 윈도우 생성 완료:', { title, body });

      return notificationWindow;
    } catch (error) {
      console.error('❌ [NotificationWindow] 커스텀 알림 생성 실패:', error);
      console.error('❌ [NotificationWindow] Error stack:', error.stack);
      
      // 에러 발생 시 다음 알림 표시
      this.currentWindow = null;
      this.showNextNotification();
      
      throw error;
    }
  }

  /**
   * 큐에서 다음 알림 표시
   */
  showNextNotification() {
    if (this.queue.length > 0) {
      const nextOptions = this.queue.shift();
      console.log(`▶️ [NotificationWindow] 큐에서 다음 알림 표시 (남은 큐: ${this.queue.length})`);
      this.showNotification(nextOptions);
    } else {
      console.log('✅ [NotificationWindow] 큐가 비어있음, 대기 중');
    }
  }

  /**
   * 현재 알림 닫기 (애니메이션 포함)
   */
  closeNotification(notificationWindow) {
    if (!notificationWindow || notificationWindow.isDestroyed()) {
      console.log('⚠️ [NotificationWindow] 윈도우가 이미 닫혔거나 없음');
      return;
    }

    console.log('🗑️ [NotificationWindow] 윈도우 닫기 애니메이션 시작');
    
    // 현재 윈도우 및 onClick 초기화
    if (this.currentWindow === notificationWindow) {
      this.currentWindow = null;
      this.currentOnClick = null;
      console.log('📝 [NotificationWindow] 현재 윈도우 및 onClick 초기화');
    }
    
    // HTML에 닫기 애니메이션 트리거
    notificationWindow.webContents.executeJavaScript('window.closeWithAnimation && window.closeWithAnimation()').catch(() => {
      // 실패 시 즉시 파괴
      console.log('⚠️ [NotificationWindow] 애니메이션 실행 실패, 즉시 파괴');
      notificationWindow.destroy();
    });
    
    // 애니메이션 시간 후 강제 파괴 (백업)
    setTimeout(() => {
      if (!notificationWindow.isDestroyed()) {
        notificationWindow.destroy();
        console.log('✅ [NotificationWindow] 윈도우 파괴됨');
      }
    }, 250); // 애니메이션(200ms) + 여유(50ms)
    
    // 다음 알림은 애니메이션 완료 후 표시
    setTimeout(() => {
      this.showNextNotification();
    }, 250);
  }

  /**
   * 모든 알림 닫기
   */
  closeAll() {
    // 큐 초기화
    this.queue = [];
    console.log('🗑️ [NotificationWindow] 큐 초기화');
    
    // 현재 윈도우 파괴
    if (this.currentWindow && !this.currentWindow.isDestroyed()) {
      this.currentWindow.destroy();
    }
    
    this.currentWindow = null;
    this.currentOnClick = null;
    console.log('✅ [NotificationWindow] 모든 알림 파괴됨');
  }
}

// 알림 클릭 이벤트 핸들러 노출
const notificationWindowInstance = new NotificationWindow();

// IPC 이벤트 리스너 등록 (main.js에서 사용하기 위해)
if (typeof module !== 'undefined' && module.exports) {
  const { ipcMain } = require('electron');
  
  ipcMain.on('notification-clicked', () => {
    console.log('🖱️ [NotificationWindow] IPC: notification-clicked 수신');
    notificationWindowInstance.handleClick();
  });
  
  console.log('✅ [NotificationWindow] IPC 리스너 등록 완료');
}

module.exports = notificationWindowInstance;
