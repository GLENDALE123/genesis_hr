// Production Feature Exports

// Types
export type {
  PackagingReport,
  PackagedBox,
  ProcessCoat,
  ExcelProductionReport,
  PackagingFormData,
  ProductionReportFilter,
  ProductionReportStatsData,
  ProductionSchedule,
  ShortageRequest
} from './types';

// Components
export { PackagingReportListView } from './components/PackagingReportListView';
export { PackagingReportForm } from './components/PackagingReportForm';
export { PackagingReportStats } from './components/PackagingReportStats';
export { ProcessConditionsModal } from './components/ProcessConditionsModal';
export { MemoModal } from './components/MemoModal';
export { ProductionManagementCenter } from './components/ProductionManagementCenter';
export { ProductionRequestFormModal } from './components/ProductionRequestFormModal';
export { ProductionRequestDetailModal } from './components/ProductionRequestDetailModal';
export { ProductionScheduleListView } from './components/ProductionScheduleListView';
export { ProductionScheduleUploadModal } from './components/ProductionScheduleUploadModal';
export { ShortageManagementListView } from './components/ShortageManagementListView';

// Containers
export { PackagingDailyReportContainer } from './containers/PackagingDailyReportContainer';

// Hooks
export { usePackagingReports } from './hooks/usePackagingReports';
export { usePackagingReportFilters } from './hooks/usePackagingReportFilters';
export { usePackagingForm } from './hooks/usePackagingForm';
export { usePackagingCalculations } from './hooks/usePackagingCalculations';
export { useProductionSchedules } from './hooks/useProductionSchedules';

// Services
export { PackagingReportsService } from './services/packagingReportsService';
export { ProductionRequestService, ProductionRequestType, ProductionRequestStatus } from './services/productionRequestService';
export type { ProductionRequest } from './services/productionRequestService';
export * as ProductionScheduleService from './services/productionScheduleService';
export * as ShortageService from './services/shortageService';

// Production Request Hooks
export { useProductionRequests } from './hooks/useProductionRequests';

// Utils
export { 
  getUserDisplayName, 
  formatOrderNumber, 
  getStatusColorClass,
  hasUnreadComments 
} from './utils/productionUtils';

// Constants
export { TABLE_CELL_STYLES, TABLE_HEAD_STYLES } from './constants/tableStyles';
