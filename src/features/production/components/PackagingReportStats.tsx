
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Users, 
  Calendar,
  BarChart3
} from 'lucide-react';
import { ProductionReportStatsData as StatsType } from '@/features/production/types';

interface PackagingReportStatsProps {
  stats: StatsType | null;
}

export const PackagingReportStats: React.FC<PackagingReportStatsProps> = ({ stats }) => {
  if (!stats) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">통계 데이터를 불러오는 중...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 주요 지표 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">총 생산일보</p>
                <p className="text-2xl font-bold">{stats.totalReports}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">총 투입수량</p>
                <p className="text-2xl font-bold">{stats.totalInputQuantity.toLocaleString()}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">총 양품수량</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalGoodQuantity.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">총 불량수량</p>
                <p className="text-2xl font-bold text-red-600">{stats.totalDefectQuantity.toLocaleString()}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 수율 및 불량률 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              평균 수율
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">
                {stats.averageYieldRate.toFixed(1)}%
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                전체 생산 대비 양품 비율
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              평균 불량률
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-4xl font-bold text-red-600 mb-2">
                {stats.averageDefectRate.toFixed(1)}%
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                전체 생산 대비 불량 비율
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 생산라인별 통계 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            생산라인별 통계
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.topProductionLines.map((line: { line: string; count: number; totalQuantity: number }, index: number) => (
              <div key={line.line} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant={index < 3 ? "default" : "secondary"}>
                    {index + 1}위
                  </Badge>
                  <span className="font-medium">{line.line}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{line.count}건</p>
                  <p className="text-xs text-muted-foreground">
                    {line.totalQuantity.toLocaleString()}개
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 발주처별 통계 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            발주처별 통계
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.topSuppliers.map((supplier: { supplier: string; count: number; totalQuantity: number }, index: number) => (
              <div key={supplier.supplier} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant={index < 3 ? "default" : "secondary"}>
                    {index + 1}위
                  </Badge>
                  <span className="font-medium">{supplier.supplier}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{supplier.count}건</p>
                  <p className="text-xs text-muted-foreground">
                    {supplier.totalQuantity.toLocaleString()}개
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


