"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Rocket, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

import { ThemeToggle } from "./theme-toggle";

const navItems = [
  { href: "/ai-tutorial", label: "AI Tutorial Chat" },
  { href: "/experts", label: "AI Experts" },
  { href: "/exam", label: "AI Exam" },
  { href: "/summarizer", label: "AI Summarizer" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/profile", label: "Profile" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/70 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-teal-400 text-white shadow-lg">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="text-lg">AI Mentor</span>
          </Link>
          <nav className="hidden items-center gap-3 text-sm font-medium lg:flex">
            {navItems.map((item) => {
              const isActive = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full px-3 py-2 transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/ai-tutorial"
            className="hidden items-center gap-1 rounded-full bg-gradient-to-br from-purple-500 to-teal-400 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl md:flex"
          >
            <Rocket className="h-4 w-4" />
            Explore
          </Link>
          <ThemeToggle />
          <SignedOut>
            <SignInButton mode="modal">
              <button className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-foreground transition hover:border-white/30">
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton appearance={{ variables: { borderRadius: "9999px" } }} afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
