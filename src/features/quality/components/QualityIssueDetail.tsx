import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Textarea } from '@/shared/components/ui/textarea';
import { ImageGalleryGrid } from '@/shared/components/common/ImageGalleryGrid';
import { 
  AlertCircle, 
  Copy,
  Edit,
  Trash2,
  Plus
} from 'lucide-react';
import { QualityIssue } from '../types';
import { STATUS_COLORS, DEPARTMENT_COLORS } from '../constants';
import { cn } from '@/shared/lib/utils';

interface QualityIssueDetailProps {
  issue: QualityIssue | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (issue: QualityIssue) => void;
  onDelete?: (issue: QualityIssue) => void;
  onAddIssueItem?: (issueId: string, newIssue: string, newStatus?: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  canManage?: boolean;
  canChangeStatus?: boolean;
}

export const QualityIssueDetail: React.FC<QualityIssueDetailProps> = ({
  issue,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onAddIssueItem,
  canEdit = false,
  canDelete = false,
  canManage = false,
}) => {
  const [isAddingIssue, setIsAddingIssue] = useState(false);
  const [newIssue, setNewIssue] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('해결완료');

  if (!issue) return null;

  const handleAddNewIssue = () => {
    if (newIssue.trim() && onAddIssueItem) {
      onAddIssueItem(issue.id, newIssue.trim(), selectedStatus);
      setNewIssue('');
      setSelectedStatus('해결완료');
      setIsAddingIssue(false);
    }
  };


  // 상태 옵션 정의
  const statusOptions = [
    { value: '미해결', label: '미해결' },
    { value: '진행중', label: '진행중' },
    { value: 'in-progress', label: '진행중' },
    { value: 'resolved', label: '해결완료' },
    { value: '해결완료', label: '해결완료' }
  ];

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCopy = () => {
    const text = `
품질이슈 정보
발주번호: ${issue.orderNumber}
부서: ${issue.department}
등록키워드: ${issue.registrationKeyword}
제품명: ${issue.productName}
부속명: ${issue.partName}
발주처: ${issue.supplier}
상태: ${issue.status}
작성자: ${typeof issue.author === 'string' ? issue.author : issue.author?.displayName || issue.author?.email || 'N/A'}
작성일: ${formatDate(issue.createdAt)}

이슈사항:
${issue.issues.map((issueItem, index) => `${index + 1}. ${issueItem}`).join('\n')}

공정/불량 키워드:
${issue.keywordPairs.map((pair, index) => `${index + 1}. ${pair.process} - ${pair.defect}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(text);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            품질이슈 상세 정보
          </DialogTitle>
          <DialogDescription>
            품질이슈의 상세 정보를 확인하고 이슈사항을 추가할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[70vh]">
          <div className="p-4 bg-white dark:bg-slate-800 rounded-lg">
            {/* 헤더 정보 - HS-Jig 스타일 */}
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">
              <div>
                <h3 className="font-bold text-xl text-gray-900 dark:text-white">
                  {issue.productName} ({issue.partName})
                </h3>
                <p className="text-base text-gray-500 dark:text-slate-400">{issue.supplier}</p>
                {/* 부서와 등록키워드 표시 */}
                <div className="flex gap-4 mt-2">
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs", DEPARTMENT_COLORS[issue.department as keyof typeof DEPARTMENT_COLORS] || 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200')}
                  >
                    부서: {issue.department || '미지정'}
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                    키워드: {issue.registrationKeyword || '미지정'}
                  </Badge>
                </div>
              </div>
              <span className="font-mono text-sm bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-md">
                {issue.orderNumber}
              </span>
            </div>

            {/* 공정/불량 키워드 */}
            {issue.keywordPairs && issue.keywordPairs.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-md text-gray-800 dark:text-slate-200 mb-2">공정/불량 키워드:</h4>
                <div className="flex flex-wrap gap-2">
                  {issue.keywordPairs.map((pair, index) => (
                    <div key={index} className="text-sm p-2 bg-slate-100 dark:bg-slate-700/50 rounded-md">
                      <span className="font-semibold">{pair.process}:</span> {pair.defect}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 첨부 이미지 */}
            {issue.imageUrls && issue.imageUrls.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-md text-gray-800 dark:text-slate-200 mb-2">첨부 이미지:</h4>
                <ImageGalleryGrid 
                  images={issue.imageUrls}
                  gridClassName="grid-cols-[repeat(auto-fill,minmax(120px,1fr))]"
                  imageClassName="h-24"
                />
              </div>
            )}

            {/* 이슈사항 - HS-Jig 스타일 */}
            <div>
              <h4 className="font-semibold text-md text-gray-800 dark:text-slate-200 mb-2">이슈사항:</h4>
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md">
                <ul className="space-y-3 text-base text-gray-700 dark:text-slate-200">
                  {issue.issues.map((item, index) => {
                    // 기존 문자열 형식과 새로운 객체 형식 모두 지원
                    const isString = typeof item === 'string';
                    const content = isString ? item : item.content;
                    const createdAt = isString ? null : item.createdAt;
                    const status = isString ? null : item.status;
                    
                    return (
                      <li key={index} className="flex justify-between items-start">
                        <div className="flex-1">
                          {createdAt && (
                            <span className="text-xs text-gray-400 mr-2">
                              {new Date(createdAt).toLocaleString('ko-KR', {
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          )}
                          <span>{content}</span>
                        </div>
                        {status && (
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs ml-2", STATUS_COLORS[status as keyof typeof STATUS_COLORS])}
                          >
                            {(() => {
                              const statusMapping = {
                                '미해결': '미해결',
                                '진행중': '진행중',
                                '해결완료': '해결완료',
                                'open': '미해결',
                                'in-progress': '진행중',
                                'resolved': '해결완료',
                                'closed': '해결완료',
                              };
                              return statusMapping[status as keyof typeof statusMapping] || '해결완료';
                            })()}
                          </Badge>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {canManage && (
                  !isAddingIssue ? (
                    <button
                      onClick={() => setIsAddingIssue(true)}
                      className="mt-3 w-full py-2 border border-dashed border-gray-400 dark:border-slate-500 rounded-md text-sm text-gray-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <Plus className="h-4 w-4 inline mr-2" />
                      이슈사항 추가하기
                    </button>
                  ) : (
                    <div className="mt-3 space-y-3">
                      <Textarea
                        value={newIssue}
                        onChange={(e) => setNewIssue(e.target.value)}
                        className="w-full"
                        rows={3}
                        placeholder="추가할 이슈 내용을 입력하세요..."
                        autoFocus
                      />
                      {/* 상태 선택 버튼 */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">상태:</span>
                        <div className="flex gap-2">
                          {statusOptions.map((option) => (
                            <Button
                              key={option.value}
                              type="button"
                              variant={selectedStatus === option.value ? "default" : "outline"}
                              size="sm"
                              onClick={() => setSelectedStatus(option.value)}
                              className={cn(
                                "text-xs px-3 py-1",
                                selectedStatus === option.value 
                                  ? STATUS_COLORS[option.value as keyof typeof STATUS_COLORS]
                                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
                              )}
                            >
                              {option.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setIsAddingIssue(false);
                            setNewIssue('');
                            setSelectedStatus('해결완료');
                          }}
                        >
                          취소
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={handleAddNewIssue}
                          disabled={!newIssue.trim()}
                        >
                          저장
                        </Button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* 작성자 정보 */}
            <div className="mt-4 pt-2 text-sm text-right text-gray-400 dark:text-slate-500">
              작성자: {typeof issue.author === 'string' 
                ? issue.author 
                : issue.author?.displayName || issue.author?.email || 'N/A'
              } / {formatDate(issue.createdAt)}
            </div>
          </div>
        </ScrollArea>

        {/* 하단 버튼들 - HS-Jig 스타일 */}
        <div className="pt-4 border-t space-y-3">
          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleCopy}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              복사
            </Button>
            {canDelete && onDelete && (
              <Button
                variant="destructive"
                onClick={() => onDelete(issue)}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                삭제
              </Button>
            )}
            {canEdit && onEdit && (
              <Button
                variant="outline"
                onClick={() => onEdit(issue)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                수정
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
