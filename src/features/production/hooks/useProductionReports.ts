import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ProductionReportService } from '@/features/production/services/productionReportService';
import { 
  PackagingReport, 
  PackagingFormData, 
  ProductionReportStats,
  ExcelProductionReport 
} from '@/features/production/types';

export const useProductionReports = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<PackagingReport[]>([]);
  const [excelReports, setExcelReports] = useState<ExcelProductionReport[]>([]);
  const [stats, setStats] = useState<ProductionReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 생산일보 목록 로드
  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [reportsData, statsData] = await Promise.all([
        ProductionReportService.getReports(),
        ProductionReportService.getReportStats()
      ]);
      setReports(reportsData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  // 엑셀 생산일보 목록 로드
  const loadExcelReports = useCallback(async () => {
    try {
      const excelData = await ProductionReportService.getExcelReports();
      setExcelReports(excelData);
    } catch (err) {
      console.error('엑셀 생산일보 로드 실패:', err);
    }
  }, []);

  // 생산일보 생성
  const createReport = useCallback(async (formData: PackagingFormData) => {
    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }

    try {
      setError(null);
      await ProductionReportService.createReport(formData, user);
      await loadReports(); // 목록 새로고침
    } catch (err) {
      setError(err instanceof Error ? err.message : '생산일보 생성에 실패했습니다.');
      throw err;
    }
  }, [user, loadReports]);

  // 생산일보 수정
  const updateReport = useCallback(async (reportId: string, formData: PackagingFormData) => {
    try {
      setError(null);
      await ProductionReportService.updateReport(reportId, formData);
      await loadReports(); // 목록 새로고침
    } catch (err) {
      setError(err instanceof Error ? err.message : '생산일보 수정에 실패했습니다.');
      throw err;
    }
  }, [loadReports]);

  // 생산일보 삭제
  const deleteReport = useCallback(async (reportId: string) => {
    try {
      setError(null);
      await ProductionReportService.deleteReport(reportId);
      await loadReports(); // 목록 새로고침
    } catch (err) {
      setError(err instanceof Error ? err.message : '생산일보 삭제에 실패했습니다.');
      throw err;
    }
  }, [loadReports]);

  // 엑셀 생산일보 업로드
  const uploadExcelReports = useCallback(async (reports: ExcelProductionReport[], fileName: string) => {
    try {
      setError(null);
      await ProductionReportService.uploadExcelReports(reports, fileName);
      await loadExcelReports(); // 엑셀 목록 새로고침
    } catch (err) {
      setError(err instanceof Error ? err.message : '엑셀 업로드에 실패했습니다.');
      throw err;
    }
  }, [loadExcelReports]);

  // 목록 새로고침
  const refreshReports = useCallback(async () => {
    await loadReports();
    await loadExcelReports();
  }, [loadReports, loadExcelReports]);

  // 실시간 업데이트 구독
  useEffect(() => {
    if (!user) return;

    const unsubscribe = ProductionReportService.subscribeToReports(
      (reports) => {
        setReports(reports);
        // 통계도 다시 계산
        ProductionReportService.getReportStats()
          .then(setStats)
          .catch(err => console.error('통계 업데이트 실패:', err));
      }
    );

    return unsubscribe;
  }, [user]);

  // 초기 로드
  useEffect(() => {
    if (user) {
      loadReports();
      loadExcelReports();
    }
  }, [user, loadReports, loadExcelReports]);

  return {
    // 데이터
    reports,
    excelReports,
    stats,
    loading,
    error,
    
    // 액션
    createReport,
    updateReport,
    deleteReport,
    uploadExcelReports,
    refreshReports,
    
    // 유틸리티
    loadReports,
    loadExcelReports
  };
};
