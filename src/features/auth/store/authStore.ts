import { create } from 'zustand';
import { getUserDisplayName } from '@/shared/utils/userUtils';
import { devtools, persist } from 'zustand/middleware';
import { User } from 'firebase/auth';
import { onAuthStateChange } from '@/shared/services/firebase';
import { AuthService } from '@/features/auth/services';
import { UserProfile } from '@/features/auth/types';
import { usePermissionsStore } from './permissionsStore';
import { auth } from '@/shared/services/firebase/config';
import { UserStatusService } from '@/features/chat/services/userStatusService';

// 전역 윈도우 객체에 인증 초기 상태 타입 추가
declare global {
  interface Window {
    __AUTH_INITIAL_STATE__?: {
      user: User | null;
      isLoading: boolean;
      error: string | null;
    };
  }
}

interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (emailOrLoginId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setUserProfile: (userProfile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  initializeAuth: () => (() => void);
  refreshUserProfile: () => Promise<void>;
}

// 스크립트에서 설정한 초기 인증 상태 가져오기
const getInitialAuthState = () => {
  // localStorage에 사용자 정보가 있으면 즉시 로드 (스피너 없음)
  if (typeof window !== 'undefined') {
    // 스크립트에서 설정한 초기 상태 우선 사용
    if (window.__AUTH_INITIAL_STATE__) {
      return {
        user: window.__AUTH_INITIAL_STATE__.user,
        isLoading: window.__AUTH_INITIAL_STATE__.isLoading,
        error: window.__AUTH_INITIAL_STATE__.error
      };
    }
    
    // localStorage에서 직접 확인
    try {
      const authData = localStorage.getItem('auth-store');
      if (authData) {
        const parsed = JSON.parse(authData);
        if (parsed.state && parsed.state.user) {
          return {
            user: parsed.state.user,
            isLoading: false, // localStorage 데이터가 있으면 즉시 로드
            error: null
          };
        }
      }
    } catch (e) {
      // JSON 파싱 실패 무시
    }
  }
  
  return {
    user: null,
    isLoading: false,
    error: null
  };
};

export const useAuthStore = create<AuthState & AuthActions>()(
  devtools(
    persist(
      (set) => ({
        // State - 스크립트에서 설정한 초기 상태 사용
        ...getInitialAuthState(),
        userProfile: null,
        
        // Actions
        login: async () => {
          set({ isLoading: true, error: null });
          try {
            // Firebase 로그인 로직은 별도 서비스에서 처리
            // 여기서는 상태 관리만 담당
            // 실제 로그인 로직은 authService에서 처리
          } catch (error) {
            set({ error: error instanceof Error ? error.message : '로그인에 실패했습니다.' });
          } finally {
            set({ isLoading: false });
          }
        },
        
        logout: async () => {
          set({ isLoading: true });
          try {
            // 현재 사용자 정보 저장 (세션 삭제용)
            const { user: currentUser } = useAuthStore.getState();
            
            // ✅ Firestore 세션 삭제를 먼저 시도 (로그인 상태에서만 삭제 가능)
            if (currentUser) {
              try {
                const { clearSession } = await import('../services/sessionService');
                await clearSession(currentUser.uid);
              } catch (sessionError) {
                console.error('⚠️ [AuthStore] 세션 삭제 실패:', sessionError);
                // 세션 삭제 실패해도 로그아웃은 진행
              }
              
              // ✅ 사용자 상태를 오프라인으로 설정
              try {
                await UserStatusService.setOffline(currentUser.uid);
              } catch (statusError) {
                if (process.env.NODE_ENV === 'development') {
                  console.warn('⚠️ [AuthStore] 사용자 상태 오프라인 설정 실패:', statusError);
                }
                // 상태 설정 실패해도 로그아웃은 진행
              }
            }
            
            // 실제 Firebase 로그아웃 호출
            await AuthService.logout();
            
            set({ user: null, userProfile: null, error: null });
            
            // ✅ 권한 캐시 초기화
            usePermissionsStore.getState().clearCache();
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '로그아웃에 실패했습니다.';
            set({ error: errorMessage });
          } finally {
            set({ isLoading: false });
          }
        },
        
        setUser: (user: User | null) => set({ user }),
        
        setUserProfile: (userProfile: UserProfile | null) => set({ userProfile }),
        
        setLoading: (isLoading: boolean) => set({ isLoading }),
        
        setError: (error: string | null) => set({ error }),
        
        initializeAuth: (): (() => void) => {
          // localStorage에 사용자 정보가 있으면 초기 로딩 상태를 false로 시작
          const { user: currentUser } = useAuthStore.getState();
          const hasStoredUser = currentUser !== null;
          
          // 사용자 정보가 있으면 즉시 로드, 없으면 로딩 표시
          if (!hasStoredUser) {
            set({ isLoading: true });
          }
          
          const unsubscribe = onAuthStateChange(async (user) => {
            set({ user, isLoading: false, error: null });
            
            if (user) {
              // 사용자 프로필 정보도 함께 로드 (재시도 로직 포함, 더 빠른 재시도)
              let retries = 0;
              const maxRetries = 5;
              
              while (retries < maxRetries) {
                try {
                  const userProfile = await AuthService.getCurrentUserProfile();
                  
                  if (userProfile) {
                    set({ userProfile });
                    break;
                  }
                  
                  // userProfile이 null이면 재시도 (더 짧은 대기 시간)
                  retries++;
                  if (retries < maxRetries) {
                    console.warn(`⚠️ [AuthStore] 프로필 로드 재시도 ${retries}/${maxRetries}`);
                    // 재시도 간격을 줄여서 더 빠르게 반응 (300ms, 600ms, 900ms...)
                    await new Promise(resolve => setTimeout(resolve, 300 * retries));
                  }
                } catch (error) {
                  retries++;
                  
                  // 권한 에러는 조용히 처리 (로그인 전 상태)
                  const errorMessage = error instanceof Error ? error.message : '';
                  const isPermissionError = errorMessage.includes('permission') || errorMessage.includes('insufficient');
                  
                  if (retries >= maxRetries) {
                    if (!isPermissionError) {
                      console.error('❌ [AuthStore] 사용자 프로필 로드 최종 실패:', error);
                    }
                    set({ userProfile: null });
                  } else if (!isPermissionError) {
                    console.warn(`⚠️ [AuthStore] 프로필 로드 재시도 ${retries}/${maxRetries} (에러)`, error);
                    // 에러 발생 시에도 더 빠른 재시도
                    await new Promise(resolve => setTimeout(resolve, 300 * retries));
                  }
                }
              }
            } else {
              // ✅ 로그아웃 시 권한 캐시 초기화
              set({ userProfile: null });
              usePermissionsStore.getState().clearCache();
            }
          });
          
          // 컴포넌트 언마운트 시 구독 해제를 위한 cleanup 함수 반환
          return () => {
            unsubscribe();
          };
        },
        
        refreshUserProfile: async () => {
          // auth.currentUser를 직접 확인하여 로그인 직후에도 빠르게 프로필 가져오기
          if (!auth?.currentUser) {
            // auth.currentUser가 없으면 store의 user 확인
          const { user } = useAuthStore.getState();
          if (!user) {
            return;
            }
          }
          
          try {
            set({ isLoading: true });
            
            const userProfile = await AuthService.getCurrentUserProfile();
            
            // 프로필을 가져왔으면 store 업데이트
            if (userProfile) {
            set({ userProfile, isLoading: false });
            } else {
              // 프로필이 없으면 재시도 (최대 3번)
              let retries = 0;
              const maxRetries = 3;
              
              while (retries < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 300 * (retries + 1)));
                const retryProfile = await AuthService.getCurrentUserProfile();
                
                if (retryProfile) {
                  set({ userProfile: retryProfile, isLoading: false });
                  return;
                }
                
                retries++;
              }
              
              // 최종 실패
              set({ isLoading: false });
              console.warn('⚠️ [AuthStore] 사용자 프로필 새로고침 실패: 프로필을 찾을 수 없습니다.');
            }
          } catch (error) {
            console.error('❌ [AuthStore] 사용자 프로필 새로고침 실패:', error);
            set({ isLoading: false });
          }
        },
      }),
      {
        name: 'auth-store',
        partialize: (state) => ({ 
          // user 정보만 persist (보안상 민감한 정보는 제외)
          user: state.user ? {
            uid: state.user.uid,
            email: state.user.email,
            displayName: getUserDisplayName(state.user, state.userProfile),
            photoURL: state.user.photoURL,
          } : null
        }),
      }
    ),
    { name: 'auth-store' }
  )
);
