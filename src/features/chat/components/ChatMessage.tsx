/**
 * 채팅 메시지 컴포넌트
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { formatChatDateTime } from '../utils/dateFormat';
import { getUserInitial } from '@/shared/utils/userUtils';
import { getUserInfo, globalUsersRef } from './UserList';
import { Image as ImageIcon, File } from 'lucide-react';
import type { ChatMessage } from '../types/chat.types';
import type { User } from 'firebase/auth';

export interface ChatMessageProps {
  message: ChatMessage;
  currentUserId: string;
  showAvatar?: boolean;
  searchQuery?: string; // 검색어
  participants?: Array<{ uid: string }>; // 채팅방 참여자 목록
  isFirstInGroup?: boolean; // 연속 메시지 그룹의 첫 번째 메시지인지
  isLastInGroup?: boolean; // 연속 메시지 그룹의 마지막 메시지인지
}

export const ChatMessageComponent: React.FC<ChatMessageProps> = ({
  message,
  currentUserId,
  showAvatar = true,
  searchQuery = '',
  participants = [],
  isFirstInGroup = true,
  isLastInGroup = true,
}) => {
  const isOwnMessage = message.sender.uid === currentUserId;
  
  // 보낸 사람 이름 (이미 이름+직급이 포함되어 있음)
  const senderDisplayName = isOwnMessage ? '' : (message.sender.displayName || '사용자');
  
  // 읽지 않은 사람 수 계산 (자신 제외)
  const unreadCount = React.useMemo(() => {
    if (!isOwnMessage || !participants.length) return 0;
    
    // 자신을 제외한 참여자 수
    const otherParticipants = participants.filter(p => p.uid !== currentUserId);
    const totalOthers = otherParticipants.length;
    
    // 읽은 사람 수 (자신 제외)
    const readByOthers = message.readBy.filter(uid => uid !== currentUserId).length;
    
    // 읽지 않은 사람 수
    return Math.max(0, totalOthers - readByOthers);
  }, [message.readBy, participants, currentUserId, isOwnMessage]);

  // 멘션과 검색어 하이라이트 처리
  const renderMessageText = (text: string, mentionedUserIds?: string[], searchQuery?: string) => {
    // 검색어가 2글자 미만이면 하이라이트하지 않음
    const trimmedQuery = searchQuery?.trim() || '';
    const validSearchQuery = trimmedQuery.length >= 2 ? trimmedQuery : '';
    
    if (!validSearchQuery && (!mentionedUserIds || mentionedUserIds.length === 0)) {
      return <span>{text}</span>;
    }

    // 멘션과 검색어를 함께 처리
    const parts: Array<{ text: string; isMention: boolean; isSearch: boolean }> = [];
    const mentionRegex = /@(\S+)/g;
    const searchRegex = validSearchQuery
      ? new RegExp(`(${validSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
      : null;
    
    // 모든 매치 위치 수집
    const matches: Array<{ index: number; length: number; type: 'mention' | 'search' }> = [];
    
    // 멘션 매치
    let mentionMatch: RegExpExecArray | null;
    while ((mentionMatch = mentionRegex.exec(text)) !== null) {
      matches.push({
        index: mentionMatch.index,
        length: mentionMatch[0].length,
        type: 'mention' as const,
      });
    }
    
    // 검색어 매치
    if (searchRegex) {
      searchRegex.lastIndex = 0; // 리셋
      let searchMatch: RegExpExecArray | null;
      while ((searchMatch = searchRegex.exec(text)) !== null) {
        // 멘션과 겹치지 않는 경우만 추가
        const isOverlapping = matches.some(m => 
          searchMatch!.index < m.index + m.length && searchMatch!.index + searchMatch![0].length > m.index
        );
        if (!isOverlapping) {
          matches.push({
            index: searchMatch.index,
            length: searchMatch[0].length,
            type: 'search' as const,
          });
        }
      }
    }
    
    // 인덱스 순으로 정렬
    matches.sort((a, b) => a.index - b.index);
    
    // 텍스트 분할
    let lastIndex = 0;
    matches.forEach((match) => {
      // 매치 이전 텍스트
      if (match.index > lastIndex) {
        parts.push({
          text: text.substring(lastIndex, match.index),
          isMention: false,
          isSearch: false,
        });
      }
      
      // 매치된 텍스트
      parts.push({
        text: text.substring(match.index, match.index + match.length),
        isMention: match.type === 'mention',
        isSearch: match.type === 'search',
      });
      
      lastIndex = match.index + match.length;
    });
    
    // 나머지 텍스트
    if (lastIndex < text.length) {
      parts.push({
        text: text.substring(lastIndex),
        isMention: false,
        isSearch: false,
      });
    }
    
    return (
      <span>
        {parts.map((part, index) => {
          if (part.isMention) {
            return (
              <span key={index} className="text-blue-600 dark:text-blue-400 font-medium">
                {part.text}
              </span>
            );
          } else if (part.isSearch) {
            return (
              <mark key={index} className={`px-1 py-0.5 rounded ${
                isOwnMessage 
                  ? 'bg-yellow-600/90 dark:bg-yellow-700/90 text-white' 
                  : 'bg-yellow-300/90 dark:bg-yellow-600/90'
              }`}>
                {part.text}
              </mark>
            );
          } else {
            return <span key={index}>{part.text}</span>;
          }
        })}
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
      className={`flex gap-3 px-4 py-1 group ${
        isOwnMessage ? 'flex-row-reverse' : 'flex-row'
      }`}
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
      <div className={`flex items-end gap-2 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} max-w-[70%]`}>
        <div className={`flex flex-col gap-1 ${isOwnMessage ? 'items-end' : 'items-start'}`}>
          {!isOwnMessage && isFirstInGroup && (
            <span className="text-xs text-muted-foreground px-1">
              {senderDisplayName}
            </span>
          )}
          <div
            className={`px-3 py-2 border break-words overflow-wrap-anywhere ${
              isOwnMessage
                ? `bg-yellow-400 dark:bg-yellow-500 text-foreground border-yellow-400 dark:border-yellow-500 ${
                    isFirstInGroup ? 'rounded-s-xl rounded-ee-xl' : 'rounded-xl'
                  }`
                : `bg-card text-foreground border-border ${
                    isFirstInGroup ? 'rounded-e-xl rounded-es-xl' : 'rounded-xl'
                  }`
            }`}
          >
            <div className="text-lg font-medium">
              {renderMessageText(message.text, message.mentionedUserIds, searchQuery)}
            </div>
            {renderAttachments()}
          </div>
        </div>
        {/* 시간 표시는 그룹의 마지막 메시지에만 표시 (1분 이내 연속 메시지) */}
        {isLastInGroup && (
          <div className={`flex flex-col items-end gap-0.5 flex-shrink-0 ${isOwnMessage ? '' : 'items-start'}`}>
            {/* 읽지 않은 사람 수 (내 메시지만) */}
            {isOwnMessage && unreadCount > 0 && (
              <span className="text-xs text-primary whitespace-nowrap">
                {unreadCount}
              </span>
            )}
            <div className={`flex items-center gap-1 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatChatDateTime(message.timestamp)}
              </span>
              {message.editedAt && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">(수정됨)</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

