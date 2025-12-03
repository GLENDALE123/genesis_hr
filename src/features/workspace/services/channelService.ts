/**
 * 채널 서비스
 * Firestore 기반 채널 관리
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import { removeUndefinedFields } from '@/shared/utils/firestoreUtils';
import type {
  Channel,
  CreateChannelData,
  UpdateChannelData,
  ChannelMemberUpdate,
} from '../types/channel.types';
import { createDefaultChannelPermissions } from '../utils/permissions';
import { getAllUsersWithAuthInfo } from '@/shared/services/firebase/userManagement';
import { DEPARTMENT_OPTIONS } from '@/shared/constants/departments';

const CHANNELS_COLLECTION = 'channels';

export class ChannelService {
  /**
   * 채널 생성
   */
  static async createChannel(data: CreateChannelData, createdBy: string): Promise<string> {
    if (!db) throw new Error('Firestore is not initialized');

    const now = new Date().toISOString();
    const permissions = data.permissions
      ? { ...createDefaultChannelPermissions(data.type), ...data.permissions }
      : createDefaultChannelPermissions(data.type);

    const channelData: Omit<Channel, 'id'> = {
      workspaceId: data.workspaceId,
      name: data.name,
      description: data.description,
      type: data.type,
      category: data.category,
      members: data.memberIds ? [...data.memberIds, createdBy] : [createdBy],
      createdBy,
      createdAt: now,
      updatedAt: now,
      permissions,
      isArchived: false,
    };

    // undefined 필드 제거 (Firestore는 undefined를 허용하지 않음)
    const cleanedData = removeUndefinedFields(channelData);
    const docRef = await addDoc(collection(db, CHANNELS_COLLECTION), cleanedData);
    return docRef.id;
  }

  /**
   * 채널 조회
   */
  static async getChannel(channelId: string): Promise<Channel | null> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, CHANNELS_COLLECTION, channelId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as Channel;
  }

  /**
   * 워크스페이스의 채널 목록 조회
   */
  static async getWorkspaceChannels(
    workspaceId: string,
    includeArchived = false
  ): Promise<Channel[]> {
    if (!db) throw new Error('Firestore is not initialized');

    const q = query(
      collection(db, CHANNELS_COLLECTION),
      where('workspaceId', '==', workspaceId),
      where('isArchived', '==', includeArchived),
      orderBy('createdAt', 'asc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Channel[];
  }

  /**
   * 사용자가 접근 가능한 채널 목록 조회
   */
  static async getUserChannels(
    workspaceId: string,
    userId: string
  ): Promise<Channel[]> {
    if (!db) throw new Error('Firestore is not initialized');

    // 워크스페이스의 모든 채널 가져오기
    const allChannels = await this.getWorkspaceChannels(workspaceId, false);

    // 사용자가 접근 가능한 채널만 필터링
    return allChannels.filter((channel) => {
      // 공개 채널은 모든 멤버 접근 가능
      if (channel.type === 'public') return true;
      // 비공개 채널은 멤버만 접근 가능
      return channel.members.includes(userId);
    });
  }

  /**
   * 채널 업데이트
   */
  static async updateChannel(
    channelId: string,
    data: UpdateChannelData
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, CHANNELS_COLLECTION, channelId);
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.topic !== undefined) updateData.topic = data.topic;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.permissions !== undefined) {
      const channel = await this.getChannel(channelId);
      if (channel) {
        updateData.permissions = {
          ...channel.permissions,
          ...data.permissions,
        };
      }
    }

    await updateDoc(docRef, updateData);
  }

  /**
   * 채널 삭제 (아카이브)
   */
  static async archiveChannel(channelId: string): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, CHANNELS_COLLECTION, channelId);
    await updateDoc(docRef, {
      isArchived: true,
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * 채널 복원
   */
  static async unarchiveChannel(channelId: string): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, CHANNELS_COLLECTION, channelId);
    await updateDoc(docRef, {
      isArchived: false,
      archivedAt: null,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * 채널 멤버 추가/제거
   */
  static async updateChannelMembers(
    data: ChannelMemberUpdate
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, CHANNELS_COLLECTION, data.channelId);
    const channel = await this.getChannel(data.channelId);

    if (!channel) {
      throw new Error('Channel not found');
    }

    if (data.action === 'add') {
      // 중복 제거
      const newMembers = [...new Set([...channel.members, ...data.memberIds])];
      await updateDoc(docRef, {
        members: newMembers,
        updatedAt: new Date().toISOString(),
      });
    } else {
      // 제거
      const updatedMembers = channel.members.filter(
        (id) => !data.memberIds.includes(id)
      );
      await updateDoc(docRef, {
        members: updatedMembers,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * 채널 마지막 메시지 업데이트
   */
  static async updateLastMessage(
    channelId: string,
    lastMessage: Channel['lastMessage']
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, CHANNELS_COLLECTION, channelId);
    await updateDoc(docRef, {
      lastMessage,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * 채널 읽지 않은 메시지 수 업데이트
   */
  static async updateUnreadCount(
    channelId: string,
    userId: string,
    count: number
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, CHANNELS_COLLECTION, channelId);
    const channel = await this.getChannel(channelId);

    if (!channel) {
      throw new Error('Channel not found');
    }

    const unreadCount = channel.unreadCount || {};
    unreadCount[userId] = count;

    await updateDoc(docRef, {
      unreadCount,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * 채널 실시간 구독
   */
  static subscribeToChannel(
    channelId: string,
    callback: (channel: Channel | null) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!db) {
      const error = new Error('Firestore is not initialized');
      onError?.(error);
      return () => {};
    }

    const docRef = doc(db, CHANNELS_COLLECTION, channelId);

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback({
            id: docSnap.id,
            ...docSnap.data(),
          } as Channel);
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
   * 워크스페이스 채널 목록 실시간 구독
   */
  static subscribeToWorkspaceChannels(
    workspaceId: string,
    callback: (channels: Channel[]) => void,
    onError?: (error: Error) => void,
    includeArchived = false
  ): () => void {
    if (!db) {
      const error = new Error('Firestore is not initialized');
      onError?.(error);
      return () => {};
    }

    const q = query(
      collection(db, CHANNELS_COLLECTION),
      where('workspaceId', '==', workspaceId),
      where('isArchived', '==', includeArchived),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const channels: Channel[] = [];
        querySnapshot.forEach((doc) => {
          channels.push({
            id: doc.id,
            ...doc.data(),
          } as Channel);
        });
        callback(channels);
      },
      (error) => {
        onError?.(error);
      }
    );

    return unsubscribe;
  }

  /**
   * 기본 채널 생성
   * 워크스페이스 생성 시 자동으로 생성되는 기본 채널들
   */
  static async createDefaultChannels(
    workspaceId: string,
    createdBy: string
  ): Promise<Channel[]> {
    if (!db) throw new Error('Firestore is not initialized');

    // 모든 사용자 가져오기 (기본 채널에 모든 사용자 추가)
    let allUserIds: string[] = [];
    try {
      const allUsers = await getAllUsersWithAuthInfo();
      allUserIds = allUsers.map((user) => user.uid).filter((uid) => !!uid);
    } catch (error) {
      console.error('Failed to get all users for default channels:', error);
      // 사용자 목록을 가져오지 못해도 기본 채널은 생성
      allUserIds = [createdBy];
    }

    const now = new Date().toISOString();
    const createdChannels: Channel[] = [];

    // 1. 일반 채널
    const generalChannelData: Omit<Channel, 'id'> = {
      workspaceId,
      name: '일반',
      description: '일반적인 대화를 나누는 채널입니다.',
      type: 'public',
      members: allUserIds,
      createdBy,
      createdAt: now,
      updatedAt: now,
      permissions: createDefaultChannelPermissions('public'),
      isArchived: false,
    };

    // undefined 필드 제거 (Firestore는 undefined를 허용하지 않음)
    const cleanedGeneralData = removeUndefinedFields(generalChannelData);
    const generalChannelRef = await addDoc(
      collection(db, CHANNELS_COLLECTION),
      cleanedGeneralData
    );
    createdChannels.push({
      id: generalChannelRef.id,
      workspaceId,
      ...cleanedGeneralData,
    } as Channel);

    // 2. 공지사항 채널
    const announcementsChannelData: Omit<Channel, 'id'> = {
      workspaceId,
      name: '공지사항',
      description: '중요한 공지사항을 공유하는 채널입니다.',
      type: 'public',
      members: allUserIds,
      createdBy,
      createdAt: now,
      updatedAt: now,
      permissions: createDefaultChannelPermissions('public'),
      isArchived: false,
    };

    // undefined 필드 제거 (Firestore는 undefined를 허용하지 않음)
    const cleanedAnnouncementsData = removeUndefinedFields(announcementsChannelData);
    const announcementsChannelRef = await addDoc(
      collection(db, CHANNELS_COLLECTION),
      cleanedAnnouncementsData
    );
    createdChannels.push({
      id: announcementsChannelRef.id,
      workspaceId,
      ...cleanedAnnouncementsData,
    } as Channel);

    // 3. 부서별 채널 생성
    for (const department of DEPARTMENT_OPTIONS) {
      const departmentChannelData: Omit<Channel, 'id'> = {
        workspaceId,
        name: department,
        description: `${department} 전용 채널입니다.`,
        type: 'public',
        category: 'department',
        members: allUserIds, // 모든 사용자를 멤버로 추가 (나중에 필터링 가능)
        createdBy,
        createdAt: now,
        updatedAt: now,
        permissions: createDefaultChannelPermissions('public'),
        isArchived: false,
      };

      // undefined 필드 제거 (Firestore는 undefined를 허용하지 않음)
      const cleanedDepartmentData = removeUndefinedFields(departmentChannelData);
      const departmentChannelRef = await addDoc(
        collection(db, CHANNELS_COLLECTION),
        cleanedDepartmentData
      );
      createdChannels.push({
        id: departmentChannelRef.id,
        workspaceId,
        ...cleanedDepartmentData,
      } as Channel);
    }

    return createdChannels;
  }
}

