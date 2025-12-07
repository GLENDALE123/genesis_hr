/**
 * 메시지 편집 다이얼로그
 */

import React, { useState, useEffect } from 'react';
import { MessageEditService } from '../services/messageEditService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Textarea } from '@/shared/components/ui/textarea';
import { Button } from '@/shared/components/ui/button';
import { useAuthStore } from '@/features/auth/store/authStore';

export interface MessageEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageId: string;
  channelId: string;
  workspaceId: string;
  currentText: string;
  onEditComplete?: () => void;
}

export const MessageEditDialog: React.FC<MessageEditDialogProps> = ({
  open,
  onOpenChange,
  messageId,
  channelId,
  workspaceId,
  currentText,
  onEditComplete,
}) => {
  const { user } = useAuthStore();
  const [editedText, setEditedText] = useState(currentText);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setEditedText(currentText);
    }
  }, [open, currentText]);

  const handleSave = async () => {
    if (!user?.uid || !editedText.trim() || editedText === currentText) {
      onOpenChange(false);
      return;
    }

    setIsSaving(true);
    try {
      await MessageEditService.editMessage(messageId, channelId, workspaceId, editedText.trim(), user.uid);
      onEditComplete?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to edit message:', error);
      alert('메시지 편집에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>메시지 편집</DialogTitle>
          <DialogDescription>
            메시지 내용을 수정할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            placeholder="메시지를 입력하세요..."
            rows={6}
            className="resize-none"
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !editedText.trim()}>
              {isSaving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

