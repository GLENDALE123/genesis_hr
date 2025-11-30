/**
 * 샘플센터 대시보드 페이지
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProtectedRoute } from '@/shared/components/auth';
import { SampleDashboard, SampleRequestDetail } from '@/features/sample';
import { useSampleRequests, useSampleFilters } from '@/features/sample/hooks';
import { SampleRequest, SampleStatus } from '@/features/sample/types';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function SampleCenterPage() {
  const navigate = useNavigate();
  const {
    requests,
    isLoading,
    error,
    updateStatus,
    deleteRequest,
    updateWorkData,
    uploadWorkImage,
    removeWorkImages,
  } = useSampleRequests();

  // 상세 보기 모달
  const [selectedRequest, setSelectedRequest] = useState<SampleRequest | null>(null);

  // 빠른 필터 적용 후 목록 페이지로 이동
  const handleQuickFilter = (status: SampleStatus, coatingMethod: string) => {
    navigate(`/sample-center/requests?status=${encodeURIComponent(status)}&coating=${encodeURIComponent(coatingMethod)}`);
  };

  return (
    <ProtectedRoute>
      <div>
        {/* 대시보드 */}
        {isLoading && requests.length === 0 ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-64" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <Skeleton className="h-96" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              데이터를 불러오는 중 오류가 발생했습니다: {error.message}
            </AlertDescription>
          </Alert>
        ) : (
          <SampleDashboard
            requests={requests}
            onSelectRequest={setSelectedRequest}
            onQuickFilter={handleQuickFilter}
          />
        )}

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
              navigate('/sample-center/requests');
            }}
            onUpdateWorkData={updateWorkData}
            onUploadWorkImage={uploadWorkImage}
            onRemoveWorkImages={removeWorkImages}
            isAdmin={true}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
