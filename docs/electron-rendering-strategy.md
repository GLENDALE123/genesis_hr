# Electron 앱 렌더링 전략 가이드

로컬 프로그램처럼 빠르게 작동하도록 정적/동적 렌더링이 올바르게 설정되어 있습니다.

## 현재 렌더링 설정

### 1. **프로덕션 빌드 - 정적 렌더링 (Static Rendering)**

Electron 앱은 빌드 시 **모든 파일을 정적으로 생성**합니다:

```javascript
// electron/main.js
if (app.isPackaged) {
  // 프로덕션: 파일 시스템에서 직접 로드 (HTTP 서버 없이, 네이티브처럼 빠름)
  const indexPath = getResourcePath('dist/index.html');
  await mainWindow.loadFile(indexPath);
}
```

**특징**:
- ✅ 파일 시스템에서 직접 로드 (네이티브처럼 빠름)
- ✅ HTTP 서버 불필요
- ✅ 네트워크 지연 없음
- ✅ 오프라인에서도 작동

### 2. **개발 모드 - 동적 렌더링 (Dynamic Rendering)**

개발 중에는 Vite 개발 서버 사용:

```javascript
// electron/main.js
else {
  // 개발 모드: 개발 서버 사용 (HMR 지원)
  await mainWindow.loadURL('http://localhost:5173');
}
```

**특징**:
- ✅ Hot Module Replacement (HMR) 지원
- ✅ 실시간 코드 변경 반영
- ✅ 빠른 개발 경험

## Vite 빌드 설정

### 정적 파일 생성

```typescript
// vite.config.ts
build: {
  outDir: 'dist',
  emptyOutDir: true,
  target: 'es2015', // ES6 타겟
  minify: 'esbuild', // 빠른 빌드
  sourcemap: false, // 프로덕션에서는 소스맵 비활성화
}
```

### 코드 스플리팅

```typescript
manualChunks: (id) => {
  // Firebase는 별도 청크 (자주 변경되지 않음)
  if (id.includes('firebase')) {
    return 'vendor-firebase';
  }
  // React는 별도 청크
  if (id.includes('react')) {
    return 'vendor-react';
  }
  // 나머지 vendor
  return 'vendor';
}
```

**효과**:
- 초기 로드 시간 단축
- 필요한 코드만 로드
- 캐시 효율성 향상

## 렌더링 방식 비교

### 정적 렌더링 (프로덕션)

```
빌드 시점:
  React 코드 → JavaScript 번들 → dist/ 폴더에 정적 파일 생성
    ↓
실행 시점:
  Electron이 dist/index.html을 파일 시스템에서 직접 로드
    ↓
즉시 렌더링 (0ms 네트워크 지연)
```

**장점**:
- ⚡ 매우 빠른 로딩 속도
- 📦 모든 파일이 로컬에 있음
- 🔒 네트워크 의존 없음
- 💾 오프라인 완전 지원

### 동적 렌더링 (개발)

```
개발 서버:
  Vite Dev Server → Hot Module Replacement
    ↓
실행 시점:
  Electron이 http://localhost:5173에서 동적으로 로드
    ↓
실시간 코드 변경 반영
```

**장점**:
- 🔥 즉시 코드 변경 반영
- 🛠️ 개발 도구 지원
- 🐛 빠른 디버깅

## 현재 설정 상태

### ✅ 올바르게 설정됨

1. **프로덕션 빌드**
   - `loadFile()` 사용 → 정적 파일 직접 로드 ✅
   - HTTP 서버 없음 → 네이티브처럼 빠름 ✅
   - 파일 경로: 상대 경로 (`./`) ✅

2. **개발 모드**
   - Vite 개발 서버 사용 ✅
   - HMR 지원 ✅
   - 빠른 개발 경험 ✅

3. **빌드 최적화**
   - 코드 스플리팅 ✅
   - 파일 압축 (minify) ✅
   - 청크 최적화 ✅

