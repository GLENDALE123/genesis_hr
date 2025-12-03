/**
 * 메시지 편집 히스토리 다이얼로그
 */

import React, { useState, useEffect } from 'react';
import { MessageEditHistoryService } from '../services/messageEditHistoryService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { formatChatDateTime } from '@/features/chat/utils/dateFormat';
import type { MessageEditHistory } from '../types/message.types';

export interface MessageEditHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageId: string;
}

export const MessageEditHistoryDialog: React.FC<MessageEditHistoryDialogProps> = ({
  open,
  onOpenChange,
  messageId,
}) => {
  const [editHistory, setEditHistory] = useState<MessageEditHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open || !messageId) return;

    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const history = await MessageEditHistoryService.getMessageEditHistory(messageId);
        setEditHistory(history);
      } catch (error) {
        console.error('Failed to load edit history:', error);
        setEditHistory([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [open, messageId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>편집 히스토리</DialogTitle>
          <DialogDescription>
            이 메시지의 편집 내역을 확인할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4 max-h-[500px] overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              로딩 중...
            </div>
          ) : editHistory.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              편집 내역이 없습니다.
            </div>
          ) : (
            editHistory.map((history, index) => (
              <div key={history.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">
                    {formatChatDateTime(history.editedAt)}
                  </span>
                  {index === 0 && (
                    <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                      최신
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">이전 내용:</p>
                    <p className="text-sm line-through text-muted-foreground">
                      {history.previousText}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">변경된 내용:</p>
                    <p className="text-sm text-foreground">{history.newText}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

