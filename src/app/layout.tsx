import type { Metadata } from "next";
import "./globals.css";
import React from "react";
import { AuthProvider } from "@/features/auth";
import { Toaster } from "@/shared/components/ui/sonner";
import { ConditionalLayout } from "@/shared/components/layout";
import { ClientThemeProvider, NetworkStatusProvider, NotificationContainer, NotificationProviderWrapper } from "@/shared/components/common";
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
              <NotificationProviderWrapper>
                <AppStateProvider>
                  <ConditionalLayout>
                    {children}
                  </ConditionalLayout>
                  <Toaster />
                  <NotificationContainer position="bottom-right" />
                </AppStateProvider>
              </NotificationProviderWrapper>
            </AuthProvider>
          </NetworkStatusProvider>
        </ClientThemeProvider>
      </body>
    </html>
  );
}
