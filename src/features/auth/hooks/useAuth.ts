'use client';

import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { onAuthStateChange, getCurrentUserProfile } from '@/shared/services/firebase/auth';
import { UserProfile } from '@/features/auth/types';

interface UseAuthReturn {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      setUser(user);
      
      if (user) {
        // 사용자가 로그인된 경우 프로필 정보 가져오기
        try {
          const profile = await getCurrentUserProfile();
          setUserProfile(profile);
        } catch (error) {
          console.error('사용자 프로필 로드 실패:', error);
          setUserProfile(null);
        }
      } else {
        // 사용자가 로그아웃된 경우 프로필 정보 초기화
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    userProfile,
    loading,
  };
};
