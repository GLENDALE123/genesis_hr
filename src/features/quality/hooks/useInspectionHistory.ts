import { useState, useEffect, useCallback, useRef } from 'react';
import { QualityInspection, QualityIssue } from '../types';
import { subscribeToInspectionsByProductInfo } from '../services/qualityInspectionService';
import { subscribeToQualityIssuesByProductInfo } from '../services/qualityIssueService';
import { analyzeInspectionHistory, InspectionSummary } from '@/shared/services/gemini/geminiService';
import { useDebounce } from 'use-debounce';

interface UseInspectionHistoryParams {
  supplier?: string;
  productName?: string;
  partName?: string;
  specification?: string;
  orderNumber?: string; // 발주번호 (묶음 검사 포함 조회용)
  enabled?: boolean; // 조회 활성화 여부
}

interface UseInspectionHistoryReturn {
  inspections: QualityInspection[];
  qualityIssues: QualityIssue[];
  summary: InspectionSummary | null;
  isLoading: boolean;
  isAnalyzing: boolean;
  error: Error | null;
  refreshAnalysis: () => Promise<void>;
}

/**
 * 발주처, 제품명, 부속명을 기반으로 품질 이력을 조회하고 Gemini API로 분석하는 훅
 */
export function useInspectionHistory({
  supplier,
  productName,
  partName,
  specification,
  orderNumber,
  enabled = true,
}: UseInspectionHistoryParams): UseInspectionHistoryReturn {
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [qualityIssues, setQualityIssues] = useState<QualityIssue[]>([]);
  const [summary, setSummary] = useState<InspectionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  // 강제 새로고침 상태 (트리거용)
  const [forceRefreshTrigger, setForceRefreshTrigger] = useState(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 디바운싱: 입력 후 500ms 후 조회
  const [debouncedSupplier] = useDebounce(supplier, 500);
  const [debouncedProductName] = useDebounce(productName, 500);
  const [debouncedPartName] = useDebounce(partName, 500);
  const [debouncedSpecification] = useDebounce(specification, 500);
  const [debouncedOrderNumber] = useDebounce(orderNumber, 500);

  // 이력 조회
  useEffect(() => {
    if (!enabled) {
      setInspections([]);
      setSummary(null);
      return;
    }

    // 최소 2개 이상의 조건이 입력되어야 조회 수행
    const conditions = [debouncedSupplier, debouncedProductName, debouncedPartName, debouncedSpecification].filter(
      (value) => value && value.trim() !== ''
    );

    if (conditions.length < 2) {
      setInspections([]);
      setSummary(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = subscribeToInspectionsByProductInfo(
      debouncedSupplier,
      debouncedProductName,
      debouncedPartName,
      debouncedSpecification,
      (data) => {
        if (!isMountedRef.current) return;
        // 발주번호가 주어진 경우, 발주번호가 포함된 검사들 필터링
        let filteredData = data;
        
        if (debouncedOrderNumber && debouncedOrderNumber.trim()) {
          const targetOrderNumber = debouncedOrderNumber.trim();
          
          filteredData = data.filter((inspection) => {
            // 1. 정확히 일치하는 경우 (개별 작성)
            if (inspection.orderNumber === targetOrderNumber) {
              return true;
            }
            
            // 2. orderNumber에 발주번호가 포함된 경우 (묶음 작성)
            // 예: "T10955-1, T10956-1" 같은 형식
            if (inspection.orderNumber && inspection.orderNumber.includes(targetOrderNumber)) {
              // 쉼표나 공백으로 구분된 발주번호 목록에서 확인
              const orderNumbers = inspection.orderNumber.split(/[,\s]+/).map(s => s.trim());
              return orderNumbers.includes(targetOrderNumber);
            }
            
            return false;
          });
        }
        
        setInspections(filteredData);
        setIsLoading(false);
      },
      (err) => {
        if (!isMountedRef.current) return;
        console.error('이력 조회 실패:', err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [enabled, debouncedSupplier, debouncedProductName, debouncedPartName, debouncedSpecification, debouncedOrderNumber]);

  // 품질이슈 조회
  useEffect(() => {
    if (!enabled) {
      setQualityIssues([]);
      return;
    }

    // 최소 2개 이상의 조건이 입력되어야 조회 수행
    const conditions = [debouncedSupplier, debouncedProductName, debouncedPartName, debouncedSpecification].filter(
      (value) => value && value.trim() !== ''
    );

    if (conditions.length < 2) {
      setQualityIssues([]);
      return;
    }

    const unsubscribe = subscribeToQualityIssuesByProductInfo(
      debouncedSupplier,
      debouncedProductName,
      debouncedPartName,
      debouncedSpecification,
      (data) => {
        if (!isMountedRef.current) return;
        setQualityIssues(data);
      },
      (err) => {
        if (!isMountedRef.current) return;
        console.error('품질이슈 조회 실패:', err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [enabled, debouncedSupplier, debouncedProductName, debouncedPartName, debouncedSpecification]);

  // 분석 새로고침 함수
  const refreshAnalysis = useCallback(async () => {
    if (!inspections.length) return;
    // 트리거 값을 변경하여 useEffect가 다시 실행되도록 함
    setForceRefreshTrigger(prev => prev + 1);
  }, [inspections.length]);

  // Gemini API 분석 (이력 조회 후 1초 추가 지연)
  useEffect(() => {
    if (!enabled || inspections.length === 0) {
      setSummary(null);
      setIsAnalyzing(false);
      return;
    }

    // 즉시 분석 시작 (지연 제거로 속도 향상)
    let cancelled = false;
    
    (async () => {
      setIsAnalyzing(true);
      setError(null);

      try {
        // forceRefreshTrigger가 0보다 크면 강제 새로고침으로 간주
        const forceRefresh = forceRefreshTrigger > 0;
        
        const analysisResult = await analyzeInspectionHistory(
          supplier || '',
          productName || '',
          partName || '',
          specification || '',
          inspections,
          qualityIssues,
          forceRefresh
        );
        
        if (!isMountedRef.current || cancelled) return;
        setSummary(analysisResult);
      } catch (err) {
        if (!isMountedRef.current || cancelled) return;
        console.error('Gemini API 분석 실패:', err);
        // API 실패는 에러로 처리하지 않고 기본 통계만 표시
        setSummary(null);
      } finally {
        if (isMountedRef.current && !cancelled) {
          setIsAnalyzing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, inspections, qualityIssues, supplier, productName, partName, forceRefreshTrigger]);

  return {
    inspections,
    qualityIssues,
    summary,
    isLoading,
    isAnalyzing,
    error,
    refreshAnalysis,
  };
}

