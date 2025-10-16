'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { History, Download, Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { DatePickerWithRange } from '@/shared/components/ui/date-range-picker';
import { addDays, format } from 'date-fns';

// 임시 데이터
const qualityHistory = [
  {
    id: 'QH-001',
    productName: '제품 A',
    batchNumber: 'BATCH-2024-001',
    testDate: '2024-01-15',
    testType: '외관검사',
    result: 'pass',
    inspector: '김검사',
    details: '표면 품질 양호',
    notes: '특이사항 없음'
  },
  {
    id: 'QH-002',
    productName: '제품 B',
    batchNumber: 'BATCH-2024-002',
    testDate: '2024-01-14',
    testType: '치수검사',
    result: 'fail',
    inspector: '이검사',
    details: '치수 불량 발견',
    notes: '재가공 필요'
  },
  {
    id: 'QH-003',
    productName: '제품 C',
    batchNumber: 'BATCH-2024-003',
    testDate: '2024-01-13',
    testType: '색상검사',
    result: 'pass',
    inspector: '박검사',
    details: '색상 일치',
    notes: '표준 색상과 일치'
  },
  {
    id: 'QH-004',
    productName: '제품 D',
    batchNumber: 'BATCH-2024-004',
    testDate: '2024-01-12',
    testType: '기능검사',
    result: 'warning',
    inspector: '최검사',
    details: '기능 정상이나 성능 저하',
    notes: '모니터링 필요'
  }
];

const getResultColor = (result: string) => {
  switch (result) {
    case 'pass':
      return 'bg-green-100 text-green-800';
    case 'fail':
      return 'bg-red-100 text-red-800';
    case 'warning':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getResultText = (result: string) => {
  switch (result) {
    case 'pass':
      return '합격';
    case 'fail':
      return '불합격';
    case 'warning':
      return '주의';
    default:
      return result;
  }
};

const getResultIcon = (result: string) => {
  switch (result) {
    case 'pass':
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    case 'fail':
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    case 'warning':
      return <Minus className="h-4 w-4 text-yellow-600" />;
    default:
      return null;
  }
};

export default function QualityHistoryPage() {
  const [dateRange, setDateRange] = useState({
    from: addDays(new Date(), -30),
    to: new Date()
  });
  const [selectedTestType, setSelectedTestType] = useState<string>('all');
  const [selectedResult, setSelectedResult] = useState<string>('all');

  // 통계 계산
  const totalTests = qualityHistory.length;
  const passCount = qualityHistory.filter(h => h.result === 'pass').length;
  const failCount = qualityHistory.filter(h => h.result === 'fail').length;
  const warningCount = qualityHistory.filter(h => h.result === 'warning').length;
  const passRate = totalTests > 0 ? Math.round((passCount / totalTests) * 100) : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">품질 종합 이력</h1>
          <p className="text-muted-foreground mt-2">
            제품 품질 검사 이력을 조회하고 분석할 수 있습니다.
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          보고서 다운로드
        </Button>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">검사 기간</label>
              <DatePickerWithRange
                date={dateRange}
                setDate={setDateRange}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">검사 유형</label>
              <Select value={selectedTestType} onValueChange={setSelectedTestType}>
                <SelectTrigger>
                  <SelectValue placeholder="검사 유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="외관검사">외관검사</SelectItem>
                  <SelectItem value="치수검사">치수검사</SelectItem>
                  <SelectItem value="색상검사">색상검사</SelectItem>
                  <SelectItem value="기능검사">기능검사</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">검사 결과</label>
              <Select value={selectedResult} onValueChange={setSelectedResult}>
                <SelectTrigger>
                  <SelectValue placeholder="검사 결과 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="pass">합격</SelectItem>
                  <SelectItem value="fail">불합격</SelectItem>
                  <SelectItem value="warning">주의</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">제품명/배치번호</label>
              <Input placeholder="검색어 입력..." />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">전체 검사</p>
                <p className="text-2xl font-bold">{totalTests}</p>
              </div>
              <History className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">합격</p>
                <p className="text-2xl font-bold text-green-600">{passCount}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">불합격</p>
                <p className="text-2xl font-bold text-red-600">{failCount}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                <TrendingDown className="h-4 w-4 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">주의</p>
                <p className="text-2xl font-bold text-yellow-600">{warningCount}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                <Minus className="h-4 w-4 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">합격률</p>
                <p className="text-2xl font-bold text-blue-600">{passRate}%</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 이력 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>품질 검사 이력</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="p-4 font-medium">ID</th>
                  <th className="p-4 font-medium">제품명</th>
                  <th className="p-4 font-medium">배치번호</th>
                  <th className="p-4 font-medium">검사일</th>
                  <th className="p-4 font-medium">검사유형</th>
                  <th className="p-4 font-medium">결과</th>
                  <th className="p-4 font-medium">검사자</th>
                  <th className="p-4 font-medium">상세내용</th>
                  <th className="p-4 font-medium">액션</th>
                </tr>
              </thead>
              <tbody>
                {qualityHistory.map((history) => (
                  <tr key={history.id} className="border-b hover:bg-muted/50">
                    <td className="p-4 font-mono text-sm">{history.id}</td>
                    <td className="p-4 font-medium">{history.productName}</td>
                    <td className="p-4 font-mono text-sm">{history.batchNumber}</td>
                    <td className="p-4">{history.testDate}</td>
                    <td className="p-4">{history.testType}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {getResultIcon(history.result)}
                        <Badge className={getResultColor(history.result)}>
                          {getResultText(history.result)}
                        </Badge>
                      </div>
                    </td>
                    <td className="p-4">{history.inspector}</td>
                    <td className="p-4">
                      <div className="max-w-xs">
                        <p className="text-sm">{history.details}</p>
                        {history.notes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {history.notes}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <Button variant="outline" size="sm">
                        상세보기
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

