/**
 * 프로젝트 서비스
 * 
 * @description
 * 프로젝트 CRUD, 멤버 관리, 권한 관리 등의 기능 제공
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
import { db, auth } from '@/shared/services/firebase/config';
// TODO: project.types.ts 파일 생성 필요
type Project = any;
type CreateProjectData = any;
type UpdateProjectData = any;
type ProjectFilterOptions = any;
type ProjectSortOptions = any;
type ProjectMember = any;
type ProjectRole = any;
type ProjectSettings = any;
import { query, where, orderBy, Timestamp, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
import { ChannelService } from '@/features/workspace/channels';

// 컬렉션 이름
const PROJECTS_COLLECTION = 'projects';
const SECTIONS_COLLECTION = 'sections';

// 기본 프로젝트 설정
const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  defaultView: 'board',
  allowMemberInvite: true,
  allowTaskCreation: true,
  allowSectionCreation: true,
  defaultTaskStatus: 'todo',
  defaultTaskPriority: 'medium',
  autoArchiveCompleted: false,
};

// 사용자 프로필 정보 가져오기
const getUserDisplayName = async (uid: string): Promise<string> => {
  try {
    const userDoc: any = await getDocument('users', uid);
    if (userDoc && userDoc.displayName) {
      return userDoc.displayName;
    }
    return uid;
  } catch {
    return uid;
  }
};

// 프로필 정보로 멤버 정보 생성
const createMemberFromUid = async (uid: string, role: ProjectRole): Promise<ProjectMember> => {
  const displayName = await getUserDisplayName(uid);
  try {
    const userDoc: any = await getDocument('users', uid);
    return {
      uid,
      role,
      joinedAt: new Date().toISOString(),
      displayName,
      photoURL: userDoc?.photoURL,
    };
  } catch {
    return {
      uid,
      role,
      joinedAt: new Date().toISOString(),
      displayName,
    };
  }
};

// 프로젝트 목록 조회
export const getProjects = async (
  filterOptions?: ProjectFilterOptions,
  sortOptions?: ProjectSortOptions
): Promise<Project[]> => {
  try {
    const queries: Array<{ field: string; operator: any; value: unknown }> = [];

    // 타입 필터
    if (filterOptions?.type && filterOptions.type.length > 0) {
      if (filterOptions.type.length === 1) {
        queries.push({ field: 'type', operator: '==', value: filterOptions.type[0] });
      } else {
        const typeChunks = [];
        for (let i = 0; i < filterOptions.type.length; i += 10) {
          typeChunks.push(filterOptions.type.slice(i, i + 10));
        }
        if (typeChunks[0]) {
          queries.push({ field: 'type', operator: 'in', value: typeChunks[0] });
        }
      }
    }

    // 워크스페이스 필터
    if (filterOptions?.workspaceId) {
      queries.push({ field: 'workspaceId', operator: '==', value: filterOptions.workspaceId });
    }

    // 멤버 필터
    if (filterOptions?.memberId) {
      queries.push({ field: 'members', operator: 'array-contains-any', value: [filterOptions.memberId] });
    }

    // 아카이브 필터
    if (filterOptions?.isArchived !== undefined) {
      queries.push({ field: 'isArchived', operator: '==', value: filterOptions.isArchived });
    } else {
      // 기본적으로 아카이브되지 않은 프로젝트만
      queries.push({ field: 'isArchived', operator: '==', value: false });
    }

    // 활성 상태 필터
    queries.push({ field: 'isActive', operator: '==', value: true });

    // 정렬 옵션
    const sortField = sortOptions?.field || 'updatedAt';
    const sortOrder = sortOptions?.order || 'desc';

    const projects = await getDocumentsWithQuery(
      PROJECTS_COLLECTION,
      queries,
      sortField,
      sortOrder
    ) as Project[];

    // 검색어 필터 (클라이언트 사이드)
    let filteredProjects = projects;
    if (filterOptions?.searchQuery) {
      const searchLower = filterOptions.searchQuery.toLowerCase();
      filteredProjects = projects.filter((project: any) =>
        project.name?.toLowerCase().includes(searchLower) ||
        (project.description && project.description.toLowerCase().includes(searchLower))
      );
    }

    // 즐겨찾기 필터
    if (filterOptions?.isFavorite !== undefined) {
      filteredProjects = filteredProjects.filter((project: any) => project.isFavorite === filterOptions.isFavorite);
    }

    // 멤버 필터 (정확한 검색)
    if (filterOptions?.memberId) {
      filteredProjects = filteredProjects.filter((project: any) =>
        project.members && project.members.some((member: any) => member.uid === filterOptions.memberId)
      );
    }

    return filteredProjects;
  } catch (error) {
    console.error('프로젝트 목록 조회 실패:', error);
    throw error;
  }
};

// 프로젝트 ID로 조회
export const getProjectById = async (id: string): Promise<Project | null> => {
  try {
    const project = await getDocument(PROJECTS_COLLECTION, id);
    return project as Project | null;
  } catch (error) {
    console.error('프로젝트 조회 실패:', error);
    return null;
  }
};

// 프로젝트 생성
export const createProject = async (
  data: CreateProjectData,
  currentUser: { uid: string; displayName?: string }
): Promise<Project> => {
  try {
    const now = new Date().toISOString();
    
    // 생성자를 owner로 추가
    const owner = await createMemberFromUid(currentUser.uid, 'owner');
    const members: ProjectMember[] = [owner];

    // 추가 멤버 초대
    if (data.members && data.members.length > 0) {
      const additionalMembers = await Promise.all(
        data.members
          .filter((uid: string) => uid !== currentUser.uid)
          .map((uid: string) => createMemberFromUid(uid, 'member'))
      );
      members.push(...additionalMembers);
    }

    const projectData: Omit<Project, 'id'> = {
      name: data.name,
      description: data.description || undefined,
      color: data.color || undefined,
      icon: data.icon || undefined,
      type: data.type,
      workspaceId: data.workspaceId || undefined,
      channelId: data.channelId || undefined,
      createdBy: currentUser.uid,
      createdAt: now,
      updatedAt: now,
      members,
      settings: {
        ...DEFAULT_PROJECT_SETTINGS,
        ...data.settings,
      },
      isActive: true,
      isArchived: false,
      isFavorite: false,
    };

    const projectId = await addDocument(PROJECTS_COLLECTION, projectData);
    
    // 워크스페이스 프로젝트인 경우 채널 자동 생성
    let channelId: string | undefined = data.channelId || undefined;
    if (data.type === 'workspace' && data.workspaceId && !data.channelId) {
      try {
        const createdChannelId = await ChannelService.createChannel(
          {
            workspaceId: data.workspaceId,
            name: data.name,
            description: data.description || `프로젝트 "${data.name}" 관련 채널`,
            type: 'public',
            category: 'project',
          },
          currentUser.uid
        );
        channelId = createdChannelId;
        
        // 프로젝트에 채널 ID 업데이트
        await updateDocument(PROJECTS_COLLECTION, projectId, { channelId });
      } catch (error) {
        console.warn('채널 생성 실패 (프로젝트는 생성됨):', error);
      }
    }
    
    // 기본 섹션 생성 (보드 뷰용)
    const defaultSections = [
      { name: '해야 할 일', position: 0 },
      { name: '진행 중', position: 1 },
      { name: '완료', position: 2 },
    ];

    for (const section of defaultSections) {
      await addDocument(SECTIONS_COLLECTION, {
        projectId,
        name: section.name,
        position: section.position,
        createdAt: now,
        updatedAt: now,
        createdBy: currentUser.uid,
        isArchived: false,
      });
    }

    return {
      id: projectId,
      ...projectData,
      channelId,
    };
  } catch (error) {
    console.error('프로젝트 생성 실패:', error);
    throw error;
  }
};

// 프로젝트 업데이트
export const updateProject = async (
  id: string,
  data: UpdateProjectData,
  currentUser: { uid: string; displayName?: string }
): Promise<void> => {
  try {
    const updateData: any = {
      ...data,
      updatedAt: new Date().toISOString(),
    };

    // undefined 값 제거
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    await updateDocument(PROJECTS_COLLECTION, id, updateData);
  } catch (error) {
    console.error('프로젝트 업데이트 실패:', error);
    throw error;
  }
};

// 프로젝트 삭제
export const deleteProject = async (id: string): Promise<void> => {
  try {
    await deleteDocument(PROJECTS_COLLECTION, id);
  } catch (error) {
    console.error('프로젝트 삭제 실패:', error);
    throw error;
  }
};

// 프로젝트 멤버 추가
export const addProjectMember = async (
  projectId: string,
  uid: string,
  role: ProjectRole = 'member',
  currentUser: { uid: string; displayName?: string }
): Promise<void> => {
  try {
    const project = await getProjectById(projectId);
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    // 이미 멤버인지 확인
    if (project.members.some((m: any) => m.uid === uid)) {
      throw new Error('이미 프로젝트 멤버입니다.');
    }

    const newMember = await createMemberFromUid(uid, role);
    
    await updateDocument(PROJECTS_COLLECTION, projectId, {
      members: arrayUnion(newMember),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('프로젝트 멤버 추가 실패:', error);
    throw error;
  }
};

// 프로젝트 멤버 제거
export const removeProjectMember = async (
  projectId: string,
  uid: string,
  currentUser: { uid: string; displayName?: string }
): Promise<void> => {
  try {
    const project = await getProjectById(projectId);
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    const memberToRemove = project.members.find((m: any) => m.uid === uid);
    if (!memberToRemove) {
      throw new Error('멤버를 찾을 수 없습니다.');
    }

    // Owner는 제거할 수 없음
    if (memberToRemove.role === 'owner') {
      throw new Error('프로젝트 소유자는 제거할 수 없습니다.');
    }

    await updateDocument(PROJECTS_COLLECTION, projectId, {
      members: arrayRemove(memberToRemove),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('프로젝트 멤버 제거 실패:', error);
    throw error;
  }
};

// 프로젝트 멤버 역할 변경
export const updateProjectMemberRole = async (
  projectId: string,
  uid: string,
  newRole: ProjectRole,
  currentUser: { uid: string; displayName?: string }
): Promise<void> => {
  try {
    const project = await getProjectById(projectId);
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    const memberIndex = project.members.findIndex((m: any) => m.uid === uid);
    if (memberIndex === -1) {
      throw new Error('멤버를 찾을 수 없습니다.');
    }

    // Owner 역할은 변경할 수 없음
    if (project.members[memberIndex].role === 'owner' && newRole !== 'owner') {
      throw new Error('프로젝트 소유자 역할은 변경할 수 없습니다.');
    }

    const updatedMembers = [...project.members];
    updatedMembers[memberIndex] = {
      ...updatedMembers[memberIndex],
      role: newRole,
    };

    await updateDocument(PROJECTS_COLLECTION, projectId, {
      members: updatedMembers,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('프로젝트 멤버 역할 변경 실패:', error);
    throw error;
  }
};

// 프로젝트 실시간 구독
export const subscribeToProjects = (
  onUpdate: (projects: Project[]) => void,
  onError: (error: Error) => void,
  filterOptions?: ProjectFilterOptions
): (() => void) => {
  try {
    const queries: Array<{ field: string; operator: any; value: unknown }> = [];

    if (filterOptions?.type && filterOptions.type.length > 0) {
      if (filterOptions.type.length === 1) {
        queries.push({ field: 'type', operator: '==', value: filterOptions.type[0] });
      }
    }

    if (filterOptions?.workspaceId) {
      queries.push({ field: 'workspaceId', operator: '==', value: filterOptions.workspaceId });
    }

    queries.push({ field: 'isArchived', operator: '==', value: false });
    queries.push({ field: 'isActive', operator: '==', value: true });

    // 쿼리 구성
    let q = query(getCollectionRef(PROJECTS_COLLECTION));
    queries.forEach(({ field, operator, value }) => {
      q = query(q, where(field, operator, value));
    });

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          const projects = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Project[];
          
          let filteredProjects = projects;

          // 클라이언트 사이드 필터링
          if (filterOptions?.searchQuery) {
            const searchLower = filterOptions.searchQuery.toLowerCase();
            filteredProjects = projects.filter((project: any) =>
              project.name?.toLowerCase().includes(searchLower) ||
              (project.description && project.description.toLowerCase().includes(searchLower))
            );
          }

          if (filterOptions?.isFavorite !== undefined) {
            filteredProjects = filteredProjects.filter((project: any) => project.isFavorite === filterOptions.isFavorite);
          }

          if (filterOptions?.memberId) {
            filteredProjects = filteredProjects.filter((project: any) =>
              project.members && project.members.some((member: any) => member.uid === filterOptions.memberId)
            );
          }

          onUpdate(filteredProjects);
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

// 프로젝트 통계 조회
export const getProjectStatistics = async (projectId: string): Promise<any> => {
  try {
    // 태스크 서비스에서 프로젝트별 태스크 통계를 가져와야 함
    // 이는 taskService에서 구현될 예정
    return {
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      overdueTasks: 0,
      progress: 0,
    };
  } catch (error) {
    console.error('프로젝트 통계 조회 실패:', error);
    throw error;
  }
};

