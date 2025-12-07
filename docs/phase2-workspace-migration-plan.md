# Phase 2: Workspace 서브모듈 분리 계획

## 현재 상태
- workspace 피처에 33개 컴포넌트, 21개 서비스, 여러 타입 파일이 혼재

## 목표 구조

```
features/workspace/
├── channels/              # 채널 관리
├── messages/              # 메시지 관리  
├── threads/               # 스레드 관리
├── reactions/             # 반응/이모지
├── approvals/             # 승인/결제
├── todos/                 # 할 일 관리
├── members/               # 멤버 관리
└── [공통 파일들]          # WorkspaceMessagePage, WorkspaceSidebar 등
```

## 파일 분류

### channels/ 서브모듈
**Components:**
- ChannelList.tsx
- ChannelView.tsx
- ChannelHeader.tsx
- ChannelSettingsDialog.tsx
- ChannelInviteDialog.tsx
- ChannelSearchDialog.tsx
- ChannelNotificationSettings.tsx
- ChannelMemberManagement.tsx
- ChannelRightSidebar.tsx
- ChannelBoardView.tsx
- DraggableChannelItem.tsx

**Services:**
- channelService.ts
- channelSearchService.ts

**Types:**
- channel.types.ts

### messages/ 서브모듈
**Components:**
- ChannelMessage.tsx
- ChannelMessageView.tsx
- ChannelMessageComposer.tsx
- MessageEditDialog.tsx
- MessageEditHistoryDialog.tsx
- MessageToTodoButton.tsx

**Services:**
- channelMessageService.ts
- messageEditService.ts
- messageEditHistoryService.ts
- messageDeleteService.ts
- pinnedMessageService.ts
- bookmarkService.ts
- mentionService.ts
- unreadMessageService.ts

**Types:**
- message.types.ts
- channelMessage.types.ts

### threads/ 서브모듈
**Components:**
- ThreadView.tsx

**Services:**
- threadService.ts

**Types:**
- thread.types.ts

### reactions/ 서브모듈
**Components:**
- ReactionPicker.tsx
- EmojiPicker.tsx

**Services:**
- reactionService.ts

**Types:**
- reaction.types.ts

### approvals/ 서브모듈
**Components:**
- ApprovalManagementPanel.tsx
- ReimbursementAdvanceManagementPanel.tsx
- ReimbursementAdvanceRequestDialog.tsx
- ReportRequestDialog.tsx

**Services:**
- approvalService.ts
- paymentService.ts
- reimbursementAdvanceService.ts

**Types:**
- approval.types.ts
- payment.types.ts
- reimbursementAdvance.types.ts

### todos/ 서브모듈
**Components:**
- TodoList.tsx
- TodoItem.tsx
- TodoForm.tsx
- TodoFilter.tsx
- TodoDetailModal.tsx

**Services:**
- todoService.ts
- todoNotificationService.ts

**Store:**
- todoStore.ts

**Types:**
- todo.types.ts

### members/ 서브모듈
**Components:**
- UserProfileCard.tsx
- UserCustomStatusDialog.tsx

### notifications/ 서브모듈
**Components:**
- (ChannelNotificationSettings는 channels로 이동)

**Services:**
- notificationSettingsService.ts

## 공통 파일 (workspace 루트 유지)
- WorkspaceMessagePage.tsx
- WorkspaceSidebar.tsx
- WorkspaceSettingsDialog.tsx
- UrlPreview.tsx
- KeyboardShortcutsDialog.tsx
- workspaceService.ts
- workspaceStore.ts
- workspace.types.ts
- constants.ts
- utils/ (공통 유틸)

## 마이그레이션 단계

1. **서브모듈 디렉토리 생성**
2. **todos 서브모듈부터 이동** (가장 독립적)
3. **reactions 서브모듈 이동**
4. **threads 서브모듈 이동**
5. **messages 서브모듈 이동**
6. **channels 서브모듈 이동**
7. **approvals 서브모듈 이동**
8. **members 서브모듈 이동**
9. **notifications 서브모듈 이동**
10. **Import 경로 업데이트**

## 진행 순서

작업량이 많으므로 단계적으로 진행:
1. 서브모듈 디렉토리 구조 생성
2. 가장 독립적인 서브모듈부터 이동 (todos, reactions, threads)
3. 의존성이 있는 서브모듈 이동 (messages, channels)
4. 복잡한 서브모듈 이동 (approvals)
5. Import 경로 일괄 업데이트


