/**
 * 설정 관리 훅
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { settingsService } from '@/shared/services/settings/settingsService';
import type {
  UserSettings,
  NotificationSettings,
  ProfileSettings,
  AppearanceSettings,
  NotificationChannelType,
} from '@/shared/types/settings';
import { DEFAULT_SETTINGS } from '@/shared/types/settings';

interface UseSettingsReturn {
  settings: UserSettings;
  isLoading: boolean;
  error: string | null;
  
  // 설정 업데이트 함수들
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  updateProfileSettings: (settings: Partial<ProfileSettings>) => Promise<void>;
  updateAppearanceSettings: (settings: Partial<AppearanceSettings>) => Promise<void>;
  updateNotificationChannel: (channel: NotificationChannelType, enabled: boolean) => Promise<void>;
  
  // 설정 새로고침
  refreshSettings: () => Promise<void>;
}

export const useSettings = (): UseSettingsReturn => {
  const { user } = useAuthStore();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // 설정 로드
  const loadSettings = useCallback(async () => {
    if (!user?.uid) {
      setSettings(DEFAULT_SETTINGS);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const loadedSettings = await settingsService.getSettings(user.uid);
      setSettings(loadedSettings);
    } catch (err) {
      console.error('❌ 설정 로드 실패:', err);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  // 초기 로드 및 실시간 구독
  useEffect(() => {
    if (!user?.uid) {
      setSettings(DEFAULT_SETTINGS);
      setIsLoading(false);
      return;
    }

    // 초기 로드
    loadSettings();

    // 실시간 구독
    const unsubscribe = settingsService.subscribeToSettings(
      user.uid,
      (updatedSettings) => {
        // 설정이 실제로 변경된 경우에만 업데이트 (불필요한 리렌더링 방지)
        setSettings(prevSettings => {
          // JSON 비교로 실제 변경 여부 확인
          const prevJson = JSON.stringify(prevSettings);
          const newJson = JSON.stringify(updatedSettings);
          if (prevJson === newJson) {
            return prevSettings; // 동일하면 이전 객체 반환
          }
          return updatedSettings;
        });
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user?.uid, loadSettings]);

  // 설정 업데이트 함수들
  const updateSettings = useCallback(
    async (newSettings: Partial<UserSettings>) => {
      if (!user?.uid) {
        throw new Error('로그인이 필요합니다.');
      }

      try {
        await settingsService.updateSettings(user.uid, newSettings);
      } catch (err) {
        console.error('❌ 설정 업데이트 실패:', err);
        throw err;
      }
    },
    [user?.uid]
  );

  const updateNotificationSettings = useCallback(
    async (notificationSettings: Partial<NotificationSettings>) => {
      if (!user?.uid) {
        throw new Error('로그인이 필요합니다.');
      }

      try {
        await settingsService.updateNotificationSettings(user.uid, notificationSettings);
      } catch (err) {
        console.error('❌ 알림 설정 업데이트 실패:', err);
        throw err;
      }
    },
    [user?.uid]
  );

  const updateProfileSettings = useCallback(
    async (profileSettings: Partial<ProfileSettings>) => {
      if (!user?.uid) {
        throw new Error('로그인이 필요합니다.');
      }

      try {
        await settingsService.updateProfileSettings(user.uid, profileSettings);
      } catch (err) {
        console.error('❌ 프로필 설정 업데이트 실패:', err);
        throw err;
      }
    },
    [user?.uid]
  );

  const updateAppearanceSettings = useCallback(
    async (appearanceSettings: Partial<AppearanceSettings>) => {
      if (!user?.uid) {
        throw new Error('로그인이 필요합니다.');
      }

      try {
        await settingsService.updateAppearanceSettings(user.uid, appearanceSettings);
      } catch (err) {
        console.error('❌ 화면 설정 업데이트 실패:', err);
        throw err;
      }
    },
    [user?.uid]
  );

  const updateNotificationChannel = useCallback(
    async (channel: NotificationChannelType, enabled: boolean) => {
      if (!user?.uid) {
        throw new Error('로그인이 필요합니다.');
      }

      try {
        await settingsService.updateNotificationChannel(user.uid, channel, enabled);
      } catch (err) {
        console.error('❌ 알림 채널 설정 업데이트 실패:', err);
        throw err;
      }
    },
    [user?.uid]
  );

  const refreshSettings = useCallback(async () => {
    await loadSettings();
  }, [loadSettings]);

  return {
    settings,
    isLoading,
    error: null,
    updateSettings,
    updateNotificationSettings,
    updateProfileSettings,
    updateAppearanceSettings,
    updateNotificationChannel,
    refreshSettings,
  };
};


