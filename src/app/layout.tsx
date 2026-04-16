import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "SaaSMail",
  description: "Multi-tenant Resend-powered email platform built with Next.js 15.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={manrope.variable}>
        <script
          dangerouslySetInnerHTML={{
            __html: `try { const theme = localStorage.getItem('theme'); if (theme === 'dark') document.documentElement.classList.add('dark'); } catch {}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
