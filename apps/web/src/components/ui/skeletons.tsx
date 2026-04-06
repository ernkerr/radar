// Skeleton pattern library — reusable loading placeholders for common layouts.
// These compose the base shadcn <Skeleton /> primitive into higher-level patterns
// that match the app's UI structures (forms, tables, cards, page shells).
//
// Usage guide:
//   1. Add a `loading` state to your component: const [loading, setLoading] = useState(true)
//   2. Set loading to false after data fetch completes
//   3. Return the matching skeleton pattern when loading is true
//
// When building NEW components that fetch data, always add a skeleton:
//   - Form with fields → <FormSkeleton fields={N} />
//   - Data table → <TableSkeleton columns={N} rows={N} />
//   - Card grid → <CardGridSkeleton count={N} />
//   - Full page → <PageSkeleton /> wrapping any of the above
//   - Custom layout → compose directly with <Skeleton className="h-4 w-32" />

import { Skeleton } from "@/components/ui/skeleton";

// -- Form skeleton: label + input pairs stacked vertically --
// Use for settings pages, profile forms, edit modals, etc.
export function FormSkeleton({
  fields = 4,
  withButton = true,
}: {
  fields?: number;
  withButton?: boolean;
}) {
  return (
    <div className="space-y-4 max-w-lg">
      {/* Heading */}
      <Skeleton className="h-5 w-48" />
      {/* Subtitle */}
      <Skeleton className="h-4 w-72" />
      {/* Field pairs: label + input */}
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      {/* Save button */}
      {withButton && <Skeleton className="h-10 w-32" />}
    </div>
  );
}

// -- Table skeleton: header row + data rows --
// Use for any tabular data (suppliers, products, run history, etc.)
export function TableSkeleton({
  columns = 3,
  rows = 3,
  withHeader = true,
}: {
  columns?: number;
  rows?: number;
  withHeader?: boolean;
}) {
  return (
    <div>
      {/* Section header with title + action button */}
      {withHeader && (
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      )}
      {/* Table */}
      <div className="border border-[var(--border)] rounded-md">
        {/* Column headers */}
        <div
          className="px-4 py-3 bg-[var(--muted)] border-b border-[var(--border)] flex gap-4"
          style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-16" />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="px-4 py-3 border-b border-[var(--border)] last:border-b-0"
            style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: "1rem", alignItems: "center" }}
          >
            {Array.from({ length: columns }).map((_, colIdx) => (
              <Skeleton
                key={colIdx}
                className={`h-4 ${colIdx === 0 ? "w-28" : "w-20"}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// -- Card grid skeleton: bordered cards in a responsive grid --
// Use for source cards, dashboard summary cards, etc.
export function CardGridSkeleton({
  count = 3,
  columns = 3,
}: {
  count?: number;
  columns?: number;
}) {
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-lg border border-[var(--border)] p-4 space-y-3"
        >
          {/* Card header: title + badge */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          {/* Card subtitle */}
          <Skeleton className="h-3 w-20" />
          {/* Card stats row */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

// -- Source list skeleton: vertical list of bordered source cards --
// Use for the Sources config tab (different layout from card grid).
export function SourceListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>
      {/* Source cards */}
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between border border-[var(--border)] rounded-md px-4 py-3"
          >
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// -- Page skeleton: full page shell with nav placeholder + content area --
// Use when the entire page is waiting on initial data (e.g. companyId resolution).
export function PageContentSkeleton() {
  return (
    <div className="space-y-4 max-w-lg">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-4 w-72" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}
