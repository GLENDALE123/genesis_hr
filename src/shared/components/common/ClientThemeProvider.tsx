'use client';

import { ThemeProvider } from 'next-themes';
import { useEffect, useState } from 'react';

interface ClientThemeProviderProps {
  children: React.ReactNode;
}

export function ClientThemeProvider({ children }: ClientThemeProviderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 서버 사이드에서는 기본 테마로 렌더링 (hydration mismatch 방지)
  if (!mounted) {
    return <>{children}</>;
  }

  // 클라이언트 사이드에서는 ThemeProvider 사용
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
