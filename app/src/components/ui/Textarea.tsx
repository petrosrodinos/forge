import { cn } from "@/utils/cn";
import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className, id, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs text-slate-400 font-medium">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={cn(
          "bg-panel border border-border rounded px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600",
          "focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors resize-none",
          className,
        )}
        {...props}
      />
    </div>
  );
}
