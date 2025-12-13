/**
 * AI 분석 탭 컴포넌트
 * 시각적으로 한눈에 파악 가능한 AI 분석 결과 표시
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Sparkles, TrendingUp, TrendingDown, Users, AlertTriangle, Settings, Palette, CheckCircle, XCircle } from 'lucide-react';
import { ParsedAIAnalysis } from '../utils/parseAIAnalysis';
import { cn } from '@/shared/lib/utils';

interface AIAnalysisTabProps {
  analysis: ParsedAIAnalysis | null;
  isLoading: boolean;
}

export const AIAnalysisTab: React.FC<AIAnalysisTabProps> = ({ analysis, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Sparkles className="h-12 w-12 mb-3 opacity-50" />
        <p className="text-sm font-medium">분석 데이터가 부족합니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 핵심 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              평균 인당생산량
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analysis.summary.average !== null ? analysis.summary.average.toFixed(1) : '-'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              최대값
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analysis.summary.max !== null ? analysis.summary.max.toFixed(1) : '-'}
            </div>
            {analysis.summary.maxDate && (
              <div className="text-xs text-muted-foreground mt-1">{analysis.summary.maxDate}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              최소값
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {analysis.summary.min !== null ? analysis.summary.min.toFixed(1) : '-'}
            </div>
            {analysis.summary.minDate && (
              <div className="text-xs text-muted-foreground mt-1">{analysis.summary.minDate}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              변동폭
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {analysis.summary.volatility !== null ? analysis.summary.volatility.toFixed(1) : '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 전반적 추세 */}
      {analysis.summary.trend && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">전반적 추세</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">{analysis.summary.trend}</p>
          </CardContent>
        </Card>
      )}

      {/* 주요 변화 시점 */}
      {analysis.majorChanges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">주요 변화 시점</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[15%]">날짜</TableHead>
                    <TableHead className="w-[15%] text-right">인당생산량</TableHead>
                    <TableHead className="w-[10%] text-center">변화</TableHead>
                    <TableHead className="w-[60%]">주요 원인</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysis.majorChanges.map((change, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{change.date}</TableCell>
                      <TableCell className="text-right font-semibold">{change.value.toFixed(1)}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={change.change === '증가' ? 'default' : 'destructive'}
                          className="flex items-center gap-1 w-fit mx-auto"
                        >
                          {change.change === '증가' ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {change.change}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{change.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 주요 요인 분석 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 생산 인원 */}
        {analysis.factors.personnel.average !== null && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                생산 인원
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">평균</span>
                <span className="text-lg font-bold">{analysis.factors.personnel.average.toFixed(1)}명</span>
              </div>
              {analysis.factors.personnel.high && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">고인원 ({analysis.factors.personnel.high.count}명↑)</span>
                  <span className="text-base font-semibold text-green-600">{analysis.factors.personnel.high.value.toFixed(1)}</span>
                </div>
              )}
              {analysis.factors.personnel.low && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">저인원 ({analysis.factors.personnel.low.count}명↓)</span>
                  <span className="text-base font-semibold text-red-600">{analysis.factors.personnel.low.value.toFixed(1)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 불량률 */}
        {analysis.factors.defectRate.average !== null && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                불량률
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">평균</span>
                <span className="text-lg font-bold">{analysis.factors.defectRate.average.toFixed(1)}%</span>
              </div>
              {analysis.factors.defectRate.high && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">최고 ({analysis.factors.defectRate.high.date})</span>
                  <span className="text-base font-semibold text-red-600">
                    {analysis.factors.defectRate.high.rate.toFixed(1)}% ({analysis.factors.defectRate.high.value.toFixed(1)})
                  </span>
                </div>
              )}
              {analysis.factors.defectRate.low && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">최저 ({analysis.factors.defectRate.low.date})</span>
                  <span className="text-base font-semibold text-green-600">
                    {analysis.factors.defectRate.low.rate.toFixed(1)}% ({analysis.factors.defectRate.low.value.toFixed(1)})
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* 패턴 분석 */}
      {(analysis.patterns.high.dates.length > 0 || analysis.patterns.low.dates.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 고생산량 날 특징 */}
          {analysis.patterns.high.dates.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  고생산량 날 특징
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs text-muted-foreground mb-2">
                  날짜: {analysis.patterns.high.dates.join(', ')}
                </div>
                <div className="space-y-1">
                  {analysis.patterns.high.features.map((feature, idx) => (
                    <Badge key={idx} variant="outline" className="mr-1 mb-1">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 저생산량 날 특징 */}
          {analysis.patterns.low.dates.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  저생산량 날 특징
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs text-muted-foreground mb-2">
                  날짜: {analysis.patterns.low.dates.join(', ')}
                </div>
                <div className="space-y-1">
                  {analysis.patterns.low.features.map((feature, idx) => (
                    <Badge key={idx} variant="outline" className="mr-1 mb-1">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 위험 요소 */}
      {analysis.risks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              위험 요소
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[15%]">날짜</TableHead>
                    <TableHead className="w-[15%] text-right">인당생산량</TableHead>
                    <TableHead className="w-[70%]">동시 발생 현상</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysis.risks.map((risk, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{risk.date}</TableCell>
                      <TableCell className="text-right font-semibold text-red-600">{risk.value.toFixed(1)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {risk.events.map((event, eventIdx) => (
                            <Badge key={eventIdx} variant="destructive" className="text-xs">
                              {event}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};





