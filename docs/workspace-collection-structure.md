# 워크스페이스 Firestore 컬렉션 구조

## 전체 구조 개요

워크스페이스는 다음과 같은 컬렉션 구조를 가지고 있습니다:

```
Firestore Root
├── workspaces/              # 워크스페이스 컬렉션
│   └── {workspaceId}/
│       └── channels/       # 서브컬렉션 (사용 안 함)
│           └── {channelId}/
│               └── todos/   # 할 일 서브컬렉션
│
├── channels/               # 채널 컬렉션 (최상위)
│   └── {channelId}
│
├── channelMessages/        # 채널 메시지 컬렉션 (최상위)
│   └── {messageId}
│
├── threads/                # 스레드 컬렉션 (최상위)
│   └── {threadId}
│
├── threadMessages/         # 스레드 메시지 컬렉션 (최상위)
│   └── {messageId}
│
├── messageReactions/       # 메시지 반응 컬렉션 (최상위)
│   └── {reactionId}
│
└── pinnedMessages/         # 고정 메시지 컬렉션 (최상위)
    └── {pinnedMessageId}
```

## 상세 구조

### 1. workspaces 컬렉션
**경로**: `workspaces/{workspaceId}`

**문서 구조**:
```typescript
{
  name: string;                    // 워크스페이스 이름
  description?: string;             // 설명
  icon?: string;                    // 아이콘
  createdBy: string;                // 생성자 UID
  createdAt: string;                // 생성일 (ISO string)
  updatedAt: string;                // 수정일 (ISO string)
  members: WorkspaceMember[];       // 멤버 목록
  settings: WorkspaceSettings;      // 설정
  isActive: boolean;                // 활성화 여부
}
```

**WorkspaceMember**:
```typescript
{
  uid: string;                      // 사용자 UID
  role: 'owner' | 'admin' | 'member'; // 역할
  joinedAt: string;                 // 참여일 (ISO string)
  displayName?: string;             // 표시 이름
  photoURL?: string;                // 프로필 사진 URL
}
```

**WorkspaceSettings**:
```typescript
{
  allowMemberInvite: boolean;        // 멤버 초대 허용
  allowChannelCreation: boolean;     // 채널 생성 허용
  defaultChannelPermissions: {       // 기본 채널 권한
    canSendMessages: boolean;
    canEditMessages: boolean;
    canDeleteMessages: boolean;
    canManageChannel: boolean;
    canManageMembers: boolean;
  };
}
```

### 2. channels 컬렉션
**경로**: `channels/{channelId}`

**문서 구조**:
```typescript
{
  workspaceId: string;               // 워크스페이스 ID
  name: string;                     // 채널 이름
  description?: string;             // 설명
  type: 'public' | 'private';      // 공개/비공개
  category?: string;                // 카테고리 (general, department, project, topic)
  members: string[];                // 멤버 UID 목록
  createdBy: string;                // 생성자 UID
  createdAt: string;                // 생성일 (ISO string)
  updatedAt: string;                // 수정일 (ISO string)
  permissions: ChannelPermissions;  // 권한 설정
  isArchived: boolean;              // 아카이브 여부
  lastMessage?: {                   // 마지막 메시지 정보
    text: string;
    senderId: string;
    senderName: string;
    timestamp: string;
  };
}
```

**ChannelPermissions**:
```typescript
{
  canSendMessages: boolean;
  canEditMessages: boolean;
  canDeleteMessages: boolean;
  canManageChannel: boolean;
  canManageMembers: boolean;
}
```

### 3. channelMessages 컬렉션
**경로**: `channelMessages/{messageId}`

**문서 구조**:
```typescript
{
  directMessageRoomId: string;      // 채널 ID (하위 호환성)
  chatRoomId: string;               // 채널 ID
  text: string;                     // 메시지 텍스트
  sender: {                         // 발신자 정보
    uid: string;
    displayName: string;
    photoURL?: string;
  };
  timestamp: string;                // 전송 시간 (ISO string)
  status: 'sent' | 'pending' | 'failed'; // 상태
  readBy: string[];                // 읽은 사용자 UID 목록
  attachments?: MessageAttachment[]; // 첨부파일
  mentionedUserIds?: string[];      // 멘션된 사용자 UID 목록
  replyTo?: string;                 // 답장 대상 메시지 ID
  editedAt?: string;                // 수정일 (ISO string)
  editHistory?: EditHistory[];      // 수정 히스토리
  deletedAt?: string;               // 삭제일 (ISO string)
  deletedBy?: string;               // 삭제자 UID
}
```

**MessageAttachment**:
```typescript
{
  id: string;
  type: 'image' | 'file';
  name: string;
  url: string;
  thumbnailUrl?: string;
  size: number;
}
```

