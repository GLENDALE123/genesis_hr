# 📁 프로젝트 폴더 구조 개선안

## 🎯 개선 목표

1. **관심사 분리 강화**: 각 모듈의 책임 범위 명확화
2. **확장성 향상**: 새 기능 추가 시 기존 코드 영향 최소화
3. **유지보수성 향상**: 관련 코드를 논리적으로 그룹화
4. **재사용성 향상**: 공통 코드와 피처별 코드 명확히 분리

---

## 📊 현재 구조 분석

### 🔴 주요 이슈

1. **workspace 피처가 과도하게 큼**
   - 31개 컴포넌트, 23개 서비스
   - 여러 도메인(채널, 메시지, 결제, 승인 등)이 혼재

2. **shared/utils가 과도하게 많음**
   - 15개 파일이 단일 디렉토리에 존재
   - 카테고리별 분리 필요

3. **위치가 적절하지 않은 파일들**
   - `app/production/schedule/excel/` → `features/production/`으로 이동 필요
   - `shared/components/auth/` → `features/auth/`로 이동 필요

4. **shared/services 구조 불명확**
   - migration 폴더가 비어있거나 미사용 가능성

---

## 🏗️ 개선된 폴더 구조

```
src/
├── app/                              # 앱 레벨 설정
│   ├── routes/                      # 중앙 집중식 라우트
│   │   └── index.tsx
│   ├── pages/                       # 페이지 컴포넌트 (최소한의 로직만)
│   │   ├── HomePage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   └── ...
│   ├── providers/                   # 전역 Provider
│   │   ├── AppStateProvider.tsx
│   │   ├── ThemeProvider.tsx
│   │   └── NotificationProvider.tsx
│   ├── store/                       # 전역 상태 관리
│   │   ├── globalStore.ts
│   │   ├── devStore.ts
│   │   └── index.ts
│   └── config/                      # 앱 설정
│       └── constants.ts
│
├── features/                         # 피처별 모듈
│   ├── auth/                        # 인증 피처 ✅ (이미 잘 구성됨)
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   ├── types/
│   │   ├── utils/
│   │   └── index.ts
│   │
│   ├── workspace/                   # 워크스페이스 (메인)
│   │   ├── channels/                # 채널 관리 서브모듈
│   │   │   ├── components/
│   │   │   │   ├── ChannelList.tsx
│   │   │   │   ├── ChannelView.tsx
│   │   │   │   ├── ChannelHeader.tsx
│   │   │   │   ├── ChannelSettingsDialog.tsx
│   │   │   │   └── ...
│   │   │   ├── services/
│   │   │   │   ├── channelService.ts
│   │   │   │   ├── channelSearchService.ts
│   │   │   │   └── ...
│   │   │   └── types/
│   │   │       └── channel.types.ts
│   │   │
│   │   ├── messages/                # 메시지 관리 서브모듈
│   │   │   ├── components/
│   │   │   │   ├── MessageEditDialog.tsx
│   │   │   │   ├── MessageEditHistoryDialog.tsx
│   │   │   │   ├── MessageQuote.tsx
│   │   │   │   ├── MessageBookmarkList.tsx
│   │   │   │   └── ...
│   │   │   ├── services/
│   │   │   │   ├── channelMessageService.ts
│   │   │   │   ├── messageEditService.ts
│   │   │   │   ├── messageEditHistoryService.ts
│   │   │   │   ├── messageDeleteService.ts
│   │   │   │   ├── pinnedMessageService.ts
│   │   │   │   └── ...
│   │   │   └── types/
│   │   │       └── message.types.ts
│   │   │
│   │   ├── threads/                 # 스레드 관리 서브모듈
│   │   │   ├── components/
│   │   │   │   ├── ThreadView.tsx
│   │   │   │   └── ...
│   │   │   ├── services/
│   │   │   │   ├── threadService.ts
│   │   │   │   └── ...
│   │   │   └── types/
│   │   │       └── thread.types.ts
│   │   │
│   │   ├── reactions/               # 반응/이모지 서브모듈
│   │   │   ├── components/
│   │   │   │   ├── ReactionPicker.tsx
│   │   │   │   └── EmojiPicker.tsx
│   │   │   ├── services/
│   │   │   │   ├── reactionService.ts
│   │   │   │   └── emojiService.ts
│   │   │   └── types/
│   │   │       └── reaction.types.ts
│   │   │
│   │   ├── approvals/               # 승인/결제 서브모듈
│   │   │   ├── components/
│   │   │   │   ├── ApprovalManagementPanel.tsx
│   │   │   │   ├── ReimbursementAdvanceManagementPanel.tsx
│   │   │   │   ├── ReimbursementAdvanceRequestDialog.tsx
│   │   │   │   └── ReportRequestDialog.tsx
│   │   │   ├── services/
│   │   │   │   ├── approvalService.ts
│   │   │   │   ├── paymentService.ts
│   │   │   │   └── reimbursementAdvanceService.ts
│   │   │   └── types/
│   │   │       ├── approval.types.ts
│   │   │       └── payment.types.ts
│   │   │
│   │   ├── search/                  # 검색 서브모듈
│   │   │   ├── components/
│   │   │   │   ├── ChannelSearchDialog.tsx
│   │   │   │   └── GlobalSearchDialog.tsx
│   │   │   ├── services/
│   │   │   │   ├── channelSearchService.ts (channels로 이동 가능)
│   │   │   │   └── globalSearchService.ts
│   │   │   └── types/
│   │   │
│   │   ├── invitations/             # 초대 관리 서브모듈
│   │   │   ├── components/
│   │   │   │   ├── ChannelInviteDialog.tsx
│   │   │   │   ├── InviteLinkDialog.tsx
│   │   │   │   └── ...
│   │   │   ├── services/
│   │   │   │   └── inviteService.ts
│   │   │   └── types/
│   │   │
│   │   ├── members/                 # 멤버 관리 서브모듈
│   │   │   ├── components/
│   │   │   │   ├── ChannelMemberManagement.tsx
│   │   │   │   └── UserProfileCard.tsx
│   │   │   └── types/
│   │   │
│   │   ├── notifications/           # 알림 설정 서브모듈
│   │   │   ├── components/
│   │   │   │   └── ChannelNotificationSettings.tsx
│   │   │   ├── services/
│   │   │   │   └── notificationSettingsService.ts
│   │   │   └── types/
│   │   │
│   │   ├── components/              # 공통 워크스페이스 컴포넌트
│   │   │   ├── WorkspaceMessagePage.tsx
│   │   │   ├── WorkspaceSidebar.tsx
│   │   │   ├── WorkspaceSettingsDialog.tsx
│   │   │   ├── DragDropZone.tsx
│   │   │   ├── FilePreview.tsx
│   │   │   ├── UrlPreview.tsx
│   │   │   ├── KeyboardShortcutsDialog.tsx
│   │   │   └── UserCustomStatusDialog.tsx
│   │   │
│   │   ├── hooks/                   # 워크스페이스 공통 훅
│   │   │   └── useKeyboardShortcuts.ts
│   │   │
│   │   ├── services/                # 워크스페이스 공통 서비스
│   │   │   ├── workspaceService.ts
│   │   │   ├── bookmarkService.ts
│   │   │   ├── mentionService.ts
│   │   │   ├── typingService.ts
│   │   │   ├── unreadMessageService.ts
│   │   │   └── urlPreviewService.ts
│   │   │
│   │   ├── store/                   # 워크스페이스 전역 상태
│   │   │   ├── workspaceStore.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── types/                   # 워크스페이스 공통 타입
│   │   │   └── workspace.types.ts
│   │   │
│   │   ├── utils/                   # 워크스페이스 공통 유틸
│   │   │   ├── messageUtils.ts
│   │   │   └── permissions.ts
│   │   │
│   │   └── index.ts                 # 워크스페이스 진입점
│   │
│   ├── production/                  # 생산 관리 피처
│   │   ├── daily-report/            # 일일 리포트 서브모듈
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   └── types/
│   │   │
│   │   ├── schedule/                # 생산 일정 서브모듈
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   ├── excel/               # ✅ app/production에서 이동
│   │   │   └── types/
│   │   │
│   │   ├── management/              # 생산 관리 서브모듈
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   └── types/
│   │   │
│   │   ├── shortage/                # 부족량 관리 서브모듈
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   └── types/
│   │   │
│   │   ├── products/                # 제품 관리 서브모듈
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   └── types/
│   │   │
│   │   ├── packaging/               # 포장 리포트 서브모듈
│   │   │   ├── components/
│   │   │   │   ├── LogisticsTransferModal.tsx  # 물류 이동 모달 (포장 리포트 관련)
│   │   │   │   ├── PackagingReportForm.tsx
│   │   │   │   ├── PackagingReportListView.tsx
│   │   │   │   ├── PackagingReportStats.tsx
│   │   │   │   └── ...
│   │   │   ├── services/
│   │   │   │   ├── packagingReportsService.ts
│   │   │   │   ├── logisticsService.ts  # 물류 이동 요청 서비스 (포장 리포트에서 사용)
│   │   │   │   └── ...
│   │   │   ├── store/
│   │   │   │   └── packagingReportsStore.ts
│   │   │   └── types/
│   │   │       └── logistics.ts  # 물류 관련 타입 (production-requests의 일부)
│   │   │
│   │   ├── requests/                # 생산 요청 서브모듈 (긴급건, 물류이동 등)
│   │   │   ├── components/
│   │   │   │   ├── ProductionRequestForm.tsx
│   │   │   │   ├── ProductionRequestFormModal.tsx
│   │   │   │   ├── ProductionRequestDetailModal.tsx
│   │   │   │   └── ...
│   │   │   ├── services/
│   │   │   │   ├── productionRequestService.ts
│   │   │   │   └── ...
│   │   │   └── types/
│   │   │       └── productionRequest.types.ts  # ProductionRequestType, ProductionRequestStatus 등
│   │   │
│   │   ├── services/                # 공통 생산 서비스
│   │   │   └── sheetsSyncService.ts
│   │   │
│   │   ├── store/                   # 생산 전역 상태
│   │   │   └── productionSchedulesStore.ts
│   │   │
│   │   └── index.ts
│   │
│   ├── quality/                     # 품질 관리 피처 ✅ (이미 잘 구성됨)
│   ├── sample/                      # 샘플 센터 피처 ✅ (이미 잘 구성됨)
│   ├── jig/                         # 지그 관리 피처 ✅ (이미 잘 구성됨)
│   ├── tasks/                       # 작업 관리 피처 ✅ (이미 잘 구성됨)
│   ├── chat/                        # 채팅 피처 ✅ (이미 잘 구성됨)
│   ├── announcements/               # 공지사항 피처 ✅ (이미 잘 구성됨)
│   ├── work-schedule/               # 근무 일정 피처 ✅ (이미 잘 구성됨)
│   ├── settings/                    # 설정 피처 ✅ (이미 잘 구성됨)
│   └── dashboard/                   # 대시보드 피처 ✅ (이미 잘 구성됨)
│
├── shared/                          # 공유 모듈
│   ├── components/                  # 공통 UI 컴포넌트
│   │   ├── ui/                     # Shadcn/ui 컴포넌트 ✅
│   │   ├── layout/                 # 레이아웃 컴포넌트 ✅
│   │   ├── common/                 # 공통 컴포넌트
│   │   │   ├── loading/
│   │   │   │   ├── LoadingSpinner.tsx
│   │   │   │   └── index.ts
│   │   │   ├── error/
│   │   │   │   ├── ErrorBoundary.tsx
│   │   │   │   └── index.ts
│   │   │   ├── image/
│   │   │   │   ├── LazyImage.tsx
│   │   │   │   ├── ImageGalleryGrid.tsx
│   │   │   │   ├── ImageLightbox.tsx
│   │   │   │   └── UploadingImageGrid.tsx
│   │   │   ├── notification/
│   │   │   │   ├── CustomNotification.tsx
│   │   │   │   ├── UpdateNotification.tsx
│   │   │   │   ├── UpdateNotificationContainer.tsx
│   │   │   │   ├── ProgressToast.tsx
│   │   │   │   └── notifications/
│   │   │   │       ├── CommentNotification.tsx
│   │   │   │       └── LogisticsNotification.tsx
│   │   │   ├── input/
│   │   │   │   ├── ChatInput.tsx
│   │   │   │   ├── InputSelect.tsx
│   │   │   │   └── index.ts
│   │   │   ├── provider/
│   │   │   │   ├── ClientThemeProvider.tsx
│   │   │   │   ├── FCMProvider.tsx
│   │   │   │   ├── FontSizeProvider.tsx
│   │   │   │   ├── NetworkStatusProvider.tsx
│   │   │   │   ├── NotificationProviderWrapper.tsx
│   │   │   │   └── ElectronNotificationProvider.tsx
│   │   │   ├── comment/
│   │   │   │   ├── CommentsSection.tsx
│   │   │   │   └── ProcessingHistory.tsx
│   │   │   ├── electron/
│   │   │   │   └── ElectronNavigationHandler.tsx
│   │   │   ├── markdown/
│   │   │   │   └── MarkdownRenderer.tsx
│   │   │   ├── attachment/
│   │   │   │   └── ChatAttachmentPreviewBar.tsx
│   │   │   └── icons/              # 아이콘 컴포넌트 ✅
│   │   └── index.ts
│   │
│   ├── hooks/                       # 공통 커스텀 훅
│   │   ├── device/
│   │   │   ├── use-device.ts
│   │   │   └── useMobileBackHandler.ts
│   │   ├── firebase/
│   │   │   ├── useFCM.ts
│   │   │   ├── useFirebaseMobileRelease.ts
│   │   │   └── useFirebaseRelease.ts
│   │   ├── network/
│   │   │   └── useNetworkStatus.ts
│   │   ├── ui/
│   │   │   ├── use-element-capture.ts
│   │   │   ├── useFontSize.ts
│   │   │   ├── useImageUpload.ts
│   │   │   └── useDebounce.ts
│   │   ├── scroll/
│   │   │   └── useInvisibleInfiniteScroll.tsx
│   │   ├── electron/
│   │   │   └── useElectronUpdater.ts
│   │   ├── notifications/
│   │   │   └── useNotifications.ts
│   │   ├── data/
│   │   │   ├── useComments.ts
│   │   │   ├── useUserActivity.ts
│   │   │   └── useAppState.ts
│   │   ├── formatting/
│   │   │   └── useOrderNumberFormatter.ts
│   │   ├── toast/
│   │   │   └── use-toast.ts
│   │   └── index.ts
│   │
│   ├── services/                    # 공통 서비스
│   │   ├── firebase/                # Firebase 서비스
│   │   │   ├── config/
│   │   │   │   ├── config.ts
│   │   │   │   └── index.ts
│   │   │   ├── firestore/
│   │   │   │   ├── firestore.ts
│   │   │   │   └── index.ts
│   │   │   ├── storage/
│   │   │   │   ├── storage.ts
│   │   │   │   └── index.ts
│   │   │   ├── auth/
│   │   │   │   ├── userService.ts
│   │   │   │   ├── userProfile.ts
│   │   │   │   ├── userManagement.ts
│   │   │   │   └── userMigrationService.ts
│   │   │   ├── messaging/
│   │   │   │   ├── messaging.ts
│   │   │   │   └── index.ts
│   │   │   ├── debug/
│   │   │   │   └── debug.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── google/                  # Google 서비스
│   │   │   ├── sheets/
│   │   │   │   ├── sheetsService.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── ai/                      # AI 서비스
│   │   │   ├── gemini/
│   │   │   │   ├── geminiService.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── comments/                # 댓글 서비스 ✅
│   │   ├── notifications/           # 알림 서비스
│   │   │   ├── notificationService.ts
│   │   │   └── index.ts
│   │   ├── lookup/                  # 조회 서비스
│   │   │   ├── orderLookupService.ts
│   │   │   └── index.ts
│   │   ├── settings/                # 설정 서비스 ✅
│   │   └── migration/               # 마이그레이션 (비어있으면 삭제)
│   │
│   ├── utils/                       # 공통 유틸리티
│   │   ├── firebase/                # Firebase 유틸리티
│   │   │   ├── firebaseErrorHandler.ts
│   │   │   ├── firestoreUtils.ts
│   │   │   ├── imageUpload.ts
│   │   │   ├── storageOptimizer.ts
│   │   │   ├── storageOptimizer.tsx
│   │   │   ├── imagePathMigration.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── date/                    # 날짜 유틸리티
│   │   │   ├── dateUtils.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── user/                    # 사용자 유틸리티
│   │   │   ├── userUtils.ts
│   │   │   ├── permissions.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── platform/                # 플랫폼 유틸리티
│   │   │   ├── platform.ts
│   │   │   ├── phoneUtils.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── ui/                      # UI 유틸리티
│   │   │   ├── statusColors.ts
│   │   │   ├── scrollbar.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── cache/                   # 캐시 유틸리티
│   │   │   ├── cacheManager.ts
│   │   │   └── index.ts
│   │   │
│   │   └── index.ts                 # 모든 유틸 export
│   │
│   ├── constants/                   # 공통 상수 ✅
│   │   ├── departments.ts
│   │   ├── navigation.ts
│   │   └── userRoles.ts
│   │
│   ├── types/                       # 공통 타입
│   │   ├── electron.d.ts
│   │   ├── settings.ts
│   │   ├── upload.ts
│   │   └── index.ts
│   │
│   ├── lib/                         # 라이브러리 설정
│   │   └── utils.ts                 # cn 함수 등
│   │
│   └── index.ts                     # shared 모듈 진입점
│
├── lib/                             # 라이브러리 설정 (루트 레벨)
│   └── utils.ts
│
├── App.tsx                          # 루트 컴포넌트
├── main.tsx                         # 진입점
└── globals.css                      # 전역 스타일
```

