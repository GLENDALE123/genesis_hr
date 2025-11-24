import { Skeleton } from '@/shared/components/ui/skeleton';

export default function WorkScheduleLoading() {
  return (
    <div className="h-full flex flex-col gap-4">
      {/* 헤더 스켈레톤 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-16" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>

      {/* 통계 요약 스켈레톤 */}
      <div className="flex items-center gap-3 p-3 border-b">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-18" />
      </div>

      {/* 메인 콘텐츠 스켈레톤 */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-7 gap-1 h-full">
          {Array.from({ length: 42 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

