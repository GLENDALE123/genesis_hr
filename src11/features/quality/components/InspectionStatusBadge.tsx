import React from 'react';
import { Badge } from '@/shared/components/ui/badge';
import { QualityInspection } from '../types';
import { INSPECTION_RESULT_COLORS } from '../constants';

interface InspectionStatusBadgeProps {
  inspections: QualityInspection[] | null;
  className?: string;
  inspectionType: 'incoming' | 'inProcess' | 'outgoing';
  onClick?: (type: 'incoming' | 'inProcess' | 'outgoing') => void;
}

/**
 * 검사 상태 뱃지 컴포넌트
 * - 미등록: 검사 데이터가 없는 경우
 * - 수입검사: 검사 결과에 따라 상태 표시
 *   - 합격/한도승인: 등록 (초록색)
 *   - 반출/불합격: 해당 상태명 (빨간색)
 *   - 한도대기: 한도대기 (노란색)
 * - 공정검사/출하검사: 기존 로직 유지 (등록/미등록)
 */
export const InspectionStatusBadge: React.FC<InspectionStatusBadgeProps> = ({
  inspections,
  className,
  inspectionType,
  onClick
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 테이블 행 클릭 이벤트 방지
    if (onClick && inspections && inspections.length > 0) {
      onClick(inspectionType);
    }
  };

  if (!inspections || inspections.length === 0) {
    return (
      <Badge 
        variant="secondary" 
        className={`${INSPECTION_RESULT_COLORS['미등록']} ${className || ''}`}
      >
        미등록
      </Badge>
    );
  }

  // 수입검사 특별 처리
  if (inspectionType === 'incoming') {
    // 날짜순으로 정렬하여 가장 최근 검사 결과 가져오기
    const sortedInspections = [...inspections].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const latestInspection = sortedInspections[0]; // 가장 최근 검사 결과
    const result = latestInspection.result;
    
    if (result === '합격' || result === '한도승인') {
      return (
        <Badge 
          className={`${INSPECTION_RESULT_COLORS['등록']} ${className || ''} cursor-pointer hover:opacity-80 transition-opacity`}
          onClick={handleClick}
          title="클릭하여 해당 검사 탭으로 이동"
        >
          등록
        </Badge>
      );
    } else if (result === '반출' || result === '불합격') {
      return (
        <Badge 
          className={`${INSPECTION_RESULT_COLORS[result]} ${className || ''} cursor-pointer hover:opacity-80 transition-opacity`}
          onClick={handleClick}
          title="클릭하여 해당 검사 탭으로 이동"
        >
          {result}
        </Badge>
      );
    } else if (result === '한도대기') {
      return (
        <Badge 
          className={`${INSPECTION_RESULT_COLORS[result]} ${className || ''} cursor-pointer hover:opacity-80 transition-opacity`}
          onClick={handleClick}
          title="클릭하여 해당 검사 탭으로 이동"
        >
          {result}
        </Badge>
      );
    }
  }

  // 공정검사, 출하검사는 기존 로직 유지 (등록 표시)
  return (
    <Badge 
      className={`${INSPECTION_RESULT_COLORS['등록']} ${className || ''} cursor-pointer hover:opacity-80 transition-opacity`}
      onClick={handleClick}
      title="클릭하여 해당 검사 탭으로 이동"
    >
      등록
    </Badge>
  );
};

