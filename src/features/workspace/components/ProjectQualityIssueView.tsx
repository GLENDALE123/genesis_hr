import React, { useEffect, useState } from 'react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Textarea } from '@/shared/components/ui/textarea';
import { ImageGalleryGrid } from '@/shared/components/common/ImageGalleryGrid';
import { CommentsSection } from '@/shared/components/common/CommentsSection';
import { AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { getQualityIssue } from '@/features/quality/services/qualityIssueService';
import { updateIssueStatus, addIssueItem } from '@/features/quality/services/qualityIssueService';
import { CommentsService } from '@/shared/services/comments/commentsService';
import { QualityIssue } from '@/features/quality/types';
import { STATUS_COLORS, DEPARTMENT_COLORS } from '@/features/quality/constants';
import { cn } from '@/shared/lib/utils';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProjectQualityIssueViewProps {
    issueId: string;
    projectId: string;
    onStatusUpdate?: (issueId: string, newStatus: string) => void;
}

export const ProjectQualityIssueView: React.FC<ProjectQualityIssueViewProps> = ({
    issueId,
    projectId,
    onStatusUpdate,
}) => {
    const { user } = useAuthStore();
    const [issue, setIssue] = useState<QualityIssue | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAddingComment, setIsAddingComment] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    useEffect(() => {
        const loadIssue = async () => {
            setLoading(true);
            try {
                const data = await getQualityIssue(issueId);
                setIssue(data);
            } catch (error) {
                console.error('Failed to load quality issue:', error);
                toast.error('품질이슈를 불러오는데 실패했습니다.');
            } finally {
                setLoading(false);
            }
        };
        loadIssue();
    }, [issueId]);

    const handleAddComment = async (text: string, mentionedUserIds?: string[]) => {
        if (!user || !text.trim()) return;

        try {
            await CommentsService.addComment('projects', projectId, {
                text,
                user: user.displayName || user.email || 'Unknown',
                uid: user.uid,
            });

            // 품질이슈에도 댓글 추가 (이슈사항으로 추가)
            if (issue) {
                await addIssueItem(
                    issueId,
                    text,
                    undefined,
                    {
                        uid: user.uid,
                        displayName: user.displayName || user.email || 'Unknown',
                        photoURL: user.photoURL,
                    }
                );
            }

            setNewComment('');
            setIsAddingComment(false);
            toast.success('댓글이 추가되었습니다.');

            // 이슈 다시 로드
            const updatedIssue = await getQualityIssue(issueId);
            setIssue(updatedIssue);
        } catch (error) {
            console.error('Failed to add comment:', error);
            toast.error('댓글 추가에 실패했습니다.');
        }
    };

    const handleStatusUpdate = async (newStatus: string) => {
        if (!issue) return;

        setIsUpdatingStatus(true);
        try {
            await updateIssueStatus(issueId, newStatus);
            toast.success('상태가 업데이트되었습니다.');

            // 이슈 다시 로드
            const updatedIssue = await getQualityIssue(issueId);
            setIssue(updatedIssue);

            if (onStatusUpdate) {
                onStatusUpdate(issueId, newStatus);
            }
        } catch (error) {
            console.error('Failed to update status:', error);
            toast.error('상태 업데이트에 실패했습니다.');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

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

    if (loading) {
        return (
            <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!issue) {
        return (
            <div className="py-10 text-center text-muted-foreground">
                품질이슈 정보를 찾을 수 없습니다.
            </div>
        );
    }

    const comments = (issue as any).comments || [];

    return (
        <div className="space-y-6">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-bold">
                        {issue.productName} ({issue.partName})
                    </h3>
                </div>
                {getStatusBadge(issue.status || '해결완료')}
            </div>

            {/* 부서 및 키워드 */}
            <div className="flex gap-2 flex-wrap">
                <Badge
                    variant="outline"
                    className={cn(
                        "text-xs",
                        DEPARTMENT_COLORS[issue.department as keyof typeof DEPARTMENT_COLORS] ||
                            'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200'
                    )}
                >
                    부서: {issue.department || '미지정'}
                </Badge>
                <Badge
                    variant="outline"
                    className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                >
                    키워드: {issue.registrationKeyword || '미지정'}
                </Badge>
            </div>

            {/* 기본 정보 */}
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <span className="text-muted-foreground">발주번호:</span>
                    <span className="ml-2 font-medium">{issue.orderNumber}</span>
                </div>
                <div>
                    <span className="text-muted-foreground">발주처:</span>
                    <span className="ml-2 font-medium">{issue.supplier}</span>
                </div>
            </div>

            {/* 이미지 */}
            {issue.imageUrls && issue.imageUrls.length > 0 && (
                <div>
                    <h4 className="font-semibold text-md mb-2">첨부 이미지:</h4>
                    <ImageGalleryGrid
                        images={issue.imageUrls}
                        gridClassName="grid-cols-[repeat(auto-fill,minmax(120px,1fr))]"
                        imageClassName="h-24"
                    />
                </div>
            )}

            {/* 이슈사항 */}
            <div>
                <h4 className="font-semibold text-md mb-2">이슈사항:</h4>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md">
                    <ul className="space-y-3 text-base">
                        {issue.issues.map((item, index) => {
                            const isString = typeof item === 'string';
                            const content = isString ? item : item.content;
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
                                                        minute: '2-digit',
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
                                            className={cn(
                                                "text-xs ml-2",
                                                STATUS_COLORS[status as keyof typeof STATUS_COLORS]
                                            )}
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
                </div>
            </div>

            {/* 상태 업데이트 버튼 */}
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusUpdate('대기중')}
                    disabled={isUpdatingStatus || issue.status === '대기중'}
                >
                    <Clock className="h-4 w-4 mr-2" />
                    대기중
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusUpdate('진행중')}
                    disabled={isUpdatingStatus || issue.status === '진행중'}
                >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    진행중
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusUpdate('해결완료')}
                    disabled={isUpdatingStatus || issue.status === '해결완료'}
                >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    해결완료
                </Button>
            </div>

            {/* 댓글 섹션 */}
            <div className="border-t pt-4">
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
                        try {
                            await CommentsService.deleteComment('projects', projectId, commentId);
                            toast.success('댓글이 삭제되었습니다.');
                            const updatedIssue = await getQualityIssue(issueId);
                            setIssue(updatedIssue);
                        } catch (error) {
                            console.error('Failed to delete comment:', error);
                            toast.error('댓글 삭제에 실패했습니다.');
                        }
                    }}
                    onEditComment={async (commentId, newText) => {
                        try {
                            await CommentsService.updateComment('projects', projectId, commentId, newText);
                            toast.success('댓글이 수정되었습니다.');
                            const updatedIssue = await getQualityIssue(issueId);
                            setIssue(updatedIssue);
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
        </div>
    );
};













