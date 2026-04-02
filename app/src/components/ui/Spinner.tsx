import { cn } from "@/utils/cn";

interface SpinnerProps {
  className?: string;
}

export function Spinner({ className }: SpinnerProps) {
  return (
    <div
      className={cn(
        "inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full spinner",
        className,
      )}
    />
  );
}
