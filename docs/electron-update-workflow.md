# Electron 업데이트 전체 워크플로우

## 개요

Firebase Storage를 사용한 Electron 자동 업데이트 시스템입니다.

## 전체 프로세스

### 1️⃣ 빌드 단계 (개발자)

```bash
# Electron 앱 빌드
npm run electron:build

# 생성되는 파일:
# - dist/TMS-Setup-0.2.0.exe (설치 파일)
# - dist/TMS-Integrated-Management-0.2.0.exe (portable 파일, delta 업데이트용)
```

**빌드 위치**: `dist/` 폴더

---

### 2️⃣ Firebase Storage 업로드 (개발자)

#### 방법 A: Firebase Console 사용 (권장)

1. Firebase Console 접속 → Storage
2. `electron-releases` 폴더 생성
3. 다음 파일 업로드:
   - **`latest.json`** (메타데이터)
     ```json
     {
       "version": "0.2.0",
       "fileName": "TMS-Setup-0.2.0.exe",
       "size": 224460800,
       "publishedAt": "2025-11-03T17:00:00Z"
     }
     ```
   - **`TMS-Setup-0.2.0.exe`** (설치 파일)
   - **`TMS-Integrated-Management-0.2.0.exe`** (portable 파일, delta 업데이트용)
   - **`latest.yml`** (electron-updater용 메타데이터 - electron-builder가 생성)
   - **`*.blockmap`** (delta 업데이트용)

#### 방법 B: 스크립트 사용 (추후 구현 가능)

```bash
node scripts/upload-electron-release.js 0.2.0 dist/TMS-Setup-0.2.0.exe
```

---

### 3️⃣ 웹 브라우저에서 다운로드

**대상**: 새 사용자 또는 웹에서 앱 설치가 필요한 사용자

1. **설정 페이지** → **정보 탭** → **"데스크탑용 앱"** 카드
2. `useFirebaseRelease` 훅이 `electron-releases/latest.json` 읽기
3. 버전 정보 및 다운로드 링크 표시
4. **"Windows" 버튼** 클릭 → Firebase Storage에서 직접 다운로드
5. 다운로드된 `.exe` 파일 실행 → 설치

**흐름**:
```
웹 브라우저 
  → Firebase Storage (electron-releases/latest.json 읽기)
  → 버전 정보 표시
  → 다운로드 버튼 클릭
  → Firebase Storage (TMS-Setup-0.2.0.exe 다운로드)
```

---

### 4️⃣ Electron 앱 내 자동 업데이트

**대상**: 이미 Electron 앱이 설치된 사용자

#### 4-1. 업데이트 체크 (백그라운드)

- **주기**: 앱 시작 시 1회 + 30분마다 자동 체크
- **방법**: `electron-updater`가 `package.json`의 `publish` 설정 확인
- **현재 상태**: GitHub Releases 설정 (변경 필요!)

```javascript
// electron/main.js
autoUpdater.checkForUpdates(); // GitHub Releases API 호출
```

**문제**: 현재 `package.json`에 GitHub 설정이 있어서 Firebase Storage를 확인하지 않음

**해결 방법**: 
1. `package.json`의 `publish` 설정을 제거하거나
2. Custom provider 구현 (추후 필요)

#### 4-2. 새 버전 발견 시

1. `electron-updater`가 새 버전 감지
2. `update-available` 이벤트 발생
3. 프론트엔드에 IPC 메시지 전송
4. **좌측 하단 알림창** 표시:
   - 버전 정보
   - "지금 업데이트" 버튼
   - "나중에 알림" 링크

#### 4-3. 사용자가 "지금 업데이트" 클릭

1. 전체 화면 오버레이 모달 표시
2. `electron-updater.downloadUpdate()` 호출
3. **백그라운드에서 다운로드 진행**:
   - delta 업데이트 시: 변경된 부분만 다운로드 (빠름)
   - 전체 업데이트 시: 전체 파일 다운로드
4. 다운로드 진행률 표시 (모달에 퍼센트)
5. 다운로드 완료 (100%) → 자동으로 설치 시작
6. 앱 재시작

**흐름**:
```
Electron 앱
  → electron-updater (업데이트 체크)
  → GitHub Releases API (현재) → Firebase Storage로 변경 필요!
  → 새 버전 발견
  → 알림 표시
  → 사용자 클릭
  → 다운로드 (백그라운드)
  → 설치 및 재시작
```

---

## ⚠️ 현재 문제점 및 해결 필요 사항

### 1. electron-updater가 여전히 GitHub을 사용

**현재 설정** (`package.json`):
```json
"build": {
  "publish": {
    "provider": "github",
    "owner": "mir1102",
    "repo": "HS-Jig"
  }
}
```

**해결 방법**:
- **옵션 A**: `publish` 설정 제거 → `electron-updater`가 자동으로 파일 경로 기반 업데이트 시도
- **옵션 B**: Custom provider 구현 → Firebase Storage 직접 접근

### 2. Firebase Storage 업로드 자동화 필요

현재는 수동으로 Firebase Console에서 업로드해야 함.

**개선안**: GitHub Actions 워크플로우 수정
- 빌드 완료 후 자동으로 Firebase Storage에 업로드
- `latest.json` 자동 생성

---

## 📋 체크리스트

### 개발자가 해야 할 일

- [ ] Storage 규칙 배포 (`firebase deploy --only storage`)
- [ ] Firebase Storage에 첫 번째 릴리스 업로드:
  - [ ] `latest.json` 생성 및 업로드
  - [ ] `TMS-Setup-*.exe` 업로드
  - [ ] `TMS-Integrated-Management-*.exe` 업로드 (delta 업데이트용)
  - [ ] `latest.yml` 업로드 (electron-builder가 생성)
  - [ ] `*.blockmap` 업로드 (electron-builder가 생성)
- [ ] `package.json`의 `publish` 설정 수정 (GitHub → Firebase 또는 제거)
- [ ] electron-updater가 Firebase Storage를 확인하도록 수정 (필요 시)

### 사용자 경험

#### 웹 브라우저 사용자
1. 설정 페이지 접속
2. "데스크탑용 앱" 카드 확인
3. Windows 버튼 클릭 → 다운로드 → 설치

#### Electron 앱 사용자
1. 앱 실행 중 (백그라운드 체크)
2. 새 버전 발견 시 알림 표시
3. "지금 업데이트" 클릭
4. 자동 다운로드 및 설치

---

## 🔄 다음 업데이트 시나리오

1. 개발자가 새 버전 빌드 (`npm run electron:build`)
2. Firebase Storage에 업로드:
   - `latest.json` 업데이트 (버전 정보 변경)
   - 새 설치 파일 업로드
3. 웹 사용자: 설정 페이지에서 자동으로 새 버전 표시
4. Electron 사용자: 30분 이내 자동으로 새 버전 감지 및 알림

