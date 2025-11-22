/**
 * 샘플 실시간 현황 보드 컴포넌트
 * HS-Jig StatusBoard 참고 (코팅방식 x 상태 매트릭스)
 */


import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { cn } from '@/shared/lib/utils';
import { SampleRequest, SampleStatus } from '../types';
import { SAMPLE_STATUS_FILTERS, COATING_METHODS } from '../constants';

interface SampleStatusBoardProps {
  requests: SampleRequest[];
  onCellClick: (status: SampleStatus, coatingMethod: string) => void;
}

export const SampleStatusBoard: React.FC<SampleStatusBoardProps> = ({
  requests,
  onCellClick
}) => {
  // 코팅방식 x 상태별 카운트 계산
  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    
    requests.forEach(req => {
      // 각 요청의 고유한 코팅방식 추출
      const uniqueMethods = new Set(req.items.map(item => item.coatingMethod));
      
      uniqueMethods.forEach(method => {
        if (COATING_METHODS.includes(method as string)) {
          const key = `${method}-${req.status}`;
          counts.set(key, (counts.get(key) || 0) + 1);
        }
      });
    });
    
    return counts;
  }, [requests]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>실시간 샘플 현황 보드</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-center border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="p-2 border text-sm font-medium">코팅/증착 방식</th>
                {SAMPLE_STATUS_FILTERS.map(status => (
                  <th key={status} className="p-2 border text-sm font-medium">
                    {status}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COATING_METHODS.map(method => (
                <tr key={method}>
                  <td className="p-2 border font-semibold">{method}</td>
                  {SAMPLE_STATUS_FILTERS.map(status => {
                    const count = statusCounts.get(`${method}-${status}`) || 0;
                    return (
                      <td
                        key={status}
                        className={cn(
                          'p-2 border',
                          count > 0 && 'cursor-pointer xl:hover:bg-muted/50 transition-colors'
                        )}
                        onClick={() => count > 0 && onCellClick(status, method)}
                      >
                        <span
                          className={cn(
                            'font-bold text-lg',
                            count > 0 ? 'text-primary' : 'text-muted-foreground'
                          )}
                        >
                          {count}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};