---

## 🔄 마이그레이션 계획

### Phase 1: 즉시 개선 가능 (Low Risk)

1. **shared/components/auth 이동**
   ```bash
   # shared/components/auth/ProtectedRoute.tsx
   → features/auth/components/ProtectedRoute.tsx
   ```

2. **app/production 이동**
   ```bash
   # app/production/schedule/excel/
   → features/production/schedule/excel/
   ```

3. **shared/utils 카테고리별 분리**
   ```bash
   # Firebase 관련
   firebaseErrorHandler.ts, firestoreUtils.ts, imageUpload.ts, 
   storageOptimizer.ts, storageOptimizer.tsx, imagePathMigration.ts
   → shared/utils/firebase/

   # 날짜 관련
   dateUtils.ts → shared/utils/date/

   # 사용자 관련
   userUtils.ts, permissions.ts → shared/utils/user/

   # 플랫폼 관련
   platform.ts, phoneUtils.ts → shared/utils/platform/

   # UI 관련
   statusColors.ts, scrollbar.ts → shared/utils/ui/

   # 캐시 관련
   cacheManager.ts → shared/utils/cache/
   ```

4. **shared/services 구조화**
   ```bash
   # Firebase 서비스 세분화
   services/firebase/ → services/firebase/{config,firestore,storage,auth,messaging,debug}/

   # Google 서비스 구조화
   services/google/sheetsService.ts → services/google/sheets/

   # AI 서비스 구조화
   services/gemini/ → services/ai/gemini/
   ```

