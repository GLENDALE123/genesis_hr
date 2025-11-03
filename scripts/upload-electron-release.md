# Electron 릴리스 업로드 가이드

Firebase Storage에 Electron 설치 파일을 업로드하는 방법입니다.

## 1. Firebase Storage 구조

```
electron-releases/
  ├── latest.json          # 최신 버전 정보 (메타데이터)
  ├── TMS-Setup-0.2.0.exe  # 설치 파일
  └── ...
```

## 2. latest.json 형식

Firebase Storage의 `electron-releases/latest.json` 파일:

```json
{
  "version": "0.2.0",
  "fileName": "TMS-Setup-latest.exe",
  "size": 224460800,
  "publishedAt": "2025-11-03T17:00:00Z"
}
```

**주의**: `fileName`은 항상 `TMS-Setup-latest.exe`로 고정합니다. 이렇게 하면 새 버전 업로드 시 자동으로 덮어쓰기되어 Storage 용량이 증가하지 않습니다.

## 3. 업로드 방법

### 방법 1: Firebase Console 사용 (권장)

1. Firebase Console 접속 → Storage
2. `electron-releases` 폴더 생성
3. 다음 파일 업로드:
   - **`latest.json`** (메타데이터)
     ```json
     {
       "version": "0.2.0",
       "fileName": "TMS-Setup-latest.exe",
       "size": 224460800,
       "publishedAt": "2025-11-03T17:00:00Z"
     }
     ```
   - **`TMS-Setup-latest.exe`** (설치 파일 - 항상 같은 이름으로 업로드하여 덮어쓰기)
   - **`TMS-Integrated-Management-latest.exe`** (portable 파일, delta 업데이트용 - 항상 같은 이름)
   - **`latest.yml`** (electron-updater용 메타데이터 - electron-builder가 생성)
   - **`*.blockmap`** (delta 업데이트용)

**중요**: 설치 파일은 항상 **같은 파일명**(`TMS-Setup-latest.exe`)으로 업로드하세요. 이렇게 하면 이전 버전이 자동으로 덮어쓰기되어 Storage 용량이 증가하지 않습니다.

### 방법 2: Firebase CLI 사용
```bash
# latest.json 업로드
firebase storage:upload electron-releases/latest.json electron-releases/latest.json

# 설치 파일 업로드 (항상 같은 이름으로)
firebase storage:upload dist/TMS-Setup-0.2.0.exe electron-releases/TMS-Setup-latest.exe
```

### 방법 3: 관리자 페이지에서 업로드 (추후 구현 가능)

## 4. Storage 규칙 배포

Storage 규칙을 업데이트했으므로 배포해야 합니다:

```bash
firebase deploy --only storage
```

또는

```bash
firebase deploy
```

## 5. 앱에서 사용

설정 페이지의 "데스크탑용 앱" 섹션에서 자동으로 최신 버전을 감지하고 다운로드 링크를 제공합니다.

