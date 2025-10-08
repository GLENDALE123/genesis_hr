import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User } from 'firebase/auth';
import { onAuthStateChange } from '@/shared/services/firebase/auth';
import { AuthService } from '@/features/auth/services';
import { UserProfile } from '@/features/auth/types';

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
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  devtools(
    persist(
      (set) => ({
        // State
        user: null,
        userProfile: null,
        isLoading: false,
        error: null,
        
        // Actions
        login: async (emailOrLoginId: string) => {
          set({ isLoading: true, error: null });
          try {
            // Firebase 로그인 로직은 별도 서비스에서 처리
            // 여기서는 상태 관리만 담당
            console.log('Login attempt:', emailOrLoginId);
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
            // Firebase 로그아웃 로직은 별도 서비스에서 처리
            set({ user: null, userProfile: null, error: null });
            console.log('Logout successful');
          } catch (error) {
            set({ error: error instanceof Error ? error.message : '로그아웃에 실패했습니다.' });
          } finally {
            set({ isLoading: false });
          }
        },
        
        setUser: (user: User | null) => set({ user }),
        
        setUserProfile: (userProfile: UserProfile | null) => set({ userProfile }),
        
        setLoading: (isLoading: boolean) => set({ isLoading }),
        
        setError: (error: string | null) => set({ error }),
        
        initializeAuth: (): (() => void) => {
          // persist된 user가 있으면 로딩 표시하지 않음 (깜빡임 방지)
          const currentState = useAuthStore.getState();
          if (!currentState.user) {
            set({ isLoading: true });
          }
          
          const unsubscribe = onAuthStateChange(async (user) => {
            set({ user, isLoading: false, error: null });
            
            if (user) {
              // 사용자 프로필 정보도 함께 로드
              try {
                const userProfile = await AuthService.getCurrentUserProfile();
                set({ userProfile });
              } catch (error) {
                // 권한 에러는 조용히 처리 (로그인 전 상태)
                const errorMessage = error instanceof Error ? error.message : '';
                if (!errorMessage.includes('permission') && !errorMessage.includes('insufficient')) {
                  console.error('사용자 프로필 로드 실패:', error);
                }
                set({ userProfile: null });
              }
            } else {
              set({ userProfile: null });
            }
          });
          
          // 컴포넌트 언마운트 시 구독 해제를 위한 cleanup 함수 반환
          return unsubscribe;
        },
      }),
      {
        name: 'auth-store',
        partialize: (state) => ({ 
          // user 정보만 persist (보안상 민감한 정보는 제외)
          user: state.user ? {
            uid: state.user.uid,
            email: state.user.email,
            displayName: state.user.displayName,
            photoURL: state.user.photoURL,
          } : null
        }),
      }
    ),
    { name: 'auth-store' }
  )
);
