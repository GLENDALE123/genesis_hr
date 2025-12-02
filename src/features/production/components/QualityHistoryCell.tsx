/**
 * 종합관리테이블용 품질이력 셀 컴포넌트
 * 
 * 수입검사, 공정검사, 출하검사를 각각 분리해서 표시
 * 각 타입별로 중요한 정보를 한눈에 확인할 수 있도록 설계
 */

import React, { useMemo, useState } from 'react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { AlertCircle, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { QualityInspectionItem } from '@/features/production/types/product.types';
import { QualityInspection } from '@/features/quality/types';
import { cn } from '@/shared/lib/utils';

interface QualityHistoryCellProps {
  qualityInspections: QualityInspectionItem[];
  fullQualityInspections?: QualityInspection[];
  onExpand?: () => void;
  isExpanded?: boolean;
  className?: string;
}

interface IncomingSummary {
  count: number;
  defectCount: number;
  defectRate: number;
  totalWithResult: number;
  totalWithoutResult: number;
  latestDate?: string;
  latestResult?: string;
  topDefectPatterns: Array<{ process: string; defect: string; count: number }>;
  latestAppearanceHistory?: string;
  latestFunctionHistory?: string;
}

interface InProcessSummary {
  count: number;
  defectCount: number;
  defectRate: number;
  totalWithResult: number;
  totalWithoutResult: number;
  // 공정이력에서 추출한 불량률 (더 정확할 수 있음)
  historyDefectRate?: number;
  historyDefectCount?: number;
  historyTotalCount?: number;
  latestDate?: string;
  latestResult?: string;
  inProcessHistorySummary?: string;
  preInspectionHistorySummary?: string;
  workLineDistribution: Record<string, number>;
  topDefectPatterns: Array<{ process: string; defect: string; count: number }>;
}

interface OutgoingSummary {
  count: number;
  defectCount: number;
  defectRate: number;
  totalWithResult: number;
  totalWithoutResult: number;
  latestDate?: string;
  latestResult?: string;
  totalWorkers: number;
  topDefectPatterns: Array<{ process: string; defect: string; count: number }>;
}

/**
 * 불량으로 간주되는 검사 결과
 * - 불합격: 명확한 불량
 * - 한도대기: 한도 승인 대기 중이므로 불량으로 간주
 * - 반출: 반출된 경우도 불량으로 간주할 수 있음 (확인 필요)
 */
const DEFECT_RESULTS = ['불합격', '한도대기', '반출'];

/**
 * 불량률 계산
 * result가 있는 검사만 대상으로 계산 (미지정 제외)
 */
function calculateDefectRate(inspections: QualityInspectionItem[]): {
  defectRate: number;
  defectCount: number;
  totalWithResult: number;
  totalWithoutResult: number;
} {
  if (inspections.length === 0) {
    return { defectRate: 0, defectCount: 0, totalWithResult: 0, totalWithoutResult: 0 };
  }
  
  // result가 있는 검사만 필터링
  const withResult = inspections.filter(i => i.result && i.result.trim() !== '');
  const withoutResult = inspections.length - withResult.length;
  
  if (withResult.length === 0) {
    return { defectRate: 0, defectCount: 0, totalWithResult: 0, totalWithoutResult: withoutResult };
  }
  
  const defectCount = withResult.filter(i => DEFECT_RESULTS.includes(i.result)).length;
  const defectRate = (defectCount / withResult.length) * 100;
  
  return { defectRate, defectCount, totalWithResult: withResult.length, totalWithoutResult: withoutResult };
}

/**
 * 공정검사이력 요약 추출 및 불량률 추출
 */
