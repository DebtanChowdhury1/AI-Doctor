"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      theme="system"
      position="bottom-right"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast rounded-3xl border border-border/60 bg-background/80 px-5 py-4 text-sm shadow-xl backdrop-blur-xl",
          description: "text-muted-foreground",
          actionButton:
            "rounded-full border border-border/80 bg-background px-3 py-1 text-xs font-semibold uppercase tracking-widest",
        },
      }}
    />
  );
}
