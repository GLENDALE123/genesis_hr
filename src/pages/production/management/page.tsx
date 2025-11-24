<<<<<<< HEAD:src/app/production/management/page.tsx

=======
>>>>>>> develop:src/pages/production/management/page.tsx
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



