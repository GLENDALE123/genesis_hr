import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/features/auth";
import { Toaster } from "@/shared/components/ui/sonner";
import { ConditionalLayout } from "@/shared/components/layout";
import { FCMProvider, ClientThemeProvider, TauriNotificationProvider, NetworkStatusProvider } from "@/shared/components/common";

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
              <FCMProvider>
                <TauriNotificationProvider>
                  <ConditionalLayout>
                    {children}
                  </ConditionalLayout>
                  <Toaster />
                </TauriNotificationProvider>
              </FCMProvider>
            </AuthProvider>
          </NetworkStatusProvider>
        </ClientThemeProvider>
      </body>
    </html>
  );
}
