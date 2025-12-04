/**
 * 메시지 로딩 처리 훅
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseMessageLoadingOptions<T> {
  fetchInitialMessages: (limit: number) => Promise<T[]>;
  subscribeToMessages: (
    callback: (messages: T[]) => void,
    onError?: (error: Error) => void,
    limit?: number
  ) => () => void;
  limit?: number;
  onMessagesChange?: (messages: T[]) => void;
}

export const useMessageLoading = <T extends { id: string; timestamp: string }>({
  fetchInitialMessages,
  subscribeToMessages,
  limit = 50,
  onMessagesChange,
}: UseMessageLoadingOptions<T>) => {
  const [messages, setMessages] = useState<T[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let unsubscribeFn: (() => void) | undefined;

    setIsInitialLoading(true);

    const fetchAndSubscribe = async () => {
      try {
        const initialMessages = await fetchInitialMessages(limit);
        
        if (!isMountedRef.current) return;

        setMessages(initialMessages);
        onMessagesChange?.(initialMessages);
        
        if (!isMountedRef.current) return;

        const unsub = subscribeToMessages(
          (newMessages) => {
            if (!isMountedRef.current) return;
            setMessages(newMessages);
            onMessagesChange?.(newMessages);
          },
          (error) => {
            console.error('Failed to subscribe to messages:', error);
          },
          limit
        );

        if (!isMountedRef.current) {
          unsub();
          return;
        }

        unsubscribeFn = unsub;
        setIsInitialLoading(false);
      } catch (error) {
        if (isMountedRef.current && process.env.NODE_ENV === 'development') {
          console.error('Failed to fetch initial messages:', error);
        }
      }
    };

    fetchAndSubscribe();

    return () => {
      if (unsubscribeFn) {
        unsubscribeFn();
      }
    };
  }, [fetchInitialMessages, subscribeToMessages, limit, onMessagesChange]);

  return {
    messages,
    isInitialLoading,
    setMessages,
  };
};


