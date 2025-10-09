import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User } from 'firebase/auth';
import { onAuthStateChange } from '@/shared/services/firebase/auth';
import { AuthService } from '@/features/auth/services';
import { UserProfile } from '@/features/auth/types';
import { TauriWindowUtils } from '@/shared/utils/tauri-window';

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
            // 실제 Firebase 로그아웃 호출
            await AuthService.logout();
            set({ user: null, userProfile: null, error: null });
            console.log('✅ 로그아웃 완료');
            
            // Tauri 환경이면 윈도우 크기 복원
            await TauriWindowUtils.onLogout();
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '로그아웃에 실패했습니다.';
            console.error('❌ 로그아웃 실패:', errorMessage);
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
          // 초기 로딩 상태 설정
          set({ isLoading: true });
          
          const unsubscribe = onAuthStateChange(async (user) => {
            console.log('🔐 Firebase 인증 상태 변경:', user ? '로그인됨' : '로그아웃됨');
            set({ user, isLoading: false, error: null });
            
            if (user) {
              // 사용자 프로필 정보도 함께 로드
              try {
                const userProfile = await AuthService.getCurrentUserProfile();
                set({ userProfile });
                
                // 로그인 완료 시 Tauri 윈도우 최대화
                await TauriWindowUtils.onLogin();
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
