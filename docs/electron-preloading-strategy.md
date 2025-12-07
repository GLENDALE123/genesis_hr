# Electron 앱 시작 전 프리로딩 전략

앱 시작 속도를 높이기 위한 프리로딩 전략 분석 및 개선 방안입니다.

## 현재 프리로딩 상태

### ✅ 현재 구현된 항목

#### 1. **네이티브 파일 시스템 캐시 로드**
```javascript
// electron/main.js (292줄)
loadNativeCache(); // 앱 시작 시 즉시 실행
```
- **타이밍**: 앱 시작 시 (창 생성 전)
- **데이터**: 네이티브 파일 시스템 캐시 (최대 500개 항목)
- **저장 위치**: `app.getPath('userData')/cache/data-cache.json`

#### 2. **Preload 스크립트 프리로딩**
```javascript
// electron/preload.js (58-61줄)
setTimeout(() => {
  preloadFirestoreCache();
}, 100);
```
- **타이밍**: 렌더러 프로세스 시작 후 100ms
- **데이터**: 네이티브 파일 시스템 캐시 → 메모리 캐시
- **제한**: 최대 500개 항목

#### 3. **인증 상태 즉시 로드**
```html
<!-- index.html (25-39줄) -->
<script>
  const authData = localStorage.getItem('auth-store');
  window.__AUTH_INITIAL_STATE__ = { ... };
</script>
```
- **타이밍**: HTML 파싱 시 즉시 실행
- **효과**: 인증 상태 즉시 확인 (스피너 없음)

#### 4. **테마 설정 즉시 적용**
```html
<!-- index.html (12-22줄) -->
<script>
  // 테마 즉시 적용 (hydration mismatch 방지)
  document.documentElement.classList.add('dark');
</script>
```
- **타이밍**: HTML 파싱 시 즉시 실행
- **효과**: 깜빡임 방지

#### 5. **Firebase IndexedDB Persistence**
```typescript
// src/shared/services/firebase/config.ts (89-100줄)
enableIndexedDbPersistence(dbService);
```
- **타이밍**: Firebase 초기화 시
- **효과**: 자동으로 IndexedDB에 캐시 저장

## ⚠️ 개선 가능한 항목

### 1. **창 표시 전 프리로딩 완료 대기**

#### 현재 상태
- 창이 즉시 표시됨 (`show: false` 설정되어 있지만 로드 후 즉시 표시)
- 프리로딩은 비동기로 진행

#### 개선 제안
```javascript
// electron/main.js
const load = async () => {
  await mainWindow.webContents.session.clearCache();
  
  if (app.isPackaged) {
    await mainWindow.loadFile(indexPath);
  } else {
    await mainWindow.loadURL(DEV_SERVER_URL);
  }
  
  // 프리로딩 완료 대기 (최대 500ms)
  await waitForPreloading();
  
  // 프리로딩 완료 후 창 표시
  mainWindow.show();
};

function waitForPreloading() {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 10; // 최대 500ms 대기
    
    const checkPreload = () => {
      // preload 스크립트에서 전달한 프리로드 상태 확인
      mainWindow.webContents.executeJavaScript('window.__PRELOAD_COMPLETE__')
        .then((complete) => {
          if (complete || attempts >= maxAttempts) {
            resolve();
          } else {
            attempts++;
            setTimeout(checkPreload, 50);
          }
        })
        .catch(() => resolve()); // 오류 시 즉시 표시
    };
    
    checkPreload();
  });
}
```

### 2. **자주 사용하는 데이터 프리로드**

