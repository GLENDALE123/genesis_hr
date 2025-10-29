'use client';

/**
 * 지그 마스터 관리 훅
 */

import { useJigMasterStore } from '../store/jigMasterStore';
import { JigMasterItem, CreateJigMasterItemData, UpdateJigMasterItemData } from '../types';
import { useAuthStore } from '@/features/auth/store/authStore';

export const useJigMaster = () => {
  const { user, userProfile } = useAuthStore();
  const {
    masterItems,
    isLoading,
    isFetching,
    error,
    selectedItem,
    autocompleteData,
    fetchMasterItems,
    subscribeToMasters,
    subscribeToMastersByDateRange,
    getJigsByDateRange,
    createMasterItem,
    updateMasterItem,
    deleteMasterItem,
    setSelectedItem,
    fetchAutocompleteData,
  } = useJigMasterStore();

  // 초기 구독은 제거하고, 컨테이너에서 날짜 필터 기반으로 구독하도록 변경
  // useEffect(() => {
  //   const unsubscribe = subscribeToMasters();
  //   
  //   return () => {
  //     unsubscribe();
  //   };
  // }, [subscribeToMasters]);

  const handleCreateMasterItem = async (data: CreateJigMasterItemData, imageFiles: File[]) => {
    if (!user) throw new Error('User not authenticated');
    
    const displayName = userProfile?.displayName || user.displayName || 'Unknown User';
    
    await createMasterItem(data, imageFiles, {
      uid: user.uid,
      displayName,
    });
  };

  return {
    masterItems,
    isLoading,
    isFetching,
    error,
    selectedItem,
    autocompleteData,
    setSelectedItem,
    createMasterItem: handleCreateMasterItem,
    updateMasterItem,
    deleteMasterItem,
    getJigsByDateRange,
    subscribeToMastersByDateRange,
    subscribeToMasters,
  };
};