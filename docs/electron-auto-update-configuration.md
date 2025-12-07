# Electron 자동 업데이트 설정 가이드

Discord나 다른 앱들처럼 별도의 설치 프로그램 없이 백그라운드에서 자동으로 업데이트되는 기능을 구현했습니다.

## 작동 방식

### 1. **앱 사용 중 - 백그라운드 다운로드만**
- 앱이 백그라운드에서 자동으로 새 버전을 다운로드합니다
- **사용자는 계속 앱을 사용할 수 있습니다** (작업 방해 없음)
- Discord처럼 조용히 백그라운드에서 다운로드만 진행됩니다
- 별도의 다운로드 버튼을 클릭할 필요가 없습니다

### 2. **앱 종료 시 - 자동 설치 및 재시작**
- **앱 사용 중에는 설치하지 않습니다** (작업 방해 방지)
- 사용자가 앱을 종료할 때만 다운로드된 업데이트를 설치합니다
- 별도의 설치 프로그램 창이 뜨지 않습니다 (백그라운드 설치)
- 설치 후 자동으로 재시작됩니다

### 3. **업데이트 체크**
- 앱 시작 후 10초 뒤에 첫 업데이트 체크
- 이후 30분마다 자동으로 업데이트 확인

## 설정 내용

### `electron/main.js` 설정

```javascript
// Firebase Storage를 업데이트 서버로 사용
autoUpdater.autoDownload = true; // 자동 다운로드 활성화
autoUpdater.autoInstallOnAppQuit = true; // 앱 종료 시 자동 설치
autoUpdater.autoRunAppAfterInstall = true; // 설치 후 자동 실행

// Firebase Storage 업데이트 서버 URL
const UPDATE_BASE_URL = `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/o/electron-releases%2F`;
autoUpdater.setFeedURL({
  provider: 'generic',
  url: `${UPDATE_BASE_URL}latest.yml?alt=media`
});
```

### 업데이트 파일 구조

Firebase Storage의 `electron-releases/` 폴더에 다음 파일들이 필요합니다:

```
electron-releases/
  ├── latest.yml          # electron-updater가 읽는 메타데이터 파일
  ├── latest.json         # 앱 내부에서 사용하는 버전 정보
  ├── TMS-Integrated-Management-*.exe  # Portable 실행 파일 (delta 업데이트용)
  ├── *.blockmap          # Delta 업데이트용 파일 (변경된 부분만 다운로드)
  └── TMS-Setup-*.exe     # 전체 설치 파일 (새로 설치하는 경우)
```

## 중요 사항

### 1. **Firebase Storage 공개 접근 설정**

Firebase Storage의 `electron-releases` 폴더가 **공개 접근**이 가능하도록 설정되어 있어야 합니다.

`storage.rules` 파일:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // electron-releases 폴더는 공개 읽기 허용
    match /electron-releases/{allPaths=**} {
      allow read: if true; // 모든 사용자가 읽기 가능
      allow write: if request.auth != null; // 인증된 사용자만 쓰기 가능
    }
  }
}
```

### 2. **latest.yml 파일 URL**

`latest.yml` 파일의 파일 경로가 Firebase Storage 공개 URL 형식을 따르는지 확인해야 합니다.

electron-builder가 생성하는 `latest.yml` 파일 예시:
```yaml
version: 0.1.14
files:
  - url: TMS-Integrated-Management-0.1.14.exe
    sha512: ...
    size: ...
```

이 파일 경로를 Firebase Storage 공개 URL로 변환해야 합니다:
```
https://firebasestorage.googleapis.com/v0/b/hs-jig-b2093.firebasestorage.app/o/electron-releases%2FTMS-Integrated-Management-0.1.14.exe?alt=media
```

### 3. **Delta 업데이트**

electron-updater는 `blockmap` 파일을 사용하여 **delta 업데이트**를 지원합니다:
- 전체 파일을 다운로드하는 대신, 변경된 부분만 다운로드
- 네트워크 사용량을 크게 줄일 수 있습니다

## 문제 해결

### 업데이트가 작동하지 않는 경우

1. **Firebase Storage 공개 접근 확인**
   - `electron-releases/latest.yml` 파일이 브라우저에서 직접 접근 가능한지 확인
   - URL: `https://firebasestorage.googleapis.com/v0/b/hs-jig-b2093.firebasestorage.app/o/electron-releases%2Flatest.yml?alt=media`

2. **latest.yml 파일 내용 확인**
   - 파일 경로가 올바른지 확인
   - 파일 다운로드 URL이 Firebase Storage 공개 URL 형식인지 확인

3. **로그 확인**
   - Electron 앱의 콘솔 로그 확인 (`[Updater]`로 시작하는 로그)
   - 업데이트 서버 URL이 올바르게 설정되었는지 확인

### 개발 모드에서는 업데이트 체크 안 함

개발 모드 (`NODE_ENV=development` 또는 `ELECTRON_DEV=true`)에서는 자동 업데이트가 비활성화됩니다.

## 사용자 경험

### Discord와 유사한 경험

1. **백그라운드 다운로드**
   - 사용자가 작업 중에도 백그라운드에서 다운로드 진행
   - 네트워크 사용량에 따라 조용히 진행

2. **자동 설치 (앱 종료 시)**
   - 다운로드 완료 후 알림 표시 (선택적)
   - 사용자가 앱을 종료할 때만 설치 및 재시작
   - 별도 설치 창 없이 조용히 진행
   - **작업 중에는 앱이 갑자기 종료되지 않음**

3. **무중단 업데이트**
   - 사용자가 작업 중이어도 업데이트 다운로드 가능
   - 앱 재시작(종료 후 재시작) 시에만 업데이트 적용
   - 작업 손실 없이 안전하게 업데이트 가능

## 추가 개선 사항

향후 개선할 수 있는 사항:

1. **업데이트 알림 UI**
   - 다운로드 진행률 표시
   - 설치 전 사용자 확인 (선택적)
   - 업데이트 내용 표시

2. **업데이트 스케줄링**
   - 사용자가 작업하지 않을 때만 업데이트
   - 사용자 정의 업데이트 시간 설정

3. **오프라인 모드**
   - 네트워크가 없을 때 업데이트 체크 건너뛰기
   - 오프라인 상태 표시

## 참고 자료

- [electron-updater 문서](https://www.electron.build/auto-update)
- [Firebase Storage 공개 접근 설정](https://firebase.google.com/docs/storage/security)

