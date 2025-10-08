'use client';

import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { onAuthStateChange } from '@/shared/services/firebase/auth';
import { AuthService } from '@/features/auth/services';
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
          const profile = await AuthService.getCurrentUserProfile();
          
          // 프로필이 없으면 마이그레이션 시도
          if (!profile) {
            console.warn('⚠️ UserProfile이 없습니다. 마이그레이션을 시도합니다...');
            const { MigrationService } = await import('@/features/auth/services/migrationService');
            const newProfile = await MigrationService.createMissingProfile(user);
            
            if (newProfile) {
              console.log('✅ 프로필 마이그레이션 완료:', newProfile);
              setUserProfile(newProfile);
            } else {
              console.error('❌ 프로필 마이그레이션 실패');
              setUserProfile(null);
            }
          } else {
            setUserProfile(profile);
          }
        } catch (error) {
          // 권한 에러는 조용히 처리 (로그인 전 상태)
          const errorMessage = error instanceof Error ? error.message : '';
          if (!errorMessage.includes('permission') && !errorMessage.includes('insufficient')) {
            console.error('사용자 프로필 로드 실패:', error);
          }
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
