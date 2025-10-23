import React from 'react';
import { ScheduleSummary, WORK_TYPES } from '../types';
import { cn } from '@/shared/lib/utils';

interface ScheduleSummaryViewProps {
  summary: ScheduleSummary;
}

export const ScheduleSummaryView: React.FC<ScheduleSummaryViewProps> = ({ summary }) => {
  return (
    <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide text-sm border-b p-3">
      {Object.entries(summary).map(([key, value]) => {
        if (value === 0) return null;
        
        const color = WORK_TYPES[key as keyof typeof WORK_TYPES]?.color;
        
        return (
          <div key={key} className="flex items-center gap-1.5 flex-shrink-0">
            {color && (
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: color }}
              />
            )}
            <span>{key}:</span>
            <span className="font-bold">{value}</span>
          </div>
        );
      })}
    </div>
  );
};
