/**
 * 유저 관리 훅
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { getAllUsersWithAuthInfo, updateUserManagementInfo, deleteUserAccount } from '@/shared/services/firebase/userManagement';
import type { UserManagementInfo } from '@/shared/services/firebase/userManagement';
import type { EditableUserData } from '../types/userManagement';
import { POSITION_OPTIONS } from '../constants/userManagement';
import { DEPARTMENT_OPTIONS } from '@/shared/constants/departments';

export const useUserManagement = () => {
  const [users, setUsers] = useState<UserManagementInfo[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserManagementInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedUsers, setEditedUsers] = useState<Record<string, EditableUserData>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserManagementInfo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 유저 목록 로드
  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const userList = await getAllUsersWithAuthInfo();
      setUsers(userList);
      setFilteredUsers(userList);
      // 편집 모드 해제 시 편집 데이터 초기화
      if (!isEditMode) {
        setEditedUsers({});
      }
    } catch (error) {
      console.error('유저 목록 로드 실패:', error);
      toast.error('유저 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [isEditMode]);

  // 초기 로드
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // 검색 필터링
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(user => {
      const email = user.email?.toLowerCase() || '';
      const displayName = user.displayName?.toLowerCase() || '';
      const phoneNumber = user.phoneNumber?.toLowerCase() || '';
      const department = user.department?.toLowerCase() || '';
      const position = user.position?.toLowerCase() || '';
      const uid = user.uid?.toLowerCase() || '';

      return (
        email.includes(query) ||
        displayName.includes(query) ||
        phoneNumber.includes(query) ||
        department.includes(query) ||
        position.includes(query) ||
        uid.includes(query)
      );
    });
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  // 변경사항 확인
  const hasChanges = useMemo(() => {
    return Object.keys(editedUsers).length > 0;
  }, [editedUsers]);

  // 모든 사용자의 고유한 직책 목록 (메모이제이션)
  const allPositions = useMemo(() => {
    const positions = new Set<string>(POSITION_OPTIONS);
    users.forEach(user => {
      if (user.position) {
        positions.add(user.position);
      }
    });
    return Array.from(positions).sort();
  }, [users]);

  // 모든 사용자의 고유한 부서 목록 (메모이제이션)
  const allDepartments = useMemo(() => {
    const departments = new Set<string>(DEPARTMENT_OPTIONS);
    users.forEach(user => {
      if (user.department) {
        departments.add(user.department);
      }
    });
    return Array.from(departments).sort();
  }, [users]);

  // 편집 모드 토글
  const handleEditModeToggle = useCallback(() => {
    if (isEditMode) {
      // 편집 모드 해제 - 변경사항 취소
      setEditedUsers({});
    }
    setIsEditMode(!isEditMode);
  }, [isEditMode]);

  // 유저 필드 변경
  const handleUserFieldChange = useCallback((uid: string, field: keyof EditableUserData, value: string | undefined) => {
    const user = users.find(u => u.uid === uid);
    if (!user) return;

    const currentData: EditableUserData = {
      role: user.role || 'Member',
      position: user.position || undefined,
      department: user.department || undefined,
    };

    const editedData = editedUsers[uid] || currentData;
    const newValue = field === 'department' && value === 'none' ? undefined : value;

    // 원본 데이터와 같은지 확인
    const updatedData = {
      ...editedData,
      [field]: newValue,
    };

    const isSameAsOriginal =
      updatedData.role === currentData.role &&
      updatedData.position === currentData.position &&
      updatedData.department === currentData.department;

    if (isSameAsOriginal) {
      // 원본과 같으면 편집 목록에서 제거
      setEditedUsers(prev => {
        const { [uid]: removed, ...rest } = prev;
        return rest;
      });
    } else {
      // 변경사항 있으면 편집 목록에 추가/업데이트
      setEditedUsers(prev => ({
        ...prev,
        [uid]: updatedData,
      }));
    }
  }, [users, editedUsers]);

  // 전체 저장
  const handleSaveAll = useCallback(async () => {
    if (!hasChanges) {
      toast.info('변경사항이 없습니다.');
      return;
    }

    try {
      setIsSaving(true);
      const updatePromises = Object.entries(editedUsers).map(async ([uid, data]) => {
        await updateUserManagementInfo(uid, {
          role: data.role,
          position: data.position || undefined,
          department: data.department || undefined,
        });
      });

      await Promise.all(updatePromises);

      toast.success(`${Object.keys(editedUsers).length}명의 유저 정보가 수정되었습니다.`);
      setEditedUsers({});
      setIsEditMode(false);
      await loadUsers();
    } catch (error) {
      console.error('유저 정보 일괄 수정 실패:', error);
      toast.error('유저 정보 수정에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  }, [hasChanges, editedUsers, loadUsers]);

  // 삭제 클릭
  const handleDeleteClick = useCallback((user: UserManagementInfo) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  }, []);

  // 삭제 확인
  const handleConfirmDelete = useCallback(async (currentUserId?: string) => {
    if (!selectedUser?.uid) {
      toast.error('유저 정보가 없습니다.');
      return;
    }

    // 자기 자신은 삭제할 수 없음
    if (selectedUser.uid === currentUserId) {
      toast.error('자기 자신은 삭제할 수 없습니다.');
      setDeleteDialogOpen(false);
      return;
    }

    try {
      setIsDeleting(true);
      await deleteUserAccount(selectedUser.uid);
      toast.success('유저가 삭제되었습니다.');
      setDeleteDialogOpen(false);
      await loadUsers();
    } catch (error) {
      console.error('유저 삭제 실패:', error);
      toast.error('유저 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  }, [selectedUser, loadUsers]);

  // 유저 데이터 가져오기 (편집된 데이터 포함)
  const getUserData = useCallback((user: UserManagementInfo): EditableUserData => {
    if (editedUsers[user.uid || '']) {
      return editedUsers[user.uid || ''];
    }
    return {
      role: user.role || 'Member',
      position: user.position || undefined,
      department: user.department || undefined,
    };
  }, [editedUsers]);

  return {
    // 상태
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
    
    // 액션
    setSearchQuery,
    setDeleteDialogOpen,
    handleEditModeToggle,
    handleUserFieldChange,
    handleSaveAll,
    handleDeleteClick,
    handleConfirmDelete,
    getUserData,
    loadUsers,
  };
};