### 4. threads 컬렉션
**경로**: `threads/{threadId}`

**문서 구조**:
```typescript
{
  channelId: string;                // 채널 ID
  workspaceId: string;              // 워크스페이스 ID
  parentMessageId: string;         // 부모 메시지 ID
  messages: ChatMessage[];          // 스레드 메시지 목록
  participants: string[];           // 참여자 UID 목록
  createdAt: string;                // 생성일 (ISO string)
  updatedAt: string;                // 수정일 (ISO string)
  isResolved: boolean;              // 해결 여부
  unreadCount: Record<string, number>; // 사용자별 읽지 않은 메시지 수
}
```

### 5. threadMessages 컬렉션
**경로**: `threadMessages/{messageId}`

**문서 구조**: `ChatMessage`와 동일

### 6. messageReactions 컬렉션
**경로**: `messageReactions/{reactionId}`

**문서 구조**:
```typescript
{
  messageId: string;                // 메시지 ID
  channelId: string;                // 채널 ID
  workspaceId: string;              // 워크스페이스 ID
  emoji: string;                    // 이모지
  users: string[];                  // 반응한 사용자 UID 목록
  count: number;                    // 반응 수
  createdAt: string;                // 생성일 (ISO string)
  updatedAt: string;                // 수정일 (ISO string)
}
```

### 7. pinnedMessages 컬렉션
**경로**: `pinnedMessages/{pinnedMessageId}`

**문서 구조**:
```typescript
{
  messageId: string;                // 메시지 ID
  channelId: string;                // 채널 ID
  workspaceId: string;              // 워크스페이스 ID
  pinnedBy: string;                 // 고정한 사용자 UID
  pinnedAt: string;                 // 고정일 (ISO string)
  message: ChatMessage;             // 메시지 데이터
}
```

### 8. todos 서브컬렉션
**경로**: `workspaces/{workspaceId}/channels/{channelId}/todos/{todoId}`

**문서 구조**:
```typescript
{
  channelId: string;                // 채널 ID
  workspaceId: string;              // 워크스페이스 ID
  title: string;                    // 할 일 제목
  description?: string;             // 설명
  assigneeIds: string[];           // 담당자 UID 목록
  dueDate?: Timestamp;              // 마감일
  completed: boolean;               // 완료 여부
  completedAt?: Timestamp;          // 완료일
  completedBy?: string;             // 완료한 사용자 UID
  createdAt: Timestamp;             // 생성일
  createdBy: string;                // 생성자 UID
  updatedAt: Timestamp;             // 수정일
  updatedBy: string;                // 수정자 UID
  messageId?: string;               // 메시지에서 생성된 경우 원본 메시지 ID
  priority?: 'low' | 'medium' | 'high'; // 우선순위
  unreadCommentCount?: number;      // 읽지 않은 댓글 수
  lastCommentAt?: Timestamp;        // 마지막 댓글 시간
  commentCount?: number;            // 총 댓글 수
}
```

## 인덱스 요구사항

다음 쿼리를 위해 Firestore 인덱스가 필요합니다:

1. **channelMessages**:
   - `chatRoomId` + `timestamp` (desc)
   - `chatRoomId` + `createdAt` (desc)

2. **channels**:
   - `workspaceId` + `isArchived` + `createdAt` (asc)
   - `workspaceId` + `members` (array-contains)

3. **threads**:
   - `channelId` + `workspaceId` + `updatedAt` (desc)

4. **messageReactions**:
   - `messageId` + `emoji`

5. **pinnedMessages**:
   - `channelId` + `workspaceId` + `pinnedAt` (desc)

6. **todos**:
   - `workspaceId` + `channelId` + `createdAt` (desc)
   - `workspaceId` + `assigneeIds` (array-contains) + `completed` + `dueDate`

## 주의사항

1. **undefined 필드**: Firestore는 `undefined` 값을 허용하지 않으므로, 모든 필드는 `null`이거나 값이 있어야 합니다.

2. **서브컬렉션 vs 최상위 컬렉션**: 
   - `todos`는 서브컬렉션으로 저장됩니다 (`workspaces/{workspaceId}/channels/{channelId}/todos`)
   - 나머지는 모두 최상위 컬렉션으로 저장됩니다

3. **타임스탬프**: 
   - 대부분의 서비스는 ISO string을 사용하지만, `todos`는 Firestore `Timestamp`를 사용합니다.

4. **읽지 않은 메시지 수**: 
   - `channels` 컬렉션의 각 채널 문서에 `unreadCount` 필드가 있을 수 있습니다 (별도 서비스에서 관리)




