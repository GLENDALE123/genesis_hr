/**
 * 채널 알림 설정 서비스
 * 사용자별 채널 알림 설정 저장/로드
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';

const NOTIFICATION_SETTINGS_COLLECTION = 'channelNotificationSettings';

export type NotificationLevel = 'all' | 'mentions' | 'nothing';
export type MuteUntil = string | null; // ISO string or null

export interface ChannelNotificationSettings {
  userId: string;
  channelId: string;
  workspaceId: string;
  level: NotificationLevel;
  muteUntil: MuteUntil;
  keywords: string[]; // 키워드 알림
  updatedAt: string; // ISO string
}

export class NotificationSettingsService {
  /**
   * 채널 알림 설정 저장
   */
  static async saveSettings(
    userId: string,
    channelId: string,
    workspaceId: string,
    settings: {
      level?: NotificationLevel;
      muteUntil?: MuteUntil;
      keywords?: string[];
    }
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const settingsId = `${userId}_${channelId}`;
    const settingsRef = doc(db, NOTIFICATION_SETTINGS_COLLECTION, settingsId);

    const existingDoc = await getDoc(settingsRef);
    const existingData = existingDoc.exists() ? existingDoc.data() : null;

    const updatedSettings: ChannelNotificationSettings = {
      userId,
      channelId,
      workspaceId,
      level: settings.level ?? existingData?.level ?? 'all',
      muteUntil: settings.muteUntil ?? existingData?.muteUntil ?? null,
      keywords: settings.keywords ?? existingData?.keywords ?? [],
      updatedAt: new Date().toISOString(),
    };

    if (existingDoc.exists()) {
      await updateDoc(settingsRef, updatedSettings as any);
    } else {
      await setDoc(settingsRef, updatedSettings);
    }
  }

  /**
   * 채널 알림 설정 로드
   */
  static async getSettings(
    userId: string,
    channelId: string
  ): Promise<ChannelNotificationSettings | null> {
    if (!db) throw new Error('Firestore is not initialized');

    const settingsId = `${userId}_${channelId}`;
    const settingsRef = doc(db, NOTIFICATION_SETTINGS_COLLECTION, settingsId);
    const settingsDoc = await getDoc(settingsRef);

    if (!settingsDoc.exists()) {
      return null;
    }

    return settingsDoc.data() as ChannelNotificationSettings;
  }

  /**
   * 기본 알림 설정 반환
   */
  static getDefaultSettings(): Omit<ChannelNotificationSettings, 'userId' | 'channelId' | 'workspaceId' | 'updatedAt'> {
    return {
      level: 'all',
      muteUntil: null,
      keywords: [],
    };
  }
}

