/**
 * 북마크 서비스
 * 채널 북마크/즐겨찾기 관리
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import type { Channel } from '@/features/workspace/channels';

const BOOKMARKS_COLLECTION = 'channelBookmarks';

export interface ChannelBookmark {
  id: string;
  userId: string;
  channelId: string;
  workspaceId: string;
  createdAt: string; // ISO string
}

export class BookmarkService {
  /**
   * 채널 북마크 추가
   */
  static async addBookmark(
    channelId: string,
    workspaceId: string,
    userId: string
  ): Promise<string> {
    if (!db) throw new Error('Firestore is not initialized');

    // 이미 북마크되어 있는지 확인
    const existing = await this.getBookmark(channelId, userId);
    if (existing) {
      return existing.id;
    }

    const bookmarkData: Omit<ChannelBookmark, 'id'> = {
      userId,
      channelId,
      workspaceId,
      createdAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, BOOKMARKS_COLLECTION), bookmarkData);
    return docRef.id;
  }

  /**
   * 채널 북마크 제거
   */
  static async removeBookmark(channelId: string, userId: string): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const bookmark = await this.getBookmark(channelId, userId);
    if (!bookmark) {
      throw new Error('Bookmark not found');
    }

    const docRef = doc(db, BOOKMARKS_COLLECTION, bookmark.id);
    await deleteDoc(docRef);
  }

  /**
   * 북마크 조회
   */
  static async getBookmark(
    channelId: string,
    userId: string
  ): Promise<ChannelBookmark | null> {
    if (!db) throw new Error('Firestore is not initialized');

    const q = query(
      collection(db, BOOKMARKS_COLLECTION),
      where('channelId', '==', channelId),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as ChannelBookmark;
  }

  /**
   * 사용자의 북마크된 채널 목록 조회
   */
  static async getUserBookmarks(userId: string): Promise<ChannelBookmark[]> {
    if (!db) throw new Error('Firestore is not initialized');

    const q = query(
      collection(db, BOOKMARKS_COLLECTION),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ChannelBookmark[];
  }

  /**
   * 북마크된 채널 목록 실시간 구독
   */
  static subscribeToUserBookmarks(
    userId: string,
    callback: (bookmarks: ChannelBookmark[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!db) {
      const error = new Error('Firestore is not initialized');
      onError?.(error);
      return () => {};
    }

    const q = query(
      collection(db, BOOKMARKS_COLLECTION),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const bookmarks: ChannelBookmark[] = [];
        querySnapshot.forEach((doc) => {
          bookmarks.push({
            id: doc.id,
            ...doc.data(),
          } as ChannelBookmark);
        });
        callback(bookmarks);
      },
      (error) => {
        onError?.(error);
      }
    );

    return unsubscribe;
  }
}

