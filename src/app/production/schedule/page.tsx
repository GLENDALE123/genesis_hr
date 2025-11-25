import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { ProductionScheduleListView } from '@/features/production/components/ProductionScheduleListView';

// Zustand persist 미들웨어가 localStorage 사용
const ProductionSchedulePageContent = () => {
  return (
    <ProtectedRoute>
      <ProductionScheduleListView />
    </ProtectedRoute>
  );
};

export default ProductionSchedulePageContent;