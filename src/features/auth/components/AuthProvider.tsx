'use client';

import React, { useEffect } from 'react';
import { useAuthStore } from '../store';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { initializeAuth, user, isLoading } = useAuthStore();

  useEffect(() => {
    // 스크립트에서 이미 초기 상태가 설정되었다면 즉시 Firebase 인증 확인
    if (window.__AUTH_INITIAL_STATE__) {
    }
    
    // Auth 상태 초기화
    const unsubscribe = initializeAuth();
    
    return unsubscribe;
  }, [initializeAuth]);

  return <>{children}</>;
};
