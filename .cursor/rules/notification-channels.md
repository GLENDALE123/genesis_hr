# 알림 채널 동적 추가 가이드

## 📋 개요

HS Next 프로젝트의 알림 시스템은 동적으로 확장 가능하도록 설계되었습니다.
새로운 알림 채널을 추가할 때는 **한 곳만 수정**하면 UI가 자동으로 업데이트됩니다.

## 🎯 알림 채널 추가 방법

### 1. 알림 채널 정의 추가

**파일**: `hs-next/src/shared/types/settings.ts`

```typescript
export const NOTIFICATION_CHANNELS = {
  'production-request': {
    label: '생산관리부 요청사항',
    icon: 'Factory',
    description: '생산관리부 요청사항 알림',
  },
  'shortage-request': {
    label: '부족분 신청',
    icon: 'AlertTriangle',
    description: '부족분 신청 알림',
  },
  'comment-mention': {
    label: '댓글',
    icon: 'MessageSquare',
    description: '댓글 및 멘션 알림',
  },
  
  // 🆕 새 채널 추가 예시
  'sample-request': {
    label: '샘플 요청',
    icon: 'TestTube',
    description: '샘플 요청 관련 알림',
  },
} as const;
```

### 2. 아이콘 맵핑 확인 (필요시)

**파일**: `hs-next/src/features/settings/components/NotificationSettings.tsx`

```typescript
// 아이콘 맵핑 (새 아이콘 사용 시 추가)
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Factory,
  AlertTriangle,
  MessageSquare,
  Bell,
  TestTube,  // ✅ 새 채널 추가 시 아이콘 추가
};
```

**아이콘 import 추가**:

```typescript
import {
  Factory,
  AlertTriangle,
  MessageSquare,
  Bell,
  TestTube,  // ✅ 추가
} from 'lucide-react';
```

## 🔄 자동으로 업데이트되는 것들

### ✅ 설정 UI
- `features/settings/components/NotificationSettings.tsx`
- 알림 설정 화면에 새 채널이 자동으로 표시됨
- 사용자가 ON/OFF 토글 가능

### ✅ Firestore 기본값
- `shared/types/settings.ts`의 `DEFAULT_SETTINGS`
- 새 채널은 기본적으로 `true` (활성화)로 설정됨

### ✅ 타입 시스템
- TypeScript가 자동으로 새 채널 타입을 인식
- 컴파일 타임에 오타 체크

## 📝 알림 전송 시 사용 방법

### Firebase Functions에서 알림 타입 지정

```javascript
// functions/index.js 또는 별도 알림 함수

const sendNotification = async (userId, notificationData) => {
  await admin.firestore()
    .collection('users')
    .doc(userId)
    .collection('inbox')
    .add({
      title: '새로운 샘플 요청',
      body: '샘플 요청이 등록되었습니다.',
      type: 'sample-request',  // ✅ 채널 타입 지정 (NOTIFICATION_CHANNELS 키와 일치)
      metadata: {
        type: 'sample-request',  // ✅ 중복 지정 (안전장치)
        // ... 기타 메타데이터
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
    });
};
```

### FCM 메시지 페이로드

```javascript
// FCM으로 직접 전송하는 경우
const message = {
  notification: {
    title: '새로운 샘플 요청',
    body: '샘플 요청이 등록되었습니다.',
  },
  data: {
    type: 'sample-request',  // ✅ 채널 타입 지정 (NOTIFICATION_CHANNELS 키와 일치)
    link: '/sample-center/requests/123',
    // ... 기타 데이터
  },
  token: fcmToken,
};

await admin.messaging().send(message);
```

## 🧪 테스트 방법

### 1. 설정 UI 확인

```bash
# 개발 서버 실행
npm run dev

# 브라우저에서 확인
# 1. 로그인
# 2. 헤더 아바타 클릭 → 설정
# 3. 알림 탭 → 새 채널이 표시되는지 확인
```

### 2. 필터링 테스트

```javascript
// Firestore에 테스트 알림 추가
const testNotification = {
  title: '테스트 샘플 요청',
  body: '새 채널 테스트',
  type: 'sample-request',  // 새 채널
  metadata: { type: 'sample-request' },
  createdAt: new Date(),
  read: false,
};

// Firestore Console에서:
// users/{userId}/inbox 컬렉션에 추가
```

### 3. 필터링 확인

