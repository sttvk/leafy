function BookCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg bg-card shadow-sm">
      <div className="aspect-[2/3] animate-pulse bg-muted" />
      <div className="flex flex-col gap-2 p-3">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="mt-1 flex items-center justify-between">
          <div className="h-4 w-16 animate-pulse rounded-full bg-muted" />
          <div className="h-3 w-12 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  )
}

const SKELETON_COUNT = 18

function BookGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-6">
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <BookCardSkeleton key={i} />
      ))}
    </div>
  )
}

export { BookCardSkeleton, BookGridSkeleton }
