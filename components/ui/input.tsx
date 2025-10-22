import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-2xl border border-white/50 bg-white/70 px-4 py-2 text-sm text-slate-800 shadow-inner transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/60 dark:border-white/10 dark:bg-slate-900/60 dark:text-white",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
