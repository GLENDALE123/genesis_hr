import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/features/auth";
import { Toaster } from "@/shared/components/ui/sonner";
import { ConditionalLayout } from "@/shared/components/layout";
import { FCMProvider } from "@/shared/components/common";
import { ThemeProvider } from "next-themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <html lang="ko" className="overflow-x-hidden">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <AuthProvider>
            <FCMProvider>
              <ConditionalLayout>
                {children}
              </ConditionalLayout>
              <Toaster />
            </FCMProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
