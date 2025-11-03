'use client';

import React from 'react';
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

  if (!isElectron || !updateAvailable || !showNotification) {
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

