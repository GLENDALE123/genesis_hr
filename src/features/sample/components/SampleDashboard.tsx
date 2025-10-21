/**
 * 샘플센터 대시보드 컴포넌트
 * HS-Jig SampleCenter 대시보드 뷰 참고
 */

'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Archive, Clock, TrendingUp, CheckCircle } from 'lucide-react';
import { SampleKpiCard } from './SampleKpiCard';
import { SampleStatusBoard } from './SampleStatusBoard';
import dynamic from 'next/dynamic';

// 차트 컴포넌트를 동적 임포트로 분할
const DynamicSimpleBarChart = dynamic(() => import('./SimpleBarChart'), {
  ssr: false,
  loading: () => <div className="h-32 flex items-center justify-center text-muted-foreground">차트 로딩 중...</div>
});
import { SampleRequest, SampleStatus } from '../types';
import { SAMPLE_STATUS_COLORS } from '../constants';

interface SampleDashboardProps {
  requests: SampleRequest[];
  onSelectRequest: (request: SampleRequest) => void;
  onQuickFilter: (status: SampleStatus, coatingMethod: string) => void;
}

export const SampleDashboard: React.FC<SampleDashboardProps> = ({
  requests,
  onSelectRequest,
  onQuickFilter
}) => {
  // KPI 데이터 계산
  const kpiData = useMemo(() => {
    const total = requests.length;
    const received = requests.filter(r => r.status === SampleStatus.Received).length;
    const inProgress = requests.filter(r => r.status === SampleStatus.InProgress).length;
    
    // 이달 완료 건수
    const completedThisMonth = requests.filter(r => {
      if (r.status !== SampleStatus.Completed) return false;
      const completedAction = r.history.find(h => h.status === SampleStatus.Completed);
      if (!completedAction) return false;
      const completedDate = new Date(completedAction.date);
      const today = new Date();
      return (
        completedDate.getMonth() === today.getMonth() &&
        completedDate.getFullYear() === today.getFullYear()
      );
    }).length;

    return { total, received, inProgress, completedThisMonth };
  }, [requests]);

  // 차트 데이터 계산
  const chartData = useMemo(() => {
    const clientCounts = new Map<string, number>();
    const requesterCounts = new Map<string, number>();
    const coatingCounts = new Map<string, number>();

    requests.forEach(req => {
      // 고객사별 카운트
      clientCounts.set(req.clientName, (clientCounts.get(req.clientName) || 0) + 1);
      
      // 담당자별 카운트
      requesterCounts.set(
        req.requesterInfo.displayName,
        (requesterCounts.get(req.requesterInfo.displayName) || 0) + 1
      );
      
      // 코팅방식별 카운트
      req.items.forEach(item => {
        if (item.coatingMethod) {
          coatingCounts.set(
            item.coatingMethod,
            (coatingCounts.get(item.coatingMethod) || 0) + 1
          );
        }
      });
    });

    const sortAndSlice = (map: Map<string, number>) =>
      Array.from(map.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    return {
      clients: sortAndSlice(clientCounts),
      requesters: sortAndSlice(requesterCounts),
      coatings: sortAndSlice(coatingCounts),
    };
  }, [requests]);

  // 최근 요청 5건
  const recentRequests = useMemo(() => {
    return [...requests]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [requests]);

  return (
    <div className="space-y-4">
      {/* KPI 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SampleKpiCard
          title="총 요청"
          value={kpiData.total}
          icon={<Archive className="h-8 w-8 text-blue-500" />}
        />
        <SampleKpiCard
          title="신규 접수"
          value={kpiData.received}
          icon={<Clock className="h-8 w-8 text-yellow-500" />}
        />
        <SampleKpiCard
          title="진행중"
          value={kpiData.inProgress}
          icon={<TrendingUp className="h-8 w-8 text-cyan-500" />}
        />
        <SampleKpiCard
          title="이달 완료"
          value={kpiData.completedThisMonth}
          icon={<CheckCircle className="h-8 w-8 text-green-500" />}
        />
      </div>

      {/* 실시간 현황 보드 */}
      <SampleStatusBoard requests={requests} onCellClick={onQuickFilter} />

      {/* 차트 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 최근 요청 5건 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>최근 요청 5건</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentRequests.map(req => (
                <div
                  key={req.id}
                  onClick={() => onSelectRequest(req)}
                  className="p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <p className="font-semibold truncate">
                      {req.productName} ({req.clientName})
                    </p>
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                        SAMPLE_STATUS_COLORS[req.status]
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(req.createdAt).toLocaleDateString('ko-KR')} by{' '}
                    {req.requesterInfo.displayName}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 고객사별 Top 5 */}
        <Card>
          <CardHeader>
            <CardTitle>고객사별 요청 Top 5</CardTitle>
          </CardHeader>
          <CardContent>
            <DynamicSimpleBarChart data={chartData.clients} colorClass="bg-blue-500" />
          </CardContent>
        </Card>

        {/* 담당자별 Top 5 */}
        <Card>
          <CardHeader>
            <CardTitle>요청 담당자별 Top 5</CardTitle>
          </CardHeader>
          <CardContent>
            <DynamicSimpleBarChart data={chartData.requesters} colorClass="bg-green-500" />
          </CardContent>
        </Card>

        {/* 코팅방식별 Top 5 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>코팅/증착 방식별 Top 5</CardTitle>
          </CardHeader>
          <CardContent>
            <DynamicSimpleBarChart data={chartData.coatings} colorClass="bg-purple-500" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

