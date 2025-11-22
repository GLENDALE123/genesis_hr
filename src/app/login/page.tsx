
import { useEffect, useState, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm } from "@/features/auth"
import { AccountSelection } from "@/features/auth/components/AccountSelection";
import { useAuthStore } from '@/features/auth/store/authStore';
import { getSavedAccount } from '@/features/auth/utils/savedAccounts';

function LoginPageContent() {
  const { user, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const mode = searchParams.get('mode');
  const emailParam = searchParams.get('email');
  const [hasSavedAccount, setHasSavedAccount] = useState<boolean | null>(null);

  useEffect(() => {
    // 저장된 계정 확인 (user가 변경될 때마다 다시 확인)
    const savedAccount = getSavedAccount();
    setHasSavedAccount(!!savedAccount);
  }, [user]); // user가 변경될 때마다 다시 확인

  // 로그인된 사용자는 즉시 대시보드로 리다이렉트
  useEffect(() => {
    if (!isLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    // 로그인되지 않은 경우에만 작은 윈도우로 조정
    if (!user && typeof window !== 'undefined' && window.__ELECTRON__ && window.electron) {
      window.electron.window.resize({
        width: 550,
        height: 650,
        center: true
      }).then(() => {
      }).catch((err) => {
        console.error('❌ 윈도우 크기 조정 실패:', err);
      });
    }
  }, [user]);

  // 로그인된 사용자는 아무것도 렌더링하지 않음 (리다이렉트 중)
  if (!isLoading && user) {
    return null;
  }

  // 저장된 계정 확인 중이면 로딩
  if (hasSavedAccount === null) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6 md:p-10 overflow-y-auto">
        <div className="w-full max-w-sm my-auto">
          <div className="text-center">로딩 중...</div>
        </div>
      </div>
    );
  }

  // mode가 signin/signup이거나 저장된 계정이 없으면 LoginForm 표시
  // 저장된 계정이 있고 mode가 지정되지 않았으면 AccountSelection 표시
  const showAccountSelection = hasSavedAccount && !mode;

  return (
    <div className="flex h-screen w-full items-center justify-center p-6 md:p-10 overflow-hidden">
      <div className="w-full max-w-sm">
        {showAccountSelection ? (
          <AccountSelection />
        ) : (
          <LoginForm initialEmail={emailParam || undefined} />
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex h-full w-full items-center justify-center p-6 md:p-10 overflow-y-auto">
        <div className="w-full max-w-sm my-auto">
          <div className="text-center">로딩 중...</div>
        </div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}



