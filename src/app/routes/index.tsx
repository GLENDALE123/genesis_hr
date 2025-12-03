import { Routes, Route } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import AnnouncementsPage from '../pages/AnnouncementsPage';
import WorkSchedulePage from '../pages/WorkSchedulePage';
import SettingsPage from '../pages/SettingsPage';
import ProductionDailyReportPage from '../pages/ProductionDailyReportPage';
import ProductionSchedulePage from '../pages/ProductionSchedulePage';
import ProductionManagementPage from '../pages/ProductionManagementPage';
import ProductionShortageManagementPage from '../pages/ProductionShortageManagementPage';
import ProductManagementPage from '../pages/ProductManagementPage';
import QualityIssuesPage from '../pages/QualityIssuesPage';
import QualityHistoryPage from '../pages/QualityHistoryPage';
import SampleCenterPage from '../pages/SampleCenterPage';
import SampleCenterRequestsPage from '../pages/SampleCenterRequestsPage';
import JigManagementPage from '../pages/JigManagementPage';
import JigMasterListPage from '../pages/JigMasterListPage';
import MessagePage from '../pages/MessagePage';

export const routes = (
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="/announcements" element={<AnnouncementsPage />} />
    <Route path="/work-schedule" element={<WorkSchedulePage />} />
    <Route path="/settings" element={<SettingsPage />} />
    
    {/* Workspace/Direct Message Routes */}
    <Route path="/workspace" element={<MessagePage />} />
    {/* Direct Message (1:1 채팅) - /workspace?mode=direct-message 으로 접근 */}
    <Route path="/direct-message" element={<MessagePage />} />
    {/* Legacy routes - 리다이렉트용 */}
    <Route path="/messages" element={<MessagePage />} />
    <Route path="/chat" element={<MessagePage />} />
    
    {/* Production Routes */}
    <Route path="/production/daily-report" element={<ProductionDailyReportPage />} />
    <Route path="/production/schedule" element={<ProductionSchedulePage />} />
    <Route path="/production/management" element={<ProductionManagementPage />} />
    <Route path="/production/shortage-management" element={<ProductionShortageManagementPage />} />
    <Route path="/production/product-management" element={<ProductManagementPage />} />
    
    {/* Quality Routes */}
    <Route path="/quality/issues" element={<QualityIssuesPage />} />
    <Route path="/quality/history" element={<QualityHistoryPage />} />
    
    {/* Sample Center Routes */}
    <Route path="/sample-center" element={<SampleCenterPage />} />
    <Route path="/sample-center/requests" element={<SampleCenterRequestsPage />} />
    
    {/* Jig Routes */}
    <Route path="/jig/management" element={<JigManagementPage />} />
    <Route path="/jig/master-list" element={<JigMasterListPage />} />
  </Routes>
);


