'use client';

import { useEffect } from 'react';
import { LoginForm } from "@/features/auth"

export default function Page() {
  useEffect(() => {
    // Electron 환경에서 로그인 페이지용 작은 윈도우 크기로 조정
    if (typeof window !== 'undefined' && window.__ELECTRON__ && window.electron) {
      window.electron.window.resize({
        width: 550,
        height: 650,
        center: true
      }).then(() => {
        console.log('🔧 로그인 페이지 윈도우 크기 조정: 550x650');
      }).catch((err) => {
        console.error('❌ 윈도우 크기 조정 실패:', err);
      });
    }

    // 컴포넌트 언마운트 시 전체화면으로 전환 (로그인 성공 시)
    return () => {
      if (typeof window !== 'undefined' && window.__ELECTRON__ && window.electron) {
        // 로그인 성공 후 대시보드로 이동하면 전체화면으로 전환
        setTimeout(() => {
          window.electron?.window.maximize();
          console.log('🔧 전체화면으로 전환');
        }, 100);
      }
    };
  }, []);

  return (
    <div className="flex h-full w-full items-center justify-center p-6 md:p-10 overflow-y-auto">
      <div className="w-full max-w-sm my-auto">
        <LoginForm />
      </div>
    </div>
  )
}
