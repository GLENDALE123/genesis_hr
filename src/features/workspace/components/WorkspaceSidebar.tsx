/**
 * 워크스페이스 사이드바 컴포넌트
 * 디스코드/슬랙 스타일의 워크스페이스 및 채널 목록
 */

import React, { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { WorkspaceService } from '../services/workspaceService';
import { ChannelService } from '../services/channelService';
import type { Workspace } from '../types/workspace.types';
import { useAuthStore } from '@/features/auth/store/authStore';
import { ChannelList } from './ChannelList';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { Plus, Hash, Users, Settings } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { WorkspaceSettingsDialog } from './WorkspaceSettingsDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';

export interface WorkspaceSidebarProps {
  className?: string;
}

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({ className }) => {
  const { user } = useAuthStore();
  const {
    currentWorkspace,
    workspaces,
    setCurrentWorkspace,
    setWorkspaces,
    setChannels,
    setIsLoadingWorkspaces,
  } = useWorkspaceStore();
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState('');

  const navigate = useNavigate();

  // 워크스페이스 목록 로드 및 초기화
  useEffect(() => {
    if (!user?.uid) return;

    setIsLoadingWorkspaces(true);
    const loadWorkspaces = async () => {
      try {
        let userWorkspaces = await WorkspaceService.getUserWorkspaces(user.uid);
        
        // 워크스페이스가 없으면 기본 워크스페이스 생성
        if (userWorkspaces.length === 0) {
          const defaultWorkspace = await WorkspaceService.ensureDefaultWorkspace(
            user.uid,
            user.displayName || undefined,
            user.photoURL || undefined
          );
          
          // 기본 채널 생성
          await ChannelService.createDefaultChannels(defaultWorkspace.id, user.uid);
          
          // 워크스페이스 목록 다시 로드
          userWorkspaces = await WorkspaceService.getUserWorkspaces(user.uid);
        }
        
        setWorkspaces(userWorkspaces);
        
        // 첫 번째 워크스페이스를 자동 선택
        if (userWorkspaces.length > 0 && !currentWorkspace) {
          const firstWorkspace = userWorkspaces[0];
          setCurrentWorkspace(firstWorkspace);
          
          // 첫 번째 채널 자동 선택
          const channels = await ChannelService.getUserChannels(
            firstWorkspace.id,
            user.uid
          );
          if (channels.length > 0) {
            const firstChannel = channels[0];
            navigate(`/workspace?channel=${firstChannel.id}`);
          }
        }
      } catch (error) {
        console.error('Failed to load workspaces:', error);
      } finally {
        setIsLoadingWorkspaces(false);
      }
    };

    loadWorkspaces();

    // 실시간 구독
    const unsubscribe = WorkspaceService.subscribeToUserWorkspaces(
      user.uid,
      (updatedWorkspaces) => {
        setWorkspaces(updatedWorkspaces);
        // 현재 워크스페이스가 목록에 없으면 첫 번째로 변경
        if (currentWorkspace && !updatedWorkspaces.find((w) => w.id === currentWorkspace.id)) {
          if (updatedWorkspaces.length > 0) {
            setCurrentWorkspace(updatedWorkspaces[0]);
          } else {
            setCurrentWorkspace(null);
          }
        }
      },
      (error) => {
        console.error('Error subscribing to workspaces:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user?.uid, setWorkspaces, setCurrentWorkspace, setIsLoadingWorkspaces, currentWorkspace]);

  // 워크스페이스 선택 시 채널 로드
  useEffect(() => {
    if (!currentWorkspace || !user?.uid) return;

    const loadChannels = async () => {
      try {
        const channels = await ChannelService.getUserChannels(
          currentWorkspace.id,
          user.uid
        );
        setChannels(currentWorkspace.id, channels);
      } catch (error) {
        console.error('Failed to load channels:', error);
      }
    };

    loadChannels();

    // 실시간 구독
    const unsubscribe = ChannelService.subscribeToWorkspaceChannels(
      currentWorkspace.id,
      (channels) => {
        // 사용자가 접근 가능한 채널만 필터링
        const accessibleChannels = channels.filter((channel) => {
          if (channel.type === 'public') return true;
          return channel.members.includes(user.uid);
        });
        setChannels(currentWorkspace.id, accessibleChannels);
      },
      (error) => {
        console.error('Error subscribing to channels:', error);
      },
      false // 아카이브된 채널 제외
    );

    return () => {
      unsubscribe();
    };
  }, [currentWorkspace, user?.uid, setChannels]);

  const handleCreateWorkspace = async () => {
    if (!user?.uid || !newWorkspaceName.trim()) return;

    try {
      const workspaceId = await WorkspaceService.createWorkspace(
        {
          name: newWorkspaceName.trim(),
          description: newWorkspaceDescription.trim() || undefined,
        },
        user.uid,
        user.displayName || undefined,
        user.photoURL || undefined
      );

      // 생성된 워크스페이스로 전환
      const newWorkspace = await WorkspaceService.getWorkspace(workspaceId);
      if (newWorkspace) {
        setCurrentWorkspace(newWorkspace);
      }

      setIsCreateWorkspaceOpen(false);
      setNewWorkspaceName('');
      setNewWorkspaceDescription('');
    } catch (error) {
      console.error('Failed to create workspace:', error);
    }
  };

  return (
    <div className={cn('flex flex-col h-full bg-background border-r border-border', className)}>
      {/* 워크스페이스 헤더 */}
      <div className="flex-shrink-0 px-2 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-foreground px-2">워크스페이스</h2>
          <Dialog open={isCreateWorkspaceOpen} onOpenChange={setIsCreateWorkspaceOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-accent rounded"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 워크스페이스 생성</DialogTitle>
                <DialogDescription>
                  팀 협업을 위한 새로운 워크스페이스를 생성하세요.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="workspace-name">워크스페이스 이름</Label>
                  <Input
                    id="workspace-name"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    placeholder="예: 개발팀, 프로젝트 A"
                  />
                </div>
                <div>
                  <Label htmlFor="workspace-description">설명 (선택사항)</Label>
                  <Textarea
                    id="workspace-description"
                    value={newWorkspaceDescription}
                    onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                    placeholder="워크스페이스에 대한 설명을 입력하세요"
                    rows={3}
                  />
                </div>
                <Button onClick={handleCreateWorkspace} className="w-full">
                  생성
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* 워크스페이스 목록 */}
        <div className="space-y-0.5">
          {workspaces.map((workspace) => (
            <div
              key={workspace.id}
              className={cn(
                'group flex items-center gap-1',
                currentWorkspace?.id === workspace.id && 'bg-accent/50 rounded'
              )}
            >
              <button
                onClick={() => setCurrentWorkspace(workspace)}
                className={cn(
                  'flex-1 text-left px-2 py-1.5 rounded text-sm font-medium transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  currentWorkspace?.id === workspace.id
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground'
                )}
              >
                <div className="flex items-center gap-2">
                  {workspace.icon ? (
                    <span className="text-base">{workspace.icon}</span>
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                  <span className="truncate">{workspace.name}</span>
                </div>
              </button>
              {currentWorkspace?.id === workspace.id && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSettingsOpen(true);
                  }}
                  title="워크스페이스 설정"
                >
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 채널 목록 */}
      {currentWorkspace && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <ChannelList workspaceId={currentWorkspace.id} />
        </div>
      )}

      {/* 사용자 정보 */}
      {user && (
        <div className="flex-shrink-0 px-2 py-2 border-t border-border bg-muted/50">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-sm font-medium text-primary-foreground">
              {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate text-foreground">
                {user.displayName || user.email || '사용자'}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {user.email}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-accent rounded"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 워크스페이스 설정 다이얼로그 */}
      {currentWorkspace && (
        <WorkspaceSettingsDialog
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          workspace={currentWorkspace}
          onWorkspaceUpdate={(updatedWorkspace) => {
            // 워크스페이스 목록 업데이트
            setWorkspaces((prev) =>
              prev.map((w) => (w.id === updatedWorkspace.id ? updatedWorkspace : w))
            );
            // 현재 워크스페이스 업데이트
            if (currentWorkspace.id === updatedWorkspace.id) {
              setCurrentWorkspace(updatedWorkspace);
            }
          }}
        />
      )}
    </div>
  );
};

