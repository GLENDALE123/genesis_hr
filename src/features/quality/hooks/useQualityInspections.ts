import { useState, useEffect, useMemo } from 'react';
import { QualityInspection, GroupedInspectionData } from '../types';
import {
  subscribeToQualityInspections,
  groupInspectionsByOrder,
  filterInspectionsByDateRange,
  searchInspections,
  deepSearchGroupedData
} from '../services/qualityInspectionService';

interface UseQualityInspectionsReturn {
  inspections: QualityInspection[];
  groupedInspections: GroupedInspectionData[];
  filteredGroupedInspections: GroupedInspectionData[];
  isLoading: boolean;
  error: Error | null;
}

interface UseQualityInspectionsOptions {
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
}

/**
 * 품질검사 목록을 실시간으로 구독하고 그룹화하는 훅
 */
export const useQualityInspections = (
  options: UseQualityInspectionsOptions = {}
): UseQualityInspectionsReturn => {
  const { startDate, endDate, searchTerm } = options;
  
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Firestore 실시간 구독
  useEffect(() => {
    setIsLoading(true);
    
    const unsubscribe = subscribeToQualityInspections(
      (data) => {
        setInspections(data);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error in useQualityInspections:', err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 발주번호별 그룹화
  const groupedInspections = useMemo(() => {
    return groupInspectionsByOrder(inspections);
  }, [inspections]);

  // 필터링된 그룹화 데이터
  const filteredGroupedInspections = useMemo(() => {
    let filtered = groupedInspections;

    // 검색어 필터링 (딥 서치)
    if (searchTerm && searchTerm.trim()) {
      filtered = filtered.filter(group => 
        deepSearchGroupedData(group, searchTerm.trim())
      );
    }

    // 날짜 필터링
    if (startDate && endDate) {
      filtered = filtered.filter(group => {
        const allInspections = [
          ...group.incoming,
          ...group.inProcess,
          ...group.outgoing
        ];
        
        return allInspections.some(inspection => {
          const inspectionDate = inspection.inspectionDate || inspection.createdAt;
          const dateStr = inspectionDate.split('T')[0];
          return dateStr >= startDate && dateStr <= endDate;
        });
      });
    }

    return filtered;
  }, [groupedInspections, startDate, endDate, searchTerm]);

  return {
    inspections,
    groupedInspections,
    filteredGroupedInspections,
    isLoading,
    error,
  };
};

