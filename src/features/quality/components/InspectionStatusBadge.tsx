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
 * - 등록: 검사 데이터가 있는 경우 (결과에 관계없이)
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

  // 검사 데이터가 있으면 등록 표시 (클릭 가능)
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

