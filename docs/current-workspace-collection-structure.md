# 현재 워크스페이스 Firestore 컬렉션 구조

## 전체 구조 개요

현재 워크스페이스는 **완전히 서브컬렉션 기반 구조**를 사용하고 있습니다:

```
Firestore Root
└── workspaces/                    # 워크스페이스 컬렉션
    └── {workspaceId}/
        └── channels/              # 채널 서브컬렉션
            └── {channelId}/
                ├── messages/     # 메시지 서브컬렉션
                ├── threads/       # 스레드 서브컬렉션
                ├── todos/         # 할 일 서브컬렉션
                ├── pinnedMessages/ # 고정 메시지 서브컬렉션
                └── messageEditHistory/ # 메시지 수정 히스토리 서브컬렉션

messageReactions/              # 메시지 반응 컬렉션 (최상위)
    └── {reactionId}
```

## 상세 구조

### 1. 워크스페이스 컬렉션
**경로**: `workspaces/{workspaceId}`

**문서 구조**:
```typescript
{
  name: string;
  description?: string;
  icon?: string;
  createdBy: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  members: WorkspaceMember[];
  settings: WorkspaceSettings;
  isActive: boolean;
}
```

### 2. 채널 서브컬렉션
**경로**: `workspaces/{workspaceId}/channels/{channelId}`

**문서 구조**:
```typescript
{
  workspaceId: string;
  name: string;
  description?: string;
  type: 'public' | 'private';
  category?: string;
  members: string[]; // 멤버 UID 목록
  createdBy: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  permissions: ChannelPermissions;
  isArchived: boolean;
  lastMessage?: {
    text: string;
    senderId: string;
    senderName: string;
    timestamp: string;
  };
}
```

### 3. 메시지 서브컬렉션
**경로**: `workspaces/{workspaceId}/channels/{channelId}/messages/{messageId}`

**문서 구조**:
```typescript
{
  channelId: string;
  workspaceId: string;
  text: string;
  sender: {
    uid: string;
    displayName: string;
    photoURL?: string;
  };
  timestamp: string; // ISO string
  readBy: string[]; // 읽은 사용자 UID 목록
  attachments?: ChannelMessageAttachment[];
  mentionedUserIds?: string[];
  replyTo?: string;
  editedAt?: string; // ISO string
  editHistory?: EditHistory[];
  deletedAt?: string; // ISO string
  deletedBy?: string;
}
```

### 4. 스레드 서브컬렉션
**경로**: `workspaces/{workspaceId}/channels/{channelId}/threads/{threadId}`

**문서 구조**:
```typescript
{
  channelId: string;
  workspaceId: string;
  parentMessageId: string;
  messages: ChannelMessage[]; // 스레드 메시지 목록
  participants: string[]; // 참여자 UID 목록
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  isResolved: boolean;
  unreadCount: Record<string, number>; // 사용자별 읽지 않은 메시지 수
}
```

### 5. 할 일 서브컬렉션
**경로**: `workspaces/{workspaceId}/channels/{channelId}/todos/{todoId}`

**문서 구조**:
```typescript
{
  channelId: string;
  workspaceId: string;
  title: string;
  description?: string;
  assigneeIds: string[];
  dueDate?: Timestamp;
  completed: boolean;
  completedAt?: Timestamp;
  completedBy?: string;
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
  messageId?: string;
  priority?: 'low' | 'medium' | 'high';
}
```

### 6. 고정 메시지 서브컬렉션
**경로**: `workspaces/{workspaceId}/channels/{channelId}/pinnedMessages/{pinnedMessageId}`

**문서 구조**:
```typescript
{
  messageId: string;
  channelId: string;
  workspaceId: string;
  pinnedBy: string;
  pinnedAt: string; // ISO string
  message: ChannelMessage;
}
```

### 7. 메시지 수정 히스토리 서브컬렉션
**경로**: `workspaces/{workspaceId}/channels/{channelId}/messageEditHistory/{historyId}`

**문서 구조**:
```typescript
{
  messageId: string;
  channelId: string;
  workspaceId: string;
  editedBy: string;
  editedAt: string; // ISO string
  previousText: string;
  newText: string;
}
```

### 8. 메시지 반응 컬렉션 (최상위)
**경로**: `messageReactions/{reactionId}`

**문서 구조**:
```typescript
{
  messageId: string;
  channelId: string;
  workspaceId: string;
  emoji: string;
  users: string[]; // 반응한 사용자 UID 목록
  count: number;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}
```

**참고**: 반응(reactions)은 현재 최상위 컬렉션 `messageReactions`를 사용하고 있습니다. 향후 서브컬렉션으로 이동할 수 있습니다.

## 주요 특징

1. **완전한 서브컬렉션 구조**: 모든 데이터가 `workspaces/{workspaceId}/channels/{channelId}/...` 경로 하위에 위치
2. **논리적 그룹화**: 관련 데이터가 채널별로 그룹화되어 관리 용이
3. **확장성**: 새로운 기능 추가 시 서브컬렉션으로 쉽게 추가 가능
4. **데이터 일관성**: 채널 삭제 시 모든 관련 데이터가 함께 삭제됨

## 서비스별 경로 함수

각 서비스에서 사용하는 경로 함수들:

- **ChannelService**: `workspaces/{workspaceId}/channels`
- **ChannelMessageService**: `workspaces/{workspaceId}/channels/{channelId}/messages`
- **ThreadService**: `workspaces/{workspaceId}/channels/{channelId}/threads`
- **TodoService**: `workspaces/{workspaceId}/channels/{channelId}/todos`
- **PinnedMessageService**: `workspaces/{workspaceId}/channels/{channelId}/pinnedMessages`
- **MessageEditHistoryService**: `workspaces/{workspaceId}/channels/{channelId}/messageEditHistory`
- **ReactionService**: `messageReactions` (최상위 컬렉션)

## 주의사항

1. **undefined 필드**: Firestore는 `undefined` 값을 허용하지 않으므로, 모든 필드는 `null`이거나 값이 있어야 합니다.
2. **타임스탬프**: 
   - 대부분의 서비스는 ISO string을 사용 (`timestamp: string`)
   - `todos`는 Firestore `Timestamp`를 사용 (`createdAt: Timestamp`)
3. **경로 길이**: 서브컬렉션 구조로 인해 경로가 길어지지만, 논리적 그룹화의 이점이 큼

