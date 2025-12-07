/**
 * 채널 알림 설정 컴포넌트
 */

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { NotificationSettingsService, type NotificationLevel } from '../../notifications';
import { useWorkspaceStore } from '../../store/workspaceStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';
import { toast } from 'sonner';
import type { Channel } from '../types/channel.types';

export interface ChannelNotificationSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: Channel;
}

export const ChannelNotificationSettings: React.FC<ChannelNotificationSettingsProps> = ({
  open,
  onOpenChange,
  channel,
}) => {
  const { user } = useAuthStore();
  const { currentWorkspace } = useWorkspaceStore();
  const [notificationLevel, setNotificationLevel] = useState<NotificationLevel>('all');
  const [muteUntil, setMuteUntil] = useState<string>('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 저장된 설정 로드
  useEffect(() => {
    if (!user?.uid || !open) return;

    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const settings = await NotificationSettingsService.getSettings(user.uid, channel.id);
        
        if (settings) {
          setNotificationLevel(settings.level);
          setMuteUntil(settings.muteUntil || '');
          setKeywords(settings.keywords || []);
        } else {
          // 기본 설정
          const defaultSettings = NotificationSettingsService.getDefaultSettings();
          setNotificationLevel(defaultSettings.level);
          setMuteUntil(defaultSettings.muteUntil || '');
          setKeywords(defaultSettings.keywords || []);
        }
      } catch (error) {
        console.error('Failed to load notification settings:', error);
        toast.error('알림 설정을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [user?.uid, channel.id, open]);

  const handleSave = async () => {
    if (!user?.uid || !currentWorkspace) return;

    try {
      setIsSaving(true);
      await NotificationSettingsService.saveSettings(
        user.uid,
        channel.id,
        currentWorkspace.id,
        {
          level: notificationLevel,
          muteUntil: muteUntil || null,
          keywords,
        }
      );
      toast.success('알림 설정이 저장되었습니다.');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      toast.error('알림 설정 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()]);
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>알림 설정</DialogTitle>
          <DialogDescription>
            {channel.name} 채널의 알림 설정을 관리할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* 알림 레벨 */}
          <div>
            <Label>알림 레벨</Label>
            <Select
              value={notificationLevel}
              onValueChange={(value) => setNotificationLevel(value as NotificationLevel)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 메시지</SelectItem>
                <SelectItem value="mentions">멘션만</SelectItem>
                <SelectItem value="nothing">알림 없음</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 키워드 알림 */}
          <div>
            <Label>키워드 알림</Label>
            <div className="space-y-2 mt-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddKeyword();
                    }
                  }}
                  placeholder="키워드 입력 후 Enter"
                  className="flex-1"
                />
                <Button type="button" onClick={handleAddKeyword} size="sm">
                  추가
                </Button>
              </div>
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-sm"
                    >
                      {keyword}
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(keyword)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 저장 버튼 */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={isSaving || isLoading}>
              {isSaving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

