# 워크스페이스 Firestore 컬렉션 구조 개선안

## 현재 구조의 문제점

현재 최상위 컬렉션이 너무 많습니다:
- `workspaces`
- `channels`
- `channelMessages`
- `threads`
- `threadMessages`
- `messageReactions`
- `pinnedMessages`

이로 인해:
1. 컬렉션 관리가 복잡함
2. 쿼리 성능 저하 가능성
3. 데이터 구조 파악이 어려움
4. 확장성 문제

## 개선된 구조

### 최상위 컬렉션 (2개만 유지)

```
Firestore Root
├── workspaces/              # 워크스페이스 컬렉션
│   └── {workspaceId}/
│       ├── channels/       # 채널 서브컬렉션
│       │   └── {channelId}/
│       │       ├── messages/      # 메시지 서브컬렉션
│       │       ├── threads/       # 스레드 서브컬렉션
│       │       ├── reactions/     # 반응 서브컬렉션
│       │       ├── pinnedMessages/ # 고정 메시지 서브컬렉션
│       │       └── todos/         # 할 일 서브컬렉션
│       └── members/        # 워크스페이스 멤버 서브컬렉션 (선택적)
│
└── channels/               # 채널 컬렉션 (최상위, 빠른 조회용)
    └── {channelId}         # 채널 기본 정보만 저장 (메시지 등은 서브컬렉션)
```

## 상세 구조

### 1. workspaces 컬렉션
**경로**: `workspaces/{workspaceId}`

**문서 구조**: 기존과 동일

### 2. workspaces/{workspaceId}/channels 서브컬렉션
**경로**: `workspaces/{workspaceId}/channels/{channelId}`

**문서 구조**: 기존 channels와 동일하지만, 서브컬렉션으로 이동

**서브컬렉션들**:
- `messages/` - 채널 메시지
- `threads/` - 스레드
- `reactions/` - 메시지 반응
- `pinnedMessages/` - 고정 메시지
- `todos/` - 할 일

### 3. channels 컬렉션 (최상위, 빠른 조회용)
**경로**: `channels/{channelId}`

**문서 구조**: 채널 기본 정보만 저장 (메시지 등은 서브컬렉션에 저장)

```typescript
{
  workspaceId: string;
  name: string;
  description?: string;
  type: 'public' | 'private';
  category?: string;
  members: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  permissions: ChannelPermissions;
  isArchived: boolean;
  lastMessage?: {
    text: string;
    senderId: string;
    senderName: string;
    timestamp: string;
  };
  // 메시지, 스레드 등은 서브컬렉션에 저장
}
```

### 4. workspaces/{workspaceId}/channels/{channelId}/messages 서브컬렉션
**경로**: `workspaces/{workspaceId}/channels/{channelId}/messages/{messageId}`

**문서 구조**: 기존 `channelMessages`와 동일

### 5. workspaces/{workspaceId}/channels/{channelId}/threads 서브컬렉션
**경로**: `workspaces/{workspaceId}/channels/{channelId}/threads/{threadId}`

**문서 구조**: 기존 `threads`와 동일

### 6. workspaces/{workspaceId}/channels/{channelId}/reactions 서브컬렉션
**경로**: `workspaces/{workspaceId}/channels/{channelId}/reactions/{reactionId}`

**문서 구조**: 기존 `messageReactions`와 동일하지만, `channelId`와 `workspaceId` 필드 제거 (경로에 포함)

### 7. workspaces/{workspaceId}/channels/{channelId}/pinnedMessages 서브컬렉션
**경로**: `workspaces/{workspaceId}/channels/{channelId}/pinnedMessages/{pinnedMessageId}`

**문서 구조**: 기존 `pinnedMessages`와 동일하지만, `channelId`와 `workspaceId` 필드 제거 (경로에 포함)

### 8. workspaces/{workspaceId}/channels/{channelId}/todos 서브컬렉션
**경로**: `workspaces/{workspaceId}/channels/{channelId}/todos/{todoId}`

**문서 구조**: 기존과 동일

## 장점

1. **최상위 컬렉션 최소화**: `workspaces`와 `channels`만 유지
2. **논리적 그룹화**: 관련 데이터가 서브컬렉션으로 그룹화되어 관리 용이
3. **확장성**: 새로운 기능 추가 시 서브컬렉션으로 쉽게 추가 가능
4. **쿼리 효율성**: 특정 채널의 데이터만 조회할 때 효율적
5. **데이터 일관성**: 채널 삭제 시 모든 관련 데이터가 함께 삭제됨

## 단점 및 고려사항

1. **경로 길이**: 경로가 길어져 코드가 복잡해질 수 있음
2. **마이그레이션**: 기존 데이터를 새 구조로 마이그레이션 필요
3. **쿼리 제한**: 서브컬렉션은 부모 문서 없이는 직접 쿼리 불가
4. **인덱스**: 서브컬렉션 쿼리를 위한 인덱스 설정 필요

## 마이그레이션 전략

1. **단계적 마이그레이션**:
   - Phase 1: 새 구조로 데이터 저장 시작 (이중 저장)
   - Phase 2: 기존 데이터를 새 구조로 복사
   - Phase 3: 기존 컬렉션에서 읽기 중단
   - Phase 4: 기존 컬렉션 삭제

2. **데이터 복사 스크립트**:
   - Firebase Functions로 배치 작업 실행
   - 점진적으로 데이터 이전

3. **하위 호환성**:
   - 기존 코드와 새 코드가 공존할 수 있도록 래퍼 함수 제공

## 대안 구조 (채널 정보만 최상위)

만약 채널 조회 성능이 중요하다면:

```
Firestore Root
├── workspaces/{workspaceId}/
│   └── (워크스페이스 정보만)
│
└── channels/{channelId}/
    ├── (채널 기본 정보)
    ├── messages/{messageId}
    ├── threads/{threadId}
    ├── reactions/{reactionId}
    ├── pinnedMessages/{pinnedMessageId}
    └── todos/{todoId}
```

이 경우 최상위 컬렉션은 `workspaces`와 `channels` 2개만 유지됩니다.






