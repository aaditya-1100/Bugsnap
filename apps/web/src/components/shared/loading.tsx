export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-16 w-full animate-pulse rounded-lg border border-zinc-800/60 bg-zinc-900/50"
        />
      ))}
    </div>
  );
}
