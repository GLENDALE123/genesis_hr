/**
 * 섹션 서비스
 * 
 * @description
 * 섹션 CRUD, 순서 관리 등의 기능 제공
 */

import {
  getDocuments,
  getDocument,
  addDocument,
  updateDocument,
  deleteDocument,
  getDocumentsWithQuery,
  onCollectionSnapshot,
  getCollectionRef,
} from '@/shared/services/firebase/firestore';
import {
  Section,
  CreateSectionData,
  UpdateSectionData,
  MoveSectionData,
} from '../types/section.types';
import { query, where, orderBy, onSnapshot } from 'firebase/firestore';

// 컬렉션 이름
const SECTIONS_COLLECTION = 'sections';

// 프로젝트의 섹션 목록 조회
export const getSectionsByProject = async (projectId: string): Promise<Section[]> => {
  try {
    const sections = await getDocumentsWithQuery(
      SECTIONS_COLLECTION,
      [
        { field: 'projectId', operator: '==', value: projectId },
        { field: 'isArchived', operator: '==', value: false },
      ],
      'position',
      'asc'
    );
    return sections as Section[];
  } catch (error) {
    console.error('섹션 목록 조회 실패:', error);
    throw error;
  }
};

// 섹션 ID로 조회
export const getSectionById = async (id: string): Promise<Section | null> => {
  try {
    const section = await getDocument(SECTIONS_COLLECTION, id);
    return section as Section | null;
  } catch (error) {
    console.error('섹션 조회 실패:', error);
    return null;
  }
};

// 섹션 생성
export const createSection = async (
  data: CreateSectionData,
  currentUser: { uid: string; displayName?: string }
): Promise<Section> => {
  try {
    const now = new Date().toISOString();

    // position이 지정되지 않으면 마지막에 추가
    let position = data.position;
    if (position === undefined) {
      const existingSections = await getSectionsByProject(data.projectId);
      position = existingSections.length;
    } else {
      // position이 지정된 경우, 기존 섹션들의 position 조정
      await adjustSectionPositions(data.projectId, position);
    }

    const sectionData: Omit<Section, 'id'> = {
      projectId: data.projectId,
      name: data.name,
      description: data.description || undefined,
      position,
      createdAt: now,
      updatedAt: now,
      createdBy: currentUser.uid,
      isArchived: false,
    };

    const sectionId = await addDocument(SECTIONS_COLLECTION, sectionData);

    return {
      id: sectionId,
      ...sectionData,
    };
  } catch (error) {
    console.error('섹션 생성 실패:', error);
    throw error;
  }
};

// 섹션 업데이트
export const updateSection = async (
  id: string,
  data: UpdateSectionData,
  currentUser: { uid: string; displayName?: string }
): Promise<void> => {
  try {
    const updateData: any = {
      ...data,
      updatedAt: new Date().toISOString(),
    };

    // position이 변경된 경우, 다른 섹션들의 position 조정
    if (data.position !== undefined) {
      const section = await getSectionById(id);
      if (section) {
        await adjustSectionPositions(section.projectId, data.position, id);
      }
    }

    // undefined 값 제거
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    await updateDocument(SECTIONS_COLLECTION, id, updateData);
  } catch (error) {
    console.error('섹션 업데이트 실패:', error);
    throw error;
  }
};

// 섹션 삭제 (아카이브)
export const deleteSection = async (id: string): Promise<void> => {
  try {
    const section = await getSectionById(id);
    if (!section) {
      throw new Error('섹션을 찾을 수 없습니다.');
    }

    // 아카이브 처리
    await updateDocument(SECTIONS_COLLECTION, id, {
      isArchived: true,
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // position 재조정
    await reorderSectionPositions(section.projectId);
  } catch (error) {
    console.error('섹션 삭제 실패:', error);
    throw error;
  }
};

// 섹션 순서 조정 (새로운 position에 섹션 추가 시)
const adjustSectionPositions = async (
  projectId: string,
  newPosition: number,
  excludeSectionId?: string
): Promise<void> => {
  try {
    const sections = await getSectionsByProject(projectId);
    const sectionsToUpdate = sections.filter(s => 
      s.position >= newPosition && s.id !== excludeSectionId
    );

    // 배치 업데이트
    const updatePromises = sectionsToUpdate.map(section =>
      updateDocument(SECTIONS_COLLECTION, section.id, {
        position: section.position + 1,
        updatedAt: new Date().toISOString(),
      })
    );

    await Promise.all(updatePromises);
  } catch (error) {
    console.error('섹션 순서 조정 실패:', error);
    throw error;
  }
};

// 섹션 순서 재정렬 (삭제 후)
const reorderSectionPositions = async (projectId: string): Promise<void> => {
  try {
    const sections = await getSectionsByProject(projectId);
    
    const updatePromises = sections.map((section, index) =>
      updateDocument(SECTIONS_COLLECTION, section.id, {
        position: index,
        updatedAt: new Date().toISOString(),
      })
    );

    await Promise.all(updatePromises);
  } catch (error) {
    console.error('섹션 순서 재정렬 실패:', error);
    throw error;
  }
};

// 섹션 이동
export const moveSection = async (
  data: MoveSectionData,
  currentUser: { uid: string; displayName?: string }
): Promise<void> => {
  try {
    const section = await getSectionById(data.sectionId);
    if (!section) {
      throw new Error('섹션을 찾을 수 없습니다.');
    }

    const sections = await getSectionsByProject(section.projectId);
    const currentIndex = sections.findIndex(s => s.id === data.sectionId);

    if (currentIndex === -1) {
      throw new Error('섹션을 찾을 수 없습니다.');
    }

    // 새 position으로 이동
    const newIndex = data.newPosition;
    if (newIndex < 0 || newIndex >= sections.length) {
      throw new Error('유효하지 않은 position입니다.');
    }

    // position 재조정
    const updatedSections = [...sections];
    const [movedSection] = updatedSections.splice(currentIndex, 1);
    updatedSections.splice(newIndex, 0, movedSection);

    // 모든 섹션의 position 업데이트
    const updatePromises = updatedSections.map((s, index) =>
      updateDocument(SECTIONS_COLLECTION, s.id, {
        position: index,
        updatedAt: new Date().toISOString(),
      })
    );

    await Promise.all(updatePromises);
  } catch (error) {
    console.error('섹션 이동 실패:', error);
    throw error;
  }
};

// 섹션 실시간 구독
export const subscribeToSections = (
  projectId: string,
  onUpdate: (sections: Section[]) => void,
  onError: (error: Error) => void
): (() => void) => {
  try {
    const queries = [
      { field: 'projectId', operator: '==' as const, value: projectId },
      { field: 'isArchived', operator: '==' as const, value: false },
    ];
    
    let q = query(getCollectionRef(SECTIONS_COLLECTION));
    queries.forEach(({ field, operator, value }) => {
      q = query(q, where(field, operator, value));
    });
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          const sections = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Section[];
          
          const filteredSections = sections
            .filter((s: any) => s.projectId === projectId && !s.isArchived)
            .sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
          onUpdate(filteredSections);
        } catch (error) {
          onError(error instanceof Error ? error : new Error('Unknown error'));
        }
      },
      (error) => {
        onError(error instanceof Error ? error : new Error('Unknown error'));
      }
    );

    return unsubscribe;
  } catch (error) {
    onError(error instanceof Error ? error : new Error('구독 실패'));
    return () => {};
  }
};

