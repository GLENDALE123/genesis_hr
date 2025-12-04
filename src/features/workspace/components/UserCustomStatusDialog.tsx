/**
 * 사용자 커스텀 상태 메시지 설정 다이얼로그
 * 슬랙/디스코드 스타일의 커스텀 상태 메시지 설정
 */

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { UserStatusService } from '@/features/chat/services/userStatusService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { toast } from 'sonner';

export interface UserCustomStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UserCustomStatusDialog: React.FC<UserCustomStatusDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { user } = useAuthStore();
  const [customStatus, setCustomStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string | undefined>();

  // 현재 상태 로드
  useEffect(() => {
    if (!open || !user?.uid) return;

    const loadStatus = async () => {
      try {
        const status = await UserStatusService.getUserStatus(user.uid);
        if (status) {
          setCurrentStatus(status.customStatus);
          setCustomStatus(status.customStatus || '');
        }
      } catch (error) {
        console.error('Failed to load user status:', error);
      }
    };

    loadStatus();
  }, [open, user?.uid]);

  const handleSave = async () => {
    if (!user?.uid) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    try {
      setIsLoading(true);
      const statusToSave = customStatus.trim() || null;
      await UserStatusService.setCustomStatus(user.uid, statusToSave);
      setCurrentStatus(statusToSave || undefined);
      toast.success('커스텀 상태 메시지가 저장되었습니다.');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save custom status:', error);
      toast.error('커스텀 상태 메시지 저장에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    if (!user?.uid) return;

    try {
      setIsLoading(true);
      await UserStatusService.setCustomStatus(user.uid, null);
      setCustomStatus('');
      setCurrentStatus(undefined);
      toast.success('커스텀 상태 메시지가 삭제되었습니다.');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to clear custom status:', error);
      toast.error('커스텀 상태 메시지 삭제에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>커스텀 상태 메시지</DialogTitle>
          <DialogDescription>
            다른 사용자에게 표시될 커스텀 상태 메시지를 설정할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="customStatus">상태 메시지</Label>
            <Textarea
              id="customStatus"
              value={customStatus}
              onChange={(e) => setCustomStatus(e.target.value)}
              placeholder="예: 회의 중, 점심 시간, 집중 모드 등"
              rows={3}
              maxLength={100}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {customStatus.length}/100자
            </p>
          </div>

          {currentStatus && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">현재 상태 메시지:</p>
              <p className="text-sm italic">"{currentStatus}"</p>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={isLoading || !currentStatus}
            >
              삭제
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                취소
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                저장
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};


