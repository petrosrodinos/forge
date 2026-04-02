import { cn } from "@/utils/cn";

interface BadgeProps {
  status: string;
  className?: string;
}

const STATUS_CLASS: Record<string, string> = {
  pending:    "tag-amber",
  processing: "tag-cyan progress-running",
  success:    "tag-green",
  failed:     "tag-red",
  none:       "tag-violet",
};

export function Badge({ status, className }: BadgeProps) {
  const cls = STATUS_CLASS[status] ?? "tag-violet";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-mono",
        cls,
        className,
      )}
    >
      {status}
    </span>
  );
}
