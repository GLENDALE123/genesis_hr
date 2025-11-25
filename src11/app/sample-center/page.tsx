/**
 * 샘플센터 대시보드 페이지
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { SampleDashboard, SampleRequestDetail } from '@/features/sample';
import { useSampleRequests, useSampleFilters } from '@/features/sample/hooks';
import { SampleRequest, SampleStatus } from '@/features/sample/types';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function SampleCenterPage() {
  const router = useRouter();
  const {
    requests,
    isLoading,
    error,
    updateStatus,
    deleteRequest,
    updateWorkData,
  } = useSampleRequests();

  // 상세 보기 모달
  const [selectedRequest, setSelectedRequest] = useState<SampleRequest | null>(null);

  // 빠른 필터 적용 후 목록 페이지로 이동
  const handleQuickFilter = (status: SampleStatus, coatingMethod: string) => {
    router.push(`/sample-center/requests?status=${encodeURIComponent(status)}&coating=${encodeURIComponent(coatingMethod)}`);
  };

  // 로딩 상태
  if (isLoading && requests.length === 0) {
    return (
      <ProtectedRoute>
        <div className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </ProtectedRoute>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <ProtectedRoute>
        <div>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              데이터를 불러오는 중 오류가 발생했습니다: {error.message}
            </AlertDescription>
          </Alert>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div>
        {/* 대시보드 */}
        <SampleDashboard
          requests={requests}
          onSelectRequest={setSelectedRequest}
          onQuickFilter={handleQuickFilter}
        />

        {/* 상세 보기 모달 */}
        {selectedRequest && (
          <SampleRequestDetail
            open={!!selectedRequest}
            request={selectedRequest}
            onClose={() => setSelectedRequest(null)}
            onUpdateStatus={updateStatus}
            onDelete={deleteRequest}
            onEdit={() => {
              // 수정 기능 구현 (요청목록 페이지에서)
              router.push('/sample-center/requests');
            }}
            onUpdateWorkData={updateWorkData}
            onUploadWorkImage={async (id: string, file: File) => {
              // 작업 이미지 업로드 로직 (필요시 구현)
              return 'uploaded-image-url'; // 임시 URL 반환
            }}
            isAdmin={true}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

