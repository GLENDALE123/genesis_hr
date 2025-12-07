import React from 'react';
import { routes } from './app/routes';
import { AuthProvider } from '@/features/auth';
import { Toaster } from '@/shared/components/ui/sonner';
import { ConditionalLayout } from '@/shared/components/layout';
import { ClientThemeProvider, NetworkStatusProvider, NotificationContainer, NotificationProviderWrapper, ElectronNavigationHandler, FontSizeProvider, UpdateNotificationContainer } from '@/shared/components/common';
import { ErrorBoundary } from '@/shared/components/common/ErrorBoundary';
import { AppStateProvider } from '@/shared/components/layout/AppStateProvider';
import { useStorageOptimizer } from '@/shared/utils/cache/storageOptimizer';

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
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // 에러 리포팅 (필요시 외부 서비스로 전송)
        console.error('❌ [App] 전역 에러:', error, errorInfo);
      }}
    >
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;
