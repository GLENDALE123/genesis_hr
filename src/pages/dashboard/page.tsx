import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { useIsAdmin } from '@/features/auth/hooks';
import { Card, CardContent } from '@/shared/components/ui/card';

export default function DashboardPage() {
  const isAdmin = useIsAdmin();

  return (
    <ProtectedRoute>
      <div className="space-y-6 max-w-7xl mx-auto p-6">
        {/* Admin이 아닐 경우 준비중 메시지 표시 */}
        {!isAdmin && (
          <Card className="mt-8">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-semibold text-muted-foreground">
                  현재 대시보드 준비중입니다
                </h2>
                <p className="text-sm text-muted-foreground">
                  대시보드는 관리자만 이용할 수 있습니다.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin 전용 대시보드 내용 */}
        {isAdmin && (
          <div className="mt-8">
            {/* 대시보드 구현 예정 */}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
