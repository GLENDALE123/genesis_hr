import { useState, useEffect, useCallback } from 'react';
import { QualityInspection } from '../types';
import { subscribeToInspectionsByProductInfo } from '../services/qualityInspectionService';
import { analyzeInspectionHistory, InspectionSummary } from '@/shared/services/gemini/geminiService';
import { useDebounce } from 'use-debounce';

interface UseInspectionHistoryParams {
  supplier?: string;
  productName?: string;
  partName?: string;
  enabled?: boolean; // 조회 활성화 여부
}

interface UseInspectionHistoryReturn {
  inspections: QualityInspection[];
  summary: InspectionSummary | null;
  isLoading: boolean;
  isAnalyzing: boolean;
  error: Error | null;
}

/**
 * 발주처, 제품명, 부속명을 기반으로 품질 이력을 조회하고 Gemini API로 분석하는 훅
 */
export function useInspectionHistory({
  supplier,
  productName,
  partName,
  enabled = true,
}: UseInspectionHistoryParams): UseInspectionHistoryReturn {
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [summary, setSummary] = useState<InspectionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 디바운싱: 입력 후 500ms 후 조회
  const [debouncedSupplier] = useDebounce(supplier, 500);
  const [debouncedProductName] = useDebounce(productName, 500);
  const [debouncedPartName] = useDebounce(partName, 500);

  // 이력 조회
  useEffect(() => {
    if (!enabled) {
      setInspections([]);
      setSummary(null);
      return;
    }

    // 최소 2개 이상의 조건이 입력되어야 조회 수행
    const conditions = [debouncedSupplier, debouncedProductName, debouncedPartName].filter(
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
      (data) => {
        setInspections(data);
        setIsLoading(false);
      },
      (err) => {
        console.error('이력 조회 실패:', err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [enabled, debouncedSupplier, debouncedProductName, debouncedPartName]);

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
        const analysisResult = await analyzeInspectionHistory(
          supplier || '',
          productName || '',
          partName || '',
          inspections
        );
        
        if (!cancelled) {
          setSummary(analysisResult);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Gemini API 분석 실패:', err);
          // API 실패는 에러로 처리하지 않고 기본 통계만 표시
          setSummary(null);
        }
      } finally {
        if (!cancelled) {
          setIsAnalyzing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, inspections, supplier, productName, partName]);

  return {
    inspections,
    summary,
    isLoading,
    isAnalyzing,
    error,
  };
}

