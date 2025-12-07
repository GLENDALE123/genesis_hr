
import React, { useState, useEffect } from 'react';
import { MoreVertical, Reply, Copy, Trash2, Edit2, X, Check } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { getUserInitial } from '@/shared/utils/user/userUtils';
import { getAllUsers } from '@/shared/services/firebase/userProfile';
import { ChatInput } from '@/shared/components/common/ChatInput';
import type { UserProfile } from '@/features/auth/types';
import type { Comment } from '@/shared/services/comments/commentsService';

interface UserWithUid extends UserProfile {
  uid: string;
  displayName?: string;
  name?: string;
}

interface CommentsSectionProps {
  comments: Comment[];
  onAddComment: (text: string, mentionedUserIds?: string[]) => void;
  onDeleteComment?: (commentId: string) => void;
  onEditComment?: (commentId: string, newText: string) => void;
  canComment?: boolean;
  currentUserUid?: string;
  isAdmin?: boolean;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({
  comments,
  onAddComment,
  onDeleteComment,
  onEditComment,
  canComment = true,
  currentUserUid = '',
  isAdmin = false,
}) => {
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyToUser, setReplyToUser] = useState<UserWithUid | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [users, setUsers] = useState<UserWithUid[]>([]);

  // 사용자 목록 가져오기
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const userList = await getAllUsers();
        setUsers(userList);
      } catch (error) {
        console.error('사용자 목록 로드 실패:', error);
      }
    };
    fetchUsers();
  }, []);

  const handleChatInputSubmit = (text: string, mentionedUserIds?: string[]) => {
    if (canComment) {
      const commentText = replyTo 
        ? `@${replyTo}\n${text}` 
        : text;
      
      onAddComment(commentText, mentionedUserIds);
      
      // 답글 상태 초기화
      setReplyTo(null);
    }
  };

  const handleCopyComment = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('댓글이 복사되었습니다.');
  };

  const handleReply = (userName: string, userUid?: string) => {
    setReplyTo(userName);
    
    // 사용자 UID로 UserProfile 찾기
    if (userUid) {
      const user = users.find(u => u.uid === userUid);
      if (user) {
        setReplyToUser(user);
      }
    } else {
      // UID가 없으면 이름으로 찾기 (fallback)
      const user = users.find(u => u.displayName === userName);
      if (user) {
        setReplyToUser(user);
      }
    }
  };

  const handleDeleteComment = (commentId: string) => {
    if (onDeleteComment) {
      onDeleteComment(commentId);
    }
  };

  const handleStartEdit = (commentId: string, currentText: string) => {
    setEditingCommentId(commentId);
    setEditingText(currentText);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingText('');
  };

  const handleSaveEdit = () => {
    if (editingCommentId && editingText.trim() && onEditComment) {
      onEditComment(editingCommentId, editingText.trim());
      setEditingCommentId(null);
      setEditingText('');
    }
  };


  // 멘션 텍스트 파싱 및 스타일링
  const renderCommentText = (text: string, isMyComment: boolean) => {
    // text가 undefined이거나 null인 경우 빈 문자열로 처리
    if (!text) {
      return <span className="text-muted-foreground">내용 없음</span>;
    }
    
    // @[DisplayName](UID) 형태와 @username 형태 모두 지원
    // @[DisplayName](UID) 패턴을 먼저 찾고, 없으면 @username 패턴 사용
    const mentionWithIdPattern = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const simpleMentionPattern = /@([^\s\n]+)/g;
    
    const parts: Array<{ type: 'text' | 'mention'; content: string; userId?: string }> = [];
    let lastIndex = 0;
    
    // 먼저 @[DisplayName](UID) 패턴 찾기
    const mentionMatches: Array<{ index: number; length: number; displayName: string; userId: string }> = [];
    let match;
    
    while ((match = mentionWithIdPattern.exec(text)) !== null) {
      mentionMatches.push({
        index: match.index,
        length: match[0].length,
        displayName: match[1],
        userId: match[2]
      });
    }
    
    // @[DisplayName](UID) 패턴이 있으면 이를 사용
    if (mentionMatches.length > 0) {
      mentionMatches.forEach((mention) => {
        // 멘션 이전 텍스트
        if (mention.index > lastIndex) {
          parts.push({
            type: 'text',
            content: text.substring(lastIndex, mention.index)
          });
        }
        
        // 멘션 텍스트
        parts.push({
          type: 'mention',
          content: `@${mention.displayName}`,
          userId: mention.userId
        });
        
        lastIndex = mention.index + mention.length;
      });
      
      // 남은 텍스트
      if (lastIndex < text.length) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex)
        });
      }
    } else {
      // @[DisplayName](UID) 패턴이 없으면 단순 @username 패턴 사용
      while ((match = simpleMentionPattern.exec(text)) !== null) {
        // 멘션 이전 텍스트
        if (match.index > lastIndex) {
          parts.push({
            type: 'text',
            content: text.substring(lastIndex, match.index)
          });
        }

        // 멘션 텍스트
        parts.push({
          type: 'mention',
          content: match[0]  // @username
        });

        lastIndex = match.index + match[0].length;
      }

      // 남은 텍스트
      if (lastIndex < text.length) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex)
        });
      }
    }

    // 파트가 없으면 전체 텍스트 반환
    if (parts.length === 0) {
      return <span className="whitespace-pre-wrap">{text}</span>;
    }

    // 파싱된 부분 렌더링
    return (
      <>
        {parts.map((part, index) => 
          part.type === 'mention' ? (
            <span 
              key={index}
              className={`font-medium ${
                isMyComment 
                  ? 'text-primary-foreground'  // 내 댓글: 흰색 굵은 텍스트
                  : 'text-primary'             // 다른 사람 댓글: 파란색 굵은 텍스트
              }`}
              data-user-id={part.userId || ''}
            >
              {part.content}
            </span>
          ) : (
            <span key={index} className="whitespace-pre-wrap">{part.content}</span>
          )
        )}
      </>
    );
  };

  return (
    <div className="mt-6 border-t border-border pt-6">
      <h4 className="font-semibold text-foreground mb-4">댓글 ({comments.length})</h4>
      
      {/* 댓글 목록 */}
      <div className="space-y-4 mb-6">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            아직 댓글이 없습니다.
          </p>
        ) : (
          comments.map((comment) => {
            const isUnread = currentUserUid && comment.readBy && !comment.readBy.includes(currentUserUid);
            const commentDate = comment.timestamp || '';
            const displayName = comment.user || '알 수 없음';
            const initial = getUserInitial({ displayName: comment.user }, '알');

            const isMyComment = comment.uid === currentUserUid;
            const canDelete = isAdmin || isMyComment;

            return (
              <div key={comment.id} className={`flex items-start gap-2.5 ${isMyComment ? 'flex-row-reverse' : ''}`}>
                {/* 사용자 아바타 */}
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback className={`font-semibold text-sm ${
                    isMyComment 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {initial}
                  </AvatarFallback>
                </Avatar>
                
                {/* 말풍선 + 메뉴 그룹 */}
                <div className={`flex items-start gap-2 flex-1 ${isMyComment ? 'flex-row-reverse' : ''}`}>
                  {/* 말풍선 */}
                  <div className={`flex flex-col max-w-[520px] leading-relaxed ${isMyComment ? 'items-end' : 'items-start'}`}>
                    {/* 헤더: 이름 + 시간 */}
                    <div className={`flex items-center gap-2 mb-1 ${isMyComment ? 'flex-row-reverse' : ''}`}>
                      <span className="text-sm font-semibold text-foreground">
                        {isMyComment ? '나' : displayName}
                      </span>
                      <span className="text-sm font-normal text-muted-foreground">
                        {commentDate ? new Date(commentDate).toLocaleString('ko-KR', { 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        }) : ''}
                        {comment.editedAt && (
                          <span className="ml-1 text-xs">(수정됨)</span>
                        )}
                      </span>
                      {isUnread && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" title="새 댓글" />
                      )}
                    </div>
                    
                    {/* 메시지 내용 */}
                    {editingCommentId === comment.id ? (
                      // 수정 모드
                      <div className="w-full space-y-2">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          rows={3}
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-4 w-4 mr-1" />
                            취소
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveEdit}
                            disabled={!editingText.trim()}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            저장
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // 읽기 모드
                      <div className={`p-4 border ${
                        isMyComment 
                          ? 'bg-primary text-primary-foreground border-primary rounded-s-xl rounded-ee-xl' 
                          : 'bg-card text-foreground border-border rounded-e-xl rounded-es-xl'
                      }`}>
                        <div className="text-sm font-normal">
                          {renderCommentText(comment.text || '', isMyComment)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 드롭다운 메뉴 (점 세 개) */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                      >
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleReply(displayName, comment.uid)}>
                        <Reply className="mr-2 h-4 w-4" />
                        답글
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopyComment(comment.text)}>
                        <Copy className="mr-2 h-4 w-4" />
                        복사
                      </DropdownMenuItem>
                      {isMyComment && onEditComment && (
                        <DropdownMenuItem onClick={() => handleStartEdit(comment.id, comment.text)}>
                          <Edit2 className="mr-2 h-4 w-4" />
                          수정
                        </DropdownMenuItem>
                      )}
                      {canDelete && onDeleteComment && (
                        <DropdownMenuItem
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          삭제
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 댓글 입력 폼 */}
      {canComment && (
        <ChatInput
          onSubmit={handleChatInputSubmit}
          placeholder="댓글을 추가하세요..."
          disabled={!canComment}
          users={users}
          currentUserUid={currentUserUid}
          replyTo={replyTo}
          replyToUser={replyToUser}
          onCancelReply={() => {
            setReplyTo(null);
            setReplyToUser(null);
          }}
        />
      )}
    </div>
  );
};

export default CommentsSection;


