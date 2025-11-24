'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Separator } from '@/shared/components/ui/separator';
import { QualityInspection } from '../types';
import { INSPECTION_TYPE_LABELS, INSPECTION_TYPE_COLORS, INSPECTION_RESULT_COLORS } from '../constants';
import { InspectionSummary } from '@/shared/services/gemini/geminiService';
import { cn } from '@/shared/lib/utils';
import { Loader2, AlertTriangle, CheckCircle2, FileText, Sparkles } from 'lucide-react';

interface InspectionHistorySummaryProps {
  inspections: QualityInspection[];
  summary: InspectionSummary | null;
  isLoading: boolean;
  isAnalyzing: boolean;
  supplier?: string;
  productName?: string;
  partName?: string;
  onInspectionClick?: (inspection: QualityInspection) => void;
}

/**
 * 품질 이력 종합 요약 컴포넌트
 * - 통계 정보
 * - 최근 이력 목록
 * - 불량 이력
 * - Gemini AI 요약 및 주의사항
 */
export const InspectionHistorySummary: React.FC<InspectionHistorySummaryProps> = ({
  inspections,
  summary,
  isLoading,
  isAnalyzing,
  supplier,
  productName,
  partName,
  onInspectionClick,
}) => {
  // 통계 계산
  const stats = useMemo(() => {
    const total = inspections.length;
    const byType = {
      incoming: inspections.filter((i) => i.inspectionType === 'incoming').length,
      inProcess: inspections.filter((i) => i.inspectionType === 'inProcess').length,
      outgoing: inspections.filter((i) => i.inspectionType === 'outgoing').length,
    };
    const passed = inspections.filter((i) => i.result === '합격').length;
    const failed = inspections.filter((i) => i.result === '불합격').length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

    return {
      total,
      byType,
      passed,
      failed,
      passRate,
    };
  }, [inspections]);

  // 최근 이력 목록 (최대 10개, 날짜순 정렬)
  const recentInspections = useMemo(() => {
    return [...inspections]
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || a.inspectionDate || '').getTime();
        const dateB = new Date(b.createdAt || b.inspectionDate || '').getTime();
        return dateB - dateA;
      })
      .slice(0, 10);
  }, [inspections]);

  // 불량 이력 (불합격만)
  const failedInspections = useMemo(() => {
    return inspections.filter((i) => i.result === '불합격');
  }, [inspections]);

  // 날짜 포맷팅
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  // 검사 타입 라벨
  const getInspectionTypeLabel = (type: string) => {
    return INSPECTION_TYPE_LABELS[type as keyof typeof INSPECTION_TYPE_LABELS] || type;
  };

  // 클라이언트 사이드 즉시 요약 계산
  const instantSummary = useMemo(() => {
    if (!inspections || inspections.length === 0) return null;

    // 1. 주요 불량 키워드 추출 (Top 3)
    const defectCounts: Record<string, number> = {};
    inspections.forEach(i => {
      if (i.result === '불합격' && i.keywordPairs) {
        i.keywordPairs.forEach(pair => {
          // process나 defect 중 하나라도 있으면 키 생성
          if (pair.defect) {
            const key = pair.process ? `${pair.process}-${pair.defect}` : pair.defect;
            defectCounts[key] = (defectCounts[key] || 0) + 1;
          }
        });
      }
    });
    
    const topDefects = Object.entries(defectCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([key, count]) => `${key}(${count}건)`);

    // 2. 최근 경향 (최근 5건)
    // 주의: 원본 배열을 변경하지 않도록 복사 후 정렬
    const recentTrend = [...inspections]
      .sort((a, b) => {
        const dateA = new Date(a.inspectionDate || a.createdAt || '').getTime();
        const dateB = new Date(b.inspectionDate || b.createdAt || '').getTime();
        return dateB - dateA;
      })
      .slice(0, 5)
      .map(i => i.result === '합격' ? 'O' : 'X')
      .join(' → ');

    // 3. 공정별 불량률
    const processFailures = inspections.filter(i => i.inspectionType === 'inProcess' && i.result === '불합격').length;
    const processTotal = inspections.filter(i => i.inspectionType === 'inProcess').length;
    const processRate = processTotal > 0 ? Math.round((processFailures / processTotal) * 100) : 0;

    return {
      topDefects,
      recentTrend,
      processRate
    };
  }, [inspections]);


  // 차트 색상 팔레트
  const CHART_COLORS = [
    '#ef4444', // red-500
    '#f97316', // orange-500
    '#eab308', // yellow-500
    '#22c55e', // green-500
    '#3b82f6', // blue-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
    '#84cc16', // lime-500
    '#f59e0b', // amber-500
  ];

  // 텍스트 강조 헬퍼 함수
  const highlightText = (text: string) => {
    if (!text) return null;
    
    // 정규식 패턴
    // 1. 대괄호 태그: [내용]
    // 2. 퍼센트: 숫자%
    // 3. 건수: (숫자건)
    // 4. 핵심 키워드: 불량, 주의, 위험
    const parts = text.split(/(\[.*?\]|\d+\.?\d*%|\(\d+건\)|불량|주의|위험)/g);
    
    return parts.map((part, index) => {
      if (part.match(/^\[.*?\]$/)) {
        return <span key={index} className="font-bold text-foreground mx-1">{part}</span>;
      }
      if (part.match(/^\d+\.?\d*%$/)) {
        return <span key={index} className="font-bold text-red-600 dark:text-red-400">{part}</span>;
      }
      if (part.match(/^\(\d+건\)$/)) {
        return <span key={index} className="font-bold text-blue-600 dark:text-blue-400">{part}</span>;
      }
      if (part.match(/^(불량|주의|위험)$/)) {
        return <span key={index} className="text-red-500 font-medium">{part}</span>;
      }
      return part;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">이력 조회 중...</p>
        </div>
      </div>
    );
  }

  if (inspections.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">조건에 맞는 이력이 없습니다.</p>
          <p className="text-xs mt-1">발주처, 제품명, 부속명을 입력해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        {/* Gemini AI 요약 */}
        {isAnalyzing && !summary && (
          <Card className="border-dashed">
            <CardContent className="py-4">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>AI가 심층 분석 중입니다...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {summary && (
          <Card className="border-purple-200 dark:border-purple-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                AI 심층 분석
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 종합 요약 */}
              {summary.summary && (
                <div>
                  <h4 className="text-xs font-medium mb-2 text-muted-foreground">요약</h4>
                  <p className="text-sm leading-relaxed">{highlightText(summary.summary)}</p>
                </div>
              )}

              {/* 주의사항 */}
              {summary.warnings && summary.warnings.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium mb-2 text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-orange-500" />
                    주의사항
                  </h4>
                  <ul className="space-y-1">
                    {summary.warnings.map((warning, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-orange-500 mt-1">•</span>
                        <span>{highlightText(warning)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 체크리스트 */}
              {summary.checklist && summary.checklist.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium mb-2 text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    다음 작업 체크리스트
                  </h4>
                  <ul className="space-y-1">
                    {summary.checklist.map((item, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-green-500 mt-1">✓</span>
                        <span>{highlightText(item)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 불량 이력 */}
        {failedInspections.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                불량 이력 ({failedInspections.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {failedInspections.slice(0, 5).map((inspection) => (
                  <div
                    key={inspection.id}
                    className={cn(
                      'p-2 rounded-md border border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 cursor-pointer hover:bg-red-100/50 dark:hover:bg-red-900/20 transition-colors',
                      onInspectionClick && 'cursor-pointer'
                    )}
                    onClick={() => onInspectionClick?.(inspection)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          INSPECTION_TYPE_COLORS[inspection.inspectionType as keyof typeof INSPECTION_TYPE_COLORS]
                        )}
                      >
                        {getInspectionTypeLabel(inspection.inspectionType)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(inspection.inspectionDate || inspection.createdAt)}
                      </span>
                    </div>
                    {inspection.resultReason && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {inspection.resultReason}
                      </p>
                    )}
                    {inspection.keywordPairs && inspection.keywordPairs.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {inspection.keywordPairs.slice(0, 3).map((pair, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {pair.process} - {pair.defect}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 최근 이력 목록 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">최근 이력</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentInspections.map((inspection) => (
                <div
                  key={inspection.id}
                  className={cn(
                    'p-2 rounded-md border hover:bg-muted/50 transition-colors',
                    onInspectionClick && 'cursor-pointer'
                  )}
                  onClick={() => onInspectionClick?.(inspection)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          INSPECTION_TYPE_COLORS[inspection.inspectionType as keyof typeof INSPECTION_TYPE_COLORS]
                        )}
                      >
                        {getInspectionTypeLabel(inspection.inspectionType)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          INSPECTION_RESULT_COLORS[inspection.result as keyof typeof INSPECTION_RESULT_COLORS] ||
                            'bg-gray-100 text-gray-800'
                        )}
                      >
                        {inspection.result}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(inspection.inspectionDate || inspection.createdAt)}
                    </span>
                  </div>
                  {inspection.orderNumber && (
                    <p className="text-xs text-muted-foreground">발주번호: {inspection.orderNumber}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};

