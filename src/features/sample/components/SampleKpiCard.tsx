/**
 * 샘플센터 KPI 카드 컴포넌트
 * HS-Jig KpiCard 참고
 */

'use client';

import React from 'react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { cn } from '@/shared/lib/utils';

interface SampleKpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const SampleKpiCard: React.FC<SampleKpiCardProps> = ({
  title,
  value,
  icon,
  onClick,
  className
}) => {
  return (
    <Card
      onClick={onClick}
      className={cn(
        'transition-all hover:shadow-lg hover:-translate-y-1',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <CardContent className="p-3 md:p-4">
        {/* 모바일 레이아웃 */}
        <div className="flex flex-col items-center text-center md:hidden">
          <div className="flex items-center gap-1 mb-2">
            <p className="text-xs font-medium text-muted-foreground whitespace-nowrap">{title}</p>
            <div className="flex-shrink-0">{icon}</div>
          </div>
          <p className="text-lg font-bold">{value}</p>
        </div>
        
        {/* 데스크톱 레이아웃 */}
        <div className="hidden md:flex items-center">
          <div className="flex-shrink-0">{icon}</div>
          <div className="ml-4 flex-1">
            <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


