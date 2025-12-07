/**
 * 반응 선택기 컴포넌트
 * 이모지 반응 추가/제거
 */

import React, { useState, useEffect } from 'react';
import { ReactionService } from '../services/reactionService';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Button } from '@/shared/components/ui/button';
import { Smile, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { POPULAR_EMOJIS } from '../types/reaction.types';
import { EmojiPicker } from './EmojiPicker';
import type { MessageReaction } from '../types/reaction.types';

export interface ReactionPickerProps {
  messageId: string;
  channelId: string;
  workspaceId: string;
  reactions?: MessageReaction[];
  onReactionsChange?: (reactions: MessageReaction[]) => void;
}

export const ReactionPicker: React.FC<ReactionPickerProps> = ({
  messageId,
  channelId,
  workspaceId,
  reactions = [],
  onReactionsChange,
}) => {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [currentReactions, setCurrentReactions] = useState<MessageReaction[]>(reactions);

  useEffect(() => {
    setCurrentReactions(reactions);
  }, [reactions]);

  useEffect(() => {
    if (!onReactionsChange) return;

    const unsubscribe = ReactionService.subscribeToMessageReactions(
      messageId,
      (updatedReactions) => {
        setCurrentReactions(updatedReactions);
        onReactionsChange(updatedReactions);
      },
      (error) => {
        console.error('Error subscribing to reactions:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [messageId, onReactionsChange]);

  const handleAddReaction = async (emoji: string) => {
    if (!user?.uid) return;

    try {
      await ReactionService.addReaction({
        messageId,
        channelId,
        workspaceId,
        emoji,
        userId: user.uid,
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const handleRemoveReaction = async (emoji: string) => {
    if (!user?.uid) return;

    try {
      await ReactionService.removeReaction({
        messageId,
        emoji,
        userId: user.uid,
      });
    } catch (error) {
      console.error('Failed to remove reaction:', error);
    }
  };

  const hasUserReacted = (reaction: MessageReaction): boolean => {
    return user?.uid ? reaction.users.includes(user.uid) : false;
  };

  return (
    <div className="relative">
      {/* 반응 표시 */}
      <div className="flex items-center gap-1 flex-wrap">
        {currentReactions.map((reaction) => {
          const userReacted = hasUserReacted(reaction);
          return (
            <button
              key={reaction.id}
              onClick={() =>
                userReacted
                  ? handleRemoveReaction(reaction.emoji)
                  : handleAddReaction(reaction.emoji)
              }
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors',
                'hover:bg-accent',
                userReacted
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <span>{reaction.emoji}</span>
              <span>{reaction.count}</span>
            </button>
          );
        })}

        {/* 반응 추가 버튼 */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="h-6 px-2 text-xs"
          >
            <Smile className="h-3 w-3" />
          </Button>

          {/* 반응 선택 팝업 */}
          {isOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsOpen(false)}
              />
              <div className="absolute bottom-full left-0 mb-2 z-20">
                <EmojiPicker
                  onEmojiSelect={handleAddReaction}
                  onClose={() => setIsOpen(false)}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

