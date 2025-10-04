'use client';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { logout } from '@/shared/services/firebase/auth';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-card shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-3xl font-bold text-foreground mb-6">
              HS Next App에 오신 것을 환영합니다!
            </h1>
            
            <div className="bg-muted rounded-lg p-4 mb-6">
              <h2 className="text-lg font-medium text-foreground mb-2">사용자 정보</h2>
              <div className="space-y-2 text-muted-foreground">
                <p><span className="font-medium text-foreground">이메일:</span> {user.email}</p>
                <p><span className="font-medium text-foreground">사용자 ID:</span> {user.uid}</p>
                {user.displayName && (
                  <p><span className="font-medium text-foreground">이름:</span> {user.displayName}</p>
                )}
                <p><span className="font-medium text-foreground">가입일:</span> {user.metadata.creationTime}</p>
              </div>
            </div>

            <div className="bg-accent rounded-lg p-4 mb-6">
              <h2 className="text-lg font-medium text-accent-foreground mb-2">Firebase 서비스 상태</h2>
              <div className="space-y-2 text-accent-foreground">
                <p>✅ Firebase Authentication - 연결됨</p>
                <p>✅ Firebase Firestore - 준비됨</p>
                <p>✅ Firebase Storage - 준비됨</p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleLogout}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium py-2 px-4 rounded-md transition-colors"
              >
                로그아웃
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-4 rounded-md transition-colors"
              >
                대시보드로 이동
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
