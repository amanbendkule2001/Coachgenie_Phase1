export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse p-1" data-testid="dashboard-skeleton">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-52 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-4 w-40 bg-slate-100 dark:bg-slate-800/60 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-9 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        </div>
      </div>

      {/* KPI Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            </div>
            <div className="h-8 w-28 bg-slate-300 dark:bg-slate-700 rounded-md" />
            <div className="h-3 w-36 bg-slate-100 dark:bg-slate-800/60 rounded" />
          </div>
        ))}
      </div>

      {/* Analytics / Charts Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="h-5 w-36 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-6 w-20 bg-slate-100 dark:bg-slate-800/60 rounded" />
          </div>
          <div className="h-64 w-full bg-slate-100 dark:bg-slate-800/40 rounded-xl" />
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-6 w-20 bg-slate-100 dark:bg-slate-800/60 rounded" />
          </div>
          <div className="h-64 w-full bg-slate-100 dark:bg-slate-800/40 rounded-xl" />
        </div>
      </div>

      {/* Table Section Skeleton */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="h-5 w-44 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-8 w-32 bg-slate-100 dark:bg-slate-800/60 rounded-lg" />
        </div>
        <div className="space-y-2.5 pt-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-12 w-full bg-slate-100 dark:bg-slate-800/30 rounded-lg"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
