
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import { Project, CreateProjectData } from '../types/project.types';
import { ChannelMessageService } from '@/features/workspace/messages/services/channelMessageService';
import { ChannelService } from '@/features/workspace/channels/services/channelService';

const COLLECTION_NAME = 'projects';

export class ProjectService {
  /**
   * 프로젝트 생성
   * 1. Projects 컬렉션에 문서 생성
   * 2. 선택된 채널에 "프로젝트 생성됨" 메시지 전송 (및 링크)
   */
  static async createProject(
    data: CreateProjectData,
    creator: { uid: string; displayName: string; photoURL?: string }
  ): Promise<string> {
    if (!db) throw new Error('Firestore is not initialized');

    const now = new Date().toISOString();

    const projectData: Omit<Project, 'id'> = {
      title: data.title,
      description: data.description,
      workspaceId: data.workspaceId,
      channelId: data.channelId,
      source: data.source,
      status: data.status || 'planning',
      priority: data.priority || 'medium',
      members: [
        {
          uid: creator.uid,
          role: 'owner',
          joinedAt: now
        },
        ...(data.members || []).map(uid => ({
          uid,
          role: 'member' as const,
          joinedAt: now
        }))
      ],
      ownerId: creator.uid,
      createdAt: now,
      updatedAt: now,
    };

    // 1. 프로젝트 문서 생성
    const projectsRef = collection(db, COLLECTION_NAME);
    const docRef = await addDoc(projectsRef, projectData);
    const projectId = docRef.id;

    // 2. 채널에 알림 메시지 전송 (선택된 채널이 있다면)
    if (data.channelId) {
      try {
        // 품질이슈에서 생성된 프로젝트인 경우 특별한 메시지 타입 사용
        const isQualityIssueProject = data.source?.type === 'quality-issue';
        
        const messageText = isQualityIssueProject
          ? `🚀 **새 프로젝트가 시작되었습니다**\n\n**${data.title}**`
          : `🚀 ** 새 프로젝트가 시작되었습니다 **\n\n ** ${data.title}**\n${data.description} \n\n[프로젝트 보기](project://${projectId})`;

        // 이미지 첨부파일 설정
        const attachments = data.imageUrls ? data.imageUrls.map((url, index) => ({
          id: typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${index}-${Math.random().toString(36).substring(2, 9)}`,
          type: 'image' as const,
          url: url,
          name: '첨부 이미지',
          size: 0
        })) : undefined;

        // 메타데이터 설정 (품질이슈 프로젝트인 경우)
        const metadata = isQualityIssueProject && data.source?.id
          ? {
              type: 'project-quality-issue' as const,
              projectId: projectId,
              issueId: data.source.id,
            }
          : undefined;

        const messageId = await ChannelMessageService.sendMessage(
          data.channelId,
          data.workspaceId,
          messageText,
          creator,
          attachments,
          undefined,
          undefined,
          metadata
        );

        // 메시지 ID를 프로젝트에 업데이트 (링크)
        await updateDoc(docRef, {
          linkedMessageId: messageId
        });

        // 채널의 viewType을 'project'로 업데이트 (프로젝트가 있는 채널은 프로젝트 뷰로 표시)
        try {
          const channel = await ChannelService.getChannel(data.channelId, data.workspaceId);
          if (channel && channel.viewType !== 'project') {
            await ChannelService.updateChannel(data.channelId, data.workspaceId, {
              viewType: 'project' as const,
            });
          }
        } catch (error) {
          console.error('Failed to update channel viewType:', error);
          // 채널 업데이트 실패는 프로젝트 생성 실패로 처리하지 않음
        }
      } catch (error) {
        console.error('Failed to send project notification message:', error);
      }
    }

    return projectId;
  }

  /**
   * 프로젝트 조회 via ID
   */
  static async getProject(projectId: string): Promise<Project | null> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, COLLECTION_NAME, projectId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Project;
    }
    return null;
  }

  /**
   * 채널별 프로젝트 목록 조회
   */
  static async getProjectsByChannel(channelId: string, workspaceId: string): Promise<Project[]> {
    if (!db) throw new Error('Firestore is not initialized');

    const q = query(
      collection(db, COLLECTION_NAME),
      where('channelId', '==', channelId),
      where('workspaceId', '==', workspaceId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Project[];
  }
}
