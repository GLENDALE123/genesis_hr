/**
 * Products 서브모듈 진입점
 */

// Components
export { ProductManagementView } from './components/ProductManagementView';
export { ProductManagementTable } from './components/ProductManagementTable';
export { ProductDetailModal } from './components/ProductDetailModal';

// Services
export {
  generateProductId,
  getProductDetail,
} from './services/productService';

export {
  getAIReport,
  generateAIReportInBackground,
  analyzeProductionTrend,
} from './services/productAIService';

// Hooks
export { useProducts } from './hooks/useProducts';
export { useProductDetail } from './hooks/useProductDetail';
export { useProductAIReport } from './hooks/useProductAIReport';

// Types
export type {
  Product,
  ProductDetail,
  ProductionHistoryItem,
  CoatingHistoryItem,
  MemoItem,
  ShortageHistoryItem,
  QualityIssueItem,
  QualityInspectionItem,
  JigHistoryItem,
  ProductionTrendData,
  AIReport,
} from './types/product.types';















