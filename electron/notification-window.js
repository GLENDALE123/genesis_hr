const { BrowserWindow, screen, app } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * 프로덕션/개발 환경에 따른 리소스 경로 가져오기
 */
function getResourcePath(relativePath) {
  if (app.isPackaged) {
    // 프로덕션 빌드: resources 디렉토리 기준
    // notification.html은 asarUnpack으로 추출되므로 resources/app.asar.unpacked/electron/ 경로
    if (relativePath.startsWith('electron/')) {
      return path.join(process.resourcesPath, 'app.asar.unpacked', relativePath);
    }
    return path.join(process.resourcesPath, 'app', relativePath);
  } else {
    // 개발 환경: __dirname 기준
    return path.join(__dirname, relativePath);
  }
}

class NotificationWindow {
  constructor() {
    this.currentWindow = null; // 현재 표시 중인 알림 윈도우
    this.currentOnClick = null; // 현재 알림의 onClick 콜백
    this.queue = []; // 대기 중인 알림 큐
    this.notificationHeight = 150; // 알림 높이 (120px → 150px로 증가)
    this.notificationWidth = 350; // 알림 너비 (400px → 350px로 감소)
    this.avatarCache = new Map(); // 아바타 이미지 캐시
    this.maxCacheSize = 50; // 최대 캐시 크기 (메모리 누수 방지)
    this.autoCloseTimer = null; // 자동 닫기 타이머 ID
    this.destroyBackupTimer = null; // 백업 파괴 타이머 ID
    this.nextShowTimer = null; // 다음 알림 표시 타이머 ID
  }

  /**
   * TMS 로고 이미지를 Base64로 읽기
   */
  getTmsLogoBase64() {
    try {
      const logoPath = getResourcePath('public/tms-logo.png');
      if (!fs.existsSync(logoPath)) {
        console.warn('⚠️ [NotificationWindow] TMS 로고 파일을 찾을 수 없습니다:', logoPath);
        return null;
      }
      const imageBuffer = fs.readFileSync(logoPath);
      const base64 = imageBuffer.toString('base64');
      return `data:image/png;base64,${base64}`;
    } catch (error) {
      console.error('❌ [NotificationWindow] TMS 로고 읽기 실패:', error);
      return null;
    }
  }

