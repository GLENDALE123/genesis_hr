export type ProjectStatus = 'planning' | 'in-progress' | 'completed' | 'on-hold';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ProjectMember {
    uid: string;
    role: 'owner' | 'admin' | 'member' | 'viewer';
    joinedAt: string;
}

export interface Project {
    id: string;
    title: string;
    description: string;
    workspaceId: string;

    // 연결된 채널/메시지 정보
    channelId?: string; // 프로젝트 전용 채널인 경우
    linkedMessageId?: string; // 일반 채널의 스레드로 생성된 경우

    // 소스 정보 (어디서 생성되었는지)
    source?: {
        type: 'quality-issue' | 'task' | 'other';
        id: string;
        ref?: any; // 추가 참조 데이터
    };

    status: ProjectStatus;
    priority: ProjectPriority;

    members: ProjectMember[];
    ownerId: string;

    createdAt: string;
    updatedAt: string;
    startDate?: string;
    dueDate?: string;

    tags?: string[];
}

export interface CreateProjectData {
    title: string;
    description: string;
    workspaceId: string;
    channelId?: string; // 선택된 채널
    source?: Project['source'];
    members?: string[]; // 초기 멤버 UID 목록
    priority?: ProjectPriority;
    status?: ProjectStatus;
    imageUrls?: string[]; // 이미지 URL 목록
}
