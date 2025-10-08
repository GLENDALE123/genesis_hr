/**
 * Tauri 네이티브 알림 서비스
 * Windows 7 환경에서 안정적으로 작동하는 알림 시스템
 */

import { 
  isPermissionGranted, 
  requestPermission, 
  sendNotification 
} from '@tauri-apps/api/notification';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
}

export class TauriNotificationService {
  private static permissionGranted: boolean | null = null;

  /**
   * 알림 권한 초기화 (앱 시작 시 1회 호출)
   */
  static async init(): Promise<boolean> {
    // 이미 권한 체크를 했다면 캐시된 값 반환
    if (this.permissionGranted !== null) {
      return this.permissionGranted;
    }

    try {
      // Tauri 환경인지 확인
      if (!this.isTauriEnvironment()) {
        console.warn('Tauri 환경이 아닙니다. 알림이 비활성화됩니다.');
        this.permissionGranted = false;
        return false;
      }

      // 이미 권한이 있는지 확인
      let granted = await isPermissionGranted();
      
      // 권한이 없으면 요청
      if (!granted) {
        const permission = await requestPermission();
        granted = permission === 'granted';
      }

      this.permissionGranted = granted;
      
      if (!granted) {
        console.warn('사용자가 알림 권한을 거부했습니다.');
      }

      return granted;
    } catch (error) {
      console.error('알림 권한 초기화 실패:', error);
      this.permissionGranted = false;
      return false;
    }
  }

  /**
   * 네이티브 알림 표시
   */
  static async show(
    title: string, 
    body: string, 
    icon?: string
  ): Promise<void> {
    try {
      const granted = await this.init();
      
      if (!granted) {
        console.warn('알림 권한이 없어 알림을 표시할 수 없습니다.');
        return;
      }

      await sendNotification({
        title,
        body,
        icon: icon || undefined,
      });

      console.log('알림 표시 성공:', { title, body });
    } catch (error) {
      console.error('알림 표시 실패:', error);
    }
  }

  /**
   * Tauri 환경인지 확인
   */
  static isTauriEnvironment(): boolean {
    return typeof window !== 'undefined' && '__TAURI__' in window;
  }

  /**
   * 권한 상태 초기화 (테스트용)
   */
  static resetPermission(): void {
    this.permissionGranted = null;
  }
}


