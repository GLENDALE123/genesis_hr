'use client';

import React, { useState, useEffect } from 'react';
import {
  QualityInspectionTable,
  QualityInspectionDetail,
  InspectionFilterPanel,
  useQualityInspections,
  useInspectionFilters,
  GroupedInspectionData,
  QualityInspection,
  createQualityInspection
} from '@/features/quality';

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

  // 날짜 필터 변경 시 구독 업데이트 (검색어가 없을 때만)
  useEffect(() => {
    if (!filters.searchTerm && filters.startDate && filters.endDate) {
      getInspectionsByDateRange(filters.startDate, filters.endDate);
    }
  }, [filters.startDate, filters.endDate, filters.searchTerm, getInspectionsByDateRange]);

  // 새 품질이력 작성 핸들러
  const handleCreateInspection = async (inspection: Omit<QualityInspection, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await createQualityInspection(inspection);
      // 성공 시 토스트 알림 또는 다른 피드백 처리
      console.log('품질이력이 성공적으로 등록되었습니다.');
    } catch (error) {
      console.error('품질이력 등록 중 오류가 발생했습니다:', error);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4 p-4">
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
        onSelectGroup={setSelectedGroup}
      />

      {/* 상세 모달 */}
      <QualityInspectionDetail
        group={selectedGroup}
        isOpen={!!selectedGroup}
        onClose={() => setSelectedGroup(null)}
      />
    </div>
  );
}

