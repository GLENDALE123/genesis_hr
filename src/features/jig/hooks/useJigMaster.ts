'use client';

/**
 * 지그 마스터 관리 훅
 */

import { useEffect } from 'react';
import { useJigMasterStore } from '../store/jigMasterStore';
import { JigMasterItem, CreateJigMasterItemData, UpdateJigMasterItemData } from '../types';
import { useAuthStore } from '@/features/auth/store/authStore';

export const useJigMaster = () => {
  const { user } = useAuthStore();
  const {
    masterItems,
    isLoading,
    error,
    selectedItem,
    autocompleteData,
    fetchMasterItems,
    subscribeToMasters,
    createMasterItem,
    updateMasterItem,
    deleteMasterItem,
    setSelectedItem,
    fetchAutocompleteData,
  } = useJigMasterStore();

  useEffect(() => {
    const unsubscribe = subscribeToMasters();
    fetchAutocompleteData();
    
    return () => {
      unsubscribe();
    };
  }, [subscribeToMasters, fetchAutocompleteData]);

  const handleCreateMasterItem = async (data: CreateJigMasterItemData, imageFiles: File[]) => {
    if (!user) throw new Error('User not authenticated');
    await createMasterItem(data, imageFiles, user.uid);
  };

  const handleUpdateMasterItem = async (id: string, updates: UpdateJigMasterItemData) => {
    await updateMasterItem(id, updates);
  };

  const handleDeleteMasterItem = async (id: string) => {
    await deleteMasterItem(id);
  };

  return {
    masterItems,
    isLoading,
    error,
    selectedItem,
    autocompleteData,
    setSelectedItem,
    createMasterItem: handleCreateMasterItem,
    updateMasterItem: handleUpdateMasterItem,
    deleteMasterItem: handleDeleteMasterItem,
  };
};