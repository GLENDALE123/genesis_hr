"use client";

import React, { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { WORK_TYPES, WorkType } from '../types';
import { cn } from '@/shared/lib/utils';

interface ScheduleAdminPanelProps {
  dates: Set<string>;
  onApply: (type: string, dates: Set<string>) => void;
  onDelete: (dates: Set<string>) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  isMobile?: boolean;
}

export const ScheduleAdminPanel: React.FC<ScheduleAdminPanelProps> = ({
  dates,
  onApply,
  onDelete,
  onCancel,
  isSubmitting = false,
  isMobile = false
}) => {
  const [localSelectedType, setLocalSelectedType] = useState<string | null>(null);

  const handleApply = () => {
    if (localSelectedType) {
      onApply(localSelectedType, dates);
    }
  };

  return (
    <div className={cn(
      "w-full flex flex-col h-full",
      isMobile ? "bg-card rounded-lg min-h-0 p-4" : ""
    )}>
      {/* 헤더 영역 - 고정 */}
      <div className={cn("flex-shrink-0", isMobile ? "pb-0" : "p-4 pb-0")}>
        <h3 className="font-bold">
          {isMobile ? `${new Date(dates.values().next().value || new Date()).getDate()}일 계획` : "근무 계획 입력"}
        </h3>
        <p className="text-xs text-muted-foreground">
          {isMobile ? "근무 유형을 선택하고 적용하세요." : "날짜와 근무 유형을 선택한 후 '적용' 버튼을 누르세요."}
        </p>
      </div>
      
      {/* 스크롤 가능한 근무 유형 목록 - 가변 높이 */}
      <div className={cn("flex-1 overflow-y-auto space-y-2", isMobile ? "px-0" : "px-4")}>
        {Object.entries(WORK_TYPES).map(([type, data]) => (
          <button
            key={type}
            onClick={() => setLocalSelectedType(type)}
            className={cn(
              "w-full text-left p-2 rounded-md transition-colors",
              localSelectedType === type 
                ? 'bg-accent text-accent-foreground' 
                : 'hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <p 
              className="font-semibold text-sm"
              style={{ color: data.color }}
            >
              {type}
            </p>
            <p className="text-xs text-muted-foreground">
              {data.description}
            </p>
          </button>
        ))}
      </div>
      
      {/* 하단 고정 버튼 영역 - 카드 하단에 딱 붙음 */}
      <div className={cn("flex-shrink-0 space-y-2 border-t", isMobile ? "px-0 pt-4 pb-0" : "px-4 pt-4 pb-0")}>
        <Button
          onClick={handleApply}
          disabled={!localSelectedType || dates.size === 0 || isSubmitting}
          className="w-full"
        >
          적용
        </Button>
        <Button
          variant="destructive"
          onClick={() => onDelete(dates)}
          disabled={isSubmitting}
          className="w-full"
        >
          계획 삭제
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="w-full"
        >
          선택 취소
        </Button>
      </div>
    </div>
  );
};