1. 설정에서 새 채널 OFF → 알림 안 옴 ✅
2. 설정에서 새 채널 ON → 알림 옴 ✅
3. 시간대 제한 설정 → 시간 외에는 안 옴 ✅

## 📊 채널별 사용 가이드

### 기본 제공 채널

| 채널 타입 | 설명 | 사용 예시 |
|---------|------|---------|
| `production-request` | 생산관리부 요청사항 | 생산관리부 요청사항 생성/승인 |
| `shortage-request` | 부족분 신청 | 부족분 신청 알림 |
| `comment-mention` | 댓글 | 댓글 작성, 사용자 멘션 |

### 새 채널 추가 시 권장 사항

1. **명확한 이름**: 채널 용도가 명확한 이름 사용
2. **적절한 아이콘**: Lucide React 아이콘 사용
3. **상세한 설명**: 사용자가 이해하기 쉬운 설명 작성
4. **기본값 고려**: 대부분의 사용자가 받고 싶을 알림이면 `true`

## 🔐 권한 및 역할 기반 필터링

알림 채널 설정은 **개인 선호도** 필터링입니다.
**비즈니스 로직** 필터링은 Firebase Functions에서 처리합니다.

```javascript
// Firebase Functions에서 역할 기반 필터링
const sendSampleRequestNotification = async (requestId) => {
  // 1. 역할 기반 필터링 (비즈니스 로직)
  const managers = await getManagerUsers();  // manager, admin만
  
  for (const manager of managers) {
    // 2. 개인 설정 확인 (사용자 선호도)
    const settings = await getUserSettings(manager.uid);
    
    if (!shouldSendNotification(settings, 'sample-request')) {
      continue;  // 이 사용자는 스킵
    }
    
    // 3. 알림 전송
    await sendNotification(manager.uid, {
      type: 'sample-request',
      // ...
    });
  }
};
```

## 🎨 아이콘 선택 가이드

### Lucide React 아이콘 목록

**추천 아이콘**:
- 생산: `Factory`, `Cog`, `Package`
- 생산일보: `ClipboardList`, `FileText`, `Calendar`
- 댓글: `MessageSquare`, `MessageCircle`
- 공지: `Megaphone`, `Bell`, `Info`
- 샘플: `TestTube`, `FlaskConical`
- 품질: `AlertTriangle`, `ShieldAlert`, `AlertCircle`
- 물류: `Truck`, `PackageOpen`, `ArrowRightLeft`
- 승인: `CheckCircle`, `ClipboardCheck`, `FileCheck`
- 문서: `FileText`, `File`, `Clipboard`
- 사용자: `Users`, `User`, `UserCheck`

**아이콘 찾기**: https://lucide.dev/icons

## 🚀 배포 체크리스트

새 알림 채널 추가 후:

- [ ] `NOTIFICATION_CHANNELS`에 채널 추가
- [ ] 아이콘 import 확인
- [ ] `iconMap`에 아이콘 추가 (새 아이콘인 경우)
- [ ] TypeScript 컴파일 오류 없음
- [ ] 설정 UI에서 새 채널 보임
- [ ] 토글 ON/OFF 동작 확인
- [ ] 필터링 로직 테스트 완료
- [ ] Firebase Functions에서 타입 일치 확인

## 📚 관련 파일

- 타입 정의: `shared/types/settings.ts`
- 설정 UI: `features/settings/components/NotificationSettings.tsx`
- 필터링 로직: `shared/services/settings/settingsService.ts`
- FCM Provider: `shared/components/common/FCMProvider.tsx`
- Electron Provider: `shared/components/common/ElectronNotificationProvider.tsx`

## 💡 팁

1. **채널 이름은 kebab-case 사용 (Functions와 일치)**
   - ✅ `production-request` 
   - ✅ `sample-request`
   - ❌ `productionRequest` (camelCase는 비권장)

2. **타입 안전성 활용**
   - TypeScript가 오타를 자동으로 잡아줌
   - `type: 'sample-requesst'` → 컴파일 에러 ✅

3. **기존 사용자 자동 호환**
   - 새 채널은 기본값 `true`로 자동 활성화
   - 기존 사용자도 즉시 알림 받음

4. **채널 삭제는 신중하게**
   - 기존 알림에 영향을 줄 수 있음
   - deprecated로 표시하고 나중에 제거 권장

---

**작성일**: 2025-01-11
**버전**: 1.0.0
**프로젝트**: HS Next - 인사관리 시스템

