import React from 'react';
<<<<<<< HEAD
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


=======
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/features/auth';
import { Toaster } from '@/shared/components/ui/sonner';
import { 
  ClientThemeProvider, 
  NetworkStatusProvider, 
  NotificationContainer, 
  NotificationProviderWrapper, 
  ElectronNavigationHandler, 
  FontSizeProvider, 
  UpdateNotificationContainer 
} from '@/shared/components/common';
import { AppStateProvider } from '@/shared/components/layout/AppStateProvider';
import { ConditionalLayout } from '@/shared/components/layout';

// 페이지 컴포넌트
import LoginPage from '@/pages/login/page';
import DashboardPage from '@/pages/dashboard/page';
import AnnouncementsPage from '@/pages/announcements/page';
import ChatPage from '@/pages/chat/page';
import JigManagementPage from '@/pages/jig/management/page';
import JigMasterListPage from '@/pages/jig/master-list/page';
import ProductionDailyReportPage from '@/pages/production/daily-report/page';
import ProductionSchedulePage from '@/pages/production/schedule/page';
import ProductionManagementPage from '@/pages/production/management/page';
import ProductionShortageManagementPage from '@/pages/production/shortage-management/page';
import QualityIssuesPage from '@/pages/quality/issues/page';
import QualityHistoryPage from '@/pages/quality/history/page';
import SampleCenterPage from '@/pages/sample-center/page';
import SampleCenterRequestsPage from '@/pages/sample-center/requests/page';
import SettingsPage from '@/pages/settings/page';
import WorkSchedulePage from '@/pages/work-schedule/page';

const App: React.FC = () => {
  return (
    <ClientThemeProvider>
      <NetworkStatusProvider>
        <AuthProvider>
          <FontSizeProvider>
            <NotificationProviderWrapper>
              <AppStateProvider>
                <ElectronNavigationHandler />
                <ConditionalLayout>
                  <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/announcements" element={<AnnouncementsPage />} />
                    
                    <Route path="/chat" element={<ChatPage />} />
                    <Route path="/chat/:id" element={<ChatPage />} />
                    
                    <Route path="/jig" element={<Navigate to="/jig/management" replace />} />
                    <Route path="/jig/management" element={<JigManagementPage />} />
                    <Route path="/jig/master-list" element={<JigMasterListPage />} />
                    
                    <Route path="/production" element={<Navigate to="/production/daily-report" replace />} />
                    <Route path="/production/daily-report" element={<ProductionDailyReportPage />} />
                    <Route path="/production/schedule" element={<ProductionSchedulePage />} />
                    <Route path="/production/management" element={<ProductionManagementPage />} />
                    <Route path="/production/shortage-management" element={<ProductionShortageManagementPage />} />
                    
                    <Route path="/quality" element={<Navigate to="/quality/issues" replace />} />
                    <Route path="/quality/issues" element={<QualityIssuesPage />} />
                    <Route path="/quality/history" element={<QualityHistoryPage />} />
                    
                    <Route path="/sample-center" element={<SampleCenterPage />} />
                    <Route path="/sample-center/requests" element={<SampleCenterRequestsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/work-schedule" element={<WorkSchedulePage />} />
                    
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
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
};

export default App;
>>>>>>> develop
