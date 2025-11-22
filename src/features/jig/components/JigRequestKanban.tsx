
import React, { useMemo } from 'react';
import { JigRequest, JigStatus } from '../types';
import { JigRequestCard } from './JigRequestCard';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { STATUS_COLORS } from '../constants';
import { STATUS_FILTERS } from '../constants';

interface JigRequestKanbanProps {
  requests: JigRequest[];
  onSelectRequest: (request: JigRequest) => void;
}

export const JigRequestKanban: React.FC<JigRequestKanbanProps> = ({ requests, onSelectRequest }) => {
  const groupedRequests = useMemo(() => {
    return STATUS_FILTERS.reduce((acc, status) => {
      acc[status] = requests.filter(req => req.status === status);
      return acc;
    }, {} as Record<JigStatus, JigRequest[]>);
  }, [requests]);

  return (
    <ScrollArea className="h-full whitespace-nowrap">
      <div className="flex space-x-4 p-2 h-full">
        {STATUS_FILTERS.map(status => (
          <Card key={status} className="flex-shrink-0 w-80 h-full flex flex-col">
            <CardHeader className={`py-3 px-4 border-b`} style={{ backgroundColor: STATUS_COLORS[status] + '20' }}>
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <span style={{ color: STATUS_COLORS[status] }}>{status}</span>
                <span className="text-sm font-normal opacity-80">{groupedRequests[status].length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-3 space-y-3">
              {groupedRequests[status].length > 0 ? (
                groupedRequests[status].map(request => (
                  <JigRequestCard key={request.id} request={request} onSelect={onSelectRequest} />
                ))
              ) : (
                <p className="text-center text-sm text-muted-foreground py-4">요청 없음</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
};

