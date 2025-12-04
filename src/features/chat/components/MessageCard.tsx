/**
 * 카드 형태 메시지 컴포넌트
 * 잔디 스타일의 카드뷰 메시지
 */

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { formatChatDateTime } from '../utils/dateFormat';
import { getUserInitial } from '@/shared/utils/userUtils';
import { cn } from '@/shared/lib/utils';
import { ImageLightbox } from '@/shared/components/common/ImageLightbox';
import { FilePreview } from '@/features/workspace/components/FilePreview';
import { MarkdownRenderer } from '@/shared/components/common/MarkdownRenderer';
import type { ChatMessage } from '../types/chat.types';
import type { MessageReaction } from '@/features/workspace/types';
import { ReactionPicker } from '@/features/workspace/components/ReactionPicker';
import { Button } from '@/shared/components/ui/button';
import { MessageSquare, MoreVertical } from 'lucide-react';
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
  const isOwnMessage = message.sender.uid === currentUserId;
  const hasAttachments = message.attachments && message.attachments.length > 0;
  const hasImages = hasAttachments && message.attachments.some((att) => att.type === 'image');
  const hasFiles = hasAttachments && message.attachments.some((att) => att.type === 'file');
  const images = hasAttachments ? message.attachments.filter((att) => att.type === 'image') : [];
  const files = hasAttachments ? message.attachments.filter((att) => att.type === 'file') : [];

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
                  {formatChatDateTime(message.createdAt)}
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
                <ImageLightbox
                  src={image.url || ''}
                  alt={`${message.sender.displayName}의 이미지 ${index + 1}`}
                  className="w-full h-auto max-h-96 object-contain bg-muted"
                />
              </div>
            ))}
          </div>
        )}

        {/* 파일 */}
        {hasFiles && files.length > 0 && (
          <div className="space-y-2">
            {files.map((file, index) => (
              <FilePreview
                key={index}
                file={{
                  name: file.name || '파일',
                  url: file.url || '',
                  size: file.size || 0,
                  type: file.mimeType || 'application/octet-stream',
                }}
                showDownload
                className="border rounded-lg p-3"
              />
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
            {onAddReaction && (
              <ReactionPicker
                messageId={message.id}
                onSelect={(emoji) => onAddReaction(message.id, emoji)}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};


