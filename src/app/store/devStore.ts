import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { UserRole } from '@/features/auth/types';

/**
 * 개발 전용 Store
 * Admin 사용자가 개발 모드에서 권한별 UI를 테스트할 수 있도록 함
 */

interface DevState {
  // 더미 권한 설정 (권한별 UI 테스트용)
  dummyRole: UserRole | null;
  
  // 개발 모드 활성화 여부
  devModeEnabled: boolean;
}

interface DevActions {
  // 더미 권한 설정
  setDummyRole: (role: UserRole | null) => void;
  clearDummyRole: () => void;
  
  // 개발 모드 토글
  toggleDevMode: () => void;
  setDevMode: (enabled: boolean) => void;
  
  // 전체 초기화
  resetDevState: () => void;
}

const initialState: DevState = {
  dummyRole: null,
  devModeEnabled: false,
};

export const useDevStore = create<DevState & DevActions>()(
  devtools(
    (set) => ({
      ...initialState,
      
      // 더미 권한 설정
      setDummyRole: (role: UserRole | null) => {
        set({ dummyRole: role });
        console.log(`🔧 [DevStore] 더미 권한 변경: ${role || '원래 권한'}`);
      },
      
      clearDummyRole: () => {
        set({ dummyRole: null });
        console.log('🔧 [DevStore] 더미 권한 초기화');
      },
      
      // 개발 모드 토글
      toggleDevMode: () => {
        set((state) => ({ 
          devModeEnabled: !state.devModeEnabled,
          // 개발 모드 비활성화 시 더미 권한도 초기화
          dummyRole: state.devModeEnabled ? null : state.dummyRole
        }));
      },
      
      setDevMode: (enabled: boolean) => {
        set({ 
          devModeEnabled: enabled,
          // 개발 모드 비활성화 시 더미 권한도 초기화
          dummyRole: enabled ? null : null
        });
      },
      
      // 전체 초기화
      resetDevState: () => {
        set(initialState);
        console.log('🔧 [DevStore] 개발 상태 초기화');
      },
    }),
    { name: 'dev-store' }
  )
);

