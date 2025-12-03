/**
 * 제품 AI 보고서 훅
 * AI 보고서 조회 및 백그라운드 생성
 */

import { useState, useEffect, useCallback } from 'react';
import { AIReport } from '@/features/production/types/product.types';
import { QualityInspection } from '@/features/quality/types';
import { QualityIssue } from '@/features/quality/types';
import { getAIReport, generateAIReportInBackground } from '@/features/production/services/productAIService';

export const useProductAIReport = (
  productId: string | null,
  supplier: string | null,
  productName: string | null,
  partName: string | null,
  specification: string | null,
  inspections: QualityInspection[] = [],
  qualityIssues: QualityIssue[] = []
) => {
  const [aiReport, setAiReport] = useState<AIReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAIReport = useCallback(async () => {
    if (!productId) {
      setAiReport(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const report = await getAIReport(productId);
      setAiReport(report);
    } catch (err) {
      console.error('Error fetching AI report:', err);
      setError(err as Error);
      setAiReport(null);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  const generateReport = useCallback(async () => {
    if (!productId || !supplier || !productName || !partName || !specification) {
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const report = await generateAIReportInBackground(
        productId,
        supplier,
        productName,
        partName,
        specification,
        inspections,
        qualityIssues
      );
      
      if (report) {
        setAiReport(report);
      }
    } catch (err) {
      console.error('Error generating AI report:', err);
      setError(err as Error);
    } finally {
      setGenerating(false);
    }
  }, [productId, supplier, productName, partName, specification, inspections, qualityIssues]);

  useEffect(() => {
    fetchAIReport();
  }, [fetchAIReport]);

  return {
    aiReport,
    loading,
    generating,
    error,
    refetch: fetchAIReport,
    generateReport
  };
};




