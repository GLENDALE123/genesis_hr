/**
 * 채널 검색 서비스
 * 메시지, 파일, 사용자 검색
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import type { ChannelMessage } from '../types/channelMessage.types';

/**
 * 채널 메시지 서브컬렉션 경로 가져오기
 */
const getMessagesCollectionPath = (workspaceId: string, channelId: string) => {
  return `workspaces/${workspaceId}/channels/${channelId}/messages`;
};

export interface SearchOptions {
  channelId?: string;
  workspaceId?: string;
  authorId?: string;
  fromDate?: string; // ISO string
  toDate?: string; // ISO string
  hasFiles?: boolean;
  hasMentions?: boolean;
  limit?: number;
}

export interface SearchResult {
  message: ChannelMessage;
  channelId: string;
  relevance?: number;
}

export class ChannelSearchService {
  /**
   * 채널 메시지 검색
   */
  static async searchMessages(
    searchQuery: string,
    workspaceId: string,
    channelId: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    if (!db) throw new Error('Firestore is not initialized');
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      return [];
    }

    const queryText = searchQuery.toLowerCase().trim();
    const searchLimit = options.limit || 50;

    let q = query(
      collection(db, getMessagesCollectionPath(workspaceId, channelId)),
      orderBy('timestamp', 'desc'),
      limit(searchLimit)
    );

    if (options.authorId) {
      q = query(q, where('sender.uid', '==', options.authorId));
    }
    if (options.fromDate) {
      q = query(q, where('timestamp', '>=', options.fromDate));
    }
    if (options.toDate) {
      q = query(q, where('timestamp', '<=', options.toDate));
    }
    if (options.hasFiles) {
      q = query(q, where('attachments', '!=', []));
    }
    if (options.hasMentions) {
      q = query(q, where('mentionedUserIds', '!=', []));
    }

    const querySnapshot = await getDocs(q);
    const results: SearchResult[] = [];

    querySnapshot.forEach((doc) => {
      const message = {
        id: doc.id,
        channelId,
        workspaceId,
        ...doc.data(),
      } as ChannelMessage;

      // 텍스트 검색 (클라이언트 사이드 필터링)
      if (message.text && message.text.toLowerCase().includes(queryText)) {
        results.push({ message, channelId });
      }
    });

    return results;
  }

  /**
   * 특정 사용자가 멘션된 메시지 검색
   */
  static async searchMentionedMessages(
    userId: string,
    workspaceId: string,
    channelId: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    if (!db) throw new Error('Firestore is not initialized');

    const searchLimit = options.limit || 50;

    let q = query(
      collection(db, getMessagesCollectionPath(workspaceId, channelId)),
      where('mentionedUserIds', 'array-contains', userId),
      orderBy('timestamp', 'desc'),
      limit(searchLimit)
    );

    if (options.fromDate) {
      q = query(q, where('timestamp', '>=', options.fromDate));
    }
    if (options.toDate) {
      q = query(q, where('timestamp', '<=', options.toDate));
    }

    const querySnapshot = await getDocs(q);
    const results: SearchResult[] = [];

    querySnapshot.forEach((doc) => {
      const message = {
        id: doc.id,
        channelId,
        workspaceId,
        ...doc.data(),
      } as ChannelMessage;

      if (message.mentionedUserIds && message.mentionedUserIds.includes(userId)) {
        results.push({ message, channelId });
      }
    });

    return results;
  }

  /**
   * 파일이 첨부된 메시지 검색
   */
  static async searchMessagesWithFiles(
    workspaceId: string,
    channelId: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    if (!db) throw new Error('Firestore is not initialized');

    const searchLimit = options.limit || 50;

    let q = query(
      collection(db, getMessagesCollectionPath(workspaceId, channelId)),
      where('attachments', '!=', []),
      orderBy('timestamp', 'desc'),
      limit(searchLimit)
    );

    if (options.fromDate) {
      q = query(q, where('timestamp', '>=', options.fromDate));
    }
    if (options.toDate) {
      q = query(q, where('timestamp', '<=', options.toDate));
    }

    const querySnapshot = await getDocs(q);
    const results: SearchResult[] = [];

    querySnapshot.forEach((doc) => {
      const message = {
        id: doc.id,
        channelId,
        workspaceId,
        ...doc.data(),
      } as ChannelMessage;

      if (message.attachments && message.attachments.length > 0) {
        results.push({ message, channelId });
      }
    });

    return results;
  }
}