### Phase 2: 워크스페이스 리팩토링 (Medium Risk)

1. **서브모듈 생성**
   - `features/workspace/channels/`
   - `features/workspace/messages/`
   - `features/workspace/threads/`
   - `features/workspace/reactions/`
   - `features/workspace/approvals/`
   - `features/workspace/search/`
   - `features/workspace/invitations/`
   - `features/workspace/members/`
   - `features/workspace/notifications/`

2. **파일 이동 및 export 업데이트**
   - 각 서브모듈로 파일 이동
   - `features/workspace/index.ts`에서 재export

### Phase 3: Production 피처 세분화 (Medium Risk)

1. **서브모듈 생성**
   - `features/production/daily-report/` - 일일 리포트
   - `features/production/schedule/` - 생산 일정
   - `features/production/management/` - 생산 관리
   - `features/production/shortage/` - 부족량 관리
   - `features/production/products/` - 제품 관리
   - `features/production/packaging/` - 포장 리포트 (물류 이동 기능 포함)
   - `features/production/requests/` - 생산 요청 (긴급건, 물류이동 등)

2. **파일 이동 및 export 업데이트**
   - 물류 관련 파일들은 `packaging/` 서브모듈에 포함 (포장 리포트와 밀접한 연관)
   - `logisticsService.ts` → `features/production/packaging/services/`
   - `LogisticsTransferModal.tsx` → `features/production/packaging/components/`
   - `types/logistics.ts` → `features/production/packaging/types/` 또는 `requests/types/`
   - 생산 요청 관련 파일들은 `requests/` 서브모듈로 분리

