'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseDate?: string;
}

interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
}

// 전역 상태 저장 (모든 인스턴스가 공유)
let globalUpdateState = {
  updateAvailable: null as UpdateInfo | null,
  downloading: false,
  downloadProgress: 0,
  downloaded: false,
  showNotification: false,
};

// 전역 상태 변경 리스너
const stateListeners: Set<() => void> = new Set();

function notifyStateChange() {
  stateListeners.forEach(listener => listener());
}

export function useElectronUpdater() {
  const [isElectron, setIsElectron] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(globalUpdateState.updateAvailable);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloaded, setDownloaded] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('0.1.0');
  const [checking, setChecking] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  
  // 30분 후 체크를 위한 타이머 ref
  const remindLaterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 전역 상태 동기화
  useEffect(() => {
    const syncState = () => {
      console.log('[useElectronUpdater] 상태 동기화:', globalUpdateState);
      setUpdateAvailable(globalUpdateState.updateAvailable);
      setDownloading(globalUpdateState.downloading);
      setDownloadProgress(globalUpdateState.downloadProgress);
      setDownloaded(globalUpdateState.downloaded);
      setShowNotification(globalUpdateState.showNotification);
    };

    stateListeners.add(syncState);
    console.log('[useElectronUpdater] 리스너 등록, 현재 리스너 수:', stateListeners.size);
    syncState(); // 초기 동기화

    return () => {
      stateListeners.delete(syncState);
      console.log('[useElectronUpdater] 리스너 제거');
    };
  }, []);

  // Electron 환경 확인
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsElectron((window as any).__ELECTRON__ === true);
    }
  }, []);

  // 업데이트 이벤트 리스너 등록
  useEffect(() => {
    if (!isElectron || !(window as any).electron?.updater) return;

    const updater = (window as any).electron.updater;

    // 새 버전 사용 가능
    const removeAvailable = updater.onUpdateAvailable?.((data: UpdateInfo) => {
      console.log('새 버전 발견:', data);
      globalUpdateState.updateAvailable = data;
      globalUpdateState.showNotification = true;
      globalUpdateState.downloading = false;
      globalUpdateState.downloadProgress = 0;
      globalUpdateState.downloaded = false;
      notifyStateChange();
    });

    // 다운로드 진행률
    const removeProgress = updater.onUpdateDownloadProgress?.((progress: DownloadProgress) => {
      globalUpdateState.downloadProgress = progress.percent;
      
      if (progress.percent === 100) {
        globalUpdateState.downloading = false;
        globalUpdateState.downloaded = true;
      }
      notifyStateChange();
    });

    // 다운로드 완료 - 자동으로 설치 및 재시작
    const removeDownloaded = updater.onUpdateDownloaded?.((data: UpdateInfo) => {
      console.log('다운로드 완료:', data);
      globalUpdateState.downloading = false;
      globalUpdateState.downloaded = true;
      globalUpdateState.downloadProgress = 100;
      notifyStateChange();
      
      // 자동으로 설치 및 재시작 (사용자 동의 없이)
      setTimeout(async () => {
        if ((window as any).electron?.updater) {
          try {
            console.log('[Updater] 자동 설치 및 재시작 시작');
            const result = await (window as any).electron.updater.installUpdate();
            if (!result.success) {
              console.error('[Updater] 자동 설치 실패:', result.error);
            }
          } catch (error: any) {
            console.error('[Updater] 자동 설치 오류:', error);
          }
        }
      }, 1000); // 1초 후 자동 설치 (사용자에게 완료 메시지를 볼 시간 제공)
    });

    // 에러
    const removeError = updater.onUpdateError?.((data: { message: string }) => {
      console.error('업데이트 오류:', data);
      globalUpdateState.downloading = false;
      notifyStateChange();
    });

    return () => {
      removeAvailable?.();
      removeProgress?.();
      removeDownloaded?.();
      removeError?.();
    };
  }, [isElectron]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (remindLaterTimerRef.current) {
        clearTimeout(remindLaterTimerRef.current);
      }
    };
  }, []);

  // 업데이트 체크
  const checkForUpdates = useCallback(async (showToast = false) => {
    if (!isElectron || !(window as any).electron?.updater) {
      return;
    }

    setChecking(true);
    try {
      const result = await (window as any).electron.updater.checkForUpdates();
      return result;
    } catch (error: any) {
      console.error('업데이트 체크 실패:', error);
    } finally {
      setChecking(false);
    }
  }, [isElectron]);

  // 업데이트 다운로드
  const handleDownloadUpdate = useCallback(async () => {
    if (!isElectron || !(window as any).electron?.updater) return;

    globalUpdateState.downloading = true;
    globalUpdateState.downloadProgress = 0;
    notifyStateChange();

    try {
      const result = await (window as any).electron.updater.downloadUpdate();
      
      if (!result.success) {
        globalUpdateState.downloading = false;
        notifyStateChange();
      }
    } catch (error: any) {
      console.error('다운로드 실패:', error);
      globalUpdateState.downloading = false;
      notifyStateChange();
    }
  }, [isElectron]);

  // 업데이트 설치 및 재시작
  const handleInstallUpdate = useCallback(async () => {
    if (!isElectron || !(window as any).electron?.updater) return;

    try {
      const result = await (window as any).electron.updater.installUpdate();
      
      if (!result.success) {
        console.error('설치 실패:', result.error);
      }
    } catch (error: any) {
      console.error('설치 실패:', error);
    }
  }, [isElectron]);

  // 나중에 알림 (30분 후 다시 체크)
  const handleRemindLater = useCallback(() => {
    globalUpdateState.showNotification = false;
    notifyStateChange();
    
    // 기존 타이머 취소
    if (remindLaterTimerRef.current) {
      clearTimeout(remindLaterTimerRef.current);
    }
    
    // 30분 후 자동 체크 (30분 = 30 * 60 * 1000ms)
    remindLaterTimerRef.current = setTimeout(() => {
      checkForUpdates();
      remindLaterTimerRef.current = null;
    }, 30 * 60 * 1000);
    
    console.log('[Updater] 30분 후 자동 업데이트 체크 예약됨');
  }, [checkForUpdates]);

  // 알림 닫기
  const handleCloseNotification = useCallback(() => {
    globalUpdateState.showNotification = false;
    notifyStateChange();
  }, []);

  // 지금 업데이트 버튼 클릭
  const handleUpdateNow = useCallback(async () => {
    // Electron 환경에서만 실제 업데이트 기능 사용
    if (!isElectron || !(window as any).electron?.updater) {
      console.warn('[Updater] Electron 환경이 아니므로 업데이트를 실행할 수 없습니다.');
      return;
    }

    if (downloaded) {
      // 다운로드 완료된 경우 설치
      await handleInstallUpdate();
    } else if (!downloading) {
      // 다운로드 시작
      await handleDownloadUpdate();
    }
  }, [isElectron, downloaded, downloading, handleInstallUpdate, handleDownloadUpdate]);

  // 테스트용 함수: 강제로 업데이트 알림 표시
  const testShowUpdateNotification = useCallback((testUpdateInfo?: UpdateInfo) => {
    const mockUpdateInfo: UpdateInfo = testUpdateInfo || {
      version: '0.2.0',
      releaseNotes: '테스트용 업데이트 알림입니다.\n\n- 버그 수정\n- 성능 개선\n- 새로운 기능 추가',
      releaseDate: new Date().toISOString(),
    };
    
    console.log('[Updater] 테스트 업데이트 알림 표시 시작:', mockUpdateInfo);
    console.log('[Updater] 현재 전역 상태:', globalUpdateState);
    console.log('[Updater] 리스너 수:', stateListeners.size);
    
    globalUpdateState.updateAvailable = mockUpdateInfo;
    globalUpdateState.showNotification = true;
    globalUpdateState.downloading = false;
    globalUpdateState.downloadProgress = 0;
    globalUpdateState.downloaded = false;
    
    console.log('[Updater] 업데이트 후 전역 상태:', globalUpdateState);
    notifyStateChange();
    console.log('[Updater] 상태 변경 알림 전송 완료');
  }, []);

  // 테스트용 함수를 전역에 노출
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__TEST_UPDATE_NOTIFICATION__ = testShowUpdateNotification;
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__TEST_UPDATE_NOTIFICATION__;
      }
    };
  }, [testShowUpdateNotification]);

  return {
    isElectron,
    updateAvailable,
    downloading,
    downloadProgress,
    downloaded,
    currentVersion,
    checking,
    showNotification,
    checkForUpdates,
    handleDownloadUpdate,
    handleInstallUpdate,
    handleUpdateNow,
    handleRemindLater,
    handleCloseNotification,
    testShowUpdateNotification,
  };
}

