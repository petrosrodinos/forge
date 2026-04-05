import { Skeleton } from "@/components/ui/Skeleton";

export function BalanceSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <Skeleton className="h-4 w-32 rounded-md" />
      <Skeleton className="h-14 w-56 max-w-full rounded-lg" />
      <Skeleton className="h-3 w-48 rounded-md" />
    </div>
  );
}

export function PurchaseHistoryTableSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-panel/40 overflow-hidden ring-1 ring-white/5" aria-hidden>
      <div className="bg-surface/60 px-4 py-3.5 flex flex-wrap gap-6 border-b border-border">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-12" />
      </div>
      <div className="divide-y divide-border/80">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="px-4 py-3.5 flex flex-wrap gap-6 items-center">
            <Skeleton className="h-4 w-24 sm:flex-1 sm:max-w-40" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-36" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TokenUsageTableSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-panel/40 overflow-hidden ring-1 ring-white/5" aria-hidden>
      <div className="bg-surface/60 px-4 py-3.5 flex flex-wrap gap-4 border-b border-border">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-10" />
      </div>
      <div className="divide-y divide-border/80">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="px-4 py-3.5 flex flex-wrap gap-4 items-center">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 flex-1 min-w-24 max-w-48" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}
