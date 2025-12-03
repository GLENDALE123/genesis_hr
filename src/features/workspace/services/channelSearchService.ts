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
import type { ChatMessage } from '@/features/chat/types/chat.types';

const CHANNEL_MESSAGES_COLLECTION = 'channelMessages';

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
  message: ChatMessage;
  channelId: string;
  relevance?: number;
}

export class ChannelSearchService {
  /**
   * 채널 메시지 검색
   */
  static async searchMessages(
    searchQuery: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    if (!db) throw new Error('Firestore is not initialized');
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      return [];
    }

    const queryText = searchQuery.toLowerCase().trim();
    const searchLimit = options.limit || 50;

    let q = query(collection(db, CHANNEL_MESSAGES_COLLECTION));

    // 채널 필터
    if (options.channelId) {
      q = query(q, where('chatRoomId', '==', options.channelId));
    }

    // 작성자 필터
    if (options.authorId) {
      q = query(q, where('sender.uid', '==', options.authorId));
    }

    // 날짜 필터
    if (options.fromDate) {
      q = query(q, where('timestamp', '>=', options.fromDate));
    }
    if (options.toDate) {
      q = query(q, where('timestamp', '<=', options.toDate));
    }

    // 파일 첨부 필터
    if (options.hasFiles) {
      // Firestore에서는 배열 필드가 존재하는지 확인
      // 실제 구현 시 더 정교한 필터링 필요
    }

    // 정렬 및 제한
    q = query(q, orderBy('timestamp', 'desc'), limit(searchLimit));

    const querySnapshot = await getDocs(q);
    const results: SearchResult[] = [];

    querySnapshot.forEach((doc) => {
      const message = {
        id: doc.id,
        ...doc.data(),
      } as ChatMessage;

      // 텍스트 검색 (클라이언트 사이드 필터링)
      if (message.text && message.text.toLowerCase().includes(queryText)) {
        // 관련도 계산 (간단한 구현)
        const relevance = this.calculateRelevance(message.text, queryText);
        results.push({
          message,
          channelId: message.chatRoomId || message.directMessageRoomId || '',
          relevance,
        });
      }
    });

    // 관련도 순으로 정렬
    return results.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
  }

  /**
   * 관련도 계산 (간단한 구현)
   */
  private static calculateRelevance(text: string, query: string): number {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();

    // 정확한 일치
    if (lowerText === lowerQuery) return 100;

    // 시작 부분 일치
    if (lowerText.startsWith(lowerQuery)) return 80;

    // 단어 시작 부분 일치
    const words = lowerText.split(/\s+/);
    const queryWords = lowerQuery.split(/\s+/);
    let wordMatches = 0;
    queryWords.forEach((qWord) => {
      if (words.some((word) => word.startsWith(qWord))) {
        wordMatches++;
      }
    });
    if (wordMatches > 0) {
      return 60 + wordMatches * 10;
    }

    // 포함 여부
    if (lowerText.includes(lowerQuery)) return 40;

    return 0;
  }

  /**
   * 멘션된 메시지 검색
   */
  static async searchMentionedMessages(
    userId: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    if (!db) throw new Error('Firestore is not initialized');

    let q = query(collection(db, CHANNEL_MESSAGES_COLLECTION));

    if (options.channelId) {
      q = query(q, where('chatRoomId', '==', options.channelId));
    }

    // 멘션 필터는 클라이언트 사이드에서 처리 (Firestore 배열 쿼리 제한)
    q = query(q, orderBy('timestamp', 'desc'), limit(options.limit || 100));

    const querySnapshot = await getDocs(q);
    const results: SearchResult[] = [];

    querySnapshot.forEach((doc) => {
      const message = {
        id: doc.id,
        ...doc.data(),
      } as ChatMessage;

      if (message.mentionedUserIds && message.mentionedUserIds.includes(userId)) {
        results.push({
          message,
          channelId: message.chatRoomId || message.directMessageRoomId || '',
        });
      }
    });

    return results;
  }

  /**
   * 파일이 첨부된 메시지 검색
   */
  static async searchMessagesWithFiles(
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    if (!db) throw new Error('Firestore is not initialized');

    let q = query(collection(db, CHANNEL_MESSAGES_COLLECTION));

    if (options.channelId) {
      q = query(q, where('chatRoomId', '==', options.channelId));
    }

    q = query(q, orderBy('timestamp', 'desc'), limit(options.limit || 100));

    const querySnapshot = await getDocs(q);
    const results: SearchResult[] = [];

    querySnapshot.forEach((doc) => {
      const message = {
        id: doc.id,
        ...doc.data(),
      } as ChatMessage;

      if (message.attachments && message.attachments.length > 0) {
        results.push({
          message,
          channelId: message.chatRoomId || message.directMessageRoomId || '',
        });
      }
    });

    return results;
  }
}

