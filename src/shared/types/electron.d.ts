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
    body: string;
    icon?: string;
  }) => Promise<{ success: boolean; error?: string }>;

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

