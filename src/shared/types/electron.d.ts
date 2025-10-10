/**
 * Electron API 타입 정의
 */

export interface ElectronAPI {
  /**
   * 플랫폼 정보
   */
  platform: string;

  /**
   * 버전 정보
   */
  versions: {
    electron: string;
    chrome: string;
    node: string;
  };

  /**
   * 알림 표시
   */
  showNotification: (options: {
    title: string;
    subtitle?: string;
    body: string;
    icon?: string;
    senderName?: string;
    senderAvatar?: string | null;
    timestamp?: string;
    centerInfo?: string;
    link?: string | null; // 알림 클릭 시 이동할 링크
    useCustom?: boolean; // true: 커스텀 윈도우, false: 네이티브 알림
  }) => Promise<{ success: boolean; type?: 'custom' | 'native'; error?: string }>;

  /**
   * 개발 모드 여부
   */
  isDev: boolean;

  /**
   * 윈도우 컨트롤
   */
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
    resize: (options: { width: number; height: number; center?: boolean }) => Promise<{ success: boolean }>;
    getSize: () => Promise<{ width: number; height: number } | null>;
  };

  /**
   * 알림 클릭 시 네비게이션 이벤트 수신
   * @param callback - 링크를 받아서 처리할 콜백 함수
   * @returns 리스너 제거 함수
   */
  onNavigateTo: (callback: (link: string) => void) => (() => void);
}

declare global {
  interface Window {
    /**
     * Electron API (preload 스크립트에서 주입)
     */
    electron?: ElectronAPI;

    /**
     * Electron 환경 감지
     */
    __ELECTRON__?: boolean;
  }
}

export {};

