/**
 * 사용자 온라인/오프라인 상태 관리 서비스
 */

import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import { CHAT_COLLECTIONS } from '../constants';

export type UserStatus = 'online' | 'away' | 'offline';

export interface UserStatusData {
  status: UserStatus;
  lastSeen: string; // ISO string
  lastActivity?: string; // 마지막 활동 시간 (ISO string)
}

/**
 * 사용자 상태 서비스
 */
export class UserStatusService {
  /**
   * 사용자 온라인 상태 설정
   */
  static async setOnline(userId: string, lastActivity?: string): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const statusRef = doc(db, CHAT_COLLECTIONS.USER_STATUS, userId);
    const now = new Date().toISOString();
    await setDoc(
      statusRef,
      {
        status: 'online',
        lastSeen: now,
        lastActivity: lastActivity || now,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  /**
   * 사용자 자리비움 상태 설정
   */
  static async setAway(userId: string): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const statusRef = doc(db, CHAT_COLLECTIONS.USER_STATUS, userId);
    await setDoc(
      statusRef,
      {
        status: 'away',
        lastSeen: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  /**
   * 사용자 오프라인 상태 설정
   */
  static async setOffline(userId: string): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const statusRef = doc(db, CHAT_COLLECTIONS.USER_STATUS, userId);
    await setDoc(
      statusRef,
      {
        status: 'offline',
        lastSeen: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  /**
   * 사용자 상태 구독
   */
  static subscribeToUserStatus(
    userId: string,
    callback: (status: UserStatusData | null) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!db) throw new Error('Firestore is not initialized');

    const statusRef = doc(db, CHAT_COLLECTIONS.USER_STATUS, userId);

    return onSnapshot(
      statusRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          callback({
            status: data.status || 'offline',
            lastSeen: data.lastSeen || new Date().toISOString(),
            lastActivity: data.lastActivity || data.lastSeen || new Date().toISOString(),
          });
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('Error fetching user status:', error);
        if (onError) {
          onError(error as Error);
        }
      }
    );
  }

  /**
   * 여러 사용자의 상태 구독
   */
  static subscribeToMultipleUserStatus(
    userIds: string[],
    callback: (statuses: Record<string, UserStatusData>) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!db) throw new Error('Firestore is not initialized');
    if (userIds.length === 0) {
      callback({});
      return () => {};
    }

    const unsubscribes: Array<() => void> = [];
    const statuses: Record<string, UserStatusData> = {};

    userIds.forEach((userId) => {
      const unsubscribe = this.subscribeToUserStatus(
        userId,
        (status) => {
          if (status) {
            statuses[userId] = status;
          } else {
            delete statuses[userId];
          }
          callback({ ...statuses });
        },
        onError
      );
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }
}

