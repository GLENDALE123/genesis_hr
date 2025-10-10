'use client';

import { useEffect } from 'react';
import { LoginForm } from "@/features/auth"
import { useAuthStore } from '@/features/auth/store/authStore';

export default function Page() {
  const { user } = useAuthStore();

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

  return (
    <div className="flex h-full w-full items-center justify-center p-6 md:p-10 overflow-y-auto">
      <div className="w-full max-w-sm my-auto">
        <LoginForm />
      </div>
    </div>
  )
}