function extractInProcessHistorySummary(
  fullInspections?: QualityInspection[]
): {
  summary?: string;
  defectRate?: number;
  defectCount?: number;
  totalCount?: number;
} {
  if (!fullInspections || fullInspections.length === 0) {
    return {};
  }
  
  const inProcessInspections = fullInspections
    .filter(i => i.inspectionType === 'inProcess' && i.inProcessInspectionHistory)
    .sort((a, b) => {
      const dateA = a.inspectionDate || (a.createdAt ? a.createdAt.split('T')[0] : '');
      const dateB = b.inspectionDate || (b.createdAt ? b.createdAt.split('T')[0] : '');
      return dateB.localeCompare(dateA);
    });
  
  if (inProcessInspections.length === 0) return {};
  
  const latestHistory = inProcessInspections[0].inProcessInspectionHistory;
  if (!latestHistory) return {};
  
  // 패턴 1: "검사 300개중 불량 13개 총불량율 4.3%"
  const pattern1 = /검사\s*(\d+)개중\s*불량\s*(\d+)개.*?불량율\s*([\d.]+)%/;
  const match1 = latestHistory.match(pattern1);
  if (match1) {
    const total = parseInt(match1[1], 10);
    const defect = parseInt(match1[2], 10);
    const rate = parseFloat(match1[3]);
    const defectTypes = latestHistory.match(/불량유형\s*[:：]?\s*([^%\n]+)/);
    const types = defectTypes ? defectTypes[1].trim() : '';
    const summary = `${total}개중 ${defect}개 불량(${rate}%)${types ? ` - ${types}` : ''}`;
    return { summary, defectRate: rate, defectCount: defect, totalCount: total };
  }
  
  // 패턴 2: "300개 검사중 불량 13개 총불량율 4.3%"
  const pattern2 = /(\d+)개\s*검사중\s*불량\s*(\d+)개.*?불량율\s*([\d.]+)%/;
  const match2 = latestHistory.match(pattern2);
  if (match2) {
    const total = parseInt(match2[1], 10);
    const defect = parseInt(match2[2], 10);
    const rate = parseFloat(match2[3]);
    const defectTypes = latestHistory.match(/불량유형\s*[:：]?\s*([^%\n]+)/);
    const types = defectTypes ? defectTypes[1].trim() : '';
    const summary = `${total}개중 ${defect}개 불량(${rate}%)${types ? ` - ${types}` : ''}`;
    return { summary, defectRate: rate, defectCount: defect, totalCount: total };
  }
  
  // 패턴 3: "300검사중 불량13 불량율 0.04%"
  const pattern3 = /(\d+)검사중\s*불량(\d+).*?불량율\s*([\d.]+)%/;
  const match3 = latestHistory.match(pattern3);
  if (match3) {
    const total = parseInt(match3[1], 10);
    const defect = parseInt(match3[2], 10);
    const rate = parseFloat(match3[3]);
    const defectTypes = latestHistory.match(/([가-힣]+-\d+%)/g);
    const types = defectTypes ? defectTypes.join(', ') : '';
    const summary = `${total}개중 ${defect}개 불량(${rate}%)${types ? ` - ${types}` : ''}`;
    return { summary, defectRate: rate, defectCount: defect, totalCount: total };
  }
  
  // 기본: 요약만 반환
  const summary = latestHistory.length > 40 
    ? latestHistory.substring(0, 40) + '...'
    : latestHistory;
  return { summary };
}

/**
 * 수입검사 요약 계산
 */
