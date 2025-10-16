import React from 'react';
import { Badge } from '@/shared/components/ui/badge';
import { QualityInspection } from '../types';
import { INSPECTION_RESULT_COLORS } from '../constants';

interface InspectionStatusBadgeProps {
  inspections: QualityInspection[] | null;
  className?: string;
}

/**
 * 검사 상태 뱃지 컴포넌트
 * - 미등록: 검사 데이터가 없는 경우
 * - 불합격: 하나라도 불합격이 있는 경우
 * - 합격: 모두 합격인 경우
 */
export const InspectionStatusBadge: React.FC<InspectionStatusBadgeProps> = ({
  inspections,
  className
}) => {
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

  // 불합격이 하나라도 있으면 불합격 표시
  if (inspections.some(inspection => inspection.result === '불합격')) {
    return (
      <Badge 
        variant="destructive" 
        className={`${INSPECTION_RESULT_COLORS['불합격']} ${className || ''}`}
      >
        불합격
      </Badge>
    );
  }

  // 한도대기가 있으면 한도대기 표시
  if (inspections.some(inspection => inspection.result === '한도대기')) {
    return (
      <Badge 
        className={`${INSPECTION_RESULT_COLORS['한도대기']} ${className || ''}`}
      >
        한도대기
      </Badge>
    );
  }

  // 모두 합격인 경우
  return (
    <Badge 
      className={`${INSPECTION_RESULT_COLORS['합격']} ${className || ''}`}
    >
      합격
    </Badge>
  );
};

