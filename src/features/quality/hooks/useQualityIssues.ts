import { useState, useEffect } from 'react';
import { subscribeToQualityIssues } from '../services/qualityIssueService';
import { QualityIssue } from '../types';
import { useAuthStore } from '@/features/auth/store/authStore';
import { toast } from 'sonner';

export const useQualityIssues = () => {
  const { user } = useAuthStore();
  const [issues, setIssues] = useState<QualityIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Firebase 데이터 구독
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToQualityIssues(
      (fetchedIssues) => {
        setIssues(fetchedIssues);
        setIsLoading(false);
      },
      (error) => {
        toast.error('품질이슈 로딩에 실패했습니다.');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

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
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    stats,
  };
};
