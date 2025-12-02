import type { ChatMessage } from '../types/chat.types';

const STORAGE_KEY = 'hs-chat-room-cache-v1';
const MESSAGE_LIMIT = 200;
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7일
const MAX_ROOMS = 50; // 최대 캐시할 방 개수

interface CachedRoomEntry {
  messages: ChatMessage[];
  cachedAt: number;
  expiry: number;
}

type CacheMap = Record<string, CachedRoomEntry>;

const isBrowser = typeof window !== 'undefined';

const readCache = (): CacheMap => {
  if (!isBrowser) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CacheMap;
    if (parsed && typeof parsed === 'object') {
      // 만료된 항목 정리
      const now = Date.now();
      const cleaned: CacheMap = {};
      let hasExpired = false;

      for (const [roomId, entry] of Object.entries(parsed)) {
        if (entry && entry.expiry && now < entry.expiry) {
          cleaned[roomId] = entry;
        } else if (entry && !entry.expiry) {
          // 만료 시간이 없는 오래된 항목은 유지 (하위 호환성)
          cleaned[roomId] = entry;
        } else {
          hasExpired = true;
        }
      }

      // 만료된 항목이 있으면 저장소 업데이트
      if (hasExpired) {
        writeCache(cleaned);
      }

      return cleaned;
    }
    return {};
  } catch (error) {
    console.warn('[chat-cache] Failed to read cache', error);
    return {};
  }
};

const writeCache = (cache: CacheMap) => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('[chat-cache] Failed to write cache', error);
  }
};

export const getCachedMessages = (roomId: string): ChatMessage[] | null => {
  if (!roomId || roomId === 'new') return null;
  const cache = readCache();
  const entry = cache[roomId];
  if (!entry || !Array.isArray(entry.messages) || entry.messages.length === 0) {
    return null;
  }
  return entry.messages;
};

export const setCachedMessages = (roomId: string, messages: ChatMessage[]) => {
  if (!roomId || roomId === 'new') return;
  if (!Array.isArray(messages) || messages.length === 0) return;

  const messagesToStore =
    messages.length > MESSAGE_LIMIT
      ? messages.slice(messages.length - MESSAGE_LIMIT)
      : messages;

  const cache = readCache();
  const now = Date.now();

  // 최대 방 개수 초과 시 가장 오래된 방 제거
  const roomKeys = Object.keys(cache);
  if (roomKeys.length >= MAX_ROOMS && !cache[roomId]) {
    // 가장 오래된 항목 찾기
    const oldestRoom = roomKeys.reduce((oldest, key) => {
      const oldestEntry = cache[oldest];
      const currentEntry = cache[key];
      if (!oldestEntry) return key;
      if (!currentEntry) return oldest;
      return (oldestEntry.cachedAt || 0) < (currentEntry.cachedAt || 0) ? oldest : key;
    });
    delete cache[oldestRoom];
  }

  cache[roomId] = {
    messages: messagesToStore,
    cachedAt: now,
    expiry: now + CACHE_EXPIRY,
  };
  writeCache(cache);
};

export const clearCachedMessages = (roomId: string) => {
  if (!roomId || roomId === 'new') return;
  const cache = readCache();
  if (cache[roomId]) {
    delete cache[roomId];
    writeCache(cache);
  }
};

/**
 * 모든 만료된 캐시 정리
 */
export const cleanupExpiredCache = (): number => {
  if (!isBrowser) return 0;
  const cache = readCache(); // readCache에서 이미 정리됨
  writeCache(cache);
  return 0; // readCache에서 정리하므로 여기서는 0 반환
};

/**
 * 모든 캐시 정리
 */
export const clearAllCache = () => {
  if (!isBrowser) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('[chat-cache] Failed to clear all cache', error);
  }
};

