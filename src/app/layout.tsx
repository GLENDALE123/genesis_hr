// Metadata removed - using index.html instead
import "./globals.css";
import React from "react";
// Font loading removed - using CSS instead
import { AuthProvider } from "@/features/auth";
import { Toaster } from "@/shared/components/ui/sonner";
import { ConditionalLayout } from "@/shared/components/layout";
import { ClientThemeProvider, NetworkStatusProvider, NotificationContainer, NotificationProviderWrapper, ElectronNavigationHandler, FontSizeProvider, UpdateNotificationContainer } from "@/shared/components/common";
import { AppStateProvider } from "@/shared/components/layout/AppStateProvider";

// Font loading removed - using CSS instead

// Metadata removed - using index.html instead



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="overflow-x-hidden" suppressHydrationWarning>
      <head>
        {/* 테마 깜빡임 방지를 위한 스크립트 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // 테마 초기화 (hydration mismatch 방지)
                  const theme = localStorage.getItem('hs-next-theme') || 'system';
                  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  const resolvedTheme = theme === 'system' ? systemTheme : theme;
                  
                  // 즉시 적용하여 깜빡임 방지
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
                        window.__AUTH_INITIAL_STATE__ = {
                          user: parsed.state.user,
                          isLoading: false,
                          error: null
                        };
                      }
                    } catch (e) {
                      // JSON 파싱 실패 무시
                    }
                  }
                } catch (e) {
                  // localStorage 접근 실패 시 기본 테마 사용
                  document.documentElement.classList.remove('dark');
                }
              })();
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
                    <UpdateNotificationContainer />
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

