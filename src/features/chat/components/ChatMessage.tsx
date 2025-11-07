/**
 * 채팅 메시지 컴포넌트
 */

'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { formatChatDateTime } from '../utils/dateFormat';
import { getUserInitial } from '@/shared/utils/userUtils';
import { Image as ImageIcon, File } from 'lucide-react';
import type { ChatMessage } from '../types/chat.types';
import type { User } from 'firebase/auth';

export interface ChatMessageProps {
  message: ChatMessage;
  currentUserId: string;
  showAvatar?: boolean;
  isSearchResult?: boolean;
}

export const ChatMessageComponent: React.FC<ChatMessageProps> = ({
  message,
  currentUserId,
  showAvatar = true,
  isSearchResult = false,
}) => {
  const isOwnMessage = message.sender.uid === currentUserId;

  // 멘션 하이라이트 처리
  const renderMessageText = (text: string, mentionedUserIds?: string[]) => {
    if (!mentionedUserIds || mentionedUserIds.length === 0) {
      return <span>{text}</span>;
    }

    // @멘션 패턴 찾아서 파란색으로 하이라이트
    const parts: Array<{ text: string; isMention: boolean }> = [];
    let lastIndex = 0;

    // 간단한 멘션 패턴 매칭 (@사용자이름)
    const mentionRegex = /@(\S+)/g;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // 멘션 이전 텍스트
      if (match.index > lastIndex) {
        parts.push({
          text: text.substring(lastIndex, match.index),
          isMention: false,
        });
      }

      // 멘션 텍스트
      parts.push({
        text: match[0],
        isMention: true,
      });

      lastIndex = match.index + match[0].length;
    }

    // 나머지 텍스트
    if (lastIndex < text.length) {
      parts.push({
        text: text.substring(lastIndex),
        isMention: false,
      });
    }

    return (
      <span>
        {parts.map((part, index) =>
          part.isMention ? (
            <span key={index} className="text-blue-600 dark:text-blue-400 font-medium">
              {part.text}
            </span>
          ) : (
            <span key={index}>{part.text}</span>
          )
        )}
      </span>
    );
  };

  // 첨부파일 렌더링 (썸네일 그리드)
  const renderAttachments = () => {
    if (!message.attachments || message.attachments.length === 0) {
      return null;
    }

    const images = message.attachments.filter((a) => a.type === 'image');
    const files = message.attachments.filter((a) => a.type === 'file');

    return (
      <div className="space-y-2">
        {images.length > 0 && (
          <div
            className={`grid gap-2 ${
              images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
            }`}
          >
            {images.map((image) => (
              <a
                key={image.id}
                href={image.url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative aspect-square rounded-lg overflow-hidden bg-muted"
              >
                <img
                  src={image.thumbnailUrl || image.url}
                  alt={image.name}
                  className="w-full h-full object-cover"
                />
              </a>
            ))}
          </div>
        )}
        {files.length > 0 && (
          <div className="space-y-1">
            {files.map((file) => (
              <a
                key={file.id}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              >
                <File className="size-4" />
                <span className="flex-1 truncate text-sm">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)}KB
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`flex gap-3 px-4 py-2 group ${
        isOwnMessage ? 'flex-row-reverse' : 'flex-row'
      } ${isSearchResult ? 'bg-yellow-100 dark:bg-yellow-900/20' : ''}`}
    >
      {/* 아바타 (상대방 메시지만, showAvatar가 true일 때) */}
      {!isOwnMessage && showAvatar && (
        <div className="flex-shrink-0">
          <Avatar className="size-8">
            <AvatarImage src={message.sender.photoURL} alt={message.sender.displayName} />
            <AvatarFallback>
              {getUserInitial(message.sender, message.sender.displayName.charAt(0))}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
      {!isOwnMessage && !showAvatar && <div className="w-8" />}

      {/* 메시지 내용 */}
      <div className={`flex flex-col gap-1 ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[70%]`}>
        {!isOwnMessage && (
          <span className="text-xs text-muted-foreground px-1">
            {message.sender.displayName}
          </span>
        )}
        <div
          className={`
            px-4 py-2 rounded-2xl break-words overflow-wrap-anywhere
            ${
              isOwnMessage
                ? 'bg-yellow-400 dark:bg-yellow-500 text-yellow-900'
                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            }
          `}
        >
          {renderMessageText(message.text, message.mentionedUserIds)}
          {renderAttachments()}
        </div>
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-muted-foreground">
            {formatChatDateTime(message.timestamp)}
          </span>
          {message.editedAt && (
            <span className="text-xs text-muted-foreground">(수정됨)</span>
          )}
        </div>
      </div>
    </div>
  );
};