## 성능 최적화

### 1. **정적 파일 로딩 최적화**

현재 설정:
```javascript
// 프로덕션: 파일 시스템 직접 접근 (가장 빠름)
await mainWindow.loadFile(indexPath);

// 개발: HTTP 서버 (HMR 지원)
await mainWindow.loadURL(DEV_SERVER_URL);
```

### 2. **코드 스플리팅**

- Firebase: 별도 청크
- React: 별도 청크
- 나머지: vendor 청크

**효과**:
- 초기 로드: 필요한 코드만 로드
- 캐싱: 변경되지 않는 코드는 캐시 활용
- 메모리: 필요한 모듈만 메모리에 로드

### 3. **빌드 최적화**

```typescript
// vite.config.ts
build: {
  minify: 'esbuild',      // 빠른 압축
  sourcemap: false,        // 소스맵 제거 (크기 감소)
  target: 'es2015',        // ES6 타겟
}
```

## 렌더링 흐름

### 프로덕션 빌드 (정적 렌더링)

```
1. 앱 시작
   ↓
2. Electron이 dist/index.html 파일 로드
   ↓
3. HTML에서 JavaScript 번들 로드
   ↓
4. React 앱 즉시 렌더링
   ↓
5. 사용자 인터랙션 즉시 반응
```

**소요 시간**: ~100-200ms (로컬 파일 로드만)

### 개발 모드 (동적 렌더링)

```
1. 앱 시작
   ↓
2. Vite 개발 서버 시작
   ↓
3. Electron이 http://localhost:5173 로드
   ↓
4. 실시간 코드 변경 감지
   ↓
5. HMR로 즉시 업데이트
```

**소요 시간**: ~500ms (네트워크 요청 포함)

## 최적화 확인 체크리스트

### ✅ 정적 렌더링 체크리스트
- [x] 프로덕션 빌드에서 `loadFile()` 사용
- [x] HTTP 서버 없이 파일 직접 로드
- [x] 파일 경로가 올바르게 설정됨
- [x] 모든 정적 파일이 빌드됨

### ✅ 동적 렌더링 체크리스트
- [x] 개발 모드에서 개발 서버 사용
- [x] HMR이 작동함
- [x] 실시간 코드 변경 반영

### ✅ 빌드 최적화 체크리스트
- [x] 코드 스플리팅 설정
- [x] 파일 압축 활성화
- [x] 소스맵 비활성화 (프로덕션)
- [x] 청크 최적화

## 추가 최적화 권장사항

### 1. **프리로딩 (Preloading)**

HTML에 중요한 리소스 프리로드 추가:
```html
<link rel="preload" href="/assets/js/vendor-react-[hash].js" as="script">
<link rel="preload" href="/assets/js/main-[hash].js" as="script">
```

### 2. **리소스 힌트**

브라우저에 리소스 로딩 힌트 제공:
```html
<link rel="dns-prefetch" href="https://firebase.googleapis.com">
<link rel="preconnect" href="https://firebase.googleapis.com">
```

### 3. **지연 로딩 (Lazy Loading)**

큰 컴포넌트는 동적 import 사용:
```typescript
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

## 현재 설정 평가

### ✅ 올바르게 설정됨

현재 설정은 Electron 앱에 최적화되어 있습니다:

1. **프로덕션**: 정적 파일 직접 로드 ✅
2. **개발**: 동적 개발 서버 사용 ✅
3. **빌드**: 최적화된 정적 파일 생성 ✅

### 개선 가능한 부분

1. **프리로딩 추가** (선택적)
2. **리소스 힌트 추가** (선택적)
3. **지연 로딩 확대** (필요시)

## 참고 자료

- [Vite 빌드 가이드](https://vitejs.dev/guide/build.html)
- [Electron 파일 로딩](https://www.electronjs.org/docs/latest/api/browser-window#winloadfilepath-options)