### Phase 4: shared/components 구조화 (Low Risk)

1. **카테고리별 폴더 생성**
   - `shared/components/common/loading/`
   - `shared/components/common/error/`
   - `shared/components/common/image/`
   - `shared/components/common/notification/`
   - `shared/components/common/input/`
   - `shared/components/common/provider/`
   - 등등...

---

## 📋 각 단계별 체크리스트

### Phase 1 체크리스트

- [ ] `shared/components/auth/ProtectedRoute.tsx` → `features/auth/components/` 이동
- [ ] `app/production/schedule/excel/` → `features/production/schedule/excel/` 이동
- [ ] `shared/utils/` 파일들을 카테고리별로 분리
- [ ] `shared/services/` 구조화
- [ ] 모든 import 경로 업데이트
- [ ] 테스트 실행 및 확인

### Phase 2 체크리스트

- [ ] workspace 서브모듈 디렉토리 생성
- [ ] 파일들을 적절한 서브모듈로 이동
- [ ] 각 서브모듈의 `index.ts` 생성
- [ ] `features/workspace/index.ts` 업데이트
- [ ] 모든 import 경로 업데이트
- [ ] 기능 테스트 실행

### Phase 3 체크리스트

- [ ] production 서브모듈 디렉토리 생성 (logistics 제외, requests 추가)
- [ ] 포장 리포트 및 물류 관련 파일들을 `packaging/` 서브모듈로 이동
- [ ] 생산 요청 관련 파일들을 `requests/` 서브모듈로 이동
- [ ] 각 서브모듈의 `index.ts` 생성
- [ ] `features/production/index.ts` 업데이트
- [ ] 모든 import 경로 업데이트 (특히 물류 관련 import)
- [ ] 기능 테스트 실행 (포장 리포트 → 물류 이동 요청 플로우 확인)

