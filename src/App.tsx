import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { routes } from './app/routes';
import { AuthProvider } from '@/features/auth';
import { Toaster } from '@/shared/components/ui/sonner';
import { ConditionalLayout } from '@/shared/components/layout';
import {
  ClientThemeProvider,
  NetworkStatusProvider,
  NotificationContainer,
  NotificationProviderWrapper,
  ElectronNavigationHandler,
  FontSizeProvider,
  UpdateNotificationContainer,
} from '@/shared/components/common';
import { AppStateProvider } from '@/shared/components/layout/AppStateProvider';

function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;


