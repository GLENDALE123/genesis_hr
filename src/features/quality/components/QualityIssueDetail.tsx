import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Textarea } from '@/shared/components/ui/textarea';
import { Input } from '@/shared/components/ui/input';
import { Progress } from '@/shared/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { ImageGalleryGrid } from '@/shared/components/common/ImageGalleryGrid';
import {
  AlertCircle,
  Edit,
  Trash2,
  Plus,
  CheckCircle,
  MessageSquarePlus
} from 'lucide-react';
import { QualityIssue } from '../types';
import { STATUS_COLORS, DEPARTMENT_COLORS } from '../constants';
import { cn } from '@/shared/lib/utils';
import { CreateProjectModal } from '@/features/workspace/components/CreateProjectModal';
import { updateIssueProjectInfo } from '../services/qualityIssueService';

interface QualityIssueDetailProps {
  issue: QualityIssue | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (issue: QualityIssue) => void;
  onDelete?: (issue: QualityIssue) => void;
  onAddIssueItem?: (issueId: string, newIssue: string, newStatus?: string) => void;
  onUpdateProcessedQuantity?: (issueId: string, additionalQuantity: number) => void;
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
  onUpdateProcessedQuantity,
  canEdit = false,
  canDelete = false,
  canManage = false,
}) => {
  const [isAddingIssue, setIsAddingIssue] = useState(false);
  const [newIssue, setNewIssue] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('해결완료');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // 출하대기 처리 관련 상태
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingQuantity, setProcessingQuantity] = useState('');

  // 프로덕션 빌드에서 boolean 변환 안정성 확보
  const dialogOpen = Boolean(isOpen);


  const handleAddNewIssue = () => {
    if (!issue) return;
    if (newIssue.trim() && onAddIssueItem) {
      onAddIssueItem(issue.id, newIssue.trim(), selectedStatus);
      setNewIssue('');
      setSelectedStatus('해결완료');
      setIsAddingIssue(false);
    }
  };

  // 출하대기 처리 관련 핸들러
  const handleConfirmProcessing = () => {
    const quantity = parseInt(processingQuantity, 10);

    if (isNaN(quantity) || quantity <= 0) {
      return;
    }

    if (!issue) {
      return;
    }

    if (issue.shippingWaitQuantity && quantity > (issue.shippingWaitQuantity - (issue.processedQuantity || 0))) {
      return;
    }

    if (onUpdateProcessedQuantity) {
      onUpdateProcessedQuantity(issue.id, quantity);
    }

    handleCancelProcessing();
  };

  const handleCancelProcessing = () => {
    setIsProcessing(false);
    setProcessingQuantity('');
  };


  // 상태 옵션 정의
  const statusOptions = [
    { value: '대기중', label: '대기중' },
    { value: '진행중', label: '진행중' },
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

  const handleProjectCreated = async (workspaceId: string, channelId: string, projectId: string) => {
    if (issue) {
      try {
        await updateIssueProjectInfo(issue.id, {
          workspaceId,
          channelId,
          projectId,
          createdAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Failed to update issue project info:', error);
      }
    }
  };


  return (
    <Dialog open={dialogOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-5xl max-h-[90vh] p-0"
        stickyHeader={
          <div className="flex flex-col gap-2">
            {issue ? (
              <>
                {/* 1열: 헤더 제목 */}
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <DialogTitle className="text-xl font-bold whitespace-nowrap overflow-hidden text-ellipsis min-w-0 flex-1">
                    {issue.productName} ({issue.partName})
                  </DialogTitle>
                </div>
                {/* 2열: 부서, 키워드 뱃지 */}
                <div className="flex gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className={cn("text-xs whitespace-nowrap flex-shrink-0", DEPARTMENT_COLORS[issue.department as keyof typeof DEPARTMENT_COLORS] || 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200')}
                  >
                    부서: {issue.department || '미지정'}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 whitespace-nowrap flex-shrink-0"
                  >
                    키워드: {issue.registrationKeyword || '미지정'}
                  </Badge>
                </div>
              </>
            ) : (
              <DialogHeader>
                <DialogTitle>품질이슈 상세</DialogTitle>
              </DialogHeader>
            )}
          </div>
        }
        stickyFooter={
          <div className="flex justify-between items-center py-2">
            {issue ? (
              <>
                {/* 출하대기 처리 완료 버튼 */}
                {issue.registrationKeyword === '출하대기' && canManage && onUpdateProcessedQuantity && (
                  <div className="flex items-center gap-2">
                    {isProcessing ? (
                      <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted animate-in slide-in-from-top-2 duration-300">
                        <Input
                          type="number"
                          value={processingQuantity}
                          onChange={e => setProcessingQuantity(e.target.value)}
                          placeholder="처리 완료 수량"
                          min="1"
                          max={issue.shippingWaitQuantity ? issue.shippingWaitQuantity - (issue.processedQuantity || 0) : undefined}
                          className="w-28"
                          autoFocus
                        />
                        <Button onClick={handleConfirmProcessing} size="sm" className="bg-green-500 hover:bg-green-600">
                          확인
                        </Button>
                        <Button onClick={handleCancelProcessing} variant="outline" size="sm">
                          취소
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => setIsProcessing(true)}
                        className="bg-blue-500 hover:bg-blue-600"
                        disabled={
                          issue.status === '해결완료' ||
                          (issue.shippingWaitQuantity != null && issue.processedQuantity != null && issue.processedQuantity >= issue.shippingWaitQuantity)
                        }
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        처리수량입력
                      </Button>
                    )}
                  </div>
                )}

                {issue && (
                  <Button
                    variant="outline"
                    onClick={() => setIsProjectModalOpen(true)}
                    className="flex items-center gap-2 mr-2"
                  >
                    <MessageSquarePlus className="h-4 w-4" />
                    프로젝트 생성
                  </Button>
                )}

                <div className="flex gap-2">
                  {canDelete && onDelete && issue && (
                    <Button
                      variant="destructive"
                      onClick={() => onDelete(issue)}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      삭제
                    </Button>
                  )}
                  {canEdit && onEdit && issue && (
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
              </>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex items-center gap-2"
                >
                  닫기
                </Button>
              </div>
            )}
          </div>
        }
      >
        {issue ? (
          <div className="space-y-6">
            {/* 공정/불량 키워드 */}
            {issue.keywordPairs && issue.keywordPairs.length > 0 && (
              <div>
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

            {/* 출하대기 정보 */}
            {issue.registrationKeyword === '출하대기' && (
              <div>
                <h4 className="font-semibold text-md text-gray-800 dark:text-slate-200 mb-2">출하대기 정보:</h4>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">출하대기 타입:</span>
                      <div className="mt-1">
                        {issue.shippingWaitType ? (
                          <Badge variant="outline" className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                            {issue.shippingWaitType}
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-500">미지정</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">전체 수량:</span>
                      <div className="mt-1">
                        <span className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                          {issue.shippingWaitQuantity ? issue.shippingWaitQuantity.toLocaleString() : 0}개
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 처리 진행률 */}
                  {issue.shippingWaitQuantity && issue.processedQuantity !== undefined && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">처리 진행률:</span>
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                          {issue.processedQuantity.toLocaleString()} / {issue.shippingWaitQuantity.toLocaleString()}개
                        </span>
                      </div>
                      <Progress
                        value={(issue.processedQuantity / issue.shippingWaitQuantity) * 100}
                        className="h-3"
                      />
                      <div className="text-right mt-1">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {Math.round((issue.processedQuantity / issue.shippingWaitQuantity) * 100)}% 완료
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 첨부 이미지 */}
            {issue.imageUrls && issue.imageUrls.length > 0 && (
              <div>
                <h4 className="font-semibold text-md text-gray-800 dark:text-slate-200 mb-2">첨부 이미지:</h4>
                <ImageGalleryGrid
                  images={issue.imageUrls}
                  gridClassName="grid-cols-[repeat(auto-fill,minmax(120px,1fr))]"
                  imageClassName="h-24"
                />
              </div>
            )}

            {/* 이슈사항 */}
            <div>
              <h4 className="font-semibold text-md text-gray-800 dark:text-slate-200 mb-2">이슈사항:</h4>
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md">
                <ul className="space-y-3 text-base text-gray-700 dark:text-slate-200">
                  {issue.issues.map((item, index) => {
                    // 기존 문자열 형식과 새로운 객체 형식 모두 지원
                    const isString = typeof item === 'string';
                    const content = isString ? item : item.content;
                    // 기존 이슈는 issue.createdAt 사용, 추가 이슈는 item.createdAt 사용
                    const createdAt = isString ? issue.createdAt : item.createdAt;
                    const status = isString ? null : item.status;

                    return (
                      <li key={index} className="flex justify-between items-start">
                        <div className="flex-1">
                          {createdAt && (
                            <>
                              <span className="text-xs text-gray-400 mr-2">
                                {new Date(createdAt).toLocaleString('ko-KR', {
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              <span className="text-xl font-bold text-gray-700 dark:text-slate-200 mr-2">
                                ·
                              </span>
                            </>
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
                                '대기중': '대기중',
                                '진행중': '진행중',
                                '해결완료': '해결완료',
                                'open': '대기중',
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
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddingIssue(true)}
                      className="mt-3 w-full border-dashed"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      이슈사항 추가하기
                    </Button>
                  ) : (
                    <div className="mt-3 space-y-2 p-4 border rounded-lg">
                      <div className="flex items-start gap-2">
                        <Textarea
                          value={newIssue}
                          onChange={(e) => setNewIssue(e.target.value)}
                          placeholder="추가할 이슈 내용을 입력하세요..."
                          rows={4}
                          className="flex-1"
                          autoFocus
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground whitespace-nowrap">진행상태:</span>
                        <Select
                          value={selectedStatus}
                          onValueChange={setSelectedStatus}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue>
                              {selectedStatus ? (
                                <Badge
                                  variant="outline"
                                  className={cn("text-xs", STATUS_COLORS[selectedStatus as keyof typeof STATUS_COLORS])}
                                >
                                  {statusOptions.find(opt => opt.value === selectedStatus)?.label || selectedStatus}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">상태 선택</span>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={cn("text-xs", STATUS_COLORS[option.value as keyof typeof STATUS_COLORS])}
                                  >
                                    {option.label}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
            <div className="pt-2 text-sm text-right text-gray-400 dark:text-slate-500">
              작성자: {typeof issue.author === 'string'
                ? issue.author
                : issue.author?.displayName || issue.author?.email || 'N/A'
              } / {formatDate(issue.createdAt)}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-muted-foreground">
            이슈 정보를 불러올 수 없습니다.
          </div>
        )}
      </DialogContent>

      {issue && (
        <CreateProjectModal
          isOpen={isProjectModalOpen}
          onClose={() => setIsProjectModalOpen(false)}
          initialTitle={`${issue.productName} - ${issue.partName}`}
          initialContent={`**이슈 사항**:\n${issue.issues.map(i => typeof i === 'string' ? i : i.content).join('\n')}\n\n**발주번호**: ${issue.orderNumber}\n**발주처**: ${issue.supplier}`}
          sourceId={issue.id}
          sourceType="quality-issue"
          initialImages={issue.imageUrls || []}
          onSuccess={handleProjectCreated}
        />
      )}
    </Dialog>
  );
};

