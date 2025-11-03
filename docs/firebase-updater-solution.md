# Firebase Storage 업데이트 설정 방법

## 문제점

현재 `electron-updater`가 GitHub Releases를 확인하고 있어서, Firebase Storage에 업로드한 파일을 감지하지 못합니다.

## 해결 방법 3가지

### 방법 1: publish 설정 제거 (가장 간단)

`package.json`에서 `publish` 설정을 제거하면, `electron-updater`가 빌드된 파일 경로를 기준으로 업데이트를 체크합니다.

하지만 이 방법은 로컬 파일 경로를 사용하므로 Firebase Storage와는 연동되지 않습니다.

### 방법 2: Custom Provider 구현 (권장)

`electron-updater`에 Firebase Storage를 직접 읽는 Custom Provider를 구현합니다.

**구현 필요**:
1. `electron/main.js`에서 Firebase Storage 접근
2. `latest.json` 읽기
3. `electron-updater`에 업데이트 정보 제공

### 방법 3: HTTPS URL로 직접 다운로드

Firebase Storage의 다운로드 URL을 직접 사용하도록 수정합니다.

**장점**: 구현이 비교적 간단
**단점**: delta 업데이트 지원 불가 (전체 파일 다운로드)

---

## 추천 방법: 방법 2 (Custom Provider)

### 구현 계획

1. **Firebase Storage에서 업데이트 정보 가져오기**
   - `electron-releases/latest.json` 읽기
   - 현재 버전과 비교
   - 새 버전 발견 시 다운로드 URL 제공

2. **electron-updater와 통합**
   - `autoUpdater.setFeedURL()` 사용하여 커스텀 업데이트 서버 지정
   - 또는 `autoUpdater.checkForUpdates()` 전에 수동으로 업데이트 정보 설정

### 간단한 구현 예시

```javascript
// electron/main.js

const { ref, getDownloadURL } = require('firebase/storage');
const { storage } = require('./firebase-storage-config'); // Firebase Storage 초기화

async function checkForFirebaseUpdate() {
  try {
    // latest.json 읽기
    const latestInfoRef = ref(storage, 'electron-releases/latest.json');
    const latestInfoUrl = await getDownloadURL(latestInfoRef);
    const response = await fetch(latestInfoUrl);
    const latestInfo = await response.json();
    
    // 현재 버전과 비교
    const currentVersion = app.getVersion();
    if (compareVersions(latestInfo.version, currentVersion) > 0) {
      // 새 버전 발견
      const installerUrl = await getDownloadURL(
        ref(storage, `electron-releases/${latestInfo.fileName}`)
      );
      
      // autoUpdater에 업데이트 정보 제공
      autoUpdater.setFeedURL({
        provider: 'generic',
        url: installerUrl
      });
      
      autoUpdater.checkForUpdates();
    }
  } catch (error) {
    console.error('Firebase 업데이트 체크 실패:', error);
  }
}
```

---

## 임시 해결책 (빠른 적용)

현재는 `package.json`의 `publish` 설정을 제거하고, 수동으로 Firebase Storage에서 업데이트를 체크하도록 수정하는 것이 가장 빠릅니다.

### 1. package.json 수정

```json
{
  "build": {
    // ...
    "publish": null  // 또는 이 줄 삭제
  }
}
```

### 2. electron/main.js 수정

`checkForUpdates` 함수를 Firebase Storage 기반으로 변경

