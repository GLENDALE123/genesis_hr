import { ProductManagementView } from '@/features/production';
import { ProtectedRoute } from '@/shared/components/auth';

export default function ProductManagementPage() {
  return (
    <ProtectedRoute>
      <div className="h-full">
        <ProductManagementView />
      </div>
    </ProtectedRoute>
  );
}





