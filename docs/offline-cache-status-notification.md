# 오프라인 캐시 데이터 상태 알림 가이드

오프라인 상태에서 캐시된 데이터를 보고 있을 때 사용자에게 명확히 알리는 기능입니다.

## 구현 내용

### 1. **데이터 동기화 상태 추적**

`DataSyncStatusProvider`를 통해 전역적으로 데이터 동기화 상태를 추적합니다:

- **온라인**: 최신 데이터 표시
- **오프라인**: 인터넷 연결 없음
- **동기화 중**: 서버와 동기화 진행 중
- **캐시 데이터**: 캐시된 데이터 표시 (최신 데이터가 아닐 수 있음)

### 2. **헤더 상태 표시**

헤더에 동기화 상태를 시각적으로 표시:

```tsx
// src/shared/components/common/DataSyncStatusIndicator.tsx
<DataSyncStatusIndicator />
```

**표시 상태**:
- ✅ **온라인 (최신 데이터)**: 표시하지 않음 (시각적 노이즈 감소)
- ⚠️ **오프라인**: 빨간색 배지 + "오프라인"
- 🔄 **동기화 중**: 노란색 배지 + "동기화 중" (회전 아이콘)
- 📦 **캐시 데이터**: 주황색 배지 + "캐시 데이터" + 경고 아이콘

### 3. **네트워크 상태 알림**

`NetworkStatusProvider`가 네트워크 상태 변화를 감지하고 알림:

**온라인 → 오프라인**:
```
❌ 인터넷 연결이 끊어졌습니다.
   오프라인 상태입니다. 캐시된 데이터를 보고 있습니다.
```

**오프라인 → 온라인**:
```
✅ 인터넷에 다시 연결되었습니다.
```

## 사용자 경험

### 오프라인 상태 감지

1. **네트워크 연결 끊김**
   - 즉시 토스트 알림 표시
   - 헤더에 오프라인 배지 표시
   - 캐시 데이터 표시 시 경고

2. **캐시 데이터 표시**
   - 헤더에 "캐시 데이터" 배지
   - 툴팁: "캐시된 데이터를 보고 있습니다. 최신 데이터가 아닐 수 있습니다."
   - 마지막 동기화 시간 표시

3. **네트워크 재연결**
   - 성공 알림 표시
   - 동기화 중 상태 표시
   - 최신 데이터로 전환

## 기술적 구현

### DataSyncStatusProvider

```tsx
// 전역 데이터 동기화 상태 관리
const { state, setCacheDataDetected, setSyncComplete } = useDataSyncStatus();

// 캐시 데이터 감지
setCacheDataDetected(true, 'source-id');

// 동기화 완료
setSyncComplete();
```

### Firestore 리스너 통합

Firestore의 `metadata.fromCache`를 활용하여 데이터 소스 추적:

```tsx
onSnapshot(query, (snapshot) => {
  const isFromCache = snapshot.metadata.fromCache;
  setCacheDataDetected(isFromCache, `query-${queryId}`);
});
```

## 주요 파일

- `src/shared/components/common/DataSyncStatusProvider.tsx` - 전역 상태 관리
- `src/shared/components/common/DataSyncStatusIndicator.tsx` - 헤더 표시 컴포넌트
- `src/shared/components/common/NetworkStatusProvider.tsx` - 네트워크 상태 알림
- `src/shared/components/layout/AppHeader.tsx` - 헤더에 표시

## 향후 개선 사항

1. **Firestore 리스너 통합**
   - 각 Firestore 리스너에서 `metadata.fromCache` 확인
   - 자동으로 동기화 상태 업데이트

2. **세밀한 상태 표시**
   - 각 페이지/컴포넌트별 동기화 상태
   - 데이터 소스별 상태 추적

3. **사용자 제어**
   - 수동 새로고침 버튼
   - 캐시 데이터 강제 표시 옵션

## 참고 자료

- [Firestore 오프라인 지원](https://firebase.google.com/docs/firestore/manage-data/enable-offline)
- [Snapshot Metadata](https://firebase.google.com/docs/reference/js/firebase.firestore.SnapshotMetadata)

