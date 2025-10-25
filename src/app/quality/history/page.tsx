'use client';

import React, { useState, useEffect } from 'react';
import {
  QualityInspectionTable,
  QualityInspectionDetail,
  InspectionFilterPanel,
  QualityInspectionForm,
  useQualityInspections,
  useInspectionFilters,
  GroupedInspectionData,
  QualityInspection,
  createQualityInspection,
  updateQualityInspection,
  deleteQualityInspection
} from '@/features/quality';
import { ProtectedRoute } from '@/shared/components/auth';

export default function QualityHistoryPage() {
  const {
    filters,
    setStartDate,
    setEndDate,
    setSearchTerm,
    resetFilters,
    today,
    yesterday,
    isSearching
  } = useInspectionFilters();

  const { filteredGroupedInspections, isLoading, isFetching, getInspectionsByDateRange } = useQualityInspections({
    searchTerm: filters.searchTerm
  });

  const [selectedGroup, setSelectedGroup] = useState<GroupedInspectionData | null>(null);
  const [selectedInitialTab, setSelectedInitialTab] = useState<'incoming' | 'inProcess' | 'outgoing' | undefined>(undefined);
  
  // 수정 모달 상태 추가
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<QualityInspection | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // 상세 모달 강제 리렌더링용

  // 날짜 필터 변경 시 구독 업데이트 (검색어가 없을 때만)
  useEffect(() => {
    if (!filters.searchTerm && filters.startDate && filters.endDate) {
      getInspectionsByDateRange(filters.startDate, filters.endDate);
    }
  }, [filters.startDate, filters.endDate, filters.searchTerm, getInspectionsByDateRange]);

  // 새 품질이력 작성 핸들러
  const handleCreateInspection = async (inspection: Omit<QualityInspection, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const docId = await createQualityInspection(inspection);
      return docId;
    } catch (error) {
      console.error('품질이력 등록 중 오류가 발생했습니다:', error);
      throw error;
    }
  };

  // 품질이력 수정 핸들러
  const handleUpdateInspection = async (id: string, inspection: Partial<QualityInspection>) => {
    try {
      await updateQualityInspection(id, inspection);
    } catch (error) {
      console.error('❌ [QualityHistoryPage] 품질이력 수정 중 오류가 발생했습니다:', error);
    }
  };

  // 품질이력 삭제 핸들러
  const handleDeleteInspection = async (id: string) => {
    try {
      await deleteQualityInspection(id);
      // 삭제 성공 후 상세모달 닫기
      setSelectedGroup(null);
      setSelectedInitialTab(undefined);
      // 강제 리렌더링으로 실시간 반영
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('품질이력 삭제 중 오류가 발생했습니다:', error);
    }
  };

  return (
    <ProtectedRoute>
      <div className="h-full flex flex-col space-y-4 p-0">
      {/* 필터 패널 */}
      <InspectionFilterPanel
        startDate={filters.startDate}
        endDate={filters.endDate}
        searchTerm={filters.searchTerm}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onSearchTermChange={setSearchTerm}
        onReset={resetFilters}
        today={today}
        yesterday={yesterday}
        totalCount={filteredGroupedInspections.length}
        isSearching={isSearching}
        isFetching={isFetching}
        onCreateInspection={handleCreateInspection}
      />

      {/* 검사 테이블 */}
      <QualityInspectionTable
        groupedData={filteredGroupedInspections}
        isLoading={isLoading}
        onSelectGroup={(group, initialTab) => {
          setSelectedGroup(group);
          setSelectedInitialTab(initialTab);
        }}
      />

      {/* 상세 모달 */}
      <QualityInspectionDetail
        group={selectedGroup}
        isOpen={!!selectedGroup}
        onClose={() => {
          setSelectedGroup(null);
          setSelectedInitialTab(undefined);
        }}
        initialTab={selectedInitialTab}
        refreshTrigger={refreshKey} // 강제 리렌더링 트리거
        onEditInspection={(inspection) => {
          setSelectedInspection(inspection);
          setIsEditModalOpen(true);
        }}
        onDeleteInspection={(inspection) => {
          // 삭제 처리
          handleDeleteInspection(inspection.id);
        }}
        onCreateInspection={handleCreateInspection}
      />

      {/* 수정 모달 */}
      <QualityInspectionForm
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedInspection(null);
        }}
        mode="edit"
        inspectionData={selectedInspection || undefined}
        initialTab={selectedInspection?.inspectionType}
        onSubmit={async () => ''} // 수정 모드에서는 사용하지 않음
        onUpdate={async (id, inspection) => {
          await handleUpdateInspection(id, inspection);
          setIsEditModalOpen(false);
          setSelectedInspection(null);
          // 상세 모달 강제 리렌더링
          setRefreshKey(prev => prev + 1);
        }}
        onDelete={async (id) => {
          await handleDeleteInspection(id);
          setIsEditModalOpen(false);
          setSelectedInspection(null);
          // 상세 모달 강제 리렌더링
          setRefreshKey(prev => prev + 1);
        }}
      />
      </div>
    </ProtectedRoute>
  );
}

