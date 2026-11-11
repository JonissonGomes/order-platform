import { Skeleton } from "./ui/skeleton";

export function DashboardLayoutSkeleton() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="w-[256px] bg-sidebar p-4 space-y-6 hidden md:block">
        <div className="flex items-center gap-3 px-2">
          <Skeleton className="h-8 w-8 rounded-sm bg-white/10" />
          <Skeleton className="h-4 w-24 bg-white/10" />
        </div>
        <div className="space-y-2 px-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-sm bg-white/10" />
          ))}
        </div>
      </div>
      <div className="flex-1 p-6 space-y-4">
        <Skeleton className="h-8 w-48 rounded-sm" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-md" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-md" />
      </div>
    </div>
  );
}
