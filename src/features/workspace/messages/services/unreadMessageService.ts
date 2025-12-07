/**
 * 읽지 않은 메시지 서비스
 * 채널별 읽지 않은 메시지 수 관리
 */

import {
  collection,
  doc,
  getDoc,
  updateDoc,
  increment,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import { ChannelService } from '@/features/workspace/channels';

/**
 * 채널 서브컬렉션 경로 가져오기
 */
const getChannelsCollectionPath = (workspaceId: string) => {
  return `workspaces/${workspaceId}/channels`;
};

export class UnreadMessageService {
  /**
   * 채널의 읽지 않은 메시지 수 증가
   */
  static async incrementUnreadCount(
    channelId: string,
    workspaceId: string,
    userId: string
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const channelRef = doc(db, getChannelsCollectionPath(workspaceId), channelId);
    const unreadPath = `unreadCount.${userId}`;

    await updateDoc(channelRef, {
      [unreadPath]: increment(1),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * 채널의 읽지 않은 메시지 수 초기화 (읽음 처리)
   */
  static async markChannelAsRead(
    channelId: string,
    workspaceId: string,
    userId: string
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const channelRef = doc(db, getChannelsCollectionPath(workspaceId), channelId);
    const unreadPath = `unreadCount.${userId}`;

    await updateDoc(channelRef, {
      [unreadPath]: 0,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * 채널의 읽지 않은 메시지 수 조회
   */
  static async getUnreadCount(
    channelId: string,
    workspaceId: string,
    userId: string
  ): Promise<number> {
    const channel = await ChannelService.getChannel(channelId, workspaceId);
    if (!channel) return 0;
    return channel.unreadCount?.[userId] || 0;
  }

  /**
   * 사용자의 모든 채널 읽지 않은 메시지 수 조회
   */
  static async getUserUnreadCounts(
    workspaceId: string,
    userId: string
  ): Promise<Record<string, number>> {
    const channels = await ChannelService.getUserChannels(workspaceId, userId);
    const counts: Record<string, number> = {};

    channels.forEach((channel: { id: string; unreadCount?: Record<string, number> }) => {
      counts[channel.id] = channel.unreadCount?.[userId] || 0;
    });

    return counts;
  }

  /**
   * 채널의 읽지 않은 메시지 수 실시간 구독
   */
  static subscribeToChannelUnreadCount(
    channelId: string,
    workspaceId: string,
    userId: string,
    callback: (count: number) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!db) {
      const error = new Error('Firestore is not initialized');
      onError?.(error);
      return () => {};
    }

    const channelRef = doc(db, getChannelsCollectionPath(workspaceId), channelId);

    const unsubscribe = onSnapshot(
      channelRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const unreadCount = data.unreadCount?.[userId] || 0;
          callback(unreadCount);
        } else {
          callback(0);
        }
      },
      (error) => {
        onError?.(error);
      }
    );

    return unsubscribe;
  }
}

