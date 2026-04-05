import { Skeleton } from "@/components/ui/Skeleton";

export function TokenPacksSkeleton() {
  return (
    <div className="grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex flex-col overflow-hidden rounded-2xl border border-border bg-panel/95 ring-1 ring-white/5 shadow-lg shadow-black/15"
        >
          <Skeleton className="h-1 w-full rounded-none" />
          <div className="flex flex-1 flex-col p-6 pt-7">
            <div className="flex gap-3">
              <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-36 rounded-md" />
                <Skeleton className="h-9 w-44 rounded-md" />
              </div>
            </div>
            <Skeleton className="mt-6 h-24 w-full rounded-xl" />
            <Skeleton className="mt-5 h-11 w-full rounded-lg" />
            <Skeleton className="mt-4 mx-auto h-3 w-40 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
