/**
 * 카드 형태 메시지 컴포넌트
 * 잔디 스타일의 카드뷰 메시지
 */

import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { formatChatDateTime } from '../utils/dateFormat';
import { getUserInitial } from '@/shared/utils/user/userUtils';
import { cn } from '@/shared/lib/utils';
import { MarkdownRenderer } from '@/shared/components/common/MarkdownRenderer';
import type { ChatMessage } from '../types/chat.types';
import type { MessageReaction } from '@/features/workspace/reactions';
import { Button } from '@/shared/components/ui/button';
import { Download, File, MessageSquare, MoreVertical } from 'lucide-react';
import { ReactionPicker } from '@/features/workspace/reactions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';

export interface MessageCardProps {
  message: ChatMessage;
  currentUserId: string;
  onThreadClick?: (messageId: string) => void;
  onQuoteMessage?: (message: ChatMessage) => void;
  reactions?: MessageReaction[];
  onAddReaction?: (messageId: string, emoji: string) => void;
  channelId?: string;
  workspaceId?: string;
}

export const MessageCard: React.FC<MessageCardProps> = ({
  message,
  currentUserId,
  onThreadClick,
  onQuoteMessage,
  reactions = [],
  onAddReaction,
  channelId,
  workspaceId,
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  const isOwnMessage = message.sender.uid === currentUserId;
  const hasAttachments = message.attachments && message.attachments.length > 0;
  const hasImages = hasAttachments && message.attachments && message.attachments.some((att) => att.type === 'image');
  const hasFiles = hasAttachments && message.attachments && message.attachments.some((att) => att.type === 'file');
  const images = hasAttachments && message.attachments ? message.attachments.filter((att) => att.type === 'image') : [];
  const files = hasAttachments && message.attachments ? message.attachments.filter((att) => att.type === 'file') : [];

  return (
    <Card className={cn(
      'w-full transition-all hover:shadow-md',
      isOwnMessage && 'border-primary/20'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={message.sender.photoURL} alt={message.sender.displayName} />
              <AvatarFallback>
                {getUserInitial(message.sender, message.sender.displayName.charAt(0))}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm text-foreground">
                  {message.sender.displayName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatChatDateTime(message.timestamp)}
                </span>
              </div>
              {message.text && (
                <div className="text-sm text-foreground mt-2 break-words">
                  <MarkdownRenderer content={message.text} />
                </div>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onThreadClick && (
                <>
                  <DropdownMenuItem onClick={() => onThreadClick(message.id)}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    스레드로 답변
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {onQuoteMessage && (
                <DropdownMenuItem onClick={() => onQuoteMessage(message)}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  인용하기
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* 이미지 */}
        {hasImages && images.length > 0 && (
          <div className="space-y-2">
            {images.map((image, index) => (
              <div key={index} className="rounded-lg overflow-hidden">
                <img
                  src={image.url || ''}
                  alt={`${message.sender.displayName}의 이미지 ${index + 1}`}
                  className="w-full h-auto max-h-96 object-contain bg-muted cursor-pointer"
                  onClick={() => {
                    setSelectedImageIndex(index);
                    setLightboxOpen(true);
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* 파일 */}
        {hasFiles && files.length > 0 && (
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="border rounded-lg p-3 flex items-center gap-3 hover:bg-accent/50 transition-colors"
              >
                <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name || '파일'}</p>
                  <p className="text-xs text-muted-foreground">
                    {file.size ? `${(file.size / 1024).toFixed(1)} KB` : '크기 알 수 없음'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(file.url || '', '_blank')}
                  className="flex-shrink-0"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* 반응 */}
        {reactions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {reactions.map((reaction, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onAddReaction?.(message.id, reaction.emoji)}
              >
                <span className="mr-1">{reaction.emoji}</span>
                <span>{reaction.count}</span>
              </Button>
            ))}
            {onAddReaction && channelId && workspaceId && (
              <ReactionPicker
                messageId={message.id}
                channelId={channelId}
                workspaceId={workspaceId}
                reactions={reactions}
                onReactionsChange={(updatedReactions) => {
                  // 반응이 변경되면 부모 컴포넌트에 알림
                }}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};


