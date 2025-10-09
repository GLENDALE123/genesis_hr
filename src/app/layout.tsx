import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/features/auth";
import { Toaster } from "@/shared/components/ui/sonner";
import { ConditionalLayout } from "@/shared/components/layout";
import { ClientThemeProvider, NotificationProvider, NetworkStatusProvider, NotificationContainer, FCMNotificationHandler, SystemTrayManager } from "@/shared/components/common";
import { AppStateProvider } from "@/shared/components/layout/AppStateProvider";

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
    <html lang="ko" className="overflow-x-hidden">
      <body className="antialiased overflow-x-hidden">
        <ClientThemeProvider>
          <NetworkStatusProvider>
            <AuthProvider>
              <NotificationProvider>
                <AppStateProvider>
                  <SystemTrayManager />
                  <FCMNotificationHandler />
                  <ConditionalLayout>
                    {children}
                  </ConditionalLayout>
                  <Toaster />
                  {/* 전역 알림 컨테이너 - 타우리 환경에서 우측 하단에 표시 */}
                  <NotificationContainer position="bottom-right" />
                </AppStateProvider>
              </NotificationProvider>
            </AuthProvider>
          </NetworkStatusProvider>
        </ClientThemeProvider>
      </body>
    </html>
  );
}
