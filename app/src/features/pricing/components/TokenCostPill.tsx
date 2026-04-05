import { Coins } from "lucide-react";
import { cn } from "@/utils/cn";

interface TokenCostPillProps {
  tokens: number;
  className?: string;
  title?: string;
}

export function TokenCostPill({ tokens, className, title }: TokenCostPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-mono tabular-nums text-[10px] text-amber-400/90",
        className,
      )}
      title={title ?? "Tokens debited for this action"}
    >
      <Coins className="h-3 w-3 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
      {Math.round(tokens).toLocaleString()}
    </span>
  );
}
