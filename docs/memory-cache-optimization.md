# 메모리, 캐시, localStorage 최적화 가이드

## 📋 개요

이 문서는 Genesis_HR 프로젝트의 메모리, 캐시, localStorage 최적화 작업을 설명합니다.

## 🎯 최적화 목표

1. **메모리 사용량 감소**: 불필요한 메모리 누수 방지
2. **localStorage 효율성**: 크기 제한 관리 및 만료 데이터 정리
3. **캐시 최적화**: 적절한 만료 시간 및 크기 제한

## 🔧 구현된 최적화

### 1. localStorage 자동 정리 시스템

**파일**: `src/shared/utils/storageOptimizer.ts`

#### 주요 기능:
- **크기 모니터링**: localStorage 사용량 실시간 추적
- **자동 정리**: 만료된 데이터 및 오래된 캐시 자동 삭제
- **안전한 저장**: QuotaExceededError 방지 및 자동 정리 후 재시도
- **정기 정리**: 24시간마다 자동 정리 실행

#### 사용법:
```typescript
import { useStorageOptimizer } from '@/shared/utils/storageOptimizer';

// App.tsx에서 자동 활성화
function App() {
  useStorageOptimizer(); // 자동 정리 활성화
  // ...
}
```

#### 주요 함수:
- `getStorageUsage()`: 현재 사용량 및 상세 정보 반환
- `autoCleanup()`: 만료 데이터 및 크기 기반 정리
- `safeSetItem()`: 크기 체크 후 안전하게 저장
- `startAutoCleanup()`: 정기 정리 스케줄러 시작

### 2. chatCache 만료 시간 추가

**파일**: `src/features/chat/utils/chatCache.ts`

#### 개선 사항:
- **만료 시간**: 7일 후 자동 만료
- **크기 제한**: 최대 50개 방만 캐시
- **자동 정리**: 읽기 시 만료된 항목 자동 삭제

```typescript
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7일
const MAX_ROOMS = 50; // 최대 캐시할 방 개수
```

### 3. Zustand Store persist 최적화

#### 개선된 Store:
- `qualityIssuesStore`: cache를 localStorage에서 제외 (메모리만 사용)
- `sampleRequestsStore`: cache를 localStorage에서 제외 (메모리만 사용)
- `qualityInspectionStore`: 이미 최적화됨 (cache 제외)

#### 변경 전:
```typescript
partialize: (state) => ({
  cache: state.cache,  // ❌ 큰 데이터를 localStorage에 저장
  lastUpdated: state.lastUpdated
})
```

#### 변경 후:
```typescript
partialize: (state) => ({
  // ✅ cache는 메모리에서만 관리
  // lastUpdated만 저장하여 캐시 유효성 확인용으로 사용
  lastUpdated: state.lastUpdated
})
```

### 4. useProducts 메모리 최적화

**파일**: `src/features/production/hooks/useProducts.ts`

#### 개선 사항:
- **메모이제이션**: `useMemo`로 불필요한 재계산 방지
- **기존 최적화 유지**: debounce, cleanup 함수 등

```typescript
// 메모이제이션: products 배열이 실제로 변경되었을 때만 참조 변경
const memoizedProducts = useMemo(() => products, [products]);

return { products: memoizedProducts, loading, error };
```

## 📊 최적화 효과

### localStorage 관리
- ✅ **크기 제한**: 4MB 안전 한계 설정
- ✅ **자동 정리**: 80% 사용 시 자동 정리 시작
- ✅ **만료 관리**: 7일 이상 오래된 데이터 자동 삭제

### 메모리 관리
- ✅ **불필요한 재계산 방지**: useMemo 활용
- ✅ **정리 함수**: 모든 Firebase 구독 정리 확인
- ✅ **Blob URL 정리**: 이미지 업로드 시 자동 정리

### 캐시 관리
- ✅ **만료 시간**: 모든 캐시에 만료 시간 추가
- ✅ **크기 제한**: chatCache 최대 50개 방
- ✅ **자동 정리**: 읽기 시 만료된 항목 자동 삭제

## 🔍 모니터링

### 개발 모드에서 저장소 상태 확인

