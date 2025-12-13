import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { Card, CardContent } from '@/shared/components/ui/card';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div className="w-full h-full flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-semibold text-muted-foreground">
                대시보드 준비중
              </h2>
              <p className="text-sm text-muted-foreground">
                대시보드 기능이 곧 제공될 예정입니다.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}