function calculateIncomingSummary(
  inspections: QualityInspectionItem[],
  fullInspections?: QualityInspection[]
): IncomingSummary {
  const incoming = inspections.filter(i => i.inspectionType === 'incoming');
  
  const sorted = [...incoming].sort((a, b) => b.inspectionDate.localeCompare(a.inspectionDate));
  const latest = sorted[0];
  
  // 키워드 페어 분석
  const patternMap = new Map<string, number>();
  incoming.forEach(inspection => {
    if (inspection.keywordPairs) {
      inspection.keywordPairs.forEach(pair => {
        const key = `${pair.process}-${pair.defect}`;
        patternMap.set(key, (patternMap.get(key) || 0) + 1);
      });
    }
  });
  
  const topDefectPatterns = Array.from(patternMap.entries())
    .map(([key, count]) => {
      const [process, defect] = key.split('-');
      return { process, defect, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  
  // 최근 외관/기능 이력 추출
  const latestFull = fullInspections?.find(f => f.id === latest?.id);
  
  const defectStats = calculateDefectRate(incoming);
  
  return {
    count: incoming.length,
    defectCount: defectStats.defectCount,
    defectRate: defectStats.defectRate,
    totalWithResult: defectStats.totalWithResult,
    totalWithoutResult: defectStats.totalWithoutResult,
    latestDate: latest?.inspectionDate,
    latestResult: latest?.result,
    topDefectPatterns,
    latestAppearanceHistory: latestFull?.appearanceHistory,
    latestFunctionHistory: latestFull?.functionHistory
  };
}

/**
 * 공정검사 요약 계산
 */
function calculateInProcessSummary(
  inspections: QualityInspectionItem[],
  fullInspections?: QualityInspection[]
): InProcessSummary {
  const inProcess = inspections.filter(i => i.inspectionType === 'inProcess');
  
  const sorted = [...inProcess].sort((a, b) => b.inspectionDate.localeCompare(a.inspectionDate));
  const latest = sorted[0];
  
  // 작업라인별 분포
  const workLineDistribution: Record<string, number> = {};
  fullInspections?.forEach(full => {
    if (full.inspectionType === 'inProcess' && full.workLine) {
      workLineDistribution[full.workLine] = (workLineDistribution[full.workLine] || 0) + 1;
    }
  });
  
  // 키워드 페어 분석
  const patternMap = new Map<string, number>();
  inProcess.forEach(inspection => {
    if (inspection.keywordPairs) {
      inspection.keywordPairs.forEach(pair => {
        const key = `${pair.process}-${pair.defect}`;
        patternMap.set(key, (patternMap.get(key) || 0) + 1);
      });
    }
  });
  
  const topDefectPatterns = Array.from(patternMap.entries())
    .map(([key, count]) => {
      const [process, defect] = key.split('-');
      return { process, defect, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  
  // 공정검사이력 요약 및 불량률 추출
  const historyData = extractInProcessHistorySummary(fullInspections);
  
  // 사전검사이력 요약
  const latestFull = fullInspections?.find(f => f.id === latest?.id);
  const preInspectionHistorySummary = latestFull?.preInspectionHistory
    ? (latestFull.preInspectionHistory.length > 50 
        ? latestFull.preInspectionHistory.substring(0, 50) + '...'
        : latestFull.preInspectionHistory)
    : undefined;
  
  const defectStats = calculateDefectRate(inProcess);
  
  // 공정이력에서 불량률이 추출되면 그것을 우선 사용, 없으면 result 기반 불량률 사용
  const finalDefectRate = historyData.defectRate !== undefined 
    ? historyData.defectRate 
    : defectStats.defectRate;
  
  return {
    count: inProcess.length,
    defectCount: historyData.defectCount !== undefined 
      ? historyData.defectCount 
      : defectStats.defectCount,
    defectRate: finalDefectRate,
    totalWithResult: defectStats.totalWithResult,
    totalWithoutResult: defectStats.totalWithoutResult,
    historyDefectRate: historyData.defectRate,
    historyDefectCount: historyData.defectCount,
    historyTotalCount: historyData.totalCount,
    latestDate: latest?.inspectionDate,
    latestResult: latest?.result,
    inProcessHistorySummary: historyData.summary,
    preInspectionHistorySummary,
    workLineDistribution,
    topDefectPatterns
  };
}

/**
 * 출하검사 요약 계산
 */
function calculateOutgoingSummary(
  inspections: QualityInspectionItem[],
  fullInspections?: QualityInspection[]
): OutgoingSummary {
  const outgoing = inspections.filter(i => i.inspectionType === 'outgoing');
  
  const sorted = [...outgoing].sort((a, b) => b.inspectionDate.localeCompare(a.inspectionDate));
  const latest = sorted[0];
  
  // 작업자 수 계산
  let totalWorkers = 0;
  fullInspections?.forEach(full => {
    if (full.inspectionType === 'outgoing' && full.workers) {
      totalWorkers += full.workers.length;
    }
  });
  
  // 키워드 페어 분석
  const patternMap = new Map<string, number>();
  outgoing.forEach(inspection => {
    if (inspection.keywordPairs) {
      inspection.keywordPairs.forEach(pair => {
        const key = `${pair.process}-${pair.defect}`;
        patternMap.set(key, (patternMap.get(key) || 0) + 1);
      });
    }
  });
  
  const topDefectPatterns = Array.from(patternMap.entries())
    .map(([key, count]) => {
      const [process, defect] = key.split('-');
      return { process, defect, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  
  const defectStats = calculateDefectRate(outgoing);
  
  return {
    count: outgoing.length,
    defectCount: defectStats.defectCount,
    defectRate: defectStats.defectRate,
    totalWithResult: defectStats.totalWithResult,
    totalWithoutResult: defectStats.totalWithoutResult,
    latestDate: latest?.inspectionDate,
    latestResult: latest?.result,
    totalWorkers,
    topDefectPatterns
  };
}

function getDefectRateColor(rate: number): string {
  if (rate >= 20) return 'text-red-600 font-bold';
  if (rate >= 10) return 'text-orange-600 font-semibold';
  if (rate >= 5) return 'text-yellow-600';
  return 'text-green-600';
}

function getResultVariant(result?: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (!result) return 'outline';
  if (result === '합격') return 'default';
  if (DEFECT_RESULTS.includes(result)) return 'destructive';
  if (result === '한도승인') return 'secondary';
  return 'outline';
}

export const QualityHistoryCell: React.FC<QualityHistoryCellProps> = ({
  qualityInspections,
  fullQualityInspections,
  onExpand,
  isExpanded = false,
  className
}) => {
  const [expandedSections, setExpandedSections] = useState<{
    incoming: boolean;
    inProcess: boolean;
    outgoing: boolean;
  }>({
    incoming: false,
    inProcess: false,
    outgoing: false
  });

  const incomingSummary = useMemo(() => 
    calculateIncomingSummary(qualityInspections, fullQualityInspections),
    [qualityInspections, fullQualityInspections]
  );

  const inProcessSummary = useMemo(() => 
    calculateInProcessSummary(qualityInspections, fullQualityInspections),
    [qualityInspections, fullQualityInspections]
  );

  const outgoingSummary = useMemo(() => 
    calculateOutgoingSummary(qualityInspections, fullQualityInspections),
    [qualityInspections, fullQualityInspections]
  );

  const totalDefectStats = useMemo(() => {
    return calculateDefectRate(qualityInspections);
  }, [qualityInspections]);

  if (qualityInspections.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        품질이력 없음
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* 수입검사 섹션 */}
      {incomingSummary.count > 0 && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">수입검사 ({incomingSummary.count}건)</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setExpandedSections(prev => ({ ...prev, incoming: !prev.incoming }))}
              >
                {expandedSections.incoming ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {incomingSummary.latestDate && (
                <span className="text-muted-foreground">
                  최근: {incomingSummary.latestDate}
                </span>
              )}
              {incomingSummary.latestResult && (
                <Badge variant={getResultVariant(incomingSummary.latestResult)} className="text-xs">
                  {incomingSummary.latestResult}
                </Badge>
              )}
              <span className={cn("font-semibold", getDefectRateColor(incomingSummary.defectRate))}>
                불량률: {incomingSummary.defectRate.toFixed(1)}%
              </span>
              {incomingSummary.totalWithoutResult > 0 && (
                <span className="text-xs text-muted-foreground">
                  (미지정 {incomingSummary.totalWithoutResult}건)
                </span>
              )}
            </div>

            {incomingSummary.topDefectPatterns.length > 0 && (
              <div className="text-xs">
                <span className="text-muted-foreground">주요불량: </span>
                {incomingSummary.topDefectPatterns.map((pattern, idx) => (
                  <span key={idx} className="text-muted-foreground">
                    {pattern.process}→{pattern.defect}({pattern.count})
                    {idx < incomingSummary.topDefectPatterns.length - 1 && ', '}
                  </span>
                ))}
              </div>
            )}

            {expandedSections.incoming && (
              <div className="space-y-2 pt-2 border-t">
                {incomingSummary.latestAppearanceHistory && (
                  <div className="text-xs">
                    <span className="font-medium">외관이력: </span>
                    <span className="text-muted-foreground">
                      {incomingSummary.latestAppearanceHistory.length > 100
                        ? incomingSummary.latestAppearanceHistory.substring(0, 100) + '...'
                        : incomingSummary.latestAppearanceHistory}
                    </span>
                  </div>
                )}
                {incomingSummary.latestFunctionHistory && (
                  <div className="text-xs">
                    <span className="font-medium">기능이력: </span>
                    <span className="text-muted-foreground">
                      {incomingSummary.latestFunctionHistory.length > 100
                        ? incomingSummary.latestFunctionHistory.substring(0, 100) + '...'
                        : incomingSummary.latestFunctionHistory}
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 공정검사 섹션 */}
      {inProcessSummary.count > 0 && (
        <Card className={cn(
          "border-l-4",
          inProcessSummary.defectRate >= 10 ? "border-l-orange-500" : "border-l-orange-400"
        )}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">공정검사 ({inProcessSummary.count}건)</CardTitle>
                {inProcessSummary.defectRate >= 10 && (
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setExpandedSections(prev => ({ ...prev, inProcess: !prev.inProcess }))}
              >
                {expandedSections.inProcess ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {inProcessSummary.latestDate && (
                <span className="text-muted-foreground">
                  최근: {inProcessSummary.latestDate}
                </span>
              )}
              {inProcessSummary.latestResult && (
                <Badge variant={getResultVariant(inProcessSummary.latestResult)} className="text-xs">
                  {inProcessSummary.latestResult}
                </Badge>
              )}
              <span className={cn("font-semibold", getDefectRateColor(inProcessSummary.defectRate))}>
                불량률: {inProcessSummary.defectRate.toFixed(1)}%
              </span>
              {inProcessSummary.totalWithoutResult > 0 && (
                <span className="text-xs text-muted-foreground">
                  (미지정 {inProcessSummary.totalWithoutResult}건)
                </span>
              )}
            </div>

            {inProcessSummary.inProcessHistorySummary && (
              <div className="text-xs">
                <span className="font-medium">공정이력: </span>
                <span className="text-muted-foreground">{inProcessSummary.inProcessHistorySummary}</span>
              </div>
            )}

            {inProcessSummary.preInspectionHistorySummary && (
              <div className="text-xs">
                <span className="font-medium">사전이력: </span>
                <span className="text-muted-foreground">{inProcessSummary.preInspectionHistorySummary}</span>
              </div>
            )}

            {Object.keys(inProcessSummary.workLineDistribution).length > 0 && (
              <div className="text-xs">
                <span className="font-medium">작업라인: </span>
                <span className="text-muted-foreground">
                  {Object.entries(inProcessSummary.workLineDistribution)
                    .map(([line, count]) => `${line}(${count}건)`)
                    .join(', ')}
                </span>
              </div>
            )}

            {inProcessSummary.topDefectPatterns.length > 0 && (
              <div className="text-xs">
                <span className="text-muted-foreground">주요불량: </span>
                {inProcessSummary.topDefectPatterns.map((pattern, idx) => (
                  <span key={idx} className="text-muted-foreground">
                    {pattern.process}→{pattern.defect}({pattern.count})
                    {idx < inProcessSummary.topDefectPatterns.length - 1 && ', '}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 출하검사 섹션 */}
      {outgoingSummary.count > 0 && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">출하검사 ({outgoingSummary.count}건)</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setExpandedSections(prev => ({ ...prev, outgoing: !prev.outgoing }))}
              >
                {expandedSections.outgoing ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {outgoingSummary.latestDate && (
                <span className="text-muted-foreground">
                  최근: {outgoingSummary.latestDate}
                </span>
              )}
              {outgoingSummary.latestResult && (
                <Badge variant={getResultVariant(outgoingSummary.latestResult)} className="text-xs">
                  {outgoingSummary.latestResult}
                </Badge>
              )}
              <span className={cn("font-semibold", getDefectRateColor(outgoingSummary.defectRate))}>
                불량률: {outgoingSummary.defectRate.toFixed(1)}%
              </span>
              {outgoingSummary.totalWithoutResult > 0 && (
                <span className="text-xs text-muted-foreground">
                  (미지정 {outgoingSummary.totalWithoutResult}건)
                </span>
              )}
            </div>

            {outgoingSummary.totalWorkers > 0 && (
              <div className="text-xs">
                <span className="font-medium">작업자: </span>
                <span className="text-muted-foreground">{outgoingSummary.totalWorkers}명 검사 완료</span>
              </div>
            )}

            {outgoingSummary.topDefectPatterns.length > 0 ? (
              <div className="text-xs">
                <span className="text-muted-foreground">주요불량: </span>
                {outgoingSummary.topDefectPatterns.map((pattern, idx) => (
                  <span key={idx} className="text-muted-foreground">
                    {pattern.process}→{pattern.defect}({pattern.count})
                    {idx < outgoingSummary.topDefectPatterns.length - 1 && ', '}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">주요불량: 없음</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 전체 요약 */}
      <div className="pt-2 border-t">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold">전체 불량률: </span>
          <span className={cn("font-semibold", getDefectRateColor(totalDefectStats.defectRate))}>
            {totalDefectStats.defectRate.toFixed(1)}%
          </span>
          {totalDefectStats.totalWithoutResult > 0 && (
            <span className="text-muted-foreground">
              (미지정 {totalDefectStats.totalWithoutResult}건)
            </span>
          )}
          {totalDefectStats.defectRate >= 10 && (
            <AlertCircle className="h-3 w-3 text-red-500" />
          )}
        </div>
      </div>
    </div>
  );
};
