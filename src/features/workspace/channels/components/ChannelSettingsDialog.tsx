/**
 * 채널 설정 다이얼로그
 * 채널 정보 수정 및 멤버 관리
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChannelService } from '../services/channelService';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Button } from '@/shared/components/ui/button';
import { toast } from 'sonner';
import { Info, Users, Settings, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { ChannelMemberManagement } from './ChannelMemberManagement';
import type { Channel } from '../types/channel.types';

export interface ChannelSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: Channel;
  onChannelUpdate?: (channel: Channel) => void;
  onChannelDelete?: (channelId: string) => void; // 채널 삭제 시 콜백
}

export const ChannelSettingsDialog: React.FC<ChannelSettingsDialogProps> = ({
  open,
  onOpenChange,
  channel,
  onChannelUpdate,
  onChannelDelete,
}) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 일반 설정
  const [channelName, setChannelName] = useState(channel.name);
  const [channelDescription, setChannelDescription] = useState(channel.description || '');
  const [channelTopic, setChannelTopic] = useState(channel.topic || '');

  // 현재 채널 정보 로드
  useEffect(() => {
    if (open) {
      const loadChannel = async () => {
        setIsLoading(true);
        try {
          const currentChannel = await ChannelService.getChannel(channel.id, channel.workspaceId);
          if (currentChannel) {
            setChannelName(currentChannel.name);
            setChannelDescription(currentChannel.description || '');
            setChannelTopic(currentChannel.topic || '');
          }
        } catch (error) {
          console.error('Failed to load channel:', error);
        } finally {
          setIsLoading(false);
        }
      };

      loadChannel();
    }
  }, [open, channel.id, channel.workspaceId]);

  // 권한 확인
  const canManageChannel = channel.permissions?.canManageChannel || false;
  const isCreator = channel.createdBy === user?.uid;

  // 일반 설정 저장
  const handleSaveGeneral = async () => {
    if (!canManageChannel && !isCreator) {
      toast.error('채널 관리 권한이 없습니다.');
      return;
    }

    if (!channelName.trim()) {
      toast.error('채널 이름을 입력해주세요.');
      return;
    }

    try {
      setIsSaving(true);
      await ChannelService.updateChannel(channel.id, channel.workspaceId, {
        name: channelName.trim(),
        description: channelDescription.trim() || undefined,
        topic: channelTopic.trim() || undefined,
      });

      // 업데이트된 채널 가져오기
      const updatedChannel = await ChannelService.getChannel(channel.id, channel.workspaceId);
      if (updatedChannel && onChannelUpdate) {
        onChannelUpdate(updatedChannel);
      }

      toast.success('채널 정보가 저장되었습니다.');
    } catch (error) {
      console.error('Failed to update channel:', error);
      toast.error('채널 정보 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMemberUpdate = async () => {
    // 채널 정보 다시 로드
    const updatedChannel = await ChannelService.getChannel(channel.id, channel.workspaceId);
    if (updatedChannel && onChannelUpdate) {
      onChannelUpdate(updatedChannel);
    }
  };

  // 채널 삭제
  const handleDeleteChannel = async () => {
    if (!canManageChannel && !isCreator) {
      toast.error('채널 삭제 권한이 없습니다.');
      return;
    }

    try {
      setIsDeleting(true);
      await ChannelService.deleteChannel(channel.id, channel.workspaceId);
      
      toast.success('채널이 삭제되었습니다.');
      onOpenChange(false);
      
      // 채널 삭제 콜백 호출
      if (onChannelDelete) {
        onChannelDelete(channel.id);
      }
      
      // 워크스페이스 페이지로 이동 (채널이 삭제되었으므로)
      navigate('/workspace');
    } catch (error) {
      console.error('Failed to delete channel:', error);
      toast.error('채널 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>채널 설정</DialogTitle>
          <DialogDescription>
            {channel.name} 채널의 설정을 관리합니다.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              일반
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              멤버 관리
            </TabsTrigger>
          </TabsList>

          {/* 일반 설정 */}
          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="channel-name">채널 이름</Label>
                <Input
                  id="channel-name"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  disabled={!canManageChannel && !isCreator}
                  placeholder="채널 이름"
                />
              </div>

              <div>
                <Label htmlFor="channel-description">설명</Label>
                <Textarea
                  id="channel-description"
                  value={channelDescription}
                  onChange={(e) => setChannelDescription(e.target.value)}
                  disabled={!canManageChannel && !isCreator}
                  placeholder="채널에 대한 설명을 입력하세요"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="channel-topic">토픽</Label>
                <Input
                  id="channel-topic"
                  value={channelTopic}
                  onChange={(e) => setChannelTopic(e.target.value)}
                  disabled={!canManageChannel && !isCreator}
                  placeholder="채널 토픽을 입력하세요"
                />
              </div>

              <div className="space-y-2">
                <Label>채널 정보</Label>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    <span className="font-medium">타입:</span>{' '}
                    {channel.type === 'public' ? '공개' : '비공개'}
                  </p>
                  <p>
                    <span className="font-medium">뷰 타입:</span>{' '}
                    {channel.viewType === 'board' ? '보드뷰' : '메시지 뷰'}
                    <span className="text-xs ml-1">(변경 불가)</span>
                  </p>
                  <p>
                    <span className="font-medium">생성일:</span>{' '}
                    {new Date(channel.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                  <p>
                    <span className="font-medium">멤버 수:</span> {channel.members.length}명
                  </p>
                </div>
              </div>

              {(canManageChannel || isCreator) && (
                <Button onClick={handleSaveGeneral} disabled={isSaving} className="w-full">
                  {isSaving ? '저장 중...' : '저장'}
                </Button>
              )}

              {!canManageChannel && !isCreator && (
                <p className="text-sm text-muted-foreground">
                  채널 관리 권한이 필요합니다.
                </p>
              )}

              {/* 위험한 작업 섹션 */}
              {(canManageChannel || isCreator) && (
                <div className="border-t pt-4 mt-4 space-y-2">
                  <Label className="text-destructive">위험한 작업</Label>
                  <Button
                    variant="destructive"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="w-full"
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    채널 삭제
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    채널을 삭제하면 모든 메시지, 할 일, 스레드가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* 멤버 관리 */}
          <TabsContent value="members" className="space-y-4 mt-4">
            <ChannelMemberManagement channel={channel} onMemberUpdate={handleMemberUpdate} />
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>채널 삭제 확인</AlertDialogTitle>
            <div className="text-sm text-muted-foreground">
              <AlertDialogDescription>
                정말로 <strong>{channel.name}</strong> 채널을 삭제하시겠습니까?
              </AlertDialogDescription>
              <p className="mt-2">
                이 작업은 되돌릴 수 없으며, 다음 데이터가 모두 삭제됩니다:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>모든 메시지</li>
                <li>모든 스레드</li>
                <li>모든 할 일</li>
                <li>고정된 메시지</li>
                <li>메시지 수정 이력</li>
              </ul>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChannel}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
