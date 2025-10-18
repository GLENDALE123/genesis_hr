'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui/sheet';
import { Settings, Shield, User, Check } from 'lucide-react';
import { useIsAdmin } from '@/features/auth/hooks';
import { usePermissionsStore } from '@/features/auth/store/permissionsStore';
import { Badge } from '@/shared/components/ui/badge';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Switch } from '@/shared/components/ui/switch';
import type { PageIdentifier, PagePermissions } from '@/features/auth/types/permissions';
import type { UserProfile } from '@/features/auth/types';
import { PermissionsService } from '@/features/auth/services/permissionsService';
import { toast } from 'sonner';
import { getUserDisplayName, getUserRoleBadgeVariant, isAdmin as checkIsAdmin, hasRole } from '@/shared/utils/userUtils';

interface PermissionSettingsButtonProps {
  pageId: PageIdentifier;
  pageName: string;
}

// 내부적으로 사용할 간단한 권한 상태 타입
interface PermissionState {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  custom: Record<string, boolean>;
}

/**
 * 관리자 전용: 페이지별 권한 설정 버튼
 * 우측 상단에 표시되어 사용자별 권한을 관리
 */
const PermissionSettingsButtonComponent: React.FC<PermissionSettingsButtonProps> = ({
  pageId,
  pageName
}) => {
  const isAdmin = useIsAdmin();
  const { clearCache } = usePermissionsStore();
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [userPermissions, setUserPermissions] = useState<Record<string, PermissionState>>({});
  const [savingPermissions, setSavingPermissions] = useState<boolean>(false);

  // 사용자 목록 가져오기
  useEffect(() => {
    if (!open || !isAdmin) {
      return;
    }

    const fetchUsers = async () => {
      setLoading(true);
      try {
        // ✅ 공통 서비스 사용 (중복 제거)
        const usersList = await PermissionsService.getAllUserProfiles();

        setUsers(usersList);

        // ✅ 병렬로 모든 사용자의 권한 가져오기
        const permissionsPromises = usersList
          .filter(user => user.uid)
          .map(async (user) => {
            const permissions = await PermissionsService.getUserPagePermissions(user.uid, pageId);
            
            // PagePermissions를 PermissionState로 변환
            let permissionState: PermissionState;
            if (permissions && permissions.crudPermissions && Array.isArray(permissions.crudPermissions)) {
              permissionState = {
                canRead: permissions.crudPermissions.includes('read'),
                canCreate: permissions.crudPermissions.includes('create'),
                canUpdate: permissions.crudPermissions.includes('update'),
                canDelete: permissions.crudPermissions.includes('delete'),
                custom: (permissions.customPermissions as Record<string, boolean>) || {},
              };
            } else {
              // 권한 데이터가 없거나 잘못된 경우 기본 권한 설정
              permissionState = {
                canRead: true,
                canCreate: true,
                canUpdate: hasRole(user, 'Manager'), // Manager는 수정 권한 기본 허용
                canDelete: false,
                custom: {},
              };
            }
            
            return { uid: user.uid, permissions: permissionState };
          });

        const permissionsResults = await Promise.all(permissionsPromises);
        
        // 결과를 맵으로 변환
        const permissionsMap: Record<string, PermissionState> = {};
        permissionsResults.forEach(result => {
          permissionsMap[result.uid] = result.permissions;
        });
        
        setUserPermissions(permissionsMap);
      } catch (error) {
        console.error('사용자 목록 가져오기 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [open, isAdmin, pageId]);

  // 권한 설정 Sheet 열기
  const handleOpenPermissions = (user: UserProfile) => {
    setSelectedUser(user);
    setSheetOpen(true);
  };

  // 권한 업데이트 핸들러
  const handlePermissionChange = async (
    permissionKey: keyof PermissionState,
    value: boolean
  ) => {
    if (!selectedUser) return;

    try {
      setSavingPermissions(true);
      
      const currentPermissions = userPermissions[selectedUser.uid] || {
        canRead: true,
        canCreate: true,
        canUpdate: hasRole(selectedUser, 'Manager'), // Manager는 수정 권한 기본 허용
        canDelete: false,
        custom: {},
      };

      const updatedPermissions: PermissionState = {
        ...currentPermissions,
        [permissionKey]: value,
      };

      // PermissionState를 PagePermissions로 변환
      const pagePermissions: PagePermissions = {
        pageId: pageId,
        crudPermissions: [
          ...(updatedPermissions.canRead ? ['read' as const] : []),
          ...(updatedPermissions.canCreate ? ['create' as const] : []),
          ...(updatedPermissions.canUpdate ? ['update' as const] : []),
          ...(updatedPermissions.canDelete ? ['delete' as const] : []),
        ],
        customPermissions: updatedPermissions.custom,
      };

      await PermissionsService.setUserPagePermissions(selectedUser.uid, pageId, pagePermissions);
      
      // ✅ 권한 캐시 초기화 (변경사항 즉시 반영)
      clearCache();
      
      setUserPermissions((prev) => ({
        ...prev,
        [selectedUser.uid]: updatedPermissions,
      }));

      toast.success('권한이 업데이트되었습니다. 페이지를 새로고침하면 반영됩니다.');
    } catch (error) {
      console.error('권한 업데이트 실패:', error);
      toast.error('권한 업데이트에 실패했습니다.');
    } finally {
      setSavingPermissions(false);
    }
  };

  // 권한 텍스트 포맷팅 함수
  const formatPermissionsText = (userId: string): string => {
    const permissions = userPermissions[userId];
    if (!permissions) return '권한 로딩 중...';

    const permissionLabels = [];
    if (permissions.canRead) permissionLabels.push('읽기');
    if (permissions.canCreate) permissionLabels.push('생성');
    if (permissions.canUpdate) permissionLabels.push('수정');
    if (permissions.canDelete) permissionLabels.push('삭제');

    if (permissionLabels.length === 0) return '권한 없음';
    if (permissionLabels.length === 4) return '모든 권한';
    
    return permissionLabels.join(', ');
  };

  // 권한 상태에 따른 배지 색상
  const getPermissionBadgeVariant = (userId: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const permissions = userPermissions[userId];
    if (!permissions) return 'outline';

    const permissionCount = [permissions.canRead, permissions.canCreate, permissions.canUpdate, permissions.canDelete].filter(Boolean).length;
    
    if (permissionCount === 4) return 'default'; // 모든 권한
    if (permissionCount >= 2) return 'secondary'; // 일부 권한
    if (permissionCount === 1 && permissions.canRead) return 'outline'; // 읽기만
    return 'destructive'; // 권한 없음
  };

  // Admin이 아니면 버튼 숨김
  if (!isAdmin) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Shield className="h-4 w-4" />
          권한 설정
          <Badge variant="default" className="ml-1">Admin</Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {pageName} - 권한 설정
          </DialogTitle>
          <DialogDescription>
            사용자별로 읽기, 쓰기, 수정, 삭제 권한 및 커스텀 권한을 설정할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 사용자 목록 */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-muted rounded-lg text-center">
              <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                사용자가 없습니다.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => {
                const isUserAdmin = checkIsAdmin(user);
                
                return (
                  <div key={user.uid} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      {/* 사용자 정보 */}
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm truncate">
                              {getUserDisplayName(user)}
                            </p>
                            <Badge variant={getUserRoleBadgeVariant(user)} className="text-xs">
                              {user.role}
                            </Badge>
                            {isUserAdmin && (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                모든 권한 보유
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                          {user.department && (
                            <p className="text-xs text-muted-foreground">
                              {user.department}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* 우측: 권한 설정 버튼과 권한 정보 */}
                      {!isUserAdmin && (
                        <div className="flex flex-col items-end gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleOpenPermissions(user)}
                          >
                            권한 설정
                          </Button>
                          <Badge 
                            variant={getPermissionBadgeVariant(user.uid)}
                            className="text-xs text-blue-600 bg-blue-50 border-blue-200"
                          >
                            {formatPermissionsText(user.uid)}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 예시 구조 */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold mb-3">커스텀 권한 예시 ({pageName})</h4>
            <div className="space-y-2 text-sm">
              {pageId === 'production-daily-report' && (
                <>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="viewProcessConditions" />
                    <label htmlFor="viewProcessConditions">공정조건 보기</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="viewMemo" />
                    <label htmlFor="viewMemo">메모 보기</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="exportExcel" />
                    <label htmlFor="exportExcel">엑셀 내보내기</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="viewSummary" />
                    <label htmlFor="viewSummary">통계 요약 보기</label>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>

      {/* 권한 설정 Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selectedUser && (
            <>
              <SheetHeader className="sticky top-0 bg-background pb-4 z-10">
                <SheetTitle className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold">
                      {getUserDisplayName(selectedUser)}
                    </p>
                    <p className="text-sm text-muted-foreground font-normal">
                      {selectedUser.email}
                    </p>
                  </div>
                </SheetTitle>
                <SheetDescription>
                  {pageName} 페이지에 대한 권한을 설정합니다.
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6 pb-6">
                {/* 사용자 정보 */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">역할</span>
                    <Badge variant={getUserRoleBadgeVariant(selectedUser)}>
                      {selectedUser.role}
                    </Badge>
                  </div>
                  {selectedUser.department && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">부서</span>
                      <span className="text-sm font-medium">{selectedUser.department}</span>
                    </div>
                  )}
                </div>

                {/* CRUD 권한 */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">기본 권한 (CRUD)</h3>
                  
                  {(() => {
                    const permissions = userPermissions[selectedUser.uid] || {
                      canRead: true,
                      canCreate: true,
                      canUpdate: false,
                      canDelete: false,
                      custom: {},
                    };
                    
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium text-sm">읽기</p>
                            <p className="text-xs text-muted-foreground">데이터 조회 권한</p>
                          </div>
                          <Switch
                            checked={permissions.canRead}
                            onCheckedChange={(checked) => handlePermissionChange('canRead', checked)}
                            disabled={savingPermissions}
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium text-sm">생성</p>
                            <p className="text-xs text-muted-foreground">새 데이터 생성 권한</p>
                          </div>
                          <Switch
                            checked={permissions.canCreate}
                            onCheckedChange={(checked) => handlePermissionChange('canCreate', checked)}
                            disabled={savingPermissions}
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium text-sm">수정</p>
                            <p className="text-xs text-muted-foreground">기존 데이터 수정 권한</p>
                          </div>
                          <Switch
                            checked={permissions.canUpdate}
                            onCheckedChange={(checked) => handlePermissionChange('canUpdate', checked)}
                            disabled={savingPermissions}
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium text-sm">삭제</p>
                            <p className="text-xs text-muted-foreground">데이터 삭제 권한</p>
                          </div>
                          <Switch
                            checked={permissions.canDelete}
                            onCheckedChange={(checked) => handlePermissionChange('canDelete', checked)}
                            disabled={savingPermissions}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 저장 상태 */}
                {savingPermissions && (
                  <div className="flex items-center justify-center gap-2 p-3 bg-primary/10 rounded-lg">
                    <Check className="h-4 w-4 text-primary animate-pulse" />
                    <span className="text-sm font-medium text-primary">저장 중...</span>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Dialog>
  );
};

// React.memo로 최적화하여 불필요한 리렌더링 방지
export const PermissionSettingsButton = React.memo(PermissionSettingsButtonComponent);

