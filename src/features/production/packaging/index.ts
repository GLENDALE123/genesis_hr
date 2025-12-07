/**
 * Packaging 서브모듈 진입점
 */

// Components
export { PackagingReportForm } from './components/PackagingReportForm';
export { PackagingReportListView } from './components/PackagingReportListView';
export { PackagingReportStats } from './components/PackagingReportStats';
export { LogisticsTransferModal } from './components/LogisticsTransferModal';
export type { LogisticsTransferData } from './components/LogisticsTransferModal';

// Containers
export { PackagingDailyReportContainer } from './containers/PackagingDailyReportContainer';

// Services
export { PackagingReportsService } from './services/packagingReportsService';
export { createLogisticsRequest } from './services/logisticsService';

// Hooks
export { usePackagingReports } from './hooks/usePackagingReports';
export { usePackagingForm } from './hooks/usePackagingForm';
export { usePackagingCalculations } from './hooks/usePackagingCalculations';
export { usePackagingReportFilters } from './hooks/usePackagingReportFilters';

// Store
export { usePackagingReportsStore } from './store/packagingReportsStore';

// Types
export type {
  PackagingReport,
  PackagingFormData,
  PackagedBox,
  PackagedBoxFormData,
  ProcessCoat,
  ProductionStatus,
  ExcelProductionReport,
  ProductionReportFilter,
  ProductionReportStatsData,
} from './types/packaging.types';

export type {
  LogisticsRequest,
} from './types/logistics.types';

export {
  ProductionRequestType,
  ProductionRequestStatus,
} from './types/logistics.types';

