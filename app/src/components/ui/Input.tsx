import { cn } from "@/utils/cn";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs text-slate-400 font-medium">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          "bg-panel border border-border rounded px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600",
          "focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors",
          error && "border-red-500/50",
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
