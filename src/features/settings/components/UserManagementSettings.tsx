/**
 * 유저 관리 설정 탭 (관리자 전용)
 */

'use client';

import React, { useTransition, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
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
import { Search, Edit, Save, X } from 'lucide-react';
import { Spinner } from '@/shared/components/ui/spinner';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useUserManagement } from '../hooks/useUserManagement';
import { UserTableRow } from './UserTableRow';
import { SelectItem } from '@/shared/components/ui/select';
import { ROLE_LABELS, ROLE_BADGE_COLORS, ROLE_OPTIONS } from '@/shared/constants/userRoles';

export const UserManagementSettings: React.FC = () => {
  const { user: currentUser, userProfile } = useAuthStore();
  const [isPending, startTransition] = useTransition();
  
  const {
    users,
    filteredUsers,
    isLoading,
    searchQuery,
    isEditMode,
    editedUsers,
    isSaving,
    deleteDialogOpen,
    selectedUser,
    isDeleting,
    hasChanges,
    allPositions,
    allDepartments,
    setSearchQuery,
    setDeleteDialogOpen,
    handleEditModeToggle: originalHandleEditModeToggle,
    handleUserFieldChange,
    handleSaveAll,
    handleDeleteClick,
    handleConfirmDelete,
    getUserData,
  } = useUserManagement();

  // 수정 모드 토글을 startTransition으로 감싸서 UI 블로킹 방지
  const handleEditModeToggle = React.useCallback(() => {
    startTransition(() => {
      originalHandleEditModeToggle();
    });
  }, [originalHandleEditModeToggle, startTransition]);

  const handleConfirmDeleteWithUserId = () => {
    handleConfirmDelete(currentUser?.uid);
  };

  // 공통 SelectItem 리스트 생성 (한 번만 생성하여 모든 행에서 재사용)
  const positionItems = useMemo(() => (
    <>
      <SelectItem value="none">없음</SelectItem>
      {allPositions.map((position) => (
        <SelectItem key={position} value={position}>
          {position}
        </SelectItem>
      ))}
    </>
  ), [allPositions]);

  const departmentItems = useMemo(() => (
    <>
      <SelectItem value="none">없음</SelectItem>
      {allDepartments.map((dept) => (
        <SelectItem key={dept} value={dept}>
          {dept}
        </SelectItem>
      ))}
    </>
  ), [allDepartments]);

  const roleItems = useMemo(() => (
    <>
      {ROLE_OPTIONS.map((option) => (
        <SelectItem key={option.value} value={option.value}>
          <span className={`px-2 py-1 rounded-md text-xs font-medium ${ROLE_BADGE_COLORS[option.value]}`}>
            {option.label}
          </span>
        </SelectItem>
      ))}
    </>
  ), []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Spinner className="size-4" />
          유저 목록을 불러오는 중...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>유저 관리</CardTitle>
              <CardDescription>
                시스템에 등록된 모든 유저를 관리할 수 있습니다. 유저 정보를 수정하거나 삭제할 수 있습니다.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isEditMode ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleEditModeToggle}
                    disabled={isSaving}
                  >
                    <X className="mr-2 h-4 w-4" />
                    취소
                  </Button>
                  <Button
                    onClick={handleSaveAll}
                    disabled={!hasChanges || isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Spinner className="mr-2 size-4 text-inherit" />
                        저장 중...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        저장
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleEditModeToggle}
                  disabled={isPending}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  전체 수정
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="이메일, 이름, 전화번호, 부서, 직책으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* 유저 테이블 */}
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-[-16px] z-10">
                <TableRow>
                  <TableHead className="whitespace-nowrap">이메일</TableHead>
                  <TableHead className="whitespace-nowrap">이름</TableHead>
                  <TableHead className="whitespace-nowrap">직책</TableHead>
                  <TableHead className="whitespace-nowrap">전화번호</TableHead>
                  <TableHead className="whitespace-nowrap">역할</TableHead>
                  <TableHead className="whitespace-nowrap">부서</TableHead>
                  <TableHead className="whitespace-nowrap">최종 로그인</TableHead>
                  <TableHead className="text-right whitespace-nowrap">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {searchQuery ? '검색 결과가 없습니다.' : '등록된 유저가 없습니다.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <UserTableRow
                      key={user.uid}
                      user={user}
                      isEditMode={isEditMode}
                      userData={getUserData(user)}
                      isEdited={!!editedUsers[user.uid || '']}
                      positionItems={positionItems}
                      departmentItems={departmentItems}
                      roleItems={roleItems}
                      onFieldChange={handleUserFieldChange}
                      onDelete={handleDeleteClick}
                      currentUserId={currentUser?.uid}
                      currentUserRole={userProfile?.role}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              총 {users.length}명의 유저 (검색 결과: {filteredUsers.length}명)
            </div>
            {isEditMode && hasChanges && (
              <div className="text-yellow-600 dark:text-yellow-500">
                {Object.keys(editedUsers).length}명의 유저 정보가 변경되었습니다.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>유저 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 <strong>{selectedUser?.email || (selectedUser?.uid ? `UID: ${selectedUser.uid}` : '선택된')}</strong> 유저를 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없으며, Firebase Auth 계정과 모든 관련 데이터가 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteWithUserId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Spinner className="mr-2 size-4" />
                  삭제 중...
                </>
              ) : (
                '삭제'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
