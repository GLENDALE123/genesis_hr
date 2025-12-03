/**
 * 워크스페이스 서비스
 * Firestore 기반 워크스페이스 관리
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import { removeUndefinedFields } from '@/shared/utils/firestoreUtils';
import type {
  Workspace,
  WorkspaceRole,
  WorkspaceMember,
  CreateWorkspaceData,
  UpdateWorkspaceData,
  WorkspaceSettings,
} from '../types/workspace.types';

const WORKSPACES_COLLECTION = 'workspaces';
const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  allowMemberInvite: true,
  allowChannelCreation: true,
  defaultChannelPermissions: {
    canSendMessages: true,
    canEditMessages: true,
    canDeleteMessages: true,
    canManageChannel: false,
    canManageMembers: false,
  },
};

export class WorkspaceService {
  /**
   * 워크스페이스 생성
   */
  static async createWorkspace(
    data: CreateWorkspaceData,
    createdBy: string,
    creatorDisplayName?: string,
    creatorPhotoURL?: string
  ): Promise<string> {
    if (!db) throw new Error('Firestore is not initialized');

    const now = new Date().toISOString();
    const workspaceData: Omit<Workspace, 'id'> = {
      name: data.name,
      description: data.description,
      icon: data.icon,
      createdBy,
      createdAt: now,
      updatedAt: now,
      members: [
        {
          uid: createdBy,
          role: 'owner',
          joinedAt: now,
          displayName: creatorDisplayName,
          photoURL: creatorPhotoURL,
        },
      ],
      settings: {
        ...DEFAULT_WORKSPACE_SETTINGS,
        ...data.settings,
      },
      isActive: true,
    };

    // undefined 필드 제거 (Firestore는 undefined를 허용하지 않음)
    const cleanedData = removeUndefinedFields(workspaceData);
    const docRef = await addDoc(collection(db, WORKSPACES_COLLECTION), cleanedData);
    return docRef.id;
  }

  /**
   * 워크스페이스 조회
   */
  static async getWorkspace(workspaceId: string): Promise<Workspace | null> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, WORKSPACES_COLLECTION, workspaceId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as Workspace;
  }

  /**
   * 사용자가 속한 워크스페이스 목록 조회
   * Note: Firestore는 배열 내 객체 필드 쿼리를 직접 지원하지 않으므로
   * 모든 활성 워크스페이스를 가져온 후 클라이언트에서 필터링 및 정렬
   */
  static async getUserWorkspaces(userId: string): Promise<Workspace[]> {
    if (!db) throw new Error('Firestore is not initialized');

    // 인덱스 없이 작동하도록 where만 사용 (orderBy는 클라이언트에서 처리)
    const q = query(
      collection(db, WORKSPACES_COLLECTION),
      where('isActive', '==', true)
    );

    const querySnapshot = await getDocs(q);
    const workspaces: Workspace[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // members 배열에서 userId가 포함된 워크스페이스만 필터링
      const member = data.members?.find((m: WorkspaceMember) => m.uid === userId);
      if (member) {
        workspaces.push({
          id: doc.id,
          ...data,
        } as Workspace);
      }
    });

    // 클라이언트에서 updatedAt 기준으로 정렬
    return workspaces.sort((a, b) => {
      const aTime = new Date(a.updatedAt || a.createdAt).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt).getTime();
      return bTime - aTime; // 내림차순
    });
  }

  /**
   * 모든 활성 워크스페이스 조회 (관리자용)
   * Note: 인덱스 없이 작동하도록 where만 사용하고 클라이언트에서 정렬
   */
  static async getAllWorkspaces(): Promise<Workspace[]> {
    if (!db) throw new Error('Firestore is not initialized');

    // 인덱스 없이 작동하도록 where만 사용 (orderBy는 클라이언트에서 처리)
    const q = query(
      collection(db, WORKSPACES_COLLECTION),
      where('isActive', '==', true)
    );

    const querySnapshot = await getDocs(q);
    const workspaces = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Workspace[];

    // 클라이언트에서 createdAt 기준으로 정렬
    return workspaces.sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return bTime - aTime; // 내림차순
    });
  }

  /**
   * 워크스페이스 업데이트
   */
  static async updateWorkspace(
    workspaceId: string,
    data: UpdateWorkspaceData
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, WORKSPACES_COLLECTION, workspaceId);
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    // icon이 null이면 필드를 삭제하고, 값이 있으면 업데이트
    if (data.icon !== undefined) {
      if (data.icon === null) {
        updateData.icon = deleteField();
      } else {
        updateData.icon = data.icon;
      }
    }
    if (data.settings !== undefined) {
      updateData.settings = {
        ...DEFAULT_WORKSPACE_SETTINGS,
        ...data.settings,
      };
    }

    await updateDoc(docRef, updateData);
  }

  /**
   * 워크스페이스 삭제 (비활성화)
   */
  static async deleteWorkspace(workspaceId: string): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, WORKSPACES_COLLECTION, workspaceId);
    await updateDoc(docRef, {
      isActive: false,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * 워크스페이스 멤버 추가
   */
  static async addMember(
    workspaceId: string,
    member: Omit<WorkspaceMember, 'joinedAt'>
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, WORKSPACES_COLLECTION, workspaceId);
    const workspace = await this.getWorkspace(workspaceId);

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // 이미 멤버인지 확인
    const existingMember = workspace.members.find((m) => m.uid === member.uid);
    if (existingMember) {
      throw new Error('User is already a member');
    }

    const newMember: WorkspaceMember = {
      ...member,
      joinedAt: new Date().toISOString(),
    };

    await updateDoc(docRef, {
      members: arrayUnion(newMember),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * 워크스페이스 멤버 제거
   */
  static async removeMember(workspaceId: string, userId: string): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, WORKSPACES_COLLECTION, workspaceId);
    const workspace = await this.getWorkspace(workspaceId);

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const memberToRemove = workspace.members.find((m) => m.uid === userId);
    if (!memberToRemove) {
      throw new Error('User is not a member');
    }

    // 소유자는 제거할 수 없음
    if (memberToRemove.role === 'owner') {
      throw new Error('Cannot remove workspace owner');
    }

    await updateDoc(docRef, {
      members: arrayRemove(memberToRemove),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * 워크스페이스 멤버 역할 업데이트
   */
  static async updateMemberRole(
    workspaceId: string,
    userId: string,
    newRole: WorkspaceMember['role']
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, WORKSPACES_COLLECTION, workspaceId);
    const workspace = await this.getWorkspace(workspaceId);

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const memberIndex = workspace.members.findIndex((m) => m.uid === userId);
    if (memberIndex === -1) {
      throw new Error('User is not a member');
    }

    // 소유자 역할은 변경할 수 없음
    if (workspace.members[memberIndex].role === 'owner' && newRole !== 'owner') {
      throw new Error('Cannot change owner role');
    }

    const updatedMembers = [...workspace.members];
    updatedMembers[memberIndex] = {
      ...updatedMembers[memberIndex],
      role: newRole,
    };

    await updateDoc(docRef, {
      members: updatedMembers,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * 워크스페이스 소유자 이전
   */
  static async transferOwnership(
    workspaceId: string,
    newOwnerId: string,
    currentOwnerId: string
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, WORKSPACES_COLLECTION, workspaceId);
    const workspace = await this.getWorkspace(workspaceId);

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // 현재 사용자가 소유자인지 확인
    const currentOwner = workspace.members.find((m) => m.uid === currentOwnerId);
    if (!currentOwner || currentOwner.role !== 'owner') {
      throw new Error('Only the current owner can transfer ownership');
    }

    // 새 소유자가 멤버인지 확인
    const newOwner = workspace.members.find((m) => m.uid === newOwnerId);
    if (!newOwner) {
      throw new Error('New owner must be a member of the workspace');
    }

    // 새 소유자가 이미 소유자인 경우
    if (newOwner.role === 'owner') {
      throw new Error('User is already the owner');
    }

    // 멤버 역할 업데이트: 현재 소유자를 admin으로, 새 소유자를 owner로
    const updatedMembers = workspace.members.map((member) => {
      if (member.uid === currentOwnerId) {
        return { ...member, role: 'admin' as WorkspaceRole };
      }
      if (member.uid === newOwnerId) {
        return { ...member, role: 'owner' as WorkspaceRole };
      }
      return member;
    });

    await updateDoc(docRef, {
      members: updatedMembers,
      createdBy: newOwnerId, // 워크스페이스 생성자도 변경
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * 워크스페이스 실시간 구독
   */
  static subscribeToWorkspace(
    workspaceId: string,
    callback: (workspace: Workspace | null) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!db) {
      const error = new Error('Firestore is not initialized');
      onError?.(error);
      return () => {};
    }

    const docRef = doc(db, WORKSPACES_COLLECTION, workspaceId);

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback({
            id: docSnap.id,
            ...docSnap.data(),
          } as Workspace);
        } else {
          callback(null);
        }
      },
      (error) => {
        onError?.(error);
      }
    );

    return unsubscribe;
  }

  /**
   * 사용자의 워크스페이스 목록 실시간 구독
   * Note: 인덱스 없이 작동하도록 where만 사용하고 클라이언트에서 정렬
   */
  static subscribeToUserWorkspaces(
    userId: string,
    callback: (workspaces: Workspace[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!db) {
      const error = new Error('Firestore is not initialized');
      onError?.(error);
      return () => {};
    }

    // 인덱스 없이 작동하도록 where만 사용 (orderBy는 클라이언트에서 처리)
    const q = query(
      collection(db, WORKSPACES_COLLECTION),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const workspaces: Workspace[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const member = data.members?.find((m: WorkspaceMember) => m.uid === userId);
          if (member) {
            workspaces.push({
              id: doc.id,
              ...data,
            } as Workspace);
          }
        });
        // 클라이언트에서 updatedAt 기준으로 정렬
        const sortedWorkspaces = workspaces.sort((a, b) => {
          const aTime = new Date(a.updatedAt || a.createdAt).getTime();
          const bTime = new Date(b.updatedAt || b.createdAt).getTime();
          return bTime - aTime; // 내림차순
        });
        callback(sortedWorkspaces);
      },
      (error) => {
        onError?.(error);
      }
    );

    return unsubscribe;
  }

  /**
   * 기본 워크스페이스 확인 및 생성
   * 모든 사용자가 자동으로 멤버가 되는 기본 워크스페이스를 생성합니다.
   */
  static async ensureDefaultWorkspace(
    userId: string,
    userDisplayName?: string,
    userPhotoURL?: string
  ): Promise<Workspace> {
    if (!db) throw new Error('Firestore is not initialized');

    const DEFAULT_WORKSPACE_NAME = '회사 워크스페이스';
    const DEFAULT_WORKSPACE_ID = 'default-workspace';

    // 기본 워크스페이스가 이미 있는지 확인
    const defaultWorkspaceRef = doc(db, WORKSPACES_COLLECTION, DEFAULT_WORKSPACE_ID);
    const defaultWorkspaceSnap = await getDoc(defaultWorkspaceRef);

    if (defaultWorkspaceSnap.exists()) {
      const workspace = {
        id: defaultWorkspaceSnap.id,
        ...defaultWorkspaceSnap.data(),
      } as Workspace;

      // 현재 사용자가 멤버인지 확인
      const isMember = workspace.members.some((m) => m.uid === userId);
      if (!isMember) {
        // 멤버가 아니면 추가
        const now = new Date().toISOString();
        const newMember: WorkspaceMember = {
          uid: userId,
          role: 'member',
          joinedAt: now,
          displayName: userDisplayName,
          photoURL: userPhotoURL,
        };

        await updateDoc(defaultWorkspaceRef, {
          members: arrayUnion(newMember),
          updatedAt: now,
        });

        // 업데이트된 워크스페이스 반환
        return {
          ...workspace,
          members: [...workspace.members, newMember],
          updatedAt: now,
        };
      }

      return workspace;
    }

    // 기본 워크스페이스가 없으면 생성
    const now = new Date().toISOString();
    const defaultWorkspaceData: Omit<Workspace, 'id'> = {
      name: DEFAULT_WORKSPACE_NAME,
      description: '모든 직원이 참여하는 기본 워크스페이스입니다.',
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
      members: [
        {
          uid: userId,
          role: 'owner',
          joinedAt: now,
          displayName: userDisplayName,
          photoURL: userPhotoURL,
        },
      ],
      settings: DEFAULT_WORKSPACE_SETTINGS,
      isActive: true,
    };

    // undefined 필드 제거 (Firestore는 undefined를 허용하지 않음)
    const cleanedData = removeUndefinedFields(defaultWorkspaceData);
    // 고정된 ID로 워크스페이스 생성
    await setDoc(defaultWorkspaceRef, cleanedData);

    return {
      id: DEFAULT_WORKSPACE_ID,
      ...defaultWorkspaceData,
    };
  }
}

