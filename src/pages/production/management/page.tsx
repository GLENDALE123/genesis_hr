import { ProductionManagementCenter } from '@/features/production';
import { ProtectedRoute } from '@/shared/components/auth';

export default function ProductionManagementPage() {
  return (
    <ProtectedRoute>
      <div className="h-full">
        <ProductionManagementCenter />
      </div>
    </ProtectedRoute>
  );
}

