import { useRef, useCallback, type FormEventHandler } from "react";
import { cn } from "@/utils/cn";
import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onInput"> {
  label?: string;
  autoResize?: boolean;
  onInput?: FormEventHandler<HTMLTextAreaElement>;
}

export function Textarea({ label, className, id, autoResize, onInput, ...props }: TextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const handleInput = useCallback(
    (e: React.FormEvent<HTMLTextAreaElement>) => {
      if (autoResize) {
        const el = e.currentTarget;
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
      }
      onInput?.(e);
    },
    [autoResize, onInput],
  );

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs text-slate-400 font-medium">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        onInput={handleInput}
        className={cn(
          "bg-panel border border-border rounded px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600",
          "focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors",
          autoResize ? "resize-none overflow-hidden" : "resize-y",
          className,
        )}
        {...props}
      />
    </div>
  );
}
