'use client';

import React, { useState } from 'react';
import {
  QualityInspectionTable,
  QualityInspectionDetail,
  InspectionFilterPanel,
  useQualityInspections,
  useInspectionFilters,
  GroupedInspectionData
} from '@/features/quality';

export default function QualityHistoryPage() {
  const {
    filters,
    setStartDate,
    setEndDate,
    setSearchTerm,
    resetFilters,
    today,
    yesterday
  } = useInspectionFilters();

  const { filteredGroupedInspections, isLoading } = useQualityInspections({
    startDate: filters.startDate,
    endDate: filters.endDate,
    searchTerm: filters.searchTerm
  });

  const [selectedGroup, setSelectedGroup] = useState<GroupedInspectionData | null>(null);

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

