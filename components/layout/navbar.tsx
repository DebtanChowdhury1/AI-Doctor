'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HeartPulse, Stethoscope } from "lucide-react";

const links = [
  { href: "/consult", label: "Consult" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/goals", label: "Goals" },
  { href: "/reports", label: "Reports" },
  { href: "/profile", label: "Profile" },
];

export function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/90 text-white shadow-lg">
            <Stethoscope className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <p className="text-base">AI Doctor</p>
            <p className="text-xs text-slate-500 dark:text-slate-300">Smart Health Companion</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "transition hover:text-brand",
                pathname === link.href
                  ? "text-brand font-semibold"
                  : "text-slate-600 dark:text-slate-300"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/70 text-slate-700 shadow-sm transition hover:border-brand hover:text-brand dark:border-white/10 dark:bg-slate-900/70 dark:text-white"
            aria-label="Toggle theme"
          >
            <HeartPulse className="h-5 w-5" />
          </button>
          <SignedOut>
            <div className="flex items-center gap-2">
              <SignInButton>
                <Button variant="outline">Sign In</Button>
              </SignInButton>
              <SignUpButton>
                <Button>Sign Up</Button>
              </SignUpButton>
            </div>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonPopoverCard: "glass-card" } }} />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
