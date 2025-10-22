import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { cn } from "@/lib/utils";
import { Plus_Jakarta_Sans } from "next/font/google";

const font = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "AI Doctor | Your Smart Health Companion",
  description: "Consult with the AI Doctor, track your wellness goals, and generate actionable reports in one secure hub.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={cn("min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-white", font.className)}>
          <ThemeProvider>
            <div className="flex min-h-screen flex-col">
              <Navbar />
              <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
                {children}
              </main>
            </div>
            <Toaster />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
