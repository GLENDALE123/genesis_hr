import React, { useEffect, useState } from 'react';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { ImageGalleryGrid } from '@/shared/components/common/ImageGalleryGrid';
import { CommentsSection } from '@/shared/components/common/CommentsSection';
import { AlertCircle, CheckCircle, Clock, Loader2, Plus } from 'lucide-react';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { getQualityIssue } from '@/features/quality/services/qualityIssueService';
import { updateIssueStatus, addIssueItem } from '@/features/quality/services/qualityIssueService';
import { CommentsService } from '@/shared/services/comments/commentsService';
import { QualityIssue } from '@/features/quality/types';
import { STATUS_COLORS, DEPARTMENT_COLORS } from '@/features/quality/constants';
import { cn } from '@/shared/lib/utils';
import { useAuthStore } from '@/features/auth/store/authStore';
import { toast } from 'sonner';
import type { ChannelMessage } from '../types/channelMessage.types';

interface ProjectQualityIssueMessageProps {
    message: ChannelMessage;
    onIssueUpdate?: () => void;
}

export const ProjectQualityIssueMessage: React.FC<ProjectQualityIssueMessageProps> = ({
    message,
    onIssueUpdate,
}) => {
    const { user } = useAuthStore();
    const { metadata } = message;
    const [issue, setIssue] = useState<QualityIssue | null>(null);
    const [loading, setLoading] = useState(true);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isAddingIssue, setIsAddingIssue] = useState(false);
    const [newIssue, setNewIssue] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<string>('해결완료');

    useEffect(() => {
        if (metadata?.issueId) {
            const loadIssue = async () => {
                setLoading(true);
                try {
                    const data = await getQualityIssue(metadata.issueId!);
                    setIssue(data);
                } catch (error) {
                    console.error('Failed to load quality issue:', error);
                    toast.error('품질이슈를 불러오는데 실패했습니다.');
                } finally {
                    setLoading(false);
                }
            };
            loadIssue();
        }
    }, [metadata?.issueId]);

    const handleAddComment = async (text: string, mentionedUserIds?: string[]) => {
        if (!user || !text.trim() || !metadata?.projectId || !issue) return;

        try {
            // 댓글에서 상태 업데이트 키워드 파싱
            const statusKeywords = {
                '해결완료': '해결완료',
                '해결 완료': '해결완료',
                '완료': '해결완료',
                '진행중': '진행중',
                '진행 중': '진행중',
                '대기중': '대기중',
                '대기 중': '대기중',
            };

            let detectedStatus: string | undefined;
            for (const [keyword, status] of Object.entries(statusKeywords)) {
                if (text.includes(keyword)) {
                    detectedStatus = status;
                    break;
                }
            }

            // 프로젝트에 댓글 추가
            await CommentsService.addComment('projects', metadata.projectId, {
                text,
                user: user.displayName || user.email || 'Unknown',
                uid: user.uid,
            });

            // 품질이슈에도 댓글 추가 (이슈사항으로 추가)
            await addIssueItem(
                issue.id,
                text,
                detectedStatus, // 상태가 감지된 경우 상태도 함께 업데이트
                {
                    uid: user.uid,
                    displayName: user.displayName || user.email || 'Unknown',
                    photoURL: user.photoURL,
                }
            );

            // 상태가 감지된 경우 품질이슈 상태도 업데이트
            if (detectedStatus && detectedStatus !== issue.status) {
                await updateIssueStatus(metadata.issueId!, detectedStatus);
                toast.success(`댓글이 추가되었고 상태가 ${detectedStatus}로 업데이트되었습니다.`);
            } else {
                toast.success('댓글이 추가되었습니다.');
            }

            // 이슈 다시 로드
            const updatedIssue = await getQualityIssue(issue.id);
            setIssue(updatedIssue);

            if (onIssueUpdate) {
                onIssueUpdate();
            }
        } catch (error) {
            console.error('Failed to add comment:', error);
            toast.error('댓글 추가에 실패했습니다.');
        }
    };

    const handleStatusUpdate = async (newStatus: string) => {
        if (!issue || !metadata?.issueId) return;

        setIsUpdatingStatus(true);
        try {
            await updateIssueStatus(metadata.issueId, newStatus);
            toast.success('상태가 업데이트되었습니다.');

            // 이슈 다시 로드
            const updatedIssue = await getQualityIssue(metadata.issueId);
            setIssue(updatedIssue);

            if (onIssueUpdate) {
                onIssueUpdate();
            }
        } catch (error) {
            console.error('Failed to update status:', error);
            toast.error('상태 업데이트에 실패했습니다.');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleAddNewIssue = async () => {
        if (!issue || !metadata?.issueId || !newIssue.trim() || !user) return;

        try {
            await addIssueItem(
                issue.id,
                newIssue.trim(),
                selectedStatus,
                {
                    uid: user.uid,
                    displayName: user.displayName || user.email || 'Unknown',
                    photoURL: user.photoURL,
                }
            );

            // 프로젝트에도 댓글 추가
            if (metadata.projectId) {
                await CommentsService.addComment('projects', metadata.projectId, {
                    text: newIssue.trim(),
                    user: user.displayName || user.email || 'Unknown',
                    uid: user.uid,
                });
            }

            toast.success('이슈사항이 추가되었습니다.');

            // 이슈 다시 로드
            const updatedIssue = await getQualityIssue(metadata.issueId);
            setIssue(updatedIssue);

            // 폼 초기화
            setNewIssue('');
            setSelectedStatus('해결완료');
            setIsAddingIssue(false);

            if (onIssueUpdate) {
                onIssueUpdate();
            }
        } catch (error) {
            console.error('Failed to add issue item:', error);
            toast.error('이슈사항 추가에 실패했습니다.');
        }
    };

    const statusOptions = [
        { value: '대기중', label: '대기중' },
        { value: '진행중', label: '진행중' },
        { value: '해결완료', label: '해결완료' },
    ];

    const getStatusBadge = (status: QualityIssue['status']) => {
        const statusMapping = {
            '대기중': '대기중',
            '진행중': '진행중',
            '해결완료': '해결완료',
            'open': '대기중',
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

    if (loading) {
        return (
            <Card className="p-3">
                <div className="flex justify-center py-3">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
            </Card>
        );
    }

    if (!issue) {
        return (
            <Card className="p-3">
                <div className="text-center text-muted-foreground text-sm py-3">
                    품질이슈 정보를 찾을 수 없습니다.
                </div>
            </Card>
        );
    }

    const comments = (issue as any).comments || [];

    return (
        <Card className="p-3 space-y-3 max-w-2xl">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    <h3 className="text-base font-semibold truncate">
                        {issue.productName} ({issue.partName})
                    </h3>
                </div>
                {getStatusBadge(issue.status || '해결완료')}
            </div>

            {/* 부서 및 키워드 */}
            <div className="flex gap-1.5 flex-wrap">
                <Badge
                    variant="outline"
                    className={cn(
                        "text-xs px-1.5 py-0.5",
                        DEPARTMENT_COLORS[issue.department as keyof typeof DEPARTMENT_COLORS] ||
                            'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200'
                    )}
                >
                    {issue.department || '미지정'}
                </Badge>
                <Badge
                    variant="outline"
                    className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                >
                    {issue.registrationKeyword || '미지정'}
                </Badge>
            </div>

            {/* 기본 정보 */}
            <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="truncate">
                    <span className="text-muted-foreground">발주:</span>
                    <span className="ml-1 font-medium">{issue.orderNumber}</span>
                </div>
                <div className="truncate">
                    <span className="text-muted-foreground">공급처:</span>
                    <span className="ml-1 font-medium">{issue.supplier}</span>
                </div>
            </div>

            {/* 이미지 */}
            {issue.imageUrls && issue.imageUrls.length > 0 && (
                <div>
                    <h4 className="font-semibold text-xs mb-1.5">이미지:</h4>
                    <ImageGalleryGrid
                        images={issue.imageUrls}
                        gridClassName="grid-cols-[repeat(auto-fill,minmax(60px,1fr))]"
                        imageClassName="h-14"
                    />
                </div>
            )}

            {/* 이슈사항 */}
            <div>
                <h4 className="font-semibold text-xs mb-1.5">이슈사항:</h4>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-md">
                    <ul className="space-y-1.5 text-xs">
                        {issue.issues.map((item, index) => {
                            const isString = typeof item === 'string';
                            const content = isString ? item : item.content;
                            const createdAt = isString ? issue.createdAt : item.createdAt;
                            const status = isString ? null : item.status;

                            return (
                                <li key={index} className="flex justify-between items-start gap-2">
                                    <div className="flex-1 min-w-0">
                                        {createdAt && (
                                            <span className="text-[10px] text-gray-400 mr-1.5">
                                                {new Date(createdAt).toLocaleString('ko-KR', {
                                                    month: '2-digit',
                                                    day: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                        )}
                                        <span className="break-words">{content}</span>
                                    </div>
                                    {status && (
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "text-[10px] px-1 py-0 ml-1 flex-shrink-0",
                                                STATUS_COLORS[status as keyof typeof STATUS_COLORS]
                                            )}
                                        >
                                            {(() => {
                                                const statusMapping = {
                                                    '대기중': '대기',
                                                    '진행중': '진행',
                                                    '해결완료': '완료',
                                                    'open': '대기',
                                                    'in-progress': '진행',
                                                    'resolved': '완료',
                                                    'closed': '완료',
                                                };
                                                return statusMapping[status as keyof typeof statusMapping] || '완료';
                                            })()}
                                        </Badge>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                    {!isAddingIssue ? (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsAddingIssue(true)}
                            className="mt-2 w-full border-dashed h-7 text-xs"
                        >
                            <Plus className="h-3 w-3 mr-1" />
                            이슈사항 추가
                        </Button>
                    ) : (
                        <div className="mt-2 space-y-1.5 p-2 border rounded-md bg-background">
                            <Textarea
                                value={newIssue}
                                onChange={(e) => setNewIssue(e.target.value)}
                                placeholder="이슈 내용을 입력하세요..."
                                rows={2}
                                className="text-xs min-h-[60px]"
                                autoFocus
                            />
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium whitespace-nowrap">상태:</span>
                                <Select
                                    value={selectedStatus}
                                    onValueChange={setSelectedStatus}
                                >
                                    <SelectTrigger className="h-7 text-xs w-32">
                                        <SelectValue>
                                            {selectedStatus ? (
                                                <Badge
                                                    variant="outline"
                                                    className={cn("text-[10px] px-1 py-0", STATUS_COLORS[selectedStatus as keyof typeof STATUS_COLORS])}
                                                >
                                                    {statusOptions.find(opt => opt.value === selectedStatus)?.label || selectedStatus}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">상태 선택</span>
                                            )}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statusOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                <Badge
                                                    variant="outline"
                                                    className={cn("text-xs", STATUS_COLORS[option.value as keyof typeof STATUS_COLORS])}
                                                >
                                                    {option.label}
                                                </Badge>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-end gap-1.5">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs px-2"
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
                                    className="h-7 text-xs px-2"
                                    onClick={handleAddNewIssue}
                                    disabled={!newIssue.trim()}
                                >
                                    저장
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 상태 업데이트 버튼 */}
            <div className="flex gap-1.5">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => handleStatusUpdate('대기중')}
                    disabled={isUpdatingStatus || issue.status === '대기중'}
                >
                    <Clock className="h-3 w-3 mr-1" />
                    대기
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => handleStatusUpdate('진행중')}
                    disabled={isUpdatingStatus || issue.status === '진행중'}
                >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    진행
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => handleStatusUpdate('해결완료')}
                    disabled={isUpdatingStatus || issue.status === '해결완료'}
                >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    완료
                </Button>
            </div>

            {/* 댓글 섹션 */}
            <div className="border-t pt-3">
                <CommentsSection
                    comments={comments.map((comment: any) => ({
                        id: comment.id || `comment-${Date.now()}`,
                        text: comment.text || comment.content || '',
                        user: comment.user || '알 수 없음',
                        uid: comment.uid || '',
                        timestamp: comment.timestamp || comment.date || comment.createdAt || new Date().toISOString(),
                        readBy: comment.readBy || [],
                        editedAt: comment.editedAt,
                    }))}
                    onAddComment={handleAddComment}
                    onDeleteComment={async (commentId) => {
                        if (!metadata?.projectId) return;
                        try {
                            await CommentsService.deleteComment('projects', metadata.projectId, commentId);
                            toast.success('댓글이 삭제되었습니다.');
                            const updatedIssue = await getQualityIssue(issue.id);
                            setIssue(updatedIssue);
                            if (onIssueUpdate) {
                                onIssueUpdate();
                            }
                        } catch (error) {
                            console.error('Failed to delete comment:', error);
                            toast.error('댓글 삭제에 실패했습니다.');
                        }
                    }}
                    onEditComment={async (commentId, newText) => {
                        if (!metadata?.projectId) return;
                        try {
                            await CommentsService.updateComment('projects', metadata.projectId, commentId, newText);
                            toast.success('댓글이 수정되었습니다.');
                            const updatedIssue = await getQualityIssue(issue.id);
                            setIssue(updatedIssue);
                            if (onIssueUpdate) {
                                onIssueUpdate();
                            }
                        } catch (error) {
                            console.error('Failed to edit comment:', error);
                            toast.error('댓글 수정에 실패했습니다.');
                        }
                    }}
                    canComment={true}
                    currentUserUid={user?.uid || ''}
                    isAdmin={false}
                />
            </div>
        </Card>
    );
};













