/**
 * 포스트잇 스토리지 유틸리티
 * Electron 환경: 파일 시스템 사용
 * 웹 환경: localStorage 사용 (하지만 포스트잇은 Electron 전용)
 */

import type { PostIt, PostItStorage, PostItFolder, PostItColor } from '@/shared/types/postit.types';
import { isElectron } from '@/shared/utils/platform/platform';

const STORAGE_KEY = 'genesis_hr_postits';
const STORAGE_VERSION = '1.0.0';
const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 200;

/**
 * 포스트잇 목록 가져오기 (Electron 전용)
 */
export const getPostIts = async (): Promise<PostIt[]> => {
  if (typeof window === 'undefined') {
    return [];
  }

  // Electron 환경이 아니면 빈 배열 반환
  if (!isElectron()) {
    return [];
  }

  try {
    // Electron IPC를 통해 파일 시스템에서 읽기
    const electron = (window as any).electron;
    if (!electron?.postit) {
      return [];
    }

    const data: PostItStorage = await electron.postit.read();
    
    // 버전 체크 (향후 마이그레이션용)
    if (data.version !== STORAGE_VERSION) {
      // 버전이 다르면 초기화
      return [];
    }

    // 기존 데이터 마이그레이션 (position, size, zIndex, visible 추가)
    const migratedPostits = (data.postits || []).map((postit, index) => ({
      ...postit,
      position: postit.position || { 
        x: 50 + (index % 5) * 50, 
        y: 50 + Math.floor(index / 5) * 50 
      },
      size: postit.size || { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT },
      zIndex: postit.zIndex || index + 1,
      visible: postit.visible !== undefined ? postit.visible : true,
    }));

    // 마이그레이션이 필요한 경우 저장
    if (migratedPostits.some((p, i) => !data.postits?.[i]?.size || !data.postits?.[i]?.zIndex)) {
      await savePostIts(migratedPostits);
    }

    return migratedPostits;
  } catch (error) {
    console.error('포스트잇 로드 실패:', error);
    return [];
  }
};

/**
 * 전체 데이터 가져오기 (Electron 전용)
 */
export const getPostItStorage = async (): Promise<PostItStorage> => {
  if (typeof window === 'undefined') {
    return { postits: [], folders: [], version: STORAGE_VERSION };
  }

  // Electron 환경이 아니면 빈 데이터 반환
  if (!isElectron()) {
    return { postits: [], folders: [], version: STORAGE_VERSION };
  }

  try {
    // Electron IPC를 통해 파일 시스템에서 읽기
    const electron = (window as any).electron;
    if (!electron?.postit) {
      return { postits: [], folders: [], version: STORAGE_VERSION };
    }

    const data: PostItStorage = await electron.postit.read();
    
    // 버전 체크
    if (data.version !== STORAGE_VERSION) {
      return { postits: [], folders: [], version: STORAGE_VERSION };
    }

    return {
      postits: data.postits || [],
      folders: data.folders || [],
      version: STORAGE_VERSION,
    };
  } catch (error) {
    console.error('포스트잇 스토리지 로드 실패:', error);
    return { postits: [], folders: [], version: STORAGE_VERSION };
  }
};

/**
 * 로컬 스토리지에 포스트잇 목록 저장하기 (Electron 전용)
 */
export const savePostIts = async (postits: PostIt[]): Promise<void> => {
  if (typeof window === 'undefined') {
    return;
  }

  // Electron 환경이 아니면 저장하지 않음
  if (!isElectron()) {
    return;
  }

  try {
    // Electron 환경에서는 파일 시스템 사용
    const current = await getPostItStorage();
    const data: PostItStorage = {
      postits,
      folders: current.folders,
      version: STORAGE_VERSION,
    };
    
    // Electron IPC를 통해 파일 시스템에 저장
    await savePostItStorage(data);
  } catch (error) {
    console.error('포스트잇 저장 실패:', error);
    throw error;
  }
};

/**
 * 전체 데이터 저장하기 (Electron 전용)
 */
export const savePostItStorage = async (storage: PostItStorage): Promise<void> => {
  if (typeof window === 'undefined') {
    throw new Error('window 객체가 없습니다');
  }

  // Electron 환경이 아니면 저장하지 않음
  if (!isElectron()) {
    throw new Error('Electron 환경이 아닙니다');
  }

  try {
    const electron = (window as any).electron;
    if (!electron?.postit) {
      throw new Error('Electron postit API가 없습니다');
    }

    const result = await electron.postit.write(storage);
    if (!result || !result.success) {
      throw new Error(result?.error || '포스트잇 저장 실패');
    }
  } catch (error) {
    console.error('[ERROR] 포스트잇 스토리지 저장 실패:', error);
    throw error;
  }
};

/**
 * 포스트잇 추가 (Electron 전용)
 */
export const addPostIt = async (content: string, color: PostItColor = 'yellow'): Promise<PostIt> => {
  const postits = await getPostIts();
  // 최대 zIndex 찾기
  const maxZIndex = postits.length > 0 
    ? Math.max(...postits.map(p => p.zIndex || 0))
    : 0;
  
  const newPostIt: PostIt = {
    id: `postit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    content,
    color,
    position: { x: 20, y: 20 },
    size: { width: 200, height: 200 },
    zIndex: maxZIndex + 1,
    visible: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  const updated = [...postits, newPostIt];
  await savePostIts(updated);
  return newPostIt;
};

/**
 * 포스트잇 업데이트 (Electron 전용)
 */
export const updatePostIt = async (id: string, updates: Partial<PostIt>): Promise<PostIt | null> => {
  const postits = await getPostIts();
  const index = postits.findIndex((p) => p.id === id);
  
  if (index === -1) {
    return null;
  }

  const updated = {
    ...postits[index],
    ...updates,
    updatedAt: Date.now(),
  };

  const newPostits = [...postits];
  newPostits[index] = updated;
  await savePostIts(newPostits);
  
  return updated;
};

/**
 * 포스트잇 삭제 (Electron 전용)
 */
export const deletePostIt = async (id: string): Promise<boolean> => {
  const postits = await getPostIts();
  const filtered = postits.filter((p) => p.id !== id);
  
  if (filtered.length === postits.length) {
    return false;
  }

  await savePostIts(filtered);
  return true;
};

/**
 * 포스트잇 순서 변경 (Electron 전용)
 */
export const reorderPostIts = async (newOrder: PostIt[]): Promise<void> => {
  await savePostIts(newOrder);
};

/**
 * 폴더 생성 (두 포스트잇을 묶기) (Electron 전용)
 */
export const createFolder = async (postitId1: string, postitId2: string, folderName?: string): Promise<PostItFolder | null> => {
  const storage = await getPostItStorage();
  const postit1 = storage.postits.find(p => p.id === postitId1);
  const postit2 = storage.postits.find(p => p.id === postitId2);
  
  if (!postit1 || !postit2) {
    return null;
  }

  const folder: PostItFolder = {
    id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: folderName || `폴더 ${storage.folders.length + 1}`,
    postitIds: [postitId1, postitId2],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // 포스트잇에 folderId 설정
  const updatedPostits = storage.postits.map(p => {
    if (p.id === postitId1 || p.id === postitId2) {
      return { ...p, folderId: folder.id };
    }
    return p;
  });

  const updatedStorage: PostItStorage = {
    postits: updatedPostits,
    folders: [...storage.folders, folder],
    version: STORAGE_VERSION,
  };

  await savePostItStorage(updatedStorage);
  return folder;
};

