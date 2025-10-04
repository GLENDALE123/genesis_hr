'use client';

import React, { useEffect } from 'react';
import { useAuthStore } from '../store';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { initializeAuth } = useAuthStore();

  useEffect(() => {
    // Auth 상태 초기화
    const unsubscribe = initializeAuth();
    
    return unsubscribe;
  }, [initializeAuth]);

  return <>{children}</>;
};
