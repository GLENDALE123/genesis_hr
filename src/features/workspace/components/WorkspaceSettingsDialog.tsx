/**
 * 워크스페이스 설정 다이얼로그
 * 워크스페이스 이름 변경, 멤버 관리, 설정 변경
 */

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { WorkspaceService } from '../services/workspaceService';
import { getAllUsersWithAuthInfo } from '@/shared/services/firebase/userManagement';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Button } from '@/shared/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import { Switch } from '@/shared/components/ui/switch';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { toast } from 'sonner';
import { getUserInitial } from '@/shared/utils/user/userUtils';
import { Settings, Users, Info, UserPlus, Trash2, Crown, Shield, User } from 'lucide-react';
import type { Workspace, WorkspaceMember, WorkspaceRole } from '../types/workspace.types';
import { canManageWorkspace } from '../utils/permissions';
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
import { useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '../store/workspaceStore';

export interface WorkspaceSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: Workspace;
  onWorkspaceUpdate?: (workspace: Workspace) => void;
}

export const WorkspaceSettingsDialog: React.FC<WorkspaceSettingsDialogProps> = ({
  open,
  onOpenChange,
  workspace,
  onWorkspaceUpdate,
}) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { setCurrentWorkspace, setWorkspaces } = useWorkspaceStore();
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 일반 설정
  const [workspaceName, setWorkspaceName] = useState(workspace.name);
  const [workspaceDescription, setWorkspaceDescription] = useState(workspace.description || '');
  const [workspaceIcon, setWorkspaceIcon] = useState(workspace.icon || '');

  // 멤버 관리
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>(workspace.members);
  const [selectedUsersToAdd, setSelectedUsersToAdd] = useState<Set<string>>(new Set());

  // 워크스페이스 설정
  const [allowMemberInvite, setAllowMemberInvite] = useState(workspace.settings.allowMemberInvite);
  const [allowChannelCreation, setAllowChannelCreation] = useState(
    workspace.settings.allowChannelCreation
  );

  // 권한 확인
  const currentUserMember = workspaceMembers.find((m) => m.uid === user?.uid);
  const canManage = currentUserMember && canManageWorkspace(currentUserMember.role, user?.uid, workspace.createdBy);
  const isOwner = currentUserMember?.role === 'owner';
  const isAdmin = currentUserMember?.role === 'admin';
  const canDelete = isOwner || isAdmin; // 소유자 또는 관리자만 삭제 가능

  // 워크스페이스 정보 로드
  useEffect(() => {
    if (open) {
      setWorkspaceName(workspace.name);
      setWorkspaceDescription(workspace.description || '');
      setWorkspaceIcon(workspace.icon || '');
      setWorkspaceMembers(workspace.members);
      setAllowMemberInvite(workspace.settings.allowMemberInvite);
      setAllowChannelCreation(workspace.settings.allowChannelCreation);
    }
  }, [open, workspace]);

  // 모든 사용자 로드 (멤버 추가용)
  useEffect(() => {
    if (open && activeTab === 'members') {
      const loadUsers = async () => {
        try {
          setIsLoading(true);
          const users = await getAllUsersWithAuthInfo();
          // 이미 멤버인 사용자 제외
          const memberUids = new Set(workspaceMembers.map((m) => m.uid));
          const availableUsers = users.filter((u) => u.uid && !memberUids.has(u.uid));
          setAllUsers(availableUsers);
        } catch (error) {
          console.error('Failed to load users:', error);
          toast.error('사용자 목록을 불러오는데 실패했습니다.');
        } finally {
          setIsLoading(false);
        }
      };

      loadUsers();
    }
  }, [open, activeTab, workspaceMembers]);

  // 일반 설정 저장
  const handleSaveGeneral = async () => {
    if (!canManage) {
      toast.error('워크스페이스 관리 권한이 없습니다.');
      return;
    }

    if (!workspaceName.trim()) {
      toast.error('워크스페이스 이름을 입력해주세요.');
      return;
    }

    try {
      setIsSaving(true);
      await WorkspaceService.updateWorkspace(workspace.id, {
        name: workspaceName.trim(),
        description: workspaceDescription.trim() || undefined,
        icon: workspaceIcon.trim() || undefined,
      });

      // 업데이트된 워크스페이스 가져오기
      const updatedWorkspace = await WorkspaceService.getWorkspace(workspace.id);
      if (updatedWorkspace && onWorkspaceUpdate) {
        onWorkspaceUpdate(updatedWorkspace);
      }

      toast.success('워크스페이스 정보가 저장되었습니다.');
    } catch (error) {
      console.error('Failed to update workspace:', error);
      toast.error('워크스페이스 정보 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 멤버 추가 (다중 선택)
  const handleAddMembers = async () => {
    if (!canManage) {
      toast.error('워크스페이스 관리 권한이 없습니다.');
      return;
    }

    if (selectedUsersToAdd.size === 0) {
      toast.error('추가할 사용자를 선택해주세요.');
      return;
    }

    try {
      setIsSaving(true);
      const usersToAdd = allUsers.filter((u) => u.uid && selectedUsersToAdd.has(u.uid));
      
      if (usersToAdd.length === 0) {
        toast.error('선택한 사용자를 찾을 수 없습니다.');
        return;
      }

      // 모든 사용자를 한 번에 추가
      const addPromises = usersToAdd.map((userToAdd) =>
        WorkspaceService.addMember(workspace.id, {
          uid: userToAdd.uid || '',
          role: 'member',
          displayName: userToAdd.displayName || undefined,
          photoURL: userToAdd.photoURL || undefined,
        })
      );

      await Promise.all(addPromises);

      // 업데이트된 워크스페이스 가져오기
      const updatedWorkspace = await WorkspaceService.getWorkspace(workspace.id);
      if (updatedWorkspace) {
        setWorkspaceMembers(updatedWorkspace.members);
        if (onWorkspaceUpdate) {
          onWorkspaceUpdate(updatedWorkspace);
        }
      }

      setSelectedUsersToAdd(new Set());
      toast.success(`${usersToAdd.length}명의 멤버가 추가되었습니다.`);
    } catch (error: any) {
      console.error('Failed to add members:', error);
      toast.error(error.message || '멤버 추가에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 사용자 선택 토글
  const handleToggleUserSelection = (userId: string) => {
    setSelectedUsersToAdd((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (selectedUsersToAdd.size === allUsers.length) {
      setSelectedUsersToAdd(new Set());
    } else {
      const allUserIds = allUsers.filter((u) => u.uid).map((u) => u.uid || '');
      setSelectedUsersToAdd(new Set(allUserIds));
    }
  };

  // 멤버 제거
  const handleRemoveMember = async (memberUid: string) => {
    if (!canManage) {
      toast.error('워크스페이스 관리 권한이 없습니다.');
      return;
    }

    const member = workspaceMembers.find((m) => m.uid === memberUid);
    if (member?.role === 'owner') {
      toast.error('소유자는 제거할 수 없습니다.');
      return;
    }

    try {
      setIsSaving(true);
      await WorkspaceService.removeMember(workspace.id, memberUid);

      // 업데이트된 워크스페이스 가져오기
      const updatedWorkspace = await WorkspaceService.getWorkspace(workspace.id);
      if (updatedWorkspace) {
        setWorkspaceMembers(updatedWorkspace.members);
        if (onWorkspaceUpdate) {
          onWorkspaceUpdate(updatedWorkspace);
        }
      }

      toast.success('멤버가 제거되었습니다.');
    } catch (error: any) {
      console.error('Failed to remove member:', error);
      toast.error(error.message || '멤버 제거에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 멤버 역할 변경
  const handleUpdateMemberRole = async (memberUid: string, newRole: WorkspaceRole) => {
    if (!canManage) {
      toast.error('워크스페이스 관리 권한이 없습니다.');
      return;
    }

    const member = workspaceMembers.find((m) => m.uid === memberUid);
    if (member?.role === 'owner' && newRole !== 'owner') {
      toast.error('소유자 역할은 변경할 수 없습니다. 소유자 이전 기능을 사용하세요.');
      return;
    }

    try {
      setIsSaving(true);
      await WorkspaceService.updateMemberRole(workspace.id, memberUid, newRole);

      // 업데이트된 워크스페이스 가져오기
      const updatedWorkspace = await WorkspaceService.getWorkspace(workspace.id);
      if (updatedWorkspace) {
        setWorkspaceMembers(updatedWorkspace.members);
        if (onWorkspaceUpdate) {
          onWorkspaceUpdate(updatedWorkspace);
        }
      }

      toast.success('멤버 역할이 변경되었습니다.');
    } catch (error: any) {
      console.error('Failed to update member role:', error);
      toast.error(error.message || '멤버 역할 변경에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 소유자 이전
  const [isTransferOwnershipDialogOpen, setIsTransferOwnershipDialogOpen] = useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);

  const handleTransferOwnership = async () => {
    if (!isOwner) {
      toast.error('소유자만 소유권을 이전할 수 있습니다.');
      return;
    }

    if (!selectedNewOwner) {
      toast.error('새 소유자를 선택해주세요.');
      return;
    }

    if (selectedNewOwner === user?.uid) {
      toast.error('이미 소유자입니다.');
      return;
    }

    try {
      setIsTransferring(true);
      await WorkspaceService.transferOwnership(
        workspace.id,
        selectedNewOwner,
        user?.uid || ''
      );

      // 업데이트된 워크스페이스 가져오기
      const updatedWorkspace = await WorkspaceService.getWorkspace(workspace.id);
      if (updatedWorkspace) {
        setWorkspaceMembers(updatedWorkspace.members);
        if (onWorkspaceUpdate) {
          onWorkspaceUpdate(updatedWorkspace);
        }
      }

      setIsTransferOwnershipDialogOpen(false);
      setSelectedNewOwner('');
      toast.success('소유권이 이전되었습니다.');
    } catch (error: any) {
      console.error('Failed to transfer ownership:', error);
      toast.error(error.message || '소유권 이전에 실패했습니다.');
    } finally {
      setIsTransferring(false);
    }
  };

  // 워크스페이스 설정 저장
  const handleSaveSettings = async () => {
    if (!canManage) {
      toast.error('워크스페이스 관리 권한이 없습니다.');
      return;
    }

    try {
      setIsSaving(true);
      await WorkspaceService.updateWorkspace(workspace.id, {
        settings: {
          allowMemberInvite,
          allowChannelCreation,
          defaultChannelPermissions: workspace.settings.defaultChannelPermissions,
        },
      });

      // 업데이트된 워크스페이스 가져오기
      const updatedWorkspace = await WorkspaceService.getWorkspace(workspace.id);
      if (updatedWorkspace && onWorkspaceUpdate) {
        onWorkspaceUpdate(updatedWorkspace);
      }

      toast.success('워크스페이스 설정이 저장되었습니다.');
    } catch (error) {
      console.error('Failed to update workspace settings:', error);
      toast.error('워크스페이스 설정 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 워크스페이스 삭제
  const handleDeleteWorkspace = async () => {
    if (!canDelete) {
      toast.error('워크스페이스 소유자 또는 관리자만 삭제할 수 있습니다.');
      return;
    }

    try {
      setIsDeleting(true);
      await WorkspaceService.deleteWorkspace(workspace.id);

      // 워크스페이스 목록에서 제거
      setWorkspaces((prev) => prev.filter((w) => w.id !== workspace.id));

      // 현재 워크스페이스가 삭제된 워크스페이스면 첫 번째 워크스페이스로 전환
      const remainingWorkspaces = await WorkspaceService.getUserWorkspaces(user?.uid || '');
      if (remainingWorkspaces.length > 0) {
        setCurrentWorkspace(remainingWorkspaces[0]);
        navigate('/workspace');
      } else {
        setCurrentWorkspace(null);
        navigate('/workspace');
      }

      setIsDeleteDialogOpen(false);
      onOpenChange(false);
      toast.success('워크스페이스가 삭제되었습니다.');
    } catch (error) {
      console.error('Failed to delete workspace:', error);
      toast.error('워크스페이스 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getRoleIcon = (role: WorkspaceRole) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-3 w-3" />;
      case 'admin':
        return <Shield className="h-3 w-3" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  const getRoleLabel = (role: WorkspaceRole) => {
    switch (role) {
      case 'owner':
        return '소유자';
      case 'admin':
        return '관리자';
      default:
        return '멤버';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>워크스페이스 설정</DialogTitle>
          <DialogDescription>
            {workspace.name} 워크스페이스의 설정을 관리합니다.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              일반
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              멤버 관리
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              설정
            </TabsTrigger>
          </TabsList>

          {/* 일반 설정 */}
          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="workspace-name">워크스페이스 이름</Label>
                <Input
                  id="workspace-name"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  disabled={!canManage}
                  placeholder="워크스페이스 이름"
                />
              </div>

              <div>
                <Label htmlFor="workspace-description">설명</Label>
                <Textarea
                  id="workspace-description"
                  value={workspaceDescription}
                  onChange={(e) => setWorkspaceDescription(e.target.value)}
                  disabled={!canManage}
                  placeholder="워크스페이스에 대한 설명을 입력하세요"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="workspace-icon">아이콘 (이모지 또는 URL)</Label>
                <Input
                  id="workspace-icon"
                  value={workspaceIcon}
                  onChange={(e) => setWorkspaceIcon(e.target.value)}
                  disabled={!canManage}
                  placeholder="예: 🏢 또는 https://..."
                />
              </div>

              {canManage && (
                <Button onClick={handleSaveGeneral} disabled={isSaving} className="w-full">
                  {isSaving ? '저장 중...' : '저장'}
                </Button>
              )}

              {!canManage && (
                <p className="text-sm text-muted-foreground">
                  워크스페이스 관리 권한이 필요합니다.
                </p>
              )}
            </div>
          </TabsContent>

          {/* 멤버 관리 */}
          <TabsContent value="members" className="space-y-4 mt-4">
            <div className="space-y-4">
              {/* 멤버 추가 (다중 선택) */}
              {canManage && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>멤버 추가</Label>
                    {allUsers.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSelectAll}
                        className="text-xs"
                      >
                        {selectedUsersToAdd.size === allUsers.length ? '전체 해제' : '전체 선택'}
                      </Button>
                    )}
                  </div>
                  {isLoading ? (
                    <div className="text-sm text-muted-foreground py-4 text-center">
                      사용자 목록을 불러오는 중...
                    </div>
                  ) : allUsers.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-4 text-center">
                      추가할 수 있는 사용자가 없습니다.
                    </div>
                  ) : (
                    <div className="border rounded-lg max-h-60 overflow-y-auto">
                      <div className="p-2 space-y-1">
                        {allUsers.map((user) => {
                          const isSelected = user.uid && selectedUsersToAdd.has(user.uid);
                          return (
                            <div
                              key={user.uid}
                              className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer"
                              onClick={() => user.uid && handleToggleUserSelection(user.uid)}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => user.uid && handleToggleUserSelection(user.uid)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.photoURL} alt={user.displayName || user.email} />
                                <AvatarFallback>
                                  {getUserInitial({ displayName: user.displayName || user.email || 'U', photoURL: user.photoURL })}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">
                                  {user.displayName || user.email || '사용자'}
                                </div>
                                {user.email && user.displayName && (
                                  <div className="text-xs text-muted-foreground truncate">
                                    {user.email}
                                  </div>
                                )}
                                {user.department && (
                                  <div className="text-xs text-muted-foreground">
                                    {user.department}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <Button
                    onClick={handleAddMembers}
                    disabled={selectedUsersToAdd.size === 0 || isSaving || isLoading}
                    className="w-full"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {selectedUsersToAdd.size > 0
                      ? `${selectedUsersToAdd.size}명 추가`
                      : '멤버 추가'}
                  </Button>
                </div>
              )}

              {/* 멤버 목록 */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>멤버</TableHead>
                      <TableHead>역할</TableHead>
                      {canManage && <TableHead className="text-right">작업</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workspaceMembers.map((member) => {
                      const userInfo = allUsers.find((u) => u.uid === member.uid);
                      const displayName =
                        member.displayName || userInfo?.displayName || userInfo?.email || '사용자';
                      const photoURL = member.photoURL || userInfo?.photoURL;

                      return (
                        <TableRow key={member.uid}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={photoURL} alt={displayName} />
                                <AvatarFallback>
                                  {getUserInitial({ displayName, photoURL })}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{displayName}</div>
                                {userInfo?.email && (
                                  <div className="text-xs text-muted-foreground">
                                    {userInfo.email}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {canManage && member.uid !== user?.uid && member.role !== 'owner' ? (
                              <Select
                                value={member.role}
                                onValueChange={(value) =>
                                  handleUpdateMemberRole(member.uid, value as WorkspaceRole)
                                }
                                disabled={isSaving}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue>
                                    <div className="flex items-center gap-1">
                                      {getRoleIcon(member.role)}
                                      <span>{getRoleLabel(member.role)}</span>
                                    </div>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="member">
                                    <div className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      <span>멤버</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="admin">
                                    <div className="flex items-center gap-1">
                                      <Shield className="h-3 w-3" />
                                      <span>관리자</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                {getRoleIcon(member.role)}
                                <span>{getRoleLabel(member.role)}</span>
                              </Badge>
                            )}
                          </TableCell>
                          {canManage && (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {/* 소유자 이전 버튼 (소유자만 표시) */}
                                {isOwner && member.uid !== user?.uid && member.role !== 'owner' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedNewOwner(member.uid);
                                      setIsTransferOwnershipDialogOpen(true);
                                    }}
                                    disabled={isSaving}
                                    className="text-xs"
                                    title="소유자 이전"
                                  >
                                    <Crown className="h-3 w-3 mr-1" />
                                    소유자 이전
                                  </Button>
                                )}
                                {/* 멤버 제거 버튼 */}
                                {member.role !== 'owner' && member.uid !== user?.uid && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveMember(member.uid)}
                                    disabled={isSaving}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* 워크스페이스 설정 */}
          <TabsContent value="settings" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>멤버 초대 허용</Label>
                  <p className="text-sm text-muted-foreground">
                    멤버가 다른 사용자를 워크스페이스에 초대할 수 있습니다.
                  </p>
                </div>
                <Switch
                  checked={allowMemberInvite}
                  onCheckedChange={setAllowMemberInvite}
                  disabled={!canManage}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>채널 생성 허용</Label>
                  <p className="text-sm text-muted-foreground">
                    멤버가 새로운 채널을 생성할 수 있습니다.
                  </p>
                </div>
                <Switch
                  checked={allowChannelCreation}
                  onCheckedChange={setAllowChannelCreation}
                  disabled={!canManage}
                />
              </div>

              {canManage && (
                <Button onClick={handleSaveSettings} disabled={isSaving} className="w-full">
                  {isSaving ? '저장 중...' : '설정 저장'}
                </Button>
              )}

              {!canManage && (
                <p className="text-sm text-muted-foreground">
                  워크스페이스 관리 권한이 필요합니다.
                </p>
              )}

              {/* 소유자 이전 (소유자만) */}
              {isOwner && (
                <div className="pt-4 border-t">
                  <div className="space-y-2">
                    <div>
                      <Label>소유자 이전</Label>
                      <p className="text-sm text-muted-foreground">
                        워크스페이스 소유권을 다른 멤버에게 이전할 수 있습니다.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setIsTransferOwnershipDialogOpen(true)}
                      className="w-full"
                    >
                      <Crown className="h-4 w-4 mr-2" />
                      소유자 이전
                    </Button>
                  </div>
                </div>
              )}

              {/* 워크스페이스 삭제 (소유자 또는 관리자) */}
              {canDelete && (
                <div className="pt-4 border-t">
                  <div className="space-y-2">
                    <div>
                      <Label className="text-destructive">위험 구역</Label>
                      <p className="text-sm text-muted-foreground">
                        워크스페이스를 삭제하면 모든 채널과 메시지가 삭제되며 복구할 수 없습니다.
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => setIsDeleteDialogOpen(true)}
                      disabled={isDeleting}
                      className="w-full"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      워크스페이스 삭제
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>워크스페이스 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 <strong>{workspace.name}</strong> 워크스페이스를 삭제하시겠습니까?
              <br />
              <br />
              이 작업은 되돌릴 수 없으며, 워크스페이스의 모든 채널과 메시지가 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorkspace}
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

