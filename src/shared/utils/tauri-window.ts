/**
 * Tauri 윈도우 유틸리티 함수
 */

export const TauriWindowUtils = {
  /**
   * Tauri 환경인지 확인
   */
  isTauri(): boolean {
    return typeof window !== 'undefined' && window.__TAURI__ !== undefined;
  },

  /**
   * 윈도우 최대화
   */
  async maximize(): Promise<void> {
    if (!this.isTauri()) return;
    
    try {
      const { appWindow } = await import('@tauri-apps/api/window');
      await appWindow.maximize();
      console.log('✅ Tauri 윈도우 최대화 완료');
    } catch (error) {
      console.error('❌ Tauri 윈도우 최대화 실패:', error);
    }
  },

  /**
   * 윈도우 최소화
   */
  async minimize(): Promise<void> {
    if (!this.isTauri()) return;
    
    try {
      const { appWindow } = await import('@tauri-apps/api/window');
      await appWindow.minimize();
      console.log('✅ Tauri 윈도우 최소화 완료');
    } catch (error) {
      console.error('❌ Tauri 윈도우 최소화 실패:', error);
    }
  },

  /**
   * 윈도우 복원 (최대화 해제)
   */
  async unmaximize(): Promise<void> {
    if (!this.isTauri()) return;
    
    try {
      const { appWindow } = await import('@tauri-apps/api/window');
      await appWindow.unmaximize();
      console.log('✅ Tauri 윈도우 복원 완료');
    } catch (error) {
      console.error('❌ Tauri 윈도우 복원 실패:', error);
    }
  },

  /**
   * 윈도우 크기 설정
   */
  async setSize(width: number, height: number): Promise<void> {
    if (!this.isTauri()) return;
    
    try {
      const { appWindow } = await import('@tauri-apps/api/window');
      const { LogicalSize } = await import('@tauri-apps/api/window');
      await appWindow.setSize(new LogicalSize(width, height));
      console.log(`✅ Tauri 윈도우 크기 설정: ${width}x${height}`);
    } catch (error) {
      console.error('❌ Tauri 윈도우 크기 설정 실패:', error);
    }
  },

  /**
   * 윈도우 중앙 정렬
   */
  async center(): Promise<void> {
    if (!this.isTauri()) return;
    
    try {
      const { appWindow } = await import('@tauri-apps/api/window');
      await appWindow.center();
      console.log('✅ Tauri 윈도우 중앙 정렬 완료');
    } catch (error) {
      console.error('❌ Tauri 윈도우 중앙 정렬 실패:', error);
    }
  },

  /**
   * 윈도우 닫기
   */
  async close(): Promise<void> {
    if (!this.isTauri()) return;
    
    try {
      const { appWindow } = await import('@tauri-apps/api/window');
      await appWindow.close();
      console.log('✅ Tauri 윈도우 닫기 완료');
    } catch (error) {
      console.error('❌ Tauri 윈도우 닫기 실패:', error);
    }
  },

  /**
   * 윈도우 숨기기
   */
  async hide(): Promise<void> {
    if (!this.isTauri()) return;
    
    try {
      const { appWindow } = await import('@tauri-apps/api/window');
      await appWindow.hide();
      console.log('✅ Tauri 윈도우 숨기기 완료');
    } catch (error) {
      console.error('❌ Tauri 윈도우 숨기기 실패:', error);
    }
  },

  /**
   * 윈도우 표시
   */
  async show(): Promise<void> {
    if (!this.isTauri()) return;
    
    try {
      const { appWindow } = await import('@tauri-apps/api/window');
      await appWindow.show();
      console.log('✅ Tauri 윈도우 표시 완료');
    } catch (error) {
      console.error('❌ Tauri 윈도우 표시 실패:', error);
    }
  },

  /**
   * 윈도우가 최대화되어 있는지 확인
   */
  async isMaximized(): Promise<boolean> {
    if (!this.isTauri()) return false;
    
    try {
      const { appWindow } = await import('@tauri-apps/api/window');
      return await appWindow.isMaximized();
    } catch (error) {
      console.error('❌ Tauri 윈도우 최대화 상태 확인 실패:', error);
      return false;
    }
  },

  /**
   * 로그인 시 윈도우 최대화
   */
  async onLogin(): Promise<void> {
    if (!this.isTauri()) return;
    
    console.log('🔐 로그인 완료 - 윈도우 최대화 시작');
    await this.maximize();
  },

  /**
   * 로그아웃 시 윈도우 크기 복원
   */
  async onLogout(): Promise<void> {
    if (!this.isTauri()) return;
    
    console.log('🚪 로그아웃 - 윈도우 크기 복원');
    await this.unmaximize();
    await this.setSize(1280, 800);
    await this.center();
  },
};

