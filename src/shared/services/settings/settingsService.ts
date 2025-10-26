/**
 * 설정 관리 서비스
 * Firestore를 통한 설정 저장/로드/구독
 */

import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import type {
  UserSettings,
  NotificationSettings,
  ProfileSettings,
  AppearanceSettings,
  NotificationChannelType,
  NotificationChannelSettings,
  DEFAULT_SETTINGS,
} from '@/shared/types/settings';
import { DEFAULT_SETTINGS as DEFAULTS } from '@/shared/types/settings';
import { detectPlatform } from '@/shared/utils/platform';

class SettingsService {
  /**
   * 사용자 설정 로드
   * @param userId - 사용자 ID
   * @returns 사용자 설정 (없으면 기본값)
   */
  async getSettings(userId: string): Promise<UserSettings> {
    try {
      if (!db) {
        console.error('❌ Firestore가 초기화되지 않았습니다.');
        return DEFAULTS;
      }

      const settingsRef = doc(db, `users/${userId}/settings/preferences`);
      const settingsSnap = await getDoc(settingsRef);

      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        // 기존 설정과 기본값 병합 (새로운 채널 자동 활성화)
        return this.mergeWithDefaults(data as Partial<UserSettings>);
      }

      // 설정이 없으면 기본값 생성
      await this.initializeSettings(userId);
      return DEFAULTS;
    } catch (error) {
      console.error('❌ 설정 로드 실패:', error);
      return DEFAULTS;
    }
  }

  /**
   * 사용자 설정 저장
   * @param userId - 사용자 ID
   * @param settings - 저장할 설정 (부분 업데이트 가능)
   */
  async updateSettings(
    userId: string,
    settings: Partial<UserSettings>
  ): Promise<void> {
    try {
      if (!db) {
        throw new Error('Firestore가 초기화되지 않았습니다.');
      }

      const settingsRef = doc(db, `users/${userId}/settings/preferences`);
      await updateDoc(settingsRef, settings as Record<string, unknown>);
    } catch (error) {
      console.error('❌ 설정 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 알림 설정 업데이트
   * @param userId - 사용자 ID
   * @param notificationSettings - 알림 설정
   */
  async updateNotificationSettings(
    userId: string,
    notificationSettings: Partial<NotificationSettings>
  ): Promise<void> {
    try {
      await this.updateSettings(userId, {
        notifications: notificationSettings as NotificationSettings,
      });
    } catch (error) {
      console.error('❌ 알림 설정 업데이트 실패:', error);
      throw error;
    }
  }

  /**
   * 프로필 설정 업데이트
   * @param userId - 사용자 ID
   * @param profileSettings - 프로필 설정
   */
  async updateProfileSettings(
    userId: string,
    profileSettings: Partial<ProfileSettings>
  ): Promise<void> {
    try {
      const currentSettings = await this.getSettings(userId);
      await this.updateSettings(userId, {
        profile: {
          ...currentSettings.profile,
          ...profileSettings,
        },
      });
    } catch (error) {
      console.error('❌ 프로필 설정 업데이트 실패:', error);
      throw error;
    }
  }

  /**
   * 화면 설정 업데이트
   * @param userId - 사용자 ID
   * @param appearanceSettings - 화면 설정
   */
  async updateAppearanceSettings(
    userId: string,
    appearanceSettings: Partial<AppearanceSettings>
  ): Promise<void> {
    try {
      const currentSettings = await this.getSettings(userId);
      await this.updateSettings(userId, {
        appearance: {
          ...currentSettings.appearance,
          ...appearanceSettings,
        },
      });
    } catch (error) {
      console.error('❌ 화면 설정 업데이트 실패:', error);
      throw error;
    }
  }

  /**
   * 특정 알림 채널 ON/OFF
   * @param userId - 사용자 ID
   * @param channel - 채널 타입
   * @param enabled - 활성화 여부
   */
  async updateNotificationChannel(
    userId: string,
    channel: NotificationChannelType,
    enabled: boolean
  ): Promise<void> {
    try {
      const settings = await this.getSettings(userId);
      const updatedChannels = {
        ...settings.notifications.channels,
        [channel]: enabled,
      };

      await this.updateSettings(userId, {
        notifications: {
          ...settings.notifications,
          channels: updatedChannels,
        },
      });
    } catch (error) {
      console.error('❌ 알림 채널 설정 업데이트 실패:', error);
      throw error;
    }
  }

  /**
   * 실시간 설정 구독
   * @param userId - 사용자 ID
   * @param callback - 설정 변경 시 호출될 콜백
   * @returns 구독 해제 함수
   */
  subscribeToSettings(
    userId: string,
    callback: (settings: UserSettings) => void
  ): () => void {
    if (!db) {
      console.error('❌ Firestore가 초기화되지 않았습니다.');
      return () => {};
    }

    const settingsRef = doc(db, `users/${userId}/settings/preferences`);
    
    const unsubscribe = onSnapshot(
      settingsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<UserSettings>;
          const settings = this.mergeWithDefaults(data);
          callback(settings);
        } else {
          callback(DEFAULTS);
        }
      },
      (error) => {
        console.error('❌ 설정 구독 오류:', error);
        callback(DEFAULTS);
      }
    );

    return unsubscribe;
  }

  /**
   * 초기 설정 생성
   * @param userId - 사용자 ID
   * @param initialData - 초기 데이터 (선택)
   */
  async initializeSettings(
    userId: string,
    initialData?: Partial<UserSettings>
  ): Promise<void> {
    try {
      if (!db) {
        throw new Error('Firestore가 초기화되지 않았습니다.');
      }

      const settingsRef = doc(db, `users/${userId}/settings/preferences`);
      const settings: UserSettings = {
        ...DEFAULTS,
        ...initialData,
      };

      await setDoc(settingsRef, settings);
    } catch (error) {
      console.error('❌ 초기 설정 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 알림이 허용되는지 확인
   * @param settings - 사용자 설정
   * @param notificationType - 알림 타입
   * @param timestamp - 알림 시간 (선택)
   * @returns 알림 표시 여부
   */
  isNotificationAllowed(
    settings: UserSettings,
    notificationType: string,
    timestamp?: Date
  ): boolean {
    // 1. 전체 알림 OFF면 차단
    if (!settings.notifications.enabled) {
      return false;
    }

    // 2. 채널별 설정 확인
    const channel = notificationType as NotificationChannelType;
    if (settings.notifications.channels[channel] === false) {
      return false;
    }

    // 3. 시간대 제한 확인
    if (settings.notifications.schedule.enabled) {
      const now = timestamp || new Date();
      const day = now.getDay(); // 0: 일요일, 6: 토요일
      const isWeekend = day === 0 || day === 6;
      
      // 평일/주말 구분
      const scheduleConfig = isWeekend 
        ? settings.notifications.schedule.weekends
        : settings.notifications.schedule.weekdays;
      
      // 해당 요일 알림 비활성화 체크
      if (!scheduleConfig.enabled) {
        return false; // 평일/주말 알림 OFF
      }
      
      // 시간 확인
      const hour = now.getHours();
      const minute = now.getMinutes();
      const currentTime = hour * 60 + minute;

      const [startHour, startMin] = scheduleConfig.startTime.split(':').map(Number);
      const [endHour, endMin] = scheduleConfig.endTime.split(':').map(Number);
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;

      if (currentTime < startTime || currentTime > endTime) {
        return false; // 시간 외
      }
    }

    return true;
  }

  /**
   * 기존 설정과 기본값 병합
   * (새로운 채널이 추가되면 자동으로 활성화)
   * @param settings - 부분 설정
   * @returns 완전한 설정
   */
  private mergeWithDefaults(settings: Partial<UserSettings>): UserSettings {
    const merged: UserSettings = {
      notifications: {
        ...DEFAULTS.notifications,
        ...settings.notifications,
        channels: {
          ...DEFAULTS.notifications.channels,
          ...settings.notifications?.channels,
        },
        schedule: {
          ...DEFAULTS.notifications.schedule,
          ...settings.notifications?.schedule,
        },
      },
      profile: {
        ...DEFAULTS.profile,
        ...settings.profile,
      },
      appearance: {
        ...DEFAULTS.appearance,
        ...settings.appearance,
      },
    };

    return merged;
  }
}

// 싱글톤 인스턴스
export const settingsService = new SettingsService();
export default settingsService;


