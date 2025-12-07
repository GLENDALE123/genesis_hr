/**
 * 채널 보드뷰 컴포넌트
 * 게시글 형태의 보드 뷰 (Jandi 스타일)
 * 우측 하단에 원형 + 버튼으로 게시글 작성 모달 열기
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { ChannelMessageService, PinnedMessageService } from '../../messages';
import { Button } from '@/shared/components/ui/button';
import { Pin, MoreVertical, MessageSquare, Plus, X, Image as ImageIcon, Paperclip, Loader2, Trash2, Edit2, Check, X as XIcon, ChevronDown } from 'lucide-react';
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
import { formatChannelMessageDateTime, formatPostDateTime } from '../../utils/dateFormat';
import type { Channel } from '../types/channel.types';
import type {
  ChannelMessage,
  ChannelMessageAttachment,
  PinnedMessage,
} from '../../messages';
import { getUserInitial, getUserDisplayName } from '@/shared/utils/user/userUtils';
import { ThreadView, ThreadService } from '../../threads';
import type { Thread } from '../../threads';
import { uploadImageFilesParallel, uploadFile } from '@/shared/services/firebase/storage';
import { toast } from 'sonner';
import { ImageLightbox } from '@/shared/components/common/ImageLightbox';
import { getUserProfile } from '@/shared/services/firebase/userProfile';
import type { UserProfile } from '@/features/auth/types';
import { UploadingImageGrid } from '@/shared/components/common/UploadingImageGrid';
import type { UploadingImageItem } from '@/shared/components/common/UploadingImageGrid';

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
  const [threads, setThreads] = useState<Record<string, Thread>>({}); // 메시지별 스레드 데이터
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set()); // 댓글 전체 표시 여부
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null); // 삭제할 메시지 ID
  const [isDeleting, setIsDeleting] = useState(false); // 삭제 중 상태
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null); // 수정 중인 메시지 ID
  const [editTitle, setEditTitle] = useState(''); // 수정할 제목
  const [editContent, setEditContent] = useState(''); // 수정할 내용
  const [editAttachments, setEditAttachments] = useState<ChannelMessageAttachment[]>([]); // 수정 중인 첨부파일
  const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<Set<string>>(new Set()); // 삭제된 첨부파일 ID
  const [editImages, setEditImages] = useState<File[]>([]); // 수정 모드에서 추가할 이미지
  const [editFiles, setEditFiles] = useState<File[]>([]); // 수정 모드에서 추가할 파일
  const editImageInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [isEditingUploading, setIsEditingUploading] = useState(false); // 수정 모드 업로드 중 상태
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({}); // 메시지별 댓글 입력 텍스트
  const [isSubmittingComment, setIsSubmittingComment] = useState<Record<string, boolean>>({}); // 메시지별 댓글 제출 중 상태
  const [commentImages, setCommentImages] = useState<Record<string, UploadingImageItem[]>>({}); // 메시지별 댓글 이미지 첨부
  const [commentFiles, setCommentFiles] = useState<Record<string, File[]>>({}); // 메시지별 댓글 파일 첨부
  const commentImageInputRefs = useRef<Record<string, HTMLInputElement | null>>({}); // 메시지별 이미지 입력 참조
  const commentFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({}); // 메시지별 파일 입력 참조
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({}); // 게시글별 ref
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null); // 하이라이트된 게시글 ID
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile | null>>({}); // 사용자 프로필 캐시

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
  
  // 이미지 라이트박스 상태
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // 메시지 로드 및 실시간 구독
  useEffect(() => {
    if (!channel.id || !channel.workspaceId || !user?.uid) {
      // user?.uid가 없으면 메시지 초기화 및 구독 중단
      setMessages([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let unsubscribeFn: (() => void) | null = null;

    // 초기 메시지 로드
    const loadMessages = async () => {
      try {
        const messagesList = await ChannelMessageService.fetchInitialMessages(
          channel.id,
          channel.workspaceId,
          50
        );
        // user?.uid가 여전히 있는지 확인 (로그아웃 중일 수 있음)
        if (!user?.uid) {
          setMessages([]);
          setIsLoading(false);
          return;
        }
        setMessages(messagesList);
      } catch (error) {
        // 권한 오류는 조용히 처리 (로그아웃 중일 수 있음)
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isPermissionError = 
          errorMessage.includes('permission') || 
          errorMessage.includes('insufficient');
        
        if (!isPermissionError) {
          console.error('Failed to load messages:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();

    // 실시간 구독
    unsubscribeFn = ChannelMessageService.subscribeToChannelMessages(
      channel.id,
      channel.workspaceId,
      (newMessages) => {
        // user?.uid가 여전히 있는지 확인 (로그아웃 중일 수 있음)
        if (!user?.uid) {
          if (unsubscribeFn) {
            unsubscribeFn();
            unsubscribeFn = null;
          }
          setMessages([]);
          setIsLoading(false);
          return;
        }
        setMessages(newMessages);
        setIsLoading(false);
      },
      (error: Error) => {
        // 권한 오류는 조용히 처리 (로그아웃 중일 수 있음)
        const errorMessage = error.message || String(error);
        const isPermissionError = 
          errorMessage.includes('permission') || 
          errorMessage.includes('insufficient');
        
        if (!isPermissionError) {
          console.error('Error subscribing to messages:', error);
        }
        setIsLoading(false);
      },
      50
    );

    return () => {
      if (unsubscribeFn) {
        unsubscribeFn();
        unsubscribeFn = null;
      }
    };
  }, [channel.id, channel.workspaceId, user?.uid]);

  // 고정 메시지 구독 및 수동 로드
  useEffect(() => {
    if (!channel.id || !channel.workspaceId) return;

    // 초기 로드
    const loadPinnedMessages = async () => {
      try {
        const pinned = await PinnedMessageService.getChannelPinnedMessages(
          channel.id,
          channel.workspaceId
        );
        setPinnedMessages(pinned);
      } catch (error) {
        console.error('Error loading pinned messages:', error);
        setPinnedMessages([]);
      }
    };

    loadPinnedMessages();

    // 실시간 구독
    const unsubscribe = PinnedMessageService.subscribeToChannelPinnedMessages(
      channel.workspaceId,
      channel.id,
      (pinned) => {
        setPinnedMessages(pinned);
      },
      (error) => {
        console.error('Error subscribing to pinned messages:', error);
        // 구독 실패 시 수동으로 다시 로드 시도
        loadPinnedMessages();
      }
    );

    return () => {
      unsubscribe();
    };
  }, [channel.id, channel.workspaceId]);

  // 댓글 수 및 스레드 데이터 구독 (채널의 모든 스레드 구독)
  useEffect(() => {
    if (!channel.id || !channel.workspaceId) return;

    const unsubscribe = ThreadService.subscribeToChannelThreads(
      channel.id,
      channel.workspaceId,
      (channelThreads) => {
        // 메시지별 댓글 수 계산
        const counts: Record<string, number> = {};
        const threadsMap: Record<string, Thread> = {};
        
        channelThreads.forEach((thread) => {
          // 부모 메시지를 제외한 댓글 수
          const commentCount = thread.messages.length > 0 ? thread.messages.length - 1 : 0;
          counts[thread.parentMessageId] = commentCount;
          threadsMap[thread.parentMessageId] = thread;
        });
        
        setThreadCounts(counts);
        setThreads(threadsMap);
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

    // 고정된 메시지 ID 목록
    const pinnedIds = new Set(pinnedMessages.map((p) => p.messageId));

    // 메시지 맵 생성 (빠른 조회를 위해)
    const messageMap = new Map(messages.map((m) => [m.id, m]));

    // 고정된 메시지 처리: pinnedMessages의 message 필드 사용 (메시지가 삭제되었거나 아직 로드되지 않은 경우 대비)
    pinnedMessages.forEach((pinnedMsg) => {
      // messages 배열에 있으면 그것을 사용, 없으면 pinnedMessages의 message 필드 사용
      const message = messageMap.get(pinnedMsg.messageId) || pinnedMsg.message;
      if (message) {
        pinned.push(message as ChannelMessage);
      }
    });

    // 모든 메시지를 일반 메시지에 포함 (고정된 게시글도 일반 목록에 표시)
    messages.forEach((message) => {
      regular.push(message);
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
  }, [messages, pinnedMessages]);

  // 게시글로 스크롤 이동 및 하이라이트
  const scrollToMessage = (messageId: string) => {
    const messageElement = messageRefs.current[messageId];
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // 하이라이트 애니메이션
      setHighlightedMessageId(messageId);
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 2000); // 2초 후 하이라이트 제거
    }
  };

  // 사용자 프로필 로드 (캐시 사용)
  useEffect(() => {
    const loadUserProfiles = async () => {
      const uniqueUserIds = new Set<string>();
      
      // 모든 메시지의 sender UID 수집
      messages.forEach((message) => {
        if (message.sender.uid) {
          uniqueUserIds.add(message.sender.uid);
        }
      });
      
      // 모든 댓글의 sender UID 수집
      Object.values(threads).forEach((thread) => {
        if (thread.messages) {
          thread.messages.forEach((msg) => {
            if (msg.sender.uid) {
              uniqueUserIds.add(msg.sender.uid);
            }
          });
        }
      });

      // 아직 로드하지 않은 사용자 프로필만 로드
      const profilesToLoad: Promise<[string, UserProfile | null]>[] = [];
      uniqueUserIds.forEach((uid) => {
        if (!userProfiles[uid]) {
          profilesToLoad.push(
            getUserProfile(uid).then((profile) => [uid, profile])
          );
        }
      });

      if (profilesToLoad.length > 0) {
        const loadedProfiles = await Promise.all(profilesToLoad);
        setUserProfiles((prev) => {
          const updated = { ...prev };
          loadedProfiles.forEach(([uid, profile]) => {
            updated[uid] = profile;
          });
          return updated;
        });
      }
    };

    if (messages.length > 0 || Object.keys(threads).length > 0) {
      loadUserProfiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, threads]);

  // 모든 이미지 URL 수집 (라이트박스용)
  const allImages = useMemo(() => {
    const imageUrls: string[] = [];
    [...pinnedPosts, ...regularPosts].forEach((message) => {
      if (message.attachments) {
        message.attachments
          .filter((att) => att.type === 'image')
          .forEach((att) => {
            imageUrls.push(att.url);
          });
      }
    });
    return imageUrls;
  }, [pinnedPosts, regularPosts]);

  // 이미지 클릭 핸들러
  const handleImageClick = (imageUrl: string) => {
    const index = allImages.indexOf(imageUrl);
    if (index !== -1) {
      setLightboxIndex(index);
      setLightboxOpen(true);
    }
  };

  // 메시지 고정/고정 해제
  const handleTogglePin = async (messageId: string) => {
    if (!user?.uid) return;

    try {
      // 먼저 Firestore에서 직접 확인 (구독이 지연될 수 있음)
      const existingPinned = await PinnedMessageService.getPinnedMessage(
        messageId,
        channel.id,
        channel.workspaceId
      );

      if (existingPinned) {
        // 고정 해제
        await PinnedMessageService.unpinMessage(
          existingPinned.id,
          channel.id,
          channel.workspaceId
        );
        // 수동으로 고정 메시지 목록 다시 로드
        const updatedPinned = await PinnedMessageService.getChannelPinnedMessages(
          channel.id,
          channel.workspaceId
        );
        setPinnedMessages(updatedPinned);
      } else {
        // 고정
        const message = messages.find((m) => m.id === messageId);
        if (message) {
          await PinnedMessageService.pinMessage(
            messageId,
            channel.id,
            channel.workspaceId,
            user.uid,
            message
          );
          // 수동으로 고정 메시지 목록 다시 로드
          const updatedPinned = await PinnedMessageService.getChannelPinnedMessages(
            channel.id,
            channel.workspaceId
          );
          setPinnedMessages(updatedPinned);
        } else {
          toast.error('게시글을 찾을 수 없습니다');
        }
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // 이미 고정된 메시지인 경우 조용히 처리 (구독이 지연되어 발생할 수 있음)
      if (errorMessage.includes('already pinned')) {
        // Firestore에서 다시 확인하여 고정 해제 시도
        try {
          const existingPinned = await PinnedMessageService.getPinnedMessage(
            messageId,
            channel.id,
            channel.workspaceId
          );
          if (existingPinned) {
            await PinnedMessageService.unpinMessage(
              existingPinned.id,
              channel.id,
              channel.workspaceId
            );
            // 수동으로 고정 메시지 목록 다시 로드
            const updatedPinned = await PinnedMessageService.getChannelPinnedMessages(
              channel.id,
              channel.workspaceId
            );
            setPinnedMessages(updatedPinned);
          }
        } catch (retryError) {
          console.error('Failed to unpin on retry:', retryError);
          toast.error('고정 처리에 실패했습니다');
        }
      } else {
        toast.error('고정 처리에 실패했습니다');
      }
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

  // 댓글 작성
  const handleAddComment = async (messageId: string) => {
    if (!user?.uid) return;
    
    const commentText = commentTexts[messageId]?.trim();
    const images = commentImages[messageId] || [];
    const files = commentFiles[messageId] || [];
    
    // 텍스트, 이미지, 파일 중 하나라도 있어야 함
    if (!commentText && images.length === 0 && files.length === 0) return;

    setIsSubmittingComment((prev) => ({ ...prev, [messageId]: true }));

    try {
      // 이미지 업로드
      const attachments: ChannelMessageAttachment[] = [];
      
      if (images.length > 0) {
        const imageFiles = images.map((item) => item.file).filter((file): file is File => file !== null);
        if (imageFiles.length > 0) {
          const imageUrls = await uploadImageFilesParallel(
            imageFiles,
            `workspaces/${channel.workspaceId}/channels/${channel.id}/threads/${messageId}/images`
          );
          
          imageUrls.forEach((url, index) => {
            attachments.push({
              id: `comment-image-${Date.now()}-${index}`,
              type: 'image',
              url,
              name: imageFiles[index].name,
              size: imageFiles[index].size,
            });
          });
        }
      }

      // 파일 업로드
      if (files.length > 0) {
        const fileUploadPromises = files.map((file) =>
          uploadFile(
            file,
            `workspaces/${channel.workspaceId}/channels/${channel.id}/threads/${messageId}/files`
          )
        );
        const fileUrls = await Promise.all(fileUploadPromises);
        
        fileUrls.forEach((url, index) => {
          attachments.push({
            id: `comment-file-${Date.now()}-${index}`,
            type: 'file',
            url,
            name: files[index].name,
            size: files[index].size,
          });
        });
      }

      // 스레드가 있는지 확인
      let thread = await ThreadService.getMessageThread(
        messageId,
        channel.workspaceId,
        channel.id
      );

      // 스레드가 없으면 생성
      if (!thread) {
        const message = messages.find((m) => m.id === messageId);
        if (!message) {
          toast.error('게시글을 찾을 수 없습니다');
          return;
        }

        // 스레드 생성 시 initialMessage는 부모 메시지의 복사본이어야 함
        // 실제 댓글은 addThreadMessage로 추가
        const threadId = await ThreadService.createThread({
          channelId: channel.id,
          workspaceId: channel.workspaceId,
          parentMessageId: messageId,
          initialMessage: {
            ...message,
            // 부모 메시지 그대로 사용
          },
        });

        thread = await ThreadService.getThread(threadId, channel.workspaceId, channel.id);
      }

      // 스레드에 댓글 추가
      if (thread) {
        await ThreadService.addThreadMessage({
          threadId: thread.id,
          channelId: channel.id,
          workspaceId: channel.workspaceId,
          message: {
            channelId: channel.id,
            workspaceId: channel.workspaceId,
            text: commentText || '',
            sender: {
              uid: user.uid,
              displayName: user.displayName || user.email || '사용자',
              photoURL: user.photoURL || undefined,
            },
            attachments: attachments.length > 0 ? attachments : undefined,
          },
        });

        // 댓글 입력창 초기화
        setCommentTexts((prev) => {
          const updated = { ...prev };
          delete updated[messageId];
          return updated;
        });
        setCommentImages((prev) => {
          const updated = { ...prev };
          if (updated[messageId]) {
            // blob URL 정리
            updated[messageId].forEach((item) => {
              if (item.preview && item.preview.startsWith('blob:')) {
                URL.revokeObjectURL(item.preview);
              }
            });
          }
          delete updated[messageId];
          return updated;
        });
        setCommentFiles((prev) => {
          const updated = { ...prev };
          delete updated[messageId];
          return updated;
        });
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('댓글 작성에 실패했습니다');
    } finally {
      setIsSubmittingComment((prev) => {
        const updated = { ...prev };
        delete updated[messageId];
        return updated;
      });
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
    setEditAttachments(message.attachments || []);
    setDeletedAttachmentIds(new Set());
    setEditImages([]);
    setEditFiles([]);
  };

  // 게시글 수정 취소
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditTitle('');
    setEditContent('');
    setEditAttachments([]);
    setDeletedAttachmentIds(new Set());
    setEditImages([]);
    setEditFiles([]);
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

    setIsEditingUploading(true);
    try {
      const messageText = editTitle.trim()
        ? `${editTitle}\n\n${editContent.trim()}`
        : editContent.trim();

      // 삭제되지 않은 첨부파일만 필터링
      const remainingAttachments = editAttachments.filter(
        (att) => !deletedAttachmentIds.has(att.id)
      );

      // 새로 추가할 이미지 업로드
      const newAttachments: ChannelMessageAttachment[] = [...remainingAttachments];
      
      if (editImages.length > 0) {
        const imageUrls = await uploadImageFilesParallel(
          editImages,
          `workspaces/${channel.workspaceId}/channels/${channel.id}/messages/${messageId}/images`
        );
        
        imageUrls.forEach((url, index) => {
          newAttachments.push({
            id: `new-image-${Date.now()}-${index}`,
            type: 'image',
            url,
            name: editImages[index].name,
            size: editImages[index].size,
          });
        });
      }

      // 새로 추가할 파일 업로드
      if (editFiles.length > 0) {
        const fileUploadPromises = editFiles.map((file) =>
          uploadFile(
            file,
            `workspaces/${channel.workspaceId}/channels/${channel.id}/messages/${messageId}/files`
          )
        );
        const fileUrls = await Promise.all(fileUploadPromises);
        
        fileUrls.forEach((url, index) => {
          newAttachments.push({
            id: `new-file-${Date.now()}-${index}`,
            type: 'file',
            url,
            name: editFiles[index].name,
            size: editFiles[index].size,
          });
        });
      }

      await ChannelMessageService.updateMessage(
        channel.id,
        channel.workspaceId,
        messageId,
        messageText,
        newAttachments.length > 0 ? newAttachments : undefined
      );
      toast.success('게시글이 수정되었습니다');
      handleCancelEdit();
    } catch (error) {
      console.error('Failed to update message:', error);
      toast.error('게시글 수정에 실패했습니다');
    } finally {
      setIsEditingUploading(false);
    }
  };

  // 첨부파일 삭제 핸들러
  const handleDeleteAttachment = (attachmentId: string) => {
    setDeletedAttachmentIds((prev) => new Set(prev).add(attachmentId));
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
              {/* 고정된 게시글 카드 섹션 */}
              {pinnedPosts.length > 0 && (
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 px-2">
                    <Pin className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-muted-foreground">고정된 게시글</h3>
                  </div>
                  <div className="space-y-3">
                  {pinnedPosts.map((message) => {
                    const { title } = parsePostContent(message.text);
                    const firstImage = message.attachments?.find((att) => att.type === 'image');
                    return (
                      <div
                        key={message.id}
                        onClick={() => scrollToMessage(message.id)}
                        className="bg-card border-2 border-primary/20 rounded-lg p-5 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-primary/40"
                      >
                        <div className="flex gap-3">
                          {/* 첫 번째 이미지 */}
                          {firstImage && (
                            <div className="w-20 h-20 flex-shrink-0 rounded-md overflow-hidden border border-border">
                              <img
                                src={firstImage.url}
                                alt={firstImage.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          {/* 제목과 날짜 */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm mb-1 line-clamp-2">
                              {title || '제목 없음'}
                            </h4>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-xs text-muted-foreground">
                                {getUserDisplayName(
                                  { displayName: message.sender.displayName },
                                  userProfiles[message.sender.uid] || null
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatPostDateTime(new Date(message.timestamp))}
                              </p>
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
                      ref={(el) => {
                        messageRefs.current[message.id] = el;
                      }}
                      className={cn(
                        "bg-card border rounded-lg p-5 hover:shadow-md transition-all overflow-hidden",
                        highlightedMessageId === message.id && "animate-flash"
                      )}
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
                              {getUserDisplayName(
                                { displayName: message.sender.displayName },
                                userProfiles[message.sender.uid] || null
                              )}
                            </span>
                             <span className="text-xs text-muted-foreground">
                               {formatPostDateTime(new Date(message.timestamp))}
                             </span>
                             <div className="flex items-center gap-1 ml-auto">
                               {/* 고정 토글 버튼 */}
                               <Button
                                 variant="ghost"
                                 size="icon"
                                 className="h-7 w-7"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   handleTogglePin(message.id);
                                 }}
                                 title={pinnedMessageIds.has(message.id) ? '고정 해제' : '게시글 고정'}
                               >
                                 {pinnedMessageIds.has(message.id) ? (
                                   <Pin className="h-4 w-4 fill-primary text-primary" />
                                 ) : (
                                   <Pin className="h-4 w-4 text-muted-foreground" />
                                 )}
                               </Button>
                               {/* 더보기 메뉴 */}
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
                                   {message.sender.uid === user?.uid && (
                                     <>
                                       <DropdownMenuItem
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           handleStartEdit(message);
                                         }}
                                       >
                                         <Edit2 className="h-4 w-4 mr-2" />
                                         수정
                                       </DropdownMenuItem>
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
                                     </>
                                   )}
                                 </DropdownMenuContent>
                               </DropdownMenu>
                             </div>
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
                              {/* 첨부파일 표시 및 삭제 */}
                              <div className="space-y-3">
                                {/* 기존 첨부파일 */}
                                {editAttachments.length > 0 && (
                                  <div className="space-y-2">
                                    {/* 이미지 그리드 */}
                                    {editAttachments.filter((att) => att.type === 'image').length > 0 && (
                                      <div className="grid grid-cols-4 gap-2">
                                        {editAttachments
                                          .filter((att) => att.type === 'image')
                                          .map((attachment) => {
                                            const isDeleted = deletedAttachmentIds.has(attachment.id);
                                            return (
                                              <div
                                                key={attachment.id}
                                                className="relative w-full aspect-square group"
                                              >
                                                <img
                                                  src={attachment.url}
                                                  alt={attachment.name}
                                                  className={cn(
                                                    "w-full h-full object-cover rounded-md border border-border",
                                                    isDeleted && "opacity-50 grayscale"
                                                  )}
                                                />
                                                <Button
                                                  variant="destructive"
                                                  size="icon"
                                                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                  onClick={() => handleDeleteAttachment(attachment.id)}
                                                  title="이미지 삭제"
                                                  disabled={isEditingUploading}
                                                >
                                                  <X className="h-3 w-3" />
                                                </Button>
                                                {isDeleted && (
                                                  <div className="absolute inset-0 flex items-center justify-center bg-destructive/20 rounded-md">
                                                    <span className="text-xs font-semibold text-destructive">삭제됨</span>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                      </div>
                                    )}
                                    {/* 파일 목록 */}
                                    {editAttachments.filter((att) => att.type !== 'image').length > 0 && (
                                      <div className="space-y-1">
                                        {editAttachments
                                          .filter((att) => att.type !== 'image')
                                          .map((attachment) => {
                                            const isDeleted = deletedAttachmentIds.has(attachment.id);
                                            return (
                                              <div
                                                key={attachment.id}
                                                className={cn(
                                                  "flex items-center justify-between text-xs p-2 rounded-md border",
                                                  isDeleted && "opacity-50 grayscale bg-muted"
                                                )}
                                              >
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                  <Paperclip className="h-3 w-3 flex-shrink-0" />
                                                  <span className="truncate">{attachment.name}</span>
                                                </div>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-6 w-6 text-destructive hover:text-destructive"
                                                  onClick={() => handleDeleteAttachment(attachment.id)}
                                                  title="파일 삭제"
                                                  disabled={isEditingUploading}
                                                >
                                                  <X className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            );
                                          })}
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* 새로 추가할 이미지 */}
                                {editImages.length > 0 && (
                                  <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">추가할 이미지</Label>
                                    <div className="grid grid-cols-4 gap-2">
                                      {editImages.map((image, index) => (
                                        <div key={index} className="relative w-full aspect-square group">
                                          <img
                                            src={URL.createObjectURL(image)}
                                            alt={`Preview ${index + 1}`}
                                            className="w-full h-full object-cover rounded-md border border-border"
                                          />
                                          <Button
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => setEditImages((prev) => prev.filter((_, i) => i !== index))}
                                            title="이미지 제거"
                                            disabled={isEditingUploading}
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* 새로 추가할 파일 */}
                                {editFiles.length > 0 && (
                                  <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">추가할 파일</Label>
                                    <div className="space-y-1">
                                      {editFiles.map((file, index) => (
                                        <div
                                          key={index}
                                          className="flex items-center justify-between text-xs p-2 rounded-md border"
                                        >
                                          <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <Paperclip className="h-3 w-3 flex-shrink-0" />
                                            <span className="truncate">{file.name}</span>
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-destructive hover:text-destructive"
                                            onClick={() => setEditFiles((prev) => prev.filter((_, i) => i !== index))}
                                            title="파일 제거"
                                            disabled={isEditingUploading}
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* 이미지/파일 추가 버튼 */}
                                <div className="flex gap-2">
                                  <input
                                    ref={editImageInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => {
                                      const files = Array.from(e.target.files || []);
                                      const imageFiles = files.filter((file) => file.type.startsWith('image/'));
                                      setEditImages((prev) => [...prev, ...imageFiles]);
                                      if (editImageInputRef.current) {
                                        editImageInputRef.current.value = '';
                                      }
                                    }}
                                    className="hidden"
                                    disabled={isEditingUploading}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => editImageInputRef.current?.click()}
                                    disabled={isEditingUploading}
                                  >
                                    <ImageIcon className="h-4 w-4 mr-2" />
                                    이미지 추가
                                  </Button>
                                  <input
                                    ref={editFileInputRef}
                                    type="file"
                                    multiple
                                    onChange={(e) => {
                                      const files = Array.from(e.target.files || []);
                                      setEditFiles((prev) => [...prev, ...files]);
                                      if (editFileInputRef.current) {
                                        editFileInputRef.current.value = '';
                                      }
                                    }}
                                    className="hidden"
                                    disabled={isEditingUploading}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => editFileInputRef.current?.click()}
                                    disabled={isEditingUploading}
                                  >
                                    <Paperclip className="h-4 w-4 mr-2" />
                                    파일 추가
                                  </Button>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveEdit(message.id)}
                                  disabled={(!editTitle.trim() && !editContent.trim()) || isEditingUploading}
                                >
                                  {isEditingUploading ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                      저장 중...
                                    </>
                                  ) : (
                                    <>
                                      <Check className="h-4 w-4 mr-1" />
                                      저장
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelEdit}
                                  disabled={isEditingUploading}
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
                          {/* 일반 표시 모드일 때만 첨부파일 표시 */}
                          {editingMessageId !== message.id && message.attachments && message.attachments.length > 0 && (
                            <div className="mb-3">
                              {/* 이미지 그리드 */}
                              {message.attachments.filter((att) => att.type === 'image').length > 0 && (
                                <div className="grid grid-cols-4 gap-2 mb-2">
                                  {message.attachments
                                    .filter((att) => att.type === 'image')
                                    .map((attachment) => (
                                      <div
                                        key={attachment.id}
                                        className="relative w-full aspect-square cursor-pointer group"
                                        onClick={() => handleImageClick(attachment.url)}
                                      >
                                        <img
                                          src={attachment.url}
                                          alt={attachment.name}
                                          className="w-full h-full object-cover rounded-md border border-border hover:opacity-90 transition-opacity"
                                        />
                                      </div>
                                    ))}
                                </div>
                              )}
                              {/* 파일 목록 */}
                              {message.attachments.filter((att) => att.type !== 'image').length > 0 && (
                                <div className="space-y-1">
                                  {message.attachments
                                    .filter((att) => att.type !== 'image')
                                    .map((attachment) => (
                                      <a
                                        key={attachment.id}
                                        href={attachment.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-primary hover:underline flex items-center gap-1"
                                      >
                                        <Paperclip className="h-3 w-3" />
                                        {attachment.name}
                                      </a>
                                    ))}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="pt-2 border-t space-y-3">
                            {/* 댓글 목록 */}
                            {(() => {
                              const thread = threads[message.id];
                              if (!thread || !thread.messages || thread.messages.length <= 1) return null;

                              // 부모 메시지를 제외한 댓글들 (최신순)
                              // 스레드의 첫 번째 메시지는 부모 메시지의 복사본이므로 제외
                              const comments = thread.messages
                                .slice(1) // 첫 번째 메시지(부모 메시지) 제외
                                .filter((msg) => msg && msg.text && msg.text.trim()) // 유효한 메시지만
                                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                              
                              if (comments.length === 0) return null;

                              const isExpanded = expandedComments.has(message.id);
                              const displayedComments = isExpanded ? comments : comments.slice(0, 3);
                              const hasMore = comments.length > 3;

                              return (
                                <div className="space-y-2">
                                  {displayedComments.map((comment) => (
                                    <div key={comment.id} className="flex items-start gap-2">
                                      <Avatar className="h-6 w-6 flex-shrink-0 mt-0.5">
                                        <AvatarImage src={comment.sender.photoURL} />
                                        <AvatarFallback>
                                          {getUserInitial(
                                            { displayName: comment.sender.displayName },
                                            comment.sender.displayName.charAt(0)
                                          )}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0 overflow-hidden">
                                        <div className="flex items-center gap-2 mb-0.5">
                                          <span className="text-xs font-semibold truncate">
                                            {getUserDisplayName(
                                              { displayName: comment.sender.displayName },
                                              userProfiles[comment.sender.uid] || null
                                            )}
                                          </span>
                                          <span className="text-xs text-muted-foreground flex-shrink-0">
                                            {formatChannelMessageDateTime(new Date(comment.timestamp))}
                                          </span>
                                        </div>
                                        <p className="text-xs text-foreground whitespace-pre-wrap break-words overflow-wrap-anywhere max-w-full">
                                          {comment.text}
                                        </p>
                                        {/* 댓글 첨부파일 */}
                                        {comment.attachments && comment.attachments.length > 0 && (
                                          <div className="mt-2 space-y-2">
                                            {/* 이미지 그리드 */}
                                            {comment.attachments.filter((att: any) => att.type === 'image').length > 0 && (
                                              <div className="grid grid-cols-4 gap-2">
                                                {comment.attachments
                                                  .filter((att: any) => att.type === 'image')
                                                  .map((attachment: any) => (
                                                    <div
                                                      key={attachment.id}
                                                      className="relative w-full aspect-square cursor-pointer group"
                                                      onClick={() => handleImageClick(attachment.url)}
                                                    >
                                                      <img
                                                        src={attachment.url}
                                                        alt={attachment.name}
                                                        className="w-full h-full object-cover rounded-md border border-border hover:opacity-90 transition-opacity"
                                                      />
                                                    </div>
                                                  ))}
                                              </div>
                                            )}
                                            {/* 파일 목록 */}
                                            {comment.attachments.filter((att: any) => att.type !== 'image').length > 0 && (
                                              <div className="space-y-1">
                                                {comment.attachments
                                                  .filter((att: any) => att.type !== 'image')
                                                  .map((attachment: any) => (
                                                    <a
                                                      key={attachment.id}
                                                      href={attachment.url}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="text-xs text-primary hover:underline flex items-center gap-1"
                                                    >
                                                      <Paperclip className="h-3 w-3" />
                                                      {attachment.name}
                                                    </a>
                                                  ))}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                  {hasMore && !isExpanded && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                                      onClick={() => {
                                        setExpandedComments((prev) => new Set(prev).add(message.id));
                                      }}
                                    >
                                      <ChevronDown className="h-3 w-3 mr-1" />
                                      댓글 {comments.length - 3}개 더보기
                                    </Button>
                                  )}
                                  {hasMore && isExpanded && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                                      onClick={() => {
                                        setExpandedComments((prev) => {
                                          const newSet = new Set(prev);
                                          newSet.delete(message.id);
                                          return newSet;
                                        });
                                      }}
                                    >
                                      댓글 접기
                                    </Button>
                                  )}
                                </div>
                              );
                            })()}

                            {/* 댓글 입력창 */}
                            <div className="flex items-start gap-2">
                                 <Avatar className="h-8 w-8 flex-shrink-0">
                                   <AvatarImage src={user?.photoURL || undefined} />
                                   <AvatarFallback>
                                     {getUserInitial(
                                       { displayName: user?.displayName },
                                       user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'
                                     )}
                                   </AvatarFallback>
                                 </Avatar>
                              <div className="flex-1 min-w-0">
                                {/* 이미지 미리보기 */}
                                {commentImages[message.id] && commentImages[message.id].length > 0 && (
                                  <UploadingImageGrid
                                    items={commentImages[message.id]}
                                    onRemove={(index) => {
                                      setCommentImages((prev) => {
                                        const updated = { ...prev };
                                        if (updated[message.id]) {
                                          const item = updated[message.id][index];
                                          if (item.preview && item.preview.startsWith('blob:')) {
                                            URL.revokeObjectURL(item.preview);
                                          }
                                          updated[message.id] = updated[message.id].filter((_, i) => i !== index);
                                        }
                                        return updated;
                                      });
                                    }}
                                    gridClassName="grid-cols-4"
                                    imageClassName="h-20"
                                  />
                                )}
                                
                                {/* 파일 목록 */}
                                {commentFiles[message.id] && commentFiles[message.id].length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {commentFiles[message.id].map((file, index) => (
                                      <div
                                        key={index}
                                        className="flex items-center justify-between text-xs p-2 rounded-md border"
                                      >
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                          <Paperclip className="h-3 w-3 flex-shrink-0" />
                                          <span className="truncate">{file.name}</span>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-destructive hover:text-destructive"
                                          onClick={() => {
                                            setCommentFiles((prev) => {
                                              const updated = { ...prev };
                                              if (updated[message.id]) {
                                                updated[message.id] = updated[message.id].filter((_, i) => i !== index);
                                              }
                                              return updated;
                                            });
                                          }}
                                          title="파일 제거"
                                          disabled={isSubmittingComment[message.id]}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                <div className="flex items-center gap-2 mt-2">
                                  <Input
                                    placeholder="댓글을 입력하세요..."
                                    value={commentTexts[message.id] || ''}
                                    onChange={(e) => {
                                      setCommentTexts((prev) => ({
                                        ...prev,
                                        [message.id]: e.target.value,
                                      }));
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleAddComment(message.id);
                                      }
                                    }}
                                    className="h-9 text-sm"
                                    disabled={isSubmittingComment[message.id]}
                                  />
                                  <input
                                    ref={(el) => {
                                      commentImageInputRefs.current[message.id] = el;
                                    }}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => {
                                      const files = Array.from(e.target.files || []);
                                      const imageFiles = files.filter((file) => file.type.startsWith('image/'));
                                      if (imageFiles.length > 0) {
                                        const newImages: UploadingImageItem[] = imageFiles.map((file) => ({
                                          file,
                                          preview: URL.createObjectURL(file),
                                        }));
                                        setCommentImages((prev) => ({
                                          ...prev,
                                          [message.id]: [...(prev[message.id] || []), ...newImages],
                                        }));
                                      }
                                      if (commentImageInputRefs.current[message.id]) {
                                        commentImageInputRefs.current[message.id]!.value = '';
                                      }
                                    }}
                                    className="hidden"
                                    disabled={isSubmittingComment[message.id]}
                                  />
                                  <input
                                    ref={(el) => {
                                      commentFileInputRefs.current[message.id] = el;
                                    }}
                                    type="file"
                                    multiple
                                    onChange={(e) => {
                                      const files = Array.from(e.target.files || []);
                                      if (files.length > 0) {
                                        setCommentFiles((prev) => ({
                                          ...prev,
                                          [message.id]: [...(prev[message.id] || []), ...files],
                                        }));
                                      }
                                      if (commentFileInputRefs.current[message.id]) {
                                        commentFileInputRefs.current[message.id]!.value = '';
                                      }
                                    }}
                                    className="hidden"
                                    disabled={isSubmittingComment[message.id]}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9"
                                    onClick={() => commentImageInputRefs.current[message.id]?.click()}
                                    disabled={isSubmittingComment[message.id]}
                                    title="이미지 첨부"
                                  >
                                    <ImageIcon className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9"
                                    onClick={() => commentFileInputRefs.current[message.id]?.click()}
                                    disabled={isSubmittingComment[message.id]}
                                    title="파일 첨부"
                                  >
                                    <Paperclip className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleAddComment(message.id)}
                                    disabled={
                                      (!commentTexts[message.id]?.trim() && 
                                       (!commentImages[message.id] || commentImages[message.id].length === 0) &&
                                       (!commentFiles[message.id] || commentFiles[message.id].length === 0)) ||
                                      isSubmittingComment[message.id]
                                    }
                                    className="h-9 px-3"
                                  >
                                    {isSubmittingComment[message.id] ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      '작성'
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
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

      {/* 이미지 라이트박스 */}
      <ImageLightbox
        images={allImages}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
};
