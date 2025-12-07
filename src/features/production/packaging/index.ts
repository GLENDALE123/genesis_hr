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
  ExcelProductionReport,
  ProductionReportFilter,
  ProductionReportStatsData,
} from './types/packaging.types';

// Enum (값으로 사용 가능하도록 일반 export)
export { ProductionStatus } from './types/packaging.types';

export type {
  LogisticsRequest,
} from './types/logistics.types';

// ProductionRequestType과 ProductionRequestStatus는 requests 서브모듈에서 export
// packaging에서 사용할 때는 requests 서브모듈에서 import하도록 변경 필요

