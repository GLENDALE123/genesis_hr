import { useState, useEffect, useCallback } from 'react';
import { subscribeToQualityIssues } from '../services/qualityIssueService';
import { QualityIssue } from '../types';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useQualityIssuesStore } from '../store/qualityIssuesStore';
import { waitForFirebaseInit } from '@/shared/services/firebase/config';
import { toast } from 'sonner';

export const useQualityIssues = () => {
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  // Zustand 스토어 사용
  const {
    issues,
    isLoading,
    isFetching,
    error,
    getCachedIssues,
    setIssues,
    setLoading,
    setFetching,
    setError,
  } = useQualityIssuesStore();

  // 클라이언트 사이드에서만 실행
  useEffect(() => {
    setMounted(true);
  }, []);

  // 초기 마운트 시 실시간 구독 시작
  useEffect(() => {
    if (!mounted || !user) return;

    let isCancelled = false;

    const initSubscription = async (): Promise<(() => void) | undefined> => {
      // 로딩 시작
      setLoading(true);
      setError(null);

      // 캐시된 데이터 먼저 표시
      const cachedData = getCachedIssues();
      if (cachedData) {
        setLoading(false);
        setFetching(true);
      }

      // Firebase 초기화 대기
      const isFirebaseReady = await waitForFirebaseInit();
      
      if (isCancelled) return;

      if (!isFirebaseReady) {
        console.error('❌ Firebase 초기화 실패');
        setError(new Error('Firebase 초기화에 실패했습니다.'));
        setLoading(false);
        setFetching(false);
        return;
      }
      try {
        // 실시간 구독 시작
        const unsubscribe = subscribeToQualityIssues(
          (newIssues) => {
            if (!isCancelled) {
              setIssues(newIssues);
              setLoading(false);
              setFetching(false);
            }
          },
          (error) => {
            if (!isCancelled) {
              console.error('❌ 품질 이슈 구독 에러:', error);
              toast.error('품질 이슈 로딩에 실패했습니다.');
              setError(error instanceof Error ? error : new Error('구독 실패'));
              setLoading(false);
              setFetching(false);
            }
          }
        );

        return unsubscribe;
      } catch (err) {
        console.error('❌ 실시간 구독 실패:', err);
        if (!isCancelled) {
          setError(err instanceof Error ? err : new Error('구독 실패'));
          setLoading(false);
          setFetching(false);
        }
        return undefined;
      }
    };

    const unsubscribePromise = initSubscription();

    // 클린업: 구독 해제
    return () => {
      isCancelled = true;
      unsubscribePromise.then(unsubscribe => {
        if (unsubscribe && typeof unsubscribe === 'function') {
          unsubscribe();
        }
      }).catch(error => {
        console.error('구독 해제 중 오류:', error);
      });
    };
  }, [mounted, user, getCachedIssues, setIssues, setError, setFetching, setLoading]);

  // 검색 및 상태 필터링
  const filteredIssues = issues
    .filter(issue => {
      // 상태 필터링
      if (statusFilter) {
        const lastIssue = issue.issues[issue.issues.length - 1];
        const currentStatus = lastIssue && typeof lastIssue === 'object' && lastIssue.status 
          ? lastIssue.status 
          : issue.status || '해결완료';
        
        const statusMatch = 
          currentStatus === statusFilter ||
          (statusFilter === '미해결' && currentStatus === 'open') ||
          (statusFilter === '진행중' && currentStatus === 'in-progress') ||
          (statusFilter === '해결완료' && (currentStatus === 'resolved' || currentStatus === 'closed'));
        
        if (!statusMatch) return false;
      }
      
      // 검색 필터링
      if (!searchTerm.trim()) return true;

      const searchLower = searchTerm.toLowerCase();
      const authorText = typeof issue.author === 'string'
        ? issue.author 
        : issue.author?.displayName || issue.author?.email || '';
      
      // 날짜 검색을 위한 포맷팅 함수
      const formatDateForSearch = (dateString: string | Date) => {
        const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
        const year = date.getFullYear().toString();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      // 공정/불량 키워드 검색을 위한 함수
      const keywordPairsText = issue.keywordPairs?.map(pair => 
        `${pair.process || ''} ${pair.defect || ''}`
      ).join(' ') || '';
      
      return (
        // 검색 필드들
        issue.orderNumber.toLowerCase().includes(searchLower) ||
        issue.productName.toLowerCase().includes(searchLower) ||
        issue.partName.toLowerCase().includes(searchLower) ||
        issue.supplier.toLowerCase().includes(searchLower) ||
        authorText.toLowerCase().includes(searchLower) ||
        issue.issues.some(i => {
          const content = typeof i === 'string' ? i : i.content;
          return content.toLowerCase().includes(searchLower);
        }) ||
        (issue.department || '').toLowerCase().includes(searchLower) ||
        (issue.registrationKeyword || '').toLowerCase().includes(searchLower) ||
        keywordPairsText.toLowerCase().includes(searchLower) ||
        // 작성일 검색 (YYYY-MM-DD 형식)
        formatDateForSearch(issue.createdAt).includes(searchLower) ||
        formatDateForSearch(issue.createdAt).replace(/-/g, '').includes(searchLower.replace(/-/g, ''))
      );
    })
    .sort((a, b) => {
      // createdAt 기준으로 오름차순 정렬 (오래된 것이 위에)
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateA - dateB;
    });

  // 통계 계산
  const stats = {
    total: issues.length,
    unresolved: issues.filter(issue => 
      issue.status === '미해결' || issue.status === 'open'
    ).length,
    inProgress: issues.filter(issue => 
      issue.status === '진행중' || issue.status === 'in-progress'
    ).length,
    resolved: issues.filter(issue => 
      issue.status === '해결완료' || 
      issue.status === 'resolved' || 
      issue.status === 'closed' ||
      !issue.status // undefined 상태도 해결완료로 처리
    ).length,
  };

  return {
    issues: filteredIssues,
    allIssues: issues,
    isLoading,
    isFetching,
    error,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    stats,
  };
};
