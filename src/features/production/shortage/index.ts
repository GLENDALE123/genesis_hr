/**
 * Shortage 서브모듈 진입점
 */

// Components
export { ShortageManagementListView } from './components/ShortageManagementListView';
export { ShortageRequestDetail } from './components/ShortageRequestDetail';
export { ShortageRequestModal } from './components/ShortageRequestModal';
export { ShortageRequestTable } from './components/ShortageRequestTable';

// Containers
export { ShortageManagementContainer } from './containers/ShortageManagementContainer';

// Services
export {
  createShortageRequest,
  updateShortageRequest,
  updateShortageStatus,
  deleteShortageRequest,
  getShortageRequestByReportId,
  getAllShortageRequests,
  subscribeToShortageRequests,
} from './services/shortageService';

// Hooks
export { useShortageRequests } from './hooks/useShortageRequests';

// Store
export { useShortageRequestsStore } from './store/shortageRequestsStore';

// Types
export type {
  ShortageRequest,
} from './types/shortage.types';

