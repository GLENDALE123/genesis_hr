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

// 초기 로드 (Electron 환경에서만)
if (typeof window !== 'undefined' && isElectron()) {
  usePostItStore.getState().refreshPostIts().catch((error) => {
    console.error('초기 포스트잇 로드 실패:', error);
  });
}