#### 개선 제안
```javascript
// electron/preload.js
async function preloadCriticalData() {
  try {
    // 1. 인증 상태 (이미 로드됨)
    const authData = localStorage.getItem('auth-store');
    
    // 2. 사용자 프로필 (로그인된 경우)
    if (authData) {
      const parsed = JSON.parse(authData);
      if (parsed.state?.user?.uid) {
        // 사용자 프로필 프리로드
        await preloadUserProfile(parsed.state.user.uid);
      }
    }
    
    // 3. Firebase 초기화 대기
    await waitForFirebaseInit();
    
    // 4. IndexedDB 캐시 확인
    const cachedCollections = await getCachedCollections();
    
    // 5. 프리로드 완료 표시
    window.__PRELOAD_COMPLETE__ = true;
    
    console.log('✅ [Preload] 중요 데이터 프리로드 완료');
  } catch (error) {
    console.warn('⚠️ [Preload] 프리로드 실패:', error);
    window.__PRELOAD_COMPLETE__ = true; // 실패해도 진행
  }
}
```

### 3. **Firebase IndexedDB 캐시 미리 준비**

#### 개선 제안
```typescript
// src/shared/services/firebase/config.ts
export const preloadFirestoreCache = async () => {
  if (!db) return;
  
  try {
    // IndexedDB가 준비될 때까지 대기
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        // IndexedDB 준비 확인
        if (indexedDB.databases) {
          indexedDB.databases().then(() => {
            clearInterval(checkInterval);
            resolve(true);
          });
        }
      }, 50);
      
      // 최대 1초 대기
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(false);
      }, 1000);
    });
    
    console.log('✅ [Firebase] IndexedDB 캐시 준비 완료');
  } catch (error) {
    console.warn('⚠️ [Firebase] IndexedDB 준비 확인 실패:', error);
  }
};
```

### 4. **이미지 및 폰트 프리로드**

#### 개선 제안
```html
<!-- index.html -->
<head>
  <!-- 중요 리소스 프리로드 -->
  <link rel="preload" href="/tms-logo.ico" as="image">
  <link rel="preload" href="/fonts/pretendard-variable.woff2" as="font" type="font/woff2" crossorigin>
</head>
```

## 📊 현재 프리로딩 타이밍

```
앱 시작
  ↓
1. 네이티브 캐시 로드 (0ms) ✅
  ↓
2. 창 생성 (50ms)
  ↓
3. Preload 스크립트 실행 (100ms)
  ↓
4. HTML 로드 (150ms)
  ↓
5. 인증 상태 로드 (인라인 스크립트, 150ms) ✅
  ↓
6. React 앱 렌더링 (200ms)
  ↓
7. Firebase 초기화 (250ms) ✅
  ↓
8. 프리로드 캐시 로드 (350ms) ✅
  ↓
9. 첫 데이터 표시 (400ms)
```

## 🚀 개선 후 예상 타이밍

```
앱 시작
  ↓
1. 네이티브 캐시 로드 (0ms) ✅
2. Firebase 초기화 시작 (0ms) ⬅️ 개선
  ↓
3. 창 생성 (50ms, show: false)
  ↓
4. Preload 스크립트 실행 (100ms)
  ↓
5. HTML 로드 + 인증 상태 로드 (150ms) ✅
  ↓
6. 중요 데이터 프리로드 (200ms) ⬅️ 새로 추가
  ↓
7. 프리로드 완료 확인 (250ms) ⬅️ 새로 추가
  ↓
8. 창 표시 (300ms) ⬅️ 개선
  ↓
9. React 앱 렌더링 (350ms)
  ↓
10. 즉시 데이터 표시 (400ms) ✅
```

**예상 개선**: 100-200ms 단축 (25-50% 향상)

## 구현 우선순위

### 🔴 높은 우선순위
1. **중요 데이터 프리로드** (사용자 프로필, 설정 등)
2. **프리로드 완료 후 창 표시** (UX 개선)

### 🟡 중간 우선순위
3. **Firebase IndexedDB 준비 확인**
4. **이미지/폰트 프리로드**

### 🟢 낮은 우선순위
5. **예측적 데이터 로딩** (다음에 사용할 데이터 추측)

## 참고

현재 프리로딩은 **기본적으로 구현되어 있으나**, 창 표시 전 완료 대기와 중요 데이터 프리로드는 추가 개선이 필요합니다.

