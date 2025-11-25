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

  // Electron 환경이 아니면 렌더링하지 않음 (테스트 제외)
  // 테스트 함수로 호출된 경우는 Electron 체크 무시 (UI 테스트용)
  const isTestMode = typeof window !== 'undefined' && 
    (window as any).__TEST_UPDATE_NOTIFICATION__ !== undefined &&
    showNotification;

  if (!isElectron && !isTestMode) {
    return null;
  }

  // 업데이트 정보가 있고 알림을 표시해야 하면 렌더링
  if (!updateAvailable || !showNotification) {
    return null;
  }
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

