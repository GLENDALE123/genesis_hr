import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { QualityIssue } from '../types';
import { DEPARTMENT_COLORS, STATUS_COLORS } from '../constants';
import { cn } from '@/shared/lib/utils';
import { Search, Plus } from 'lucide-react';

interface QualityIssueTableProps {
  issues: QualityIssue[];
  isLoading: boolean;
  searchTerm: string;
  onSelectIssue?: (issue: QualityIssue) => void;
  onSearchChange?: (term: string) => void;
  onOpenFormModal?: () => void;
}

// 헬퍼 함수들
const formatDate = (dateString: string | Date) => {
  const dateObj = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return dateObj.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const getDepartmentColor = (department: string) => {
  return DEPARTMENT_COLORS[department as keyof typeof DEPARTMENT_COLORS] || 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200';
};

const getStatusBadge = (status: QualityIssue['status']) => {
  // 한국어 상태를 영어로 매핑
  const statusMapping = {
    '미해결': '미해결',
    '진행중': '진행중', 
    '해결완료': '해결완료',
    'open': '미해결',
    'in-progress': '진행중',
    'resolved': '해결완료',
    'closed': '해결완료',
  };
  
  const koreanStatus = statusMapping[status] || '해결완료';
  const statusColor = STATUS_COLORS[koreanStatus as keyof typeof STATUS_COLORS] || STATUS_COLORS['해결완료'];
  
  return (
    <Badge variant="outline" className={cn("text-xs", statusColor)}>
      {koreanStatus}
    </Badge>
  );
};

export const QualityIssueTable: React.FC<QualityIssueTableProps> = ({
  issues,
  isLoading,
  searchTerm,
  onSelectIssue,
  onSearchChange,
  onOpenFormModal,
}) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 py-3 px-6">
        <div className="flex items-center justify-between">
          <CardTitle>품질이슈 목록</CardTitle>
          <div className="flex items-center gap-3">
            {onSearchChange && (
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="검색..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}
            {onOpenFormModal && (
              <Button 
                className="flex items-center gap-2"
                onClick={onOpenFormModal}
              >
                <Plus className="h-4 w-4" />
                새 이슈 등록
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0">
        <div className="h-full overflow-auto">
          <Table className="w-full text-sm text-left text-gray-500 dark:text-slate-400 min-w-[1200px]">
                   <TableHeader className="sticky top-0 z-10 bg-background">
                     <TableRow className="border-b bg-background">
                       <TableHead className="px-2 py-3 whitespace-nowrap bg-background rounded-tl-lg">발주번호</TableHead>
                       <TableHead className="px-2 py-3 whitespace-nowrap bg-background">부서</TableHead>
                       <TableHead className="px-2 py-3 whitespace-nowrap bg-background">등록키워드</TableHead>
                       <TableHead className="px-2 py-3 whitespace-nowrap bg-background">상태</TableHead>
                       <TableHead className="px-2 py-3 whitespace-nowrap bg-background">제품명</TableHead>
                       <TableHead className="px-2 py-3 whitespace-nowrap bg-background">부속명</TableHead>
                       <TableHead className="px-2 py-3 whitespace-nowrap bg-background">발주처</TableHead>
                       <TableHead className="px-2 py-3 whitespace-nowrap bg-background">이슈사항</TableHead>
                       <TableHead className="px-2 py-3 whitespace-nowrap bg-background">이미지</TableHead>
                       <TableHead className="px-2 py-3 whitespace-nowrap bg-background">작성자</TableHead>
                       <TableHead className="px-2 py-3 whitespace-nowrap bg-background rounded-tr-lg">작성일</TableHead>
                     </TableRow>
                   </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={11} className="px-2 py-8 text-center text-muted-foreground">
                    로딩 중...
                  </TableCell>
                </TableRow>
              ) : issues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="px-2 py-8 text-center text-muted-foreground">
                    {searchTerm ? '검색된 품질이슈가 없습니다.' : '등록된 품질이슈가 없습니다.'}
                  </TableCell>
                </TableRow>
              ) : (
                issues.map((issue) => (
                  <TableRow 
                    key={issue.id} 
                    className="border-b cursor-pointer hover:bg-muted/50"
                    onClick={() => onSelectIssue?.(issue)}
                  >
                    <TableCell className="px-2 py-3 whitespace-nowrap font-mono">{issue.orderNumber}</TableCell>
                    <TableCell className="px-2 py-3 whitespace-nowrap">
                      <Badge variant="secondary" className={`text-xs ${getDepartmentColor(issue.department)}`}>
                        {issue.department || '미지정'}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2 py-3 whitespace-nowrap">
                      <Badge variant="outline" className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                        {issue.registrationKeyword || '미지정'}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2 py-3 whitespace-nowrap">
                      {(() => {
                        // 최근 작성된 이슈의 상태를 기준으로 표시
                        const lastIssue = issue.issues[issue.issues.length - 1];
                        if (lastIssue && typeof lastIssue === 'object' && lastIssue.status) {
                          return getStatusBadge(lastIssue.status as any);
                        }
                        // 전체 이슈의 상태가 undefined인 경우 해결완료로 처리
                        return getStatusBadge(issue.status || '해결완료');
                      })()}
                    </TableCell>
                    <TableCell className="px-2 py-3 whitespace-nowrap font-semibold">{issue.productName}</TableCell>
                    <TableCell className="px-2 py-3 whitespace-nowrap">{issue.partName}</TableCell>
                    <TableCell className="px-2 py-3 whitespace-nowrap">{issue.supplier}</TableCell>
                    <TableCell className="px-2 py-3 whitespace-nowrap truncate max-w-sm">
                      {(() => {
                        // 최근 작성된 이슈 표시
                        const lastIssue = issue.issues[issue.issues.length - 1];
                        if (lastIssue) {
                          return typeof lastIssue === 'string' ? lastIssue : lastIssue.content;
                        }
                        return '이슈 없음';
                      })()}
                    </TableCell>
                    <TableCell className="px-2 py-3 whitespace-nowrap">
                      {issue.imageUrls && issue.imageUrls.length > 0 ? (
                        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          </svg>
                          <span className="text-xs">{issue.imageUrls.length}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-slate-500 text-xs">없음</span>
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-3 whitespace-nowrap">
                      {typeof issue.author === 'string' 
                        ? issue.author 
                        : issue.author?.displayName || issue.author?.email || 'N/A'
                      }
                    </TableCell>
                    <TableCell className="px-2 py-3 whitespace-nowrap">{formatDate(issue.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
};
