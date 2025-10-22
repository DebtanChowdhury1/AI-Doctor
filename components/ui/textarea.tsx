import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[120px] w-full rounded-2xl border border-white/40 bg-white/70 px-4 py-3 text-sm text-slate-800 shadow-inner transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/60 dark:border-white/10 dark:bg-slate-900/60 dark:text-white",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
