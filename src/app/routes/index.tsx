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
import QualityIssuesPage from '../pages/QualityIssuesPage';
import QualityHistoryPage from '../pages/QualityHistoryPage';
import SampleCenterPage from '../pages/SampleCenterPage';
import SampleCenterRequestsPage from '../pages/SampleCenterRequestsPage';
import JigManagementPage from '../pages/JigManagementPage';
import JigMasterListPage from '../pages/JigMasterListPage';

export const routes = (
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="/announcements" element={<AnnouncementsPage />} />
    <Route path="/work-schedule" element={<WorkSchedulePage />} />
    <Route path="/settings" element={<SettingsPage />} />
    
    {/* Production Routes */}
    <Route path="/production/daily-report" element={<ProductionDailyReportPage />} />
    <Route path="/production/schedule" element={<ProductionSchedulePage />} />
    <Route path="/production/management" element={<ProductionManagementPage />} />
    <Route path="/production/shortage-management" element={<ProductionShortageManagementPage />} />
    
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