  /**
   * 이미지를 다운로드하여 Base64로 변환 (캐시 사용)
   */
  async downloadImage(url) {
    try {
      if (this.avatarCache.has(url)) {
        return this.avatarCache.get(url);
      }
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
            }

            this.avatarCache.set(url, dataUrl);
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
    // 현재 표시 중인 알림이 있으면 큐에 추가
    if (this.currentWindow && !this.currentWindow.isDestroyed()) {
      this.queue.push(options);
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
      // 아바타 이미지 다운로드 (HTTP URL인 경우)
      let processedSenderAvatar = options.senderAvatar;
      if (options.senderAvatar && options.senderAvatar.startsWith('http')) {
        processedSenderAvatar = await this.downloadImage(options.senderAvatar);
        if (!processedSenderAvatar) {
          console.warn('⚠️ [NotificationWindow] 아바타 다운로드 실패, 원본 URL 사용');
          processedSenderAvatar = options.senderAvatar;
        }
      }

      // 작업 영역 가져오기 (작업 표시줄 제외)
      const workArea = screen.getPrimaryDisplay().workArea;
      // 알림 위치 계산 (우하단, 작업 표시줄 고려)
      const margin = 10; // 화면 가장자리 여백
      const x = workArea.x + workArea.width - this.notificationWidth - margin;
      const y = workArea.y + workArea.height - this.notificationHeight - margin;
      // 알림 윈도우 생성
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
          preload: getResourcePath('electron/notification-preload.js'),
          // 보안 기본값 유지. 외부 이미지 로드는 downloadImage로 dataURL 변환하여 처리
          webSecurity: true,
          allowRunningInsecureContent: false
        }
      });

      // 현재 윈도우 및 onClick 콜백 설정
      this.currentWindow = notificationWindow;
      this.currentOnClick = onClick;
      // TMS 로고 이미지를 Base64로 읽기
      const tmsLogoBase64 = this.getTmsLogoBase64();
      // HTML 로드 (URL에 데이터 전달)
      // 소리는 main.js에서 재생되므로 soundEnabled는 전달하지 않아도 됨
      const dataToSend = {
        title,
        subtitle: options.subtitle,  // ✅ 서브타이틀 추가
        body,
        icon: icon || getResourcePath('public/tms-logo.png'),
        senderName: options.senderName,
        senderAvatar: processedSenderAvatar,  // ✅ 처리된 아바타 사용
        timestamp: options.timestamp || new Date().toISOString(),
        centerInfo: options.centerInfo,  // ✅ 중앙 정보 추가
        metadata: options.metadata || {},  // ✅ metadata 추가
        tmsLogoBase64: tmsLogoBase64  // ✅ TMS 로고 Base64 추가
      };
      const notificationData = encodeURIComponent(JSON.stringify(dataToSend));

      const htmlPath = getResourcePath('electron/notification.html');
      
      // 파일 존재 여부 확인
      if (!fs.existsSync(htmlPath)) {
        console.error('❌ [NotificationWindow] notification.html 파일을 찾을 수 없습니다:', htmlPath);
        throw new Error(`notification.html 파일을 찾을 수 없습니다: ${htmlPath}`);
      }
      
      // Windows 경로 처리: 역슬래시를 슬래시로 변환하고, 드라이브 문자 처리
      let fileUrl = htmlPath.replace(/\\/g, '/');
      // Windows 절대 경로인 경우 (C:/ 형태) file:///로 시작
      if (fileUrl.match(/^[A-Z]:\//)) {
        fileUrl = `file:///${fileUrl}`;
      } else {
        fileUrl = `file://${fileUrl}`;
      }
      
      const fullUrl = `${fileUrl}?data=${notificationData}`;
      console.log('📄 [NotificationWindow] 알림 HTML 로드:', fullUrl);
      
    notificationWindow.loadURL(fullUrl);

    // 윈도우 준비되면 표시
    notificationWindow.once('ready-to-show', () => {
      // 단순하게 바로 표시 (CSS 애니메이션 사용)
      notificationWindow.show();
    });

    // 7초 후 자동 닫기
    this.clearTimers();
    this.autoCloseTimer = setTimeout(() => {
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
        // 수동 닫기 등 예외 상황 대비 (closeNotification 미호출 시)
        if (this.currentWindow === notificationWindow) {
          this.currentWindow = null;
          this.currentOnClick = null;
          this.clearTimers();
          this.showNextNotification();
        }
      });
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
      this.showNotification(nextOptions);
    } else {
    }
  }

  /**
   * 현재 알림 닫기 (애니메이션 포함)
   */
  closeNotification(notificationWindow) {
    if (!notificationWindow || notificationWindow.isDestroyed()) {
      return;
    }
    // 현재 윈도우 및 onClick 초기화
    if (this.currentWindow === notificationWindow) {
      this.currentWindow = null;
      this.currentOnClick = null;
    }
    
    // HTML에 닫기 애니메이션 트리거
    notificationWindow.webContents.executeJavaScript('window.closeWithAnimation && window.closeWithAnimation()').catch(() => {
      // 실패 시 즉시 파괴
      notificationWindow.destroy();
    });
    
    // 애니메이션 시간 후 강제 파괴 (백업)
    if (this.destroyBackupTimer) clearTimeout(this.destroyBackupTimer);
    this.destroyBackupTimer = setTimeout(() => {
      if (!notificationWindow.isDestroyed()) {
        notificationWindow.destroy();
      }
    }, 250); // 애니메이션(200ms) + 여유(50ms)
    
    // 다음 알림은 애니메이션 완료 후 표시
    if (this.nextShowTimer) clearTimeout(this.nextShowTimer);
    this.nextShowTimer = setTimeout(() => {
      this.showNextNotification();
    }, 250);
  }

  /**
   * 모든 알림 닫기
   */
  closeAll() {
    // 큐 초기화
    this.queue = [];
    // 현재 윈도우 파괴
    if (this.currentWindow && !this.currentWindow.isDestroyed()) {
      this.currentWindow.destroy();
    }
    
    this.currentWindow = null;
    this.currentOnClick = null;
    this.clearTimers();
  }

  /**
   * 내부 타이머 해제
   */
  clearTimers() {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = null;
    }
    if (this.destroyBackupTimer) {
      clearTimeout(this.destroyBackupTimer);
      this.destroyBackupTimer = null;
    }
    if (this.nextShowTimer) {
      clearTimeout(this.nextShowTimer);
      this.nextShowTimer = null;
    }
  }
}

// 알림 클릭 이벤트 핸들러 노출
const notificationWindowInstance = new NotificationWindow();

// IPC 이벤트 리스너 등록 (main.js에서 사용하기 위해)
if (typeof module !== 'undefined' && module.exports) {
  const { ipcMain } = require('electron');
  
  ipcMain.on('notification-clicked', () => {
    notificationWindowInstance.handleClick();
  });
}

module.exports = notificationWindowInstance;
