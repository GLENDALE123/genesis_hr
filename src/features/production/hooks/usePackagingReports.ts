import { useState, useEffect, useCallback } from 'react';
import { PackagingReport, PackagingFormData } from '@/features/production/types';
import { PackagingReportsService } from '@/features/production/services/packagingReportsService';
import { waitForFirebaseInit } from '@/shared/services/firebase/config';
import { useAuth } from '@/features/auth/hooks/useAuth';

/**
 * Packaging Reports 데이터를 관리하는 커스텀 훅
 * HS-Jig의 packaging-reports 컬렉션과 동일한 구조 사용
 */
export const usePackagingReports = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<PackagingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [mounted, setMounted] = useState(false);

  // 클라이언트 사이드에서만 실행되도록 보장
  useEffect(() => {
    setMounted(true);
  }, []);

  // 실시간 업데이트를 위한 구독 (클라이언트에서만)
  useEffect(() => {
    if (!mounted) return;

    let unsubscribe: (() => void) | null = null;
    let isCancelled = false;

    const initSubscription = async () => {
      setLoading(true);
      setError(null);

      // Firebase 초기화 대기
      const isFirebaseReady = await waitForFirebaseInit();
      
      if (isCancelled) return;

      if (!isFirebaseReady) {
        setError(new Error('Firebase 초기화에 실패했습니다. 페이지를 새로고침해주세요.'));
        setLoading(false);
        return;
      }

      unsubscribe = PackagingReportsService.subscribeToPackagingReports(
        (newReports) => {
          if (!isCancelled) {
            setReports(newReports);
            setLoading(false);
          }
        },
        500, // 최대 500개 데이터 로드
        (err) => {
          // 에러 발생 시 처리 (권한 에러는 조용히 처리)
          if (!isCancelled) {
            const errorMessage = err instanceof Error ? err.message : '';
            if (!errorMessage.includes('permission') && !errorMessage.includes('insufficient')) {
              console.error('생산일보 데이터 로드 실패:', err);
              setError(err);
            }
            setLoading(false);
          }
        }
      );
    };

    initSubscription();

    return () => {
      isCancelled = true;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [mounted]);

  // 수동 새로고침
  const refetch = useCallback(async () => {
    if (!mounted) return;
    
    try {
      setLoading(true);
      setError(null);
      const newReports = await PackagingReportsService.getPackagingReports(500);
      setReports(newReports);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [mounted]);

  // 특정 날짜 범위로 필터링된 데이터 가져오기
  const getReportsByDateRange = useCallback(async (startDate: string, endDate: string) => {
    if (!mounted) return;
    
    try {
      setLoading(true);
      setError(null);
      const filteredReports = await PackagingReportsService.getPackagingReportsByDateRange(
        startDate, 
        endDate
      );
      setReports(filteredReports);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [mounted]);

  // 특정 생산라인으로 필터링된 데이터 가져오기
  const getReportsByLine = useCallback(async (productionLine: string) => {
    if (!mounted) return;
    
    try {
      setLoading(true);
      setError(null);
      const filteredReports = await PackagingReportsService.getPackagingReportsByLine(
        productionLine
      );
      setReports(filteredReports);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [mounted]);

  // 보고서 삭제
  const deleteReport = useCallback(async (reportId: string) => {
    try {
      await PackagingReportsService.deletePackagingReport(reportId);
      // 삭제 후 로컬 상태에서도 제거
      setReports(prev => prev.filter(report => report.id !== reportId));
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  // 보고서 업데이트
  const updateReport = useCallback(async (reportId: string, updateData: Partial<PackagingReport>) => {
    try {
      await PackagingReportsService.updatePackagingReport(reportId, updateData);
      // 업데이트 후 로컬 상태도 갱신
      setReports(prev => prev.map(report => 
        report.id === reportId ? { ...report, ...updateData } : report
      ));
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  // 보고서 생성
  const createReport = useCallback(async (formData: PackagingFormData) => {
    if (!user) {
      const error = new Error('로그인이 필요합니다.');
      setError(error);
      throw error;
    }

    try {
      const reportId = await PackagingReportsService.createPackagingReport(formData, {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email
      });
      // 생성 후 목록 새로고침 (실시간 구독이 자동으로 업데이트하지만, 즉시 반영 위해)
      await refetch();
      return reportId;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [user, refetch]);

  return {
    reports,
    loading,
    error,
    refetch,
    getReportsByDateRange,
    getReportsByLine,
    createReport,
    deleteReport,
    updateReport
  };
};
