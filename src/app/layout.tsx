import type { Metadata } from "next";
import "./globals.css";
import React from "react";
import { Inter } from 'next/font/google';
import { AuthProvider } from "@/features/auth";
import { Toaster } from "@/shared/components/ui/sonner";
import { ConditionalLayout } from "@/shared/components/layout";
import { ClientThemeProvider, NetworkStatusProvider, NotificationContainer, NotificationProviderWrapper, ElectronNavigationHandler, FontSizeProvider } from "@/shared/components/common";
import { AppStateProvider } from "@/shared/components/layout/AppStateProvider";

// 폰트 최적화 설정
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
});

export const metadata: Metadata = {
  title: "HS Next App",
  description: "Next.js app with Firebase integration",
};



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`overflow-x-hidden ${inter.variable}`}>
      <head>
        {/* 테마 깜빡임 방지를 위한 스크립트 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                // 테마 초기화
                const theme = localStorage.getItem('hs-next-theme') || 'system';
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                const resolvedTheme = theme === 'system' ? systemTheme : theme;
                
                if (resolvedTheme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
                
                // 인증 상태 초기화
                const authData = localStorage.getItem('auth-store');
                if (authData) {
                  try {
                    const parsed = JSON.parse(authData);
                    if (parsed.state && parsed.state.user) {
                      // 인증된 사용자가 있으면 로딩 상태로 설정
                      window.__AUTH_INITIAL_STATE__ = {
                        user: parsed.state.user,
                        isLoading: true,
                        error: null
                      };
                    }
                  } catch (e) {
                  }
                }
              } catch (e) {
                // localStorage 접근 실패 시 기본 테마 사용
                document.documentElement.classList.remove('dark');
              }
            `,
          }}
        />
      </head>
      <body className="antialiased overflow-x-hidden font-sans">
        <ClientThemeProvider>
          <NetworkStatusProvider>
            <AuthProvider>
              <FontSizeProvider>
                <NotificationProviderWrapper>
                  <AppStateProvider>
                    <ElectronNavigationHandler />
                    <ConditionalLayout>
                      {children}
                    </ConditionalLayout>
                    <Toaster />
                    <NotificationContainer position="bottom-right" />
                  </AppStateProvider>
                </NotificationProviderWrapper>
              </FontSizeProvider>
            </AuthProvider>
          </NetworkStatusProvider>
        </ClientThemeProvider>
      </body>
    </html>
  );
}
