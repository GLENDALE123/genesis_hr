/**
 * 유저 테이블 행 컴포넌트 (메모이제이션)
 */

'use client';

import React, { useCallback, memo, useMemo } from 'react';
import { TableRow, TableCell } from '@/shared/components/ui/table';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Input } from '@/shared/components/ui/input';
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { UserManagementInfo } from '@/shared/services/firebase/userManagement';
import type { EditableUserData } from '../types/userManagement';
import { ROLE_LABELS, ROLE_BADGE_COLORS, ROLE_OPTIONS } from '@/shared/constants/userRoles';
import { formatPhoneNumber } from '@/shared/utils/phoneUtils';
import type { UserRole } from '@/features/auth/types';

interface UserTableRowProps {
  user: UserManagementInfo;
  isEditMode: boolean;
  userData: EditableUserData;
  isEdited: boolean;
  positionItems: React.ReactNode;
  departmentItems: React.ReactNode;
  roleItems: React.ReactNode;
  onFieldChange: (uid: string, field: keyof EditableUserData, value: string | undefined) => void;
  onDelete: (user: UserManagementInfo) => void;
  currentUserId?: string;
  currentUserRole?: UserRole;
}

export const UserTableRow = memo<UserTableRowProps>(({ 
  user, 
  isEditMode, 
  userData, 
  isEdited, 
  positionItems,
  departmentItems,
  roleItems,
  onFieldChange, 
  onDelete, 
  currentUserId,
  currentUserRole 
}) => {
  const handleRoleChange = useCallback((value: string) => {
    onFieldChange(user.uid || '', 'role', value);
  }, [user.uid, onFieldChange]);

  const handlePositionChange = useCallback((value: string) => {
    onFieldChange(user.uid || '', 'position', value === 'none' ? undefined : value);
  }, [user.uid, onFieldChange]);

  const handleDepartmentChange = useCallback((value: string) => {
    onFieldChange(user.uid || '', 'department', value);
  }, [user.uid, onFieldChange]);

  const handleDisplayNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFieldChange(user.uid || '', 'displayName', e.target.value || undefined);
  }, [user.uid, onFieldChange]);

  const handlePhoneNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // 숫자만 입력해도 자동으로 하이픈 포맷팅
    const formatted = formatPhoneNumber(e.target.value);
    onFieldChange(user.uid || '', 'phoneNumber', formatted || undefined);
  }, [user.uid, onFieldChange]);

  const handleDeleteClick = useCallback(() => {
    onDelete(user);
  }, [user, onDelete]);

  // 편집 모드에서 표시할 값
  const displayName = userData.displayName || '';
  
  // 전화번호: 편집 모드에서는 포맷팅된 한국 형식으로 표시
  // Firebase Auth 형식(+821012345678)이면 한국 형식(010-1234-5678)으로 변환
  const getDisplayPhone = () => {
    if (!userData.phoneNumber) return '';
    
    // Firebase Auth 형식 (+821012345678)을 한국 형식으로 변환
    if (userData.phoneNumber.startsWith('+82')) {
      const rest = userData.phoneNumber.substring(3);
      return formatPhoneNumber('0' + rest);
    }
    
    // 이미 포맷팅된 형식이면 그대로 사용, 아니면 포맷팅
    return formatPhoneNumber(userData.phoneNumber);
  };
  
  const displayPhone = getDisplayPhone();

  return (
    <TableRow className={isEdited ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}>
      <TableCell className="font-medium whitespace-nowrap">
        {user.email || (user.uid ? `UID: ${user.uid.slice(0, 8)}...` : '-')}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {isEditMode ? (
          <Input
            value={displayName}
            onChange={handleDisplayNameChange}
            placeholder="이름"
            className="w-[120px]"
          />
        ) : (
          user.displayName || (user.uid ? `User ${user.uid.slice(0, 8)}` : '-')
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {isEditMode ? (
          <Select
            value={userData.position || 'none'}
            onValueChange={handlePositionChange}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="직책 선택">
                {userData.position || '없음'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {positionItems}
            </SelectContent>
          </Select>
        ) : (
          userData.position || '-'
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {isEditMode ? (
          <Input
            type="tel"
            value={displayPhone}
            onChange={handlePhoneNumberChange}
            placeholder="010-1234-5678"
            className="w-[140px]"
            maxLength={13}
          />
        ) : (
          user.phoneNumber 
            ? (() => {
                // Firebase Auth 형식 (+821012345678)을 한국 형식으로 변환
                const phone = user.phoneNumber.replace(/^\+82/, '0');
                return formatPhoneNumber(phone);
              })()
            : '-'
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {isEditMode ? (
          <Select
            value={userData.role}
            onValueChange={handleRoleChange}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue asChild>
                <span className={`px-2 py-1 rounded-md text-xs font-medium ${ROLE_BADGE_COLORS[userData.role]}`}>
                  {ROLE_LABELS[userData.role]}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {roleItems}
            </SelectContent>
          </Select>
        ) : (
          <span className={`px-2 py-1 rounded-md text-xs font-medium ${ROLE_BADGE_COLORS[userData.role]}`}>
            {ROLE_LABELS[userData.role]}
          </span>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {isEditMode ? (
          <Select
            value={userData.department || 'none'}
            onValueChange={handleDepartmentChange}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="부서 선택">
                {userData.department || '없음'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {departmentItems}
            </SelectContent>
          </Select>
        ) : (
          userData.department || '-'
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {user.lastLoginAt && user.lastLoginAt instanceof Date && !isNaN(user.lastLoginAt.getTime())
          ? format(user.lastLoginAt, 'yyyy-MM-dd HH:mm', { locale: ko })
          : '-'}
      </TableCell>
      <TableCell className="text-right whitespace-nowrap">
        {currentUserRole !== 'Manager' && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteClick}
            disabled={user.uid === currentUserId || isEditMode}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}, (prevProps, nextProps) => {
  // props 비교 최적화: 중요한 props만 비교
  return (
    prevProps.user.uid === nextProps.user.uid &&
    prevProps.isEditMode === nextProps.isEditMode &&
    prevProps.userData.role === nextProps.userData.role &&
    prevProps.userData.position === nextProps.userData.position &&
    prevProps.userData.department === nextProps.userData.department &&
    prevProps.userData.displayName === nextProps.userData.displayName &&
    prevProps.userData.phoneNumber === nextProps.userData.phoneNumber &&
    prevProps.isEdited === nextProps.isEdited &&
    prevProps.currentUserId === nextProps.currentUserId &&
    prevProps.currentUserRole === nextProps.currentUserRole &&
    // 함수 참조는 안정적이므로 비교 불필요
    prevProps.positionItems === nextProps.positionItems &&
    prevProps.departmentItems === nextProps.departmentItems &&
    prevProps.roleItems === nextProps.roleItems
  );
});

UserTableRow.displayName = 'UserTableRow';

