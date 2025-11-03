/**
 * 유저 테이블 행 컴포넌트 (메모이제이션)
 */

'use client';

import React, { useCallback, memo } from 'react';
import { TableRow, TableCell } from '@/shared/components/ui/table';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { UserManagementInfo } from '@/shared/services/firebase/userManagement';
import type { EditableUserData } from '../types/userManagement';
import { ROLE_LABELS, ROLE_BADGE_COLORS, ROLE_OPTIONS } from '@/shared/constants/userRoles';
import { formatPhoneNumber } from '@/shared/utils/phoneUtils';

interface UserTableRowProps {
  user: UserManagementInfo;
  isEditMode: boolean;
  userData: EditableUserData;
  isEdited: boolean;
  allPositions: string[];
  allDepartments: string[];
  onFieldChange: (uid: string, field: keyof EditableUserData, value: string | undefined) => void;
  onDelete: (user: UserManagementInfo) => void;
  currentUserId?: string;
}

export const UserTableRow = memo<UserTableRowProps>(({ 
  user, 
  isEditMode, 
  userData, 
  isEdited, 
  allPositions, 
  allDepartments, 
  onFieldChange, 
  onDelete, 
  currentUserId 
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

  const handleDeleteClick = useCallback(() => {
    onDelete(user);
  }, [user, onDelete]);

  return (
    <TableRow className={isEdited ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}>
      <TableCell className="font-medium whitespace-nowrap">
        {user.email || (user.uid ? `UID: ${user.uid.slice(0, 8)}...` : '-')}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {user.displayName || (user.uid ? `User ${user.uid.slice(0, 8)}` : '-')}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {user.phoneNumber 
          ? (() => {
              // Firebase Auth 형식 (+821012345678)을 한국 형식으로 변환
              const phone = user.phoneNumber.replace(/^\+82/, '0');
              return formatPhoneNumber(phone);
            })()
          : '-'}
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
              {ROLE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${ROLE_BADGE_COLORS[option.value]}`}>
                    {option.label}
                  </span>
                </SelectItem>
              ))}
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
            value={userData.position || 'none'}
            onValueChange={handlePositionChange}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="직책 선택">
                {userData.position || '없음'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">없음</SelectItem>
              {allPositions.map((position) => (
                <SelectItem key={position} value={position}>
                  {position}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          userData.position || '-'
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
              <SelectItem value="none">없음</SelectItem>
              {allDepartments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          userData.department || '-'
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {user.lastLoginAt
          ? format(user.lastLoginAt, 'yyyy-MM-dd HH:mm', { locale: ko })
          : '-'}
      </TableCell>
      <TableCell className="text-right whitespace-nowrap">
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDeleteClick}
          disabled={user.uid === currentUserId || isEditMode}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
});

UserTableRow.displayName = 'UserTableRow';

