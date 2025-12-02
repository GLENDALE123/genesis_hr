import React from 'react';
import { routes } from './app/routes';
import { AuthProvider } from '@/features/auth';
import { Toaster } from '@/shared/components/ui/sonner';
import { ConditionalLayout } from '@/shared/components/layout';
import { ClientThemeProvider, NetworkStatusProvider, NotificationContainer, NotificationProviderWrapper, ElectronNavigationHandler, FontSizeProvider, UpdateNotificationContainer } from '@/shared/components/common';
import { AppStateProvider } from '@/shared/components/layout/AppStateProvider';
import { useStorageOptimizer } from '@/shared/utils/storageOptimizer';

function AppContent() {
  // localStorage 자동 정리 활성화
  useStorageOptimizer();

  return (
    <ClientThemeProvider>
      <NetworkStatusProvider>
        <AuthProvider>
          <FontSizeProvider>
            <NotificationProviderWrapper>
              <AppStateProvider>
                <ElectronNavigationHandler />
                <ConditionalLayout>
                  {routes}
                </ConditionalLayout>
                <Toaster />
                <NotificationContainer position="bottom-right" />
                <UpdateNotificationContainer />
              </AppStateProvider>
            </NotificationProviderWrapper>
          </FontSizeProvider>
        </AuthProvider>
      </NetworkStatusProvider>
    </ClientThemeProvider>
  );
}

function App() {
  return <AppContent />;
}

export default App;
