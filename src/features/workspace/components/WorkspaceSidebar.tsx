/**
 * 워크스페이스 사이드바 컴포넌트
 * 디스코드/슬랙 스타일의 워크스페이스 및 채널 목록
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { WorkspaceService } from '../services/workspaceService';
import { ChannelService } from '../services/channelService';
import type { Workspace } from '../types/workspace.types';
import { useAuthStore } from '@/features/auth/store/authStore';
import { ChannelList } from './ChannelList';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { Plus, Hash, Users, Settings, ChevronDown, Search, Check } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
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
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [workspaceSearchQuery, setWorkspaceSearchQuery] = useState('');

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
  }, [user?.uid, setWorkspaces, setCurrentWorkspace, setIsLoadingWorkspaces]);

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
        // 첫 번째 채널 자동 선택
        const channels = await ChannelService.getUserChannels(
          newWorkspace.id,
          user.uid
        );
        if (channels.length > 0) {
          const firstChannel = channels[0];
          navigate(`/workspace?channel=${firstChannel.id}`);
        }
      }

      setIsCreateWorkspaceOpen(false);
      setNewWorkspaceName('');
      setNewWorkspaceDescription('');
    } catch (error) {
      console.error('Failed to create workspace:', error);
    }
  };

  const handleWorkspaceSelect = (workspace: Workspace) => {
    setCurrentWorkspace(workspace);
    setIsWorkspaceDropdownOpen(false);
    setWorkspaceSearchQuery('');
    // 첫 번째 채널 자동 선택
    const channels = useWorkspaceStore.getState().channels[workspace.id] || [];
    if (channels.length > 0) {
      const firstChannel = channels[0];
      navigate(`/workspace?channel=${firstChannel.id}`);
    }
  };

  // 워크스페이스 검색 필터링
  const filteredWorkspaces = useMemo(() => {
    if (!workspaceSearchQuery.trim()) {
      return workspaces;
    }
    const query = workspaceSearchQuery.toLowerCase();
    return workspaces.filter(
      (workspace) =>
        workspace.name.toLowerCase().includes(query) ||
        workspace.description?.toLowerCase().includes(query)
    );
  }, [workspaces, workspaceSearchQuery]);

  return (
    <div className={cn('flex flex-col h-full bg-background border-r border-border', className)}>
      {/* 워크스페이스 선택 헤더 */}
      <div className="flex-shrink-0 px-2 py-2 border-b border-border">
        <DropdownMenu open={isWorkspaceDropdownOpen} onOpenChange={setIsWorkspaceDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between h-9 px-2 text-sm font-medium hover:bg-accent"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {currentWorkspace ? (
                  <>
                    {currentWorkspace.icon ? (
                      <span className="text-base flex-shrink-0">{currentWorkspace.icon}</span>
                    ) : (
                      <Users className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span className="truncate">{currentWorkspace.name}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">워크스페이스 선택</span>
                )}
              </div>
              <ChevronDown className="h-4 w-4 flex-shrink-0 ml-2 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[240px] p-0">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="워크스페이스 검색..."
                  value={workspaceSearchQuery}
                  onChange={(e) => setWorkspaceSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="max-h-[300px] overflow-y-auto overflow-x-hidden">
              <div className="p-1">
                {filteredWorkspaces.length === 0 ? (
                  <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                    {workspaceSearchQuery ? '검색 결과가 없습니다' : '워크스페이스가 없습니다'}
                  </div>
                ) : (
                  filteredWorkspaces.map((workspace) => (
                    <DropdownMenuItem
                      key={workspace.id}
                      onClick={() => handleWorkspaceSelect(workspace)}
                      className="flex items-center gap-2 px-2 py-2 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {workspace.icon ? (
                          <span className="text-base flex-shrink-0">{workspace.icon}</span>
                        ) : (
                          <Users className="h-4 w-4 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{workspace.name}</div>
                          {workspace.description && (
                            <div className="text-xs text-muted-foreground truncate">
                              {workspace.description}
                            </div>
                          )}
                        </div>
                      </div>
                      {currentWorkspace?.id === workspace.id && (
                        <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))
                )}
              </div>
            </div>
            <DropdownMenuSeparator />
            <div className="p-1">
              <Dialog open={isCreateWorkspaceOpen} onOpenChange={setIsCreateWorkspaceOpen}>
                <DialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setIsCreateWorkspaceOpen(true);
                    }}
                    className="flex items-center gap-2 px-2 py-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>새 워크스페이스 생성</span>
                  </DropdownMenuItem>
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
              {currentWorkspace && (
                <DropdownMenuItem
                  onClick={() => {
                    setIsSettingsOpen(true);
                    setIsWorkspaceDropdownOpen(false);
                  }}
                  className="flex items-center gap-2 px-2 py-2"
                >
                  <Settings className="h-4 w-4" />
                  <span>워크스페이스 설정</span>
                </DropdownMenuItem>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
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

