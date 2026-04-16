function BookCardSkeleton() {
  return (
    <div className="relative aspect-[2/3] overflow-hidden rounded-lg">
      <div className="absolute inset-0 animate-pulse bg-muted" />
      <div className="absolute top-2 left-2">
        <div className="h-4 w-14 rounded-full bg-white/20" />
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-10">
        <div className="h-3 w-3/4 rounded bg-white/30" />
        <div className="mt-2 h-2 w-1/2 rounded bg-white/20" />
      </div>
    </div>
  )
}

const DEFAULT_SKELETON_COUNT = 25

interface BookGridSkeletonProps {
  count?: number
}

function BookGridSkeleton({ count = DEFAULT_SKELETON_COUNT }: BookGridSkeletonProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-6">
      {Array.from({ length: count }, (_, i) => (
        <BookCardSkeleton key={i} />
      ))}
    </div>
  )
}

export { BookCardSkeleton, BookGridSkeleton }