### Phase 4 체크리스트

- [ ] shared/components/common 하위 구조 생성
- [ ] 파일들을 적절한 카테고리로 이동
- [ ] 각 카테고리의 `index.ts` 생성
- [ ] 모든 import 경로 업데이트
- [ ] 테스트 실행 및 확인

---

## 🎯 기대 효과

### 1. **유지보수성 향상**
- 관련 코드가 논리적으로 그룹화되어 찾기 쉬움
- 각 모듈의 책임이 명확해짐

### 2. **확장성 향상**
- 새 기능 추가 시 적절한 위치를 쉽게 파악 가능
- 기존 코드에 영향 최소화

### 3. **재사용성 향상**
- 공통 코드와 피처별 코드 명확히 분리
- 중복 코드 감소

### 4. **협업 효율성 향상**
- 팀원들이 코드 구조를 쉽게 이해
- 병렬 개발 시 충돌 최소화

---

## ⚠️ 주의사항

1. **점진적 마이그레이션**
   - 한 번에 모든 것을 바꾸지 말고 단계별로 진행
   - 각 단계마다 테스트 및 검증

2. **Import 경로 업데이트**
   - 파일 이동 시 모든 import 경로 업데이트 필수
   - TypeScript 컴파일러로 오류 확인

3. **Export 정책 일관성**
   - 각 모듈의 `index.ts`에서 명확한 export 정책 유지
   - 내부 구현은 숨기고 필요한 것만 export

4. **기존 기능 보존**
   - 리팩토링 중 기존 기능 동작 보장
   - 기능 테스트로 검증

---

## 🔍 검증 방법

1. **TypeScript 컴파일 검사**
   ```bash
   npm run build
   ```

2. **ESLint 검사**
   ```bash
   npm run lint
   ```

3. **수동 테스트**
   - 각 피처의 주요 기능 동작 확인
   - Import 경로 정상 동작 확인

4. **단계별 커밋**
   - 각 Phase를 작은 단위로 나누어 커밋
   - 문제 발생 시 롤백 용이

---

## 📚 참고 자료

- [피처 기반 프로젝트 구조 규칙](./always_applied_workspace_rules.md)
- [코드 분리 법칙](./always_applied_workspace_rules.md)

---

이 개선안을 통해 더 구조화되고 유지보수하기 쉬운 코드베이스를 구축할 수 있습니다. 🚀
