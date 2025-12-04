/**
 * 채널 보드뷰 컴포넌트
 * 게시글 형태의 보드 뷰 (Jandi 스타일)
 * 우측 하단에 원형 + 버튼으로 게시글 작성 모달 열기
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { ChannelMessageService } from '../services/channelMessageService';
import { PinnedMessageService } from '../services/pinnedMessageService';
import { Button } from '@/shared/components/ui/button';
import { Pin, MoreVertical, MessageSquare, Plus, X, Image as ImageIcon, Paperclip, Loader2, Trash2, Edit2, Check, X as XIcon } from 'lucide-react';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { cn } from '@/shared/lib/utils';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { Channel } from '../types/channel.types';
import type {
  ChannelMessage,
  ChannelMessageAttachment,
} from '../types/channelMessage.types';
import type { PinnedMessage } from '../types/message.types';
import { getUserInitial } from '@/shared/utils/userUtils';
import { ThreadView } from './ThreadView';
import { ThreadService } from '../services/threadService';
import type { Thread } from '../types/thread.types';
import { uploadImageFilesParallel, uploadFile } from '@/shared/services/firebase/storage';
import { toast } from 'sonner';

export interface ChannelBoardViewProps {
  channel: Channel;
}

export const ChannelBoardView: React.FC<ChannelBoardViewProps> = ({ channel }) => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [threadCounts, setThreadCounts] = useState<Record<string, number>>({}); // 메시지별 댓글 수
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null); // 삭제할 메시지 ID
  const [isDeleting, setIsDeleting] = useState(false); // 삭제 중 상태
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null); // 수정 중인 메시지 ID
  const [editTitle, setEditTitle] = useState(''); // 수정할 제목
  const [editContent, setEditContent] = useState(''); // 수정할 내용

  // 게시글 작성 모달 상태
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postImages, setPostImages] = useState<File[]>([]);
  const [postFiles, setPostFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // 메시지 로드 및 실시간 구독
  useEffect(() => {
    if (!channel.id || !channel.workspaceId || !user?.uid) return;

    setIsLoading(true);

    // 초기 메시지 로드
    const loadMessages = async () => {
      try {
        const messagesList = await ChannelMessageService.fetchInitialMessages(
          channel.id,
          channel.workspaceId,
          50
        );
        setMessages(messagesList);
      } catch (error) {
        console.error('Failed to load messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();

    // 실시간 구독
    const unsubscribe = ChannelMessageService.subscribeToChannelMessages(
      channel.id,
      channel.workspaceId,
      (newMessages) => {
        setMessages(newMessages);
        setIsLoading(false);
      },
      (error: Error) => {
        console.error('Error subscribing to messages:', error);
        setIsLoading(false);
      },
      50
    );

    return () => {
      unsubscribe();
    };
  }, [channel.id, channel.workspaceId, user?.uid]);

  // 고정 메시지 구독
  useEffect(() => {
    if (!channel.id || !channel.workspaceId) return;

    const unsubscribe = PinnedMessageService.subscribeToChannelPinnedMessages(
      channel.workspaceId,
      channel.id,
      (pinned) => {
        setPinnedMessages(pinned);
      },
      (error) => {
        console.error('Error subscribing to pinned messages:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [channel.id, channel.workspaceId]);

  // 댓글 수 구독 (채널의 모든 스레드 구독)
  useEffect(() => {
    if (!channel.id || !channel.workspaceId) return;

    const unsubscribe = ThreadService.subscribeToChannelThreads(
      channel.id,
      channel.workspaceId,
      (threads) => {
        // 메시지별 댓글 수 계산
        const counts: Record<string, number> = {};
        threads.forEach((thread) => {
          // 부모 메시지를 제외한 댓글 수
          const commentCount = thread.messages.length > 0 ? thread.messages.length - 1 : 0;
          counts[thread.parentMessageId] = commentCount;
        });
        setThreadCounts(counts);
      },
      (error) => {
        console.error('Error subscribing to channel threads:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [channel.id, channel.workspaceId]);

  // 고정된 메시지 ID 목록
  const pinnedMessageIds = useMemo(() => {
    return new Set(pinnedMessages.map((p) => p.messageId));
  }, [pinnedMessages]);

  // 메시지에서 제목과 내용 분리 (제목이 첫 줄에 있고 빈 줄로 구분된 경우)
  const parsePostContent = (text: string) => {
    const lines = text.split('\n');
    if (lines.length >= 2 && lines[0].trim() && lines[1].trim() === '') {
      // 첫 줄이 제목이고, 두 번째 줄이 빈 줄인 경우
      return {
        title: lines[0].trim(),
        content: lines.slice(2).join('\n').trim(),
      };
    }
    // 제목이 없는 경우
    return {
      title: null,
      content: text.trim(),
    };
  };

  // 고정된 메시지와 일반 메시지 분리
  const { pinnedPosts, regularPosts } = useMemo(() => {
    const pinned: ChannelMessage[] = [];
    const regular: ChannelMessage[] = [];

    messages.forEach((message) => {
      if (pinnedMessageIds.has(message.id)) {
        pinned.push(message);
      } else {
        regular.push(message);
      }
    });

    // 고정 메시지는 고정 시간 순으로 정렬
    pinned.sort((a, b) => {
      const aPinned = pinnedMessages.find((p) => p.messageId === a.id);
      const bPinned = pinnedMessages.find((p) => p.messageId === b.id);
      if (!aPinned || !bPinned) return 0;
      return new Date(bPinned.pinnedAt).getTime() - new Date(aPinned.pinnedAt).getTime();
    });

    // 일반 메시지는 최신순으로 정렬
    regular.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return { pinnedPosts: pinned, regularPosts: regular };
  }, [messages, pinnedMessageIds, pinnedMessages]);

  // 메시지 고정/고정 해제
  const handleTogglePin = async (messageId: string) => {
    if (!user?.uid) return;

    try {
      const existingPinned = pinnedMessages.find((p) => p.messageId === messageId);
      if (existingPinned) {
        await PinnedMessageService.unpinMessage(
          existingPinned.id,
          channel.id,
          channel.workspaceId
        );
        toast.success('고정 해제되었습니다');
      } else {
        const message = messages.find((m) => m.id === messageId);
        if (message) {
          await PinnedMessageService.pinMessage(
            messageId,
            channel.id,
            channel.workspaceId,
            user.uid,
            message
          );
          toast.success('고정되었습니다');
        }
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error);
      toast.error('고정 처리에 실패했습니다');
    }
  };

  // 스레드 열기
  const handleThreadClick = async (messageId: string) => {
    try {
      const thread = await ThreadService.getMessageThread(
        messageId,
        channel.workspaceId,
        channel.id
      );
      if (thread) {
        setSelectedThreadId(thread.id);
        setSelectedThread(thread);
      }
    } catch (error) {
      console.error('Failed to get thread:', error);
    }
  };

  // 스레드 닫기
  const handleCloseThread = () => {
    setSelectedThreadId(null);
    setSelectedThread(null);
  };

  // 게시글 삭제
  const handleDeleteMessage = async (messageId: string) => {
    if (!user?.uid || !messageId) return;

    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    // 권한 체크: 작성자만 삭제 가능
    if (message.sender.uid !== user.uid) {
      toast.error('본인이 작성한 게시글만 삭제할 수 있습니다');
      return;
    }

    setIsDeleting(true);
    try {
      await ChannelMessageService.deleteMessage(
        channel.id,
        channel.workspaceId,
        messageId
      );
      toast.success('게시글이 삭제되었습니다');
      setDeleteMessageId(null);
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error('게시글 삭제에 실패했습니다');
    } finally {
      setIsDeleting(false);
    }
  };

  // 게시글 수정 시작
  const handleStartEdit = (message: ChannelMessage) => {
    const { title, content } = parsePostContent(message.text);
    setEditingMessageId(message.id);
    setEditTitle(title || '');
    setEditContent(content || '');
  };

  // 게시글 수정 취소
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditTitle('');
    setEditContent('');
  };

  // 게시글 수정 저장
  const handleSaveEdit = async (messageId: string) => {
    if (!user?.uid || !messageId) return;

    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    // 권한 체크: 작성자만 수정 가능
    if (message.sender.uid !== user.uid) {
      toast.error('본인이 작성한 게시글만 수정할 수 있습니다');
      return;
    }

    if (!editTitle.trim() && !editContent.trim()) {
      toast.error('제목 또는 내용을 입력해주세요');
      return;
    }

    try {
      const messageText = editTitle.trim()
        ? `${editTitle}\n\n${editContent.trim()}`
        : editContent.trim();

      await ChannelMessageService.updateMessage(
        channel.id,
        channel.workspaceId,
        messageId,
        messageText
      );
      toast.success('게시글이 수정되었습니다');
      handleCancelEdit();
    } catch (error) {
      console.error('Failed to update message:', error);
      toast.error('게시글 수정에 실패했습니다');
    }
  };

  // 이미지 선택
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    setPostImages((prev) => [...prev, ...imageFiles]);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  // 파일 선택
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPostFiles((prev) => [...prev, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 이미지 제거
  const handleRemoveImage = (index: number) => {
    setPostImages((prev) => prev.filter((_, i) => i !== index));
  };

  // 파일 제거
  const handleRemoveFile = (index: number) => {
    setPostFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // 파일 처리 (이미지와 일반 파일 분리)
  const handleFiles = (files: File[]) => {
    const imageFiles: File[] = [];
    const otherFiles: File[] = [];

    files.forEach((file) => {
      if (file.type.startsWith('image/')) {
        imageFiles.push(file);
      } else {
        otherFiles.push(file);
      }
    });

    if (imageFiles.length > 0) {
      setPostImages((prev) => [...prev, ...imageFiles]);
    }
    if (otherFiles.length > 0) {
      setPostFiles((prev) => [...prev, ...otherFiles]);
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 드롭 영역을 완전히 벗어났을 때만 드래그 상태 해제
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isUploading) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  // 게시글 작성
  const handleCreatePost = async () => {
    if (!user?.uid) return;
    if (!postTitle.trim() && !postContent.trim() && postImages.length === 0 && postFiles.length === 0) {
      toast.error('제목 또는 내용을 입력해주세요');
      return;
    }

    setIsUploading(true);
    try {
      const attachments: ChannelMessageAttachment[] = [];

      // 이미지 업로드
      if (postImages.length > 0) {
        const imageUrls = await uploadImageFilesParallel(
          postImages,
          `workspace/messages/${channel.workspaceId}/${channel.id}`
        );
        imageUrls.forEach((url, index) => {
          attachments.push({
            id: `img-${Date.now()}-${index}`,
            type: 'image',
            url,
            name: postImages[index].name,
            size: postImages[index].size,
            mimeType: postImages[index].type,
          });
        });
      }

      // 파일 업로드
      if (postFiles.length > 0) {
        for (const file of postFiles) {
          const timestamp = Date.now();
          const fileExtension = file.name.split('.').pop();
          const fileName = `file_${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const filePath = `workspace/messages/${channel.workspaceId}/${channel.id}/${fileName}`;
          
          const url = await uploadFile(file, filePath);
          attachments.push({
            id: `file-${timestamp}-${file.name}`,
            type: 'file',
            url,
            name: file.name,
            size: file.size,
            mimeType: file.type,
          });
        }
      }

      // 메시지 전송 (제목과 내용을 결합)
      const messageText = postTitle.trim()
        ? `${postTitle}\n\n${postContent.trim()}`
        : postContent.trim();

      await ChannelMessageService.sendMessage(
        channel.id,
        channel.workspaceId,
        messageText,
        {
          uid: user.uid,
          displayName: user.displayName || user.email || '사용자',
          photoURL: user.photoURL || undefined,
        },
        attachments.length > 0 ? attachments : undefined
      );

      // 모달 닫기 및 초기화
      setIsCreatePostOpen(false);
      setPostTitle('');
      setPostContent('');
      setPostImages([]);
      setPostFiles([]);
      toast.success('게시글이 작성되었습니다');
    } catch (error) {
      console.error('Failed to create post:', error);
      toast.error('게시글 작성에 실패했습니다');
    } finally {
      setIsUploading(false);
    }
  };

  // 모달 닫기
  const handleCloseModal = () => {
    if (isUploading) return;
    setIsCreatePostOpen(false);
    setPostTitle('');
    setPostContent('');
    setPostImages([]);
    setPostFiles([]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full relative">
      {/* 메인 보드뷰 */}
      <div
        className={cn(
          'flex-1 min-w-0 w-full flex flex-col',
          selectedThreadId && 'border-r'
        )}
      >
        <ScrollArea className="flex-1">
          <div className="p-4">
            <div className="max-w-3xl mx-auto space-y-4">
              {/* 고정된 게시글 섹션 */}
              {pinnedPosts.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-2">
                    <Pin className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-muted-foreground">고정된 게시글</h3>
                  </div>
                  <div className="space-y-3">
                  {pinnedPosts.map((message) => {
                    const pinnedInfo = pinnedMessages.find((p) => p.messageId === message.id);
                    return (
                      <div
                        key={message.id}
                        className="bg-card border-2 border-primary/20 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarImage src={message.sender.photoURL} />
                            <AvatarFallback>
                              {getUserInitial(
                                { displayName: message.sender.displayName },
                                message.sender.displayName.charAt(0)
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm">
                                {message.sender.displayName}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                <Pin className="h-3 w-3 mr-1" />
                                고정됨
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(message.timestamp), 'yyyy년 MM월 dd일 HH:mm', {
                                  locale: ko,
                                })}
                              </span>
                            </div>
                            {editingMessageId === message.id ? (
                              // 수정 모드
                              <div className="space-y-3 mb-3">
                                <div>
                                  <Input
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    placeholder="제목"
                                    className="mb-2"
                                  />
                                  <Textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    placeholder="내용"
                                    rows={6}
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveEdit(message.id)}
                                    disabled={!editTitle.trim() && !editContent.trim()}
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    저장
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleCancelEdit}
                                  >
                                    <XIcon className="h-4 w-4 mr-1" />
                                    취소
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              // 일반 표시 모드
                              (() => {
                                const { title, content } = parsePostContent(message.text);
                                return (
                                  <>
                                    {title && (
                                      <h3 className="text-base font-semibold text-foreground mb-2">
                                        {title}
                                      </h3>
                                    )}
                                    {content && (
                                      <div className="text-sm text-foreground whitespace-pre-wrap mb-3">
                                        {content}
                                      </div>
                                    )}
                                  </>
                                );
                              })()
                            )}
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mb-3 space-y-2">
                                {message.attachments.map((attachment) => (
                                  <div key={attachment.id} className="text-xs text-muted-foreground">
                                    {attachment.type === 'image' ? (
                                      <img
                                        src={attachment.url}
                                        alt={attachment.name}
                                        className="max-w-full max-h-64 rounded-md"
                                      />
                                    ) : (
                                      <a
                                        href={attachment.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                      >
                                        📎 {attachment.name}
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center justify-between pt-2 border-t">
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <button
                                  className="flex items-center gap-1.5 hover:text-foreground transition-colors font-medium"
                                  onClick={() => handleThreadClick(message.id)}
                                >
                                  <MessageSquare className="h-4 w-4" />
                                  댓글
                                  {threadCounts[message.id] > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                      {threadCounts[message.id]}
                                    </span>
                                  )}
                                </button>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTogglePin(message.id);
                                    }}
                                  >
                                    <Pin className="h-4 w-4 mr-2" />
                                    고정 해제
                                  </DropdownMenuItem>
                                  {message.sender.uid === user?.uid && (
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteMessageId(message.id);
                                      }}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      삭제
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 일반 게시글 섹션 */}
            <div className="space-y-3">
              {pinnedPosts.length > 0 && (
                <div className="flex items-center gap-2 px-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">게시글</h3>
                </div>
              )}
              {regularPosts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">아직 게시글이 없습니다.</p>
                  <p className="text-xs mt-1">첫 게시글을 작성해보세요.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {regularPosts.map((message) => (
                    <div
                      key={message.id}
                      className="bg-card border rounded-lg p-5 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleThreadClick(message.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src={message.sender.photoURL} />
                          <AvatarFallback>
                            {getUserInitial(
                              { displayName: message.sender.displayName },
                              message.sender.displayName.charAt(0)
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">
                              {message.sender.displayName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(message.timestamp), 'yyyy년 MM월 dd일 HH:mm', {
                                locale: ko,
                              })}
                            </span>
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                asChild
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTogglePin(message.id);
                                  }}
                                >
                                  <Pin className="h-4 w-4 mr-2" />
                                  게시글 고정
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          {editingMessageId === message.id ? (
                            // 수정 모드
                            <div className="space-y-3 mb-3">
                              <div>
                                <Input
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  placeholder="제목"
                                  className="mb-2"
                                />
                                <Textarea
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  placeholder="내용"
                                  rows={6}
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveEdit(message.id)}
                                  disabled={!editTitle.trim() && !editContent.trim()}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  저장
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelEdit}
                                >
                                  <XIcon className="h-4 w-4 mr-1" />
                                  취소
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // 일반 표시 모드
                            (() => {
                              const { title, content } = parsePostContent(message.text);
                              return (
                                <>
                                  {title && (
                                    <h3 className="text-base font-semibold text-foreground mb-2">
                                      {title}
                                    </h3>
                                  )}
                                  {content && (
                                    <div className="text-sm text-foreground whitespace-pre-wrap mb-3">
                                      {content}
                                    </div>
                                  )}
                                </>
                              );
                            })()
                          )}
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mb-3 space-y-2">
                              {message.attachments.map((attachment) => (
                                <div key={attachment.id} className="text-xs text-muted-foreground">
                                  {attachment.type === 'image' ? (
                                    <img
                                      src={attachment.url}
                                      alt={attachment.name}
                                      className="max-w-full max-h-64 rounded-md"
                                    />
                                  ) : (
                                    <a
                                      href={attachment.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline"
                                    >
                                      📎 {attachment.name}
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-2 border-t">
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <button
                                className="flex items-center gap-1.5 hover:text-foreground transition-colors font-medium"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleThreadClick(message.id);
                                }}
                              >
                                <MessageSquare className="h-4 w-4" />
                                댓글
                                {threadCounts[message.id] > 0 && (
                                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                    {threadCounts[message.id]}
                                  </span>
                                )}
                              </button>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                asChild
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTogglePin(message.id);
                                  }}
                                >
                                  <Pin className="h-4 w-4 mr-2" />
                                  게시글 고정
                                </DropdownMenuItem>
                                {message.sender.uid === user?.uid && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteMessageId(message.id);
                                    }}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    삭제
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* 스레드 뷰 */}
      {selectedThreadId && selectedThread && (
        <div className="w-96 flex-shrink-0">
          <ThreadView
            threadId={selectedThreadId}
            channelId={channel.id}
            workspaceId={channel.workspaceId}
            parentMessageId={selectedThread.parentMessageId}
            onClose={handleCloseThread}
            currentUserId={user?.uid || ''}
          />
        </div>
      )}

      {/* 우측 하단 게시글 추가 버튼 */}
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        onClick={() => setIsCreatePostOpen(true)}
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* 게시글 작성 모달 */}
      <Dialog open={isCreatePostOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>게시글 작성</DialogTitle>
            <DialogDescription>
              새로운 게시글을 작성하세요. 제목과 내용을 입력하고 이미지나 파일을 첨부할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          <div
            ref={dropZoneRef}
            className={cn(
              'space-y-4 mt-4 relative',
              isDragging && 'ring-2 ring-primary ring-offset-2 rounded-lg'
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {/* 드래그 오버 레이어 */}
            {isDragging && (
              <div className="absolute inset-0 bg-primary/5 border-2 border-dashed border-primary rounded-lg z-10 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl mb-2">📎</div>
                  <p className="text-sm font-medium text-primary">파일을 여기에 놓으세요</p>
                </div>
              </div>
            )}
            {/* 제목 입력 */}
            <div>
              <Label htmlFor="post-title">제목</Label>
              <Input
                id="post-title"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="게시글 제목을 입력하세요"
                disabled={isUploading}
              />
            </div>

            {/* 내용 입력 */}
            <div>
              <Label htmlFor="post-content">내용</Label>
              <Textarea
                id="post-content"
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="게시글 내용을 입력하세요"
                rows={8}
                disabled={isUploading}
              />
            </div>

            {/* 이미지 첨부 */}
            <div>
              <Label>이미지 첨부</Label>
              <div className="space-y-2">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                  disabled={isUploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full"
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  이미지 선택
                </Button>
                {postImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {postImages.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-md"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveImage(index)}
                          disabled={isUploading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 파일 첨부 */}
            <div>
              <Label>파일 첨부</Label>
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isUploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full"
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  파일 선택
                </Button>
                {postFiles.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {postFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-muted rounded-md"
                      >
                        <span className="text-sm truncate flex-1">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleRemoveFile(index)}
                          disabled={isUploading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 작성 버튼 */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleCloseModal}
                disabled={isUploading}
              >
                취소
              </Button>
              <Button
                onClick={handleCreatePost}
                disabled={isUploading || (!postTitle.trim() && !postContent.trim() && postImages.length === 0 && postFiles.length === 0)}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    작성 중...
                  </>
                ) : (
                  '작성'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 게시글 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteMessageId !== null} onOpenChange={(open) => !open && setDeleteMessageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>게시글 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 이 게시글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 게시글과 관련된 모든 댓글도 함께 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMessageId && handleDeleteMessage(deleteMessageId)}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
