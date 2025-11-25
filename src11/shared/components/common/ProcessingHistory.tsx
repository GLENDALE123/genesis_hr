import React from 'react';
import { Badge } from '@/shared/components/ui/badge';
import { getStatusColor } from '@/shared/utils/statusColors';

export interface HistoryEntry {
  id?: string;
  date: string | { seconds: number } | Date;
  user?: string;
  by?: string;
  status: string;
  reason?: string;
  action?: string;
  comment?: string;
}

export interface ProcessingHistoryProps {
  history: HistoryEntry[];
  statusColorMap?: Record<string, string>;
  userField?: 'user' | 'by';
  dateField?: 'date';
  className?: string;
}

/**
 * Reusable ProcessingHistory component for displaying processing history
 * Supports flexible field mapping and custom styling
 */
export const ProcessingHistory: React.FC<ProcessingHistoryProps> = ({
  history,
  statusColorMap,
  userField = 'user',
  dateField = 'date',
  className = ''
}) => {
  // Parse date from various formats (Firestore timestamp, ISO string, Date object)
  const parseDate = (date: string | { seconds: number } | Date): string => {
    try {
      if (typeof date === 'string') {
        return new Date(date).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      } else if (date && typeof date === 'object' && 'seconds' in date) {
        return new Date(date.seconds * 1000).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      } else if (date instanceof Date) {
        return date.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      return '날짜 없음';
    } catch (error) {
      console.error('Date parsing error:', error);
      return '날짜 오류';
    }
  };

  // Get user name from the specified field
  const getUserName = (entry: HistoryEntry): string => {
    if (userField === 'by' && entry.by) {
      return entry.by;
    }
    return entry.user || entry.by || '알 수 없음';
  };

  // Get action/reason text
  const getActionText = (entry: HistoryEntry): string => {
    return entry.reason || entry.action || entry.comment || '';
  };

  if (!history || history.length === 0) {
    return (
      <div className={`text-sm text-muted-foreground ${className}`}>
        처리 이력이 없습니다.
      </div>
    );
  }

  return (
    <div className={`space-y-2 overflow-x-auto ${className}`}>
      <div className="text-sm font-medium text-foreground">처리 이력</div>
      <div className="w-full min-w-max">
        {history.map((entry, index) => (
          <div
            key={entry.id || index}
            className="flex items-center gap-3 bg-muted/50 rounded-lg px-4 py-3 text-sm w-full block mb-2"
          >
            <span className="text-muted-foreground whitespace-nowrap">
              {parseDate(entry[dateField])}
            </span>
            <span className="text-foreground font-medium whitespace-nowrap">
              {getUserName(entry)}
            </span>
            <Badge 
              variant="secondary" 
              className={`${getStatusColor(entry.status, statusColorMap)} whitespace-nowrap`}
            >
              {entry.status}
            </Badge>
            {getActionText(entry) && (
              <span className="text-muted-foreground flex-none whitespace-nowrap">
                {getActionText(entry)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProcessingHistory;
