import type { ChatMessage } from '../types/chat.types';

const STORAGE_KEY = 'hs-chat-room-cache-v1';
const MESSAGE_LIMIT = 200;

interface CachedRoomEntry {
  messages: ChatMessage[];
  cachedAt: number;
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
      return parsed;
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
  cache[roomId] = {
    messages: messagesToStore,
    cachedAt: Date.now(),
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

