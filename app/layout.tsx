import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Space_Grotesk } from "next/font/google";

import "./globals.css";

import { AppToaster } from "@/components/ui/sonner-toaster";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Header } from "@/components/layout/header";

const font = Space_Grotesk({ subsets: ["latin"], display: "swap", variable: "--font-sans" });

export const metadata: Metadata = {
  title: "AI Mentor — Learn Anything, From Anyone, Anytime",
  description: "AI Mentor transforms any video or topic into an interactive tutor with Gemini 2.0 Flash.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${font.variable} min-h-screen bg-background font-sans text-foreground`}>
          <ThemeProvider>
            <Header />
            <main className="container pb-20 pt-10">{children}</main>
            <AppToaster />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
