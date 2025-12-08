/**
 * 포스트잇 전역 스토어
 * 모든 컴포넌트에서 포스트잇 상태를 공유하기 위한 Zustand store
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { PostIt, PostItColor } from '@/shared/types/postit.types';
import {
  getPostIts,
  addPostIt,
  updatePostIt as updatePostItStorage,
  deletePostIt as deletePostItStorage,
  reorderPostIts,
  createFolder as createFolderStorage,
} from '@/shared/utils/postitStorage';
import { isElectron } from '@/shared/utils/platform/platform';

interface PostItState {
  postits: PostIt[];
  isLoading: boolean;
}

interface PostItActions {
  // 포스트잇 목록 새로고침
  refreshPostIts: () => Promise<void>;

  // 포스트잇 추가
  createPostIt: (content: string, color?: PostItColor) => Promise<PostIt>;

  // 포스트잇 업데이트
  updatePostIt: (id: string, updates: Partial<PostIt>) => Promise<PostIt | null>;

  // 포스트잇 삭제
  removePostIt: (id: string) => Promise<boolean>;

  // 포스트잇 순서 변경
  reorderPostIts: (newOrder: PostIt[]) => Promise<void>;

  // 포스트잇을 화면에 보이도록 이동
  bringToView: (id: string) => Promise<void>;

  // 폴더 생성 (두 포스트잇을 묶기)
  createFolder: (postitId1: string, postitId2: string, folderName?: string) => Promise<void>;
}

export const usePostItStore = create<PostItState & PostItActions>()(
  devtools(
    persist(
      (set, get) => ({
        // State
        postits: [],
        isLoading: false,

        // Actions
        refreshPostIts: async () => {
          try {
            set({ isLoading: true });
            const loaded = await getPostIts();
            set({ postits: loaded, isLoading: false });
          } catch (error) {
            console.error('포스트잇 로드 실패:', error);
            set({ isLoading: false });
            throw error;
          }
        },

        createPostIt: async (content: string, color: PostItColor = 'yellow') => {
          const newPostIt = await addPostIt(content, color);
          set((state) => ({
            postits: [...state.postits, newPostIt],
          }));
          return newPostIt;
        },

        updatePostIt: async (id: string, updates: Partial<PostIt>) => {
          const updated = await updatePostItStorage(id, updates);
          if (updated) {
            set((state) => ({
              postits: state.postits.map((p) => (p.id === id ? updated : p)),
            }));
          }
          return updated;
        },

        removePostIt: async (id: string) => {
          const success = await deletePostItStorage(id);
          if (success) {
            set((state) => ({
              postits: state.postits.filter((p) => p.id !== id),
            }));
          }
          return success;
        },

        reorderPostIts: async (newOrder: PostIt[]) => {
          await reorderPostIts(newOrder);
          set({ postits: newOrder });
        },

        bringToView: async (id: string) => {
          const state = get();
          const postit = state.postits.find((p) => p.id === id);
          if (!postit) return;

          // 포스트잇이 화면 밖에 있는지 체크
          const isOutOfView =
            postit.position.x + postit.size.width < 0 ||
            postit.position.x > window.innerWidth ||
            postit.position.y + postit.size.height < 0 ||
            postit.position.y > window.innerHeight;

          if (isOutOfView) {
            // 화면 중앙으로 이동
            const centerX = (window.innerWidth - postit.size.width) / 2;
            const centerY = (window.innerHeight - postit.size.height) / 2;

            await state.updatePostIt(id, {
              position: {
                x: Math.max(0, centerX),
                y: Math.max(0, centerY),
              },
            });
          }

          // zIndex를 최상위로
          const maxZIndex = Math.max(...state.postits.map((p) => p.zIndex || 0));
          if (postit.zIndex < maxZIndex) {
            await state.updatePostIt(id, { zIndex: maxZIndex + 1 });
          }
        },

        createFolder: async (postitId1: string, postitId2: string, folderName?: string) => {
          // Electron 환경이 아니면 실행하지 않음
          if (!isElectron()) {
            return;
          }

          const folder = await createFolderStorage(postitId1, postitId2, folderName);
          if (folder) {
            // 포스트잇 목록 새로고침
            const currentState = get();
            await currentState.refreshPostIts();
          }
        },
      }),
      {
        name: 'postit-store',
        // localStorage에 저장하지 않고 메모리에서만 관리 (postitStorage가 이미 localStorage 관리)
        partialize: () => ({}), // 빈 객체 반환하여 persist 비활성화
      }
    ),
    { name: 'PostItStore' }
  )
);

// 초기 로드 및 실시간 동기화 (Electron 환경에서만)
// 이 코드는 모듈이 로드될 때 한 번만 실행됨
// 포스트잇 창과 메인 창 모두에서 실행되어야 함
if (typeof window !== 'undefined' && isElectron()) {
  console.log('[OK] [PostIt Store] Electron 환경 감지, 초기 로드 시작');
  console.log('[DEBUG] [PostIt Store] 현재 URL:', window.location.href);
  console.log('[DEBUG] [PostIt Store] 현재 hash:', window.location.hash);
  
  // 포스트잇 모드인지 확인
  const isPostItMode = (() => {
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get('mode') === 'postit') return true;
    const hash = window.location.hash;
    if (hash) {
      const hashQuery = hash.split('?')[1];
      if (hashQuery) {
        const hashParams = new URLSearchParams(hashQuery);
        if (hashParams.get('mode') === 'postit') return true;
      }
    }
    return false;
  })();
  
  console.log('[OK] [PostIt Store] 포스트잇 모드:', isPostItMode);
  
  // 약간의 지연 후 로드 (window.electron이 준비될 때까지)
  // 포스트잇 모드에서는 더 긴 지연 필요 (React 렌더링 완료 대기)
  const delay = isPostItMode ? 500 : 100;
  
  setTimeout(() => {
    const store = usePostItStore.getState();
    
    // Electron API 확인
    const electron = (window as any).electron;
    console.log('[OK] [PostIt Store] Electron API 확인:', {
      electron: !!electron,
      postit: !!electron?.postit,
      read: typeof electron?.postit?.read === 'function',
      onUpdate: typeof electron?.postit?.onUpdate === 'function'
    });

    // Electron API가 없으면 재시도
    if (!electron?.postit) {
      console.warn('[WARN] [PostIt Store] Electron API가 아직 준비되지 않음, 200ms 후 재시도');
      setTimeout(() => {
        const storeRetry = usePostItStore.getState();
        const electronRetry = (window as any).electron;
        if (electronRetry?.postit) {
          console.log('[OK] [PostIt Store] 재시도 성공, 데이터 로드 시작');
          storeRetry.refreshPostIts()
            .then(() => {
              console.log('[OK] [PostIt Store] 재시도로 초기 데이터 로드 완료');
            })
            .catch((error) => {
              console.error('[ERROR] [PostIt Store] 재시도 초기 로드 실패:', error);
            });
        } else {
          console.error('[ERROR] [PostIt Store] 재시도 실패, Electron API가 여전히 없음');
        }
      }, 200);
      return;
    }

    // 초기 데이터 로드
    console.log('[OK] [PostIt Store] 초기 데이터 로드 시작...');
    store.refreshPostIts()
      .then(() => {
        const state = usePostItStore.getState();
        console.log('[OK] [PostIt Store] 초기 데이터 로드 완료, 포스트잇 개수:', state.postits.length);
      })
      .catch((error) => {
        console.error('[ERROR] [PostIt Store] 초기 포스트잇 로드 실패:', error);
        if (error instanceof Error) {
          console.error('[ERROR] [PostIt Store] 에러 메시지:', error.message);
          console.error('[ERROR] [PostIt Store] 에러 스택:', error.stack);
        }
      });

    // IPC 이벤트 리스너 등록 (데이터 변경 감지)
    if ((window as any).electron?.postit?.onUpdate) {
      console.log('[OK] [PostIt Store] IPC 이벤트 리스너 등록');
      (window as any).electron.postit.onUpdate((data: any) => {
        console.log('[OK] [PostIt Store] 포스트잇 데이터 업데이트 수신:', {
          postitsCount: data?.postits?.length || 0,
          foldersCount: data?.folders?.length || 0
        });
        if (data && data.postits) {
          usePostItStore.setState({ postits: data.postits, isLoading: false });
        } else {
          console.log('[OK] [PostIt Store] 데이터가 비어있어 새로고침 실행');
          store.refreshPostIts();
        }
      });
    } else {
      console.warn('[WARN] [PostIt Store] electron.postit.onUpdate가 없어 이벤트 리스너를 등록할 수 없습니다');
    }
  }, delay);
}
