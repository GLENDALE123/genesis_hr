'use client';

import React, { useEffect } from 'react';
import { useElectronUpdater } from '@/shared/hooks/useElectronUpdater';
import { UpdateNotification } from './UpdateNotification';

export const UpdateNotificationContainer: React.FC = () => {
  const {
    isElectron,
    updateAvailable,
    downloading,
    downloadProgress,
    downloaded,
    showNotification,
    handleUpdateNow,
    handleRemindLater,
    handleCloseNotification,
  } = useElectronUpdater();

  // 디버깅 로그
  useEffect(() => {
    console.log('[UpdateNotificationContainer] 상태:', {
      updateAvailable,
      showNotification,
      downloading,
      downloadProgress,
    });
  }, [updateAvailable, showNotification, downloading, downloadProgress]);

  // Electron 환경이 아니면 렌더링하지 않음 (테스트 제외)
  // 테스트 함수로 호출된 경우는 Electron 체크 무시 (UI 테스트용)
  const isTestMode = typeof window !== 'undefined' && 
    (window as any).__TEST_UPDATE_NOTIFICATION__ !== undefined &&
    showNotification;

  if (!isElectron && !isTestMode) {
    console.log('[UpdateNotificationContainer] Electron 환경이 아니므로 렌더링 안함');
    return null;
  }

  // 업데이트 정보가 있고 알림을 표시해야 하면 렌더링
  if (!updateAvailable || !showNotification) {
    console.log('[UpdateNotificationContainer] 렌더링 안함:', {
      updateAvailable: !!updateAvailable,
      showNotification,
      isElectron,
      isTestMode,
    });
    return null;
  }

  console.log('[UpdateNotificationContainer] 렌더링:', updateAvailable, 'isElectron:', isElectron);
  return (
    <UpdateNotification
      notification={updateAvailable}
      onClose={handleCloseNotification}
      onUpdateNow={handleUpdateNow}
      onRemindLater={handleRemindLater}
      downloading={downloading}
      downloadProgress={downloadProgress}
    />
  );
};

