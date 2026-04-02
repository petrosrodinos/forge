import { cn } from "@/utils/cn";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        {
          "bg-accent text-white hover:bg-purple-700": variant === "primary",
          "bg-panel border border-border text-slate-300 hover:bg-white/5": variant === "secondary",
          "text-slate-400 hover:text-slate-200 hover:bg-white/5": variant === "ghost",
          "bg-red-600/20 border border-red-600/30 text-red-400 hover:bg-red-600/30": variant === "danger",
        },
        {
          "text-xs px-2.5 py-1": size === "sm",
          "text-sm px-3.5 py-1.5": size === "md",
          "text-sm px-5 py-2.5": size === "lg",
        },
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
