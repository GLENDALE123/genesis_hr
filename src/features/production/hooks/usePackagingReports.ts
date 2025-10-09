import { useState, useEffect, useCallback } from 'react';
import { PackagingReport, PackagingFormData } from '@/features/production/types';
import { PackagingReportsService } from '@/features/production/services/packagingReportsService';
import { waitForFirebaseInit } from '@/shared/services/firebase/config';
import { useAuthStore } from '@/features/auth/store/authStore';
import { usePackagingReportsStore } from '@/features/production/store/packagingReportsStore';

/**
 * Packaging Reports 데이터를 관리하는 커스텀 훅
 * HS-Jig의 packaging-reports 컬렉션과 동일한 구조 사용
 * 
 * 성능 최적화:
 * - Zustand 스토어에 날짜별 캐싱 (5분 유효)
 * - 캐시된 데이터 즉시 표시 → 백그라운드에서 최신 데이터 업데이트
 */
export const usePackagingReports = () => {
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  
  // Zustand 스토어 사용
  const {
    reports,
    isLoading: loading,
    isFetching,
    error,
    getCachedReports,
    setReports: setCachedReports,
    setLoading,
    setFetching,
    setError,
    updateReport: updateCachedReport,
    deleteReport: deleteCachedReport,
    addReport: addCachedReport
  } = usePackagingReportsStore();

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
      console.log('🔄 생산일보 데이터 구독 시작...');
      
      // ✅ 간단하게: 최신 500건만 조회 (날짜 무관, 필터에서 처리)
      console.log('📅 최신 500건 조회 시작...');
      
      // 로딩 시작
      setLoading(true);
      setError(null);

      // Firebase 초기화 대기
      console.log('🔥 Firebase 초기화 확인 중...');
      const isFirebaseReady = await waitForFirebaseInit();
      
      if (isCancelled) return;

      if (!isFirebaseReady) {
        console.error('❌ Firebase 초기화 실패');
        setError(new Error('Firebase 초기화에 실패했습니다. 페이지를 새로고침해주세요.'));
        setLoading(false);
        setFetching(false);
        return;
      }
      
      console.log('✅ Firebase 초기화 완료 - 실시간 구독 시작');

      // ✅ 간단하게: 최신 500건 실시간 구독
      unsubscribe = PackagingReportsService.subscribeToPackagingReports(
        (newReports) => {
          if (!isCancelled) {
            console.log('✅ 생산일보 데이터 수신 성공:', `${newReports.length}건`);
            
            // Zustand 스토어에 저장 (간단하게)
            const store = usePackagingReportsStore.getState();
            store.setReports(newReports, '', ''); // 날짜 범위 없이 저장
          }
        },
        500, // 최신 500건
        (err) => {
          // 에러 발생 시 처리
          if (!isCancelled) {
            console.error('❌ 생산일보 데이터 로드 실패:', err);
            const errorMessage = err instanceof Error ? err.message : '';
            
            // 권한 에러 확인
            if (errorMessage.includes('permission') || errorMessage.includes('insufficient')) {
              console.warn('⚠️ 권한 에러 발생:', errorMessage);
              // 권한 에러도 사용자에게 알림
              setError(new Error('생산일보 데이터를 불러올 권한이 없습니다. 관리자에게 문의하세요.'));
            } else {
              setError(err);
            }
            setLoading(false);
            setFetching(false);
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
  }, [mounted, getCachedReports, setCachedReports, setLoading, setFetching, setError]);

  // 수동 새로고침
  const refetch = useCallback(async () => {
    if (!mounted) return;
    
    try {
      setFetching(true);
      setError(null);
      
      // 오늘 날짜 데이터 다시 가져오기
      const today = new Date().toISOString().split('T')[0];
      const newReports = await PackagingReportsService.getPackagingReportsByDateRange(today, today);
      
      // Zustand 스토어에 캐싱
      setCachedReports(newReports, today, today);
    } catch (err) {
      setError(err as Error);
    }
  }, [mounted, setCachedReports, setFetching, setError]);

  // 특정 날짜 범위로 필터링된 데이터 가져오기
  const getReportsByDateRange = useCallback(async (startDate: string, endDate: string) => {
    if (!mounted) return;
    
    try {
      // 캐시 확인
      const cachedData = getCachedReports(startDate, endDate);
      
      if (cachedData && cachedData.length > 0) {
        console.log('⚡ 캐시된 날짜 범위 데이터 즉시 표시');
        setFetching(true); // 백그라운드 fetching
      } else {
        setLoading(true);
      }
      
      setError(null);
      
      const filteredReports = await PackagingReportsService.getPackagingReportsByDateRange(
        startDate, 
        endDate
      );
      
      // Zustand 스토어에 캐싱
      setCachedReports(filteredReports, startDate, endDate);
    } catch (err) {
      setError(err as Error);
    }
  }, [mounted, getCachedReports, setCachedReports, setLoading, setFetching, setError]);

  // 특정 생산라인으로 필터링된 데이터 가져오기
  const getReportsByLine = useCallback(async (productionLine: string) => {
    if (!mounted) return;
    
    try {
      setLoading(true);
      setError(null);
      const filteredReports = await PackagingReportsService.getPackagingReportsByLine(
        productionLine
      );
      
      // 라인 필터는 날짜 범위와 별도로 처리 (캐싱하지 않음)
      // TODO: 필요시 라인별 캐싱도 추가 가능
    } catch (err) {
      setError(err as Error);
    }
  }, [mounted, setLoading, setError]);

  // 보고서 삭제
  const deleteReport = useCallback(async (reportId: string) => {
    try {
      await PackagingReportsService.deletePackagingReport(reportId);
      // Zustand 스토어에서도 제거 (캐시 동기화)
      deleteCachedReport(reportId);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [deleteCachedReport, setError]);

  // 보고서 업데이트
  const updateReport = useCallback(async (reportId: string, updateData: Partial<PackagingReport>) => {
    try {
      await PackagingReportsService.updatePackagingReport(reportId, updateData);
      // Zustand 스토어에서도 업데이트 (캐시 동기화)
      updateCachedReport(reportId, updateData);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [updateCachedReport, setError]);

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
    isFetching, // 백그라운드 fetching 상태
    error,
    refetch,
    getReportsByDateRange,
    getReportsByLine,
    createReport,
    deleteReport,
    updateReport
  };
};