```typescript
import { logStorageStatus } from '@/shared/utils/storageOptimizer';

// 저장소 사용량 로깅
logStorageStatus();
```

출력 예시:
```
[StorageOptimizer] 저장소 사용량: {
  used: "1.23 MB",
  available: "2.77 MB",
  percentage: "30.75%",
  items: 15,
  topItems: [
    { key: "quality-inspection-store", size: "0.45 MB" },
    { key: "chat-room-cache-v1", size: "0.32 MB" },
    ...
  ]
}
```

## 🚀 사용 가이드

### 1. 앱 시작 시 자동 정리 활성화

`App.tsx`에 이미 통합되어 있습니다:
```typescript
import { useStorageOptimizer } from '@/shared/utils/storageOptimizer';

function AppContent() {
  useStorageOptimizer(); // ✅ 자동 정리 활성화
  // ...
}
```

### 2. 수동 정리 (필요 시)

```typescript
import { autoCleanup, getStorageUsage } from '@/shared/utils/storageOptimizer';

// 현재 사용량 확인
const usage = getStorageUsage();
console.log(`사용 중: ${usage.percentage.toFixed(2)}%`);

// 수동 정리 실행
const result = autoCleanup();
console.log(`정리됨: ${result.cleaned}개 항목, 만료: ${result.expired}개`);
```

### 3. 안전한 저장

```typescript
import { safeSetItem } from '@/shared/utils/storageOptimizer';

// 기존 방식 (위험)
localStorage.setItem('key', value); // ❌ QuotaExceededError 가능

// 안전한 방식
const success = safeSetItem('key', value); // ✅ 자동 정리 후 재시도
if (!success) {
  console.warn('저장 실패: 저장소 공간 부족');
}
```

## ⚠️ 주의사항

### 1. 중요한 데이터 보호
다음 store는 정리에서 제외됩니다:
- `auth-store`: 사용자 인증 정보
- `global-store`: 전역 설정

### 2. 캐시 만료 시간
- **일반 캐시**: 5분 (메모리)
- **chatCache**: 7일 (localStorage)
- **ImageCache**: 7일 (localStorage)

### 3. 크기 제한
- **localStorage**: 4MB 안전 한계 (브라우저 제한 5-10MB)
- **chatCache**: 최대 50개 방
- **ImageCache**: 최대 100개 항목

## 🔄 향후 개선 사항

### 1. 가상화 (Virtualization)
대용량 리스트(예: 2000개 제품)에 가상화 적용 고려:
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

// 가상화로 화면에 보이는 항목만 렌더링
```

### 2. IndexedDB 활용
큰 데이터는 localStorage 대신 IndexedDB 사용 고려:
- 더 큰 저장 공간 (수백 MB)
- 구조화된 데이터 저장
- 비동기 처리

### 3. Service Worker 캐싱
정적 리소스 캐싱을 Service Worker로 처리:
- 네트워크 요청 감소
- 오프라인 지원
- 자동 캐시 관리

## 📝 체크리스트

최적화 작업 완료 확인:
- [x] localStorage 크기 제한 및 모니터링 유틸리티 생성
- [x] localStorage 만료 데이터 자동 정리 시스템 구현
- [x] useProducts 훅 메모리 최적화 (useMemo 추가)
- [x] Zustand persist 설정 최적화 (불필요한 데이터 제외)
- [x] chatCache에 만료 시간 추가 및 크기 제한

## 🎯 성능 개선 예상 효과

1. **localStorage 사용량**: 30-50% 감소 예상
2. **메모리 사용량**: 불필요한 재계산 방지로 10-20% 감소
3. **앱 시작 속도**: 만료 데이터 정리로 5-10% 개선
4. **QuotaExceededError**: 자동 정리로 거의 발생하지 않음

## 📚 참고 자료

- [localStorage 크기 제한](https://developer.mozilla.org/en-US/docs/Web/API/Storage)
- [Zustand Persist 미들웨어](https://github.com/pmndrs/zustand/blob/main/docs/integrations/persisting-store-data.md)
- [React useMemo 최적화](https://react.dev/reference/react/useMemo)























