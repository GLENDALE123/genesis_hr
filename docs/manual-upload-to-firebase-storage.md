# Firebase Storage에 수동으로 Electron 릴리스 업로드하기

## 방법 1: Firebase Console 사용 (가장 간단)

### 1. Firebase Console 접속
1. https://console.firebase.google.com 접속
2. 프로젝트 `hs-jig-b2093` 선택
3. 왼쪽 메뉴에서 **Storage** 클릭

### 2. 폴더 구조 확인
- `electron-releases/` 폴더가 없으면 생성
- `electron-releases/` 폴더로 이동

### 3. 파일 업로드
다음 파일들을 업로드합니다:

#### 필수 파일:
1. **latest.json** - 메타데이터 파일 (아래 내용 참고)
2. **TMS-Setup-latest.exe** - 설치 파일 (빌드된 `dist/TMS-Setup-*.exe` 파일)
3. **TMS-Integrated-Management-latest.exe** - Portable 파일 (빌드된 `dist/*-Integrated-Management*.exe` 파일)
4. **latest.yml** - 업데이트 메타데이터 (빌드된 `dist/*.yml` 파일)
5. ***.blockmap** - Delta 업데이트용 블록맵 파일들 (빌드된 `dist/*.blockmap` 파일)

### 4. latest.json 생성
`latest.json` 파일은 다음과 같은 형식입니다:

```json
{
  "version": "0.1.14",
  "fileName": "TMS-Setup-latest.exe",
  "size": 12345678,
  "publishedAt": "2025-01-03T12:00:00Z"
}
```

**생성 방법:**
1. `TMS-Setup-*.exe` 파일의 크기를 확인 (바이트 단위)
2. 현재 날짜/시간을 ISO 8601 형식으로 기록
3. 위 형식에 맞춰 JSON 파일 생성

---

## 방법 2: gsutil 로컬 사용 (명령줄)

### 1. Google Cloud SDK 설치
1. https://cloud.google.com/sdk/docs/install 다운로드
2. 설치 후 `gcloud auth login` 실행하여 로그인

### 2. 서비스 계정 인증
```bash
# 서비스 계정 키 파일 다운로드 (Firebase Console > 프로젝트 설정 > 서비스 계정)
gcloud auth activate-service-account --key-file=path/to/service-account-key.json
```

### 3. 파일 업로드
```bash
# 버킷 이름
BUCKET="hs-jig-b2093.firebasestorage.app"

# latest.json 업로드
gsutil cp latest.json gs://$BUCKET/electron-releases/latest.json

# 설치 파일 업로드 (이름 변경)
gsutil cp dist/TMS-Setup-0.1.14.exe gs://$BUCKET/electron-releases/TMS-Setup-latest.exe

# Portable 파일 업로드 (이름 변경)
gsutil cp dist/TMS-Integrated-Management-0.1.14.exe gs://$BUCKET/electron-releases/TMS-Integrated-Management-latest.exe

# latest.yml 업로드
gsutil cp dist/latest.yml gs://$BUCKET/electron-releases/latest.yml

# blockmap 파일들 업로드
gsutil cp dist/*.blockmap gs://$BUCKET/electron-releases/
```

---

## 방법 3: Firebase CLI 사용

### 1. Firebase CLI 설치
```bash
npm install -g firebase-tools
```

### 2. 로그인 및 프로젝트 설정
```bash
firebase login
firebase use hs-jig-b2093
```

### 3. Storage 규칙 확인
`storage.rules` 파일이 올바르게 배포되어 있는지 확인:
```bash
firebase deploy --only storage
```

### 4. 파일 업로드
Firebase CLI는 직접 파일 업로드를 지원하지 않으므로, Firebase Console 또는 gsutil을 사용해야 합니다.

---

## 파일 이름 규칙

**중요:** 다음 파일들은 항상 같은 이름으로 업로드하여 덮어쓰기합니다:

- `TMS-Setup-latest.exe` - 최신 설치 파일
- `TMS-Integrated-Management-latest.exe` - 최신 Portable 파일
- `latest.yml` - 최신 업데이트 메타데이터
- `latest.json` - 최신 버전 정보

이렇게 하면 클라이언트가 항상 최신 파일을 다운로드할 수 있습니다.

---

## 업로드 체크리스트

빌드 후 다음 파일들을 업로드해야 합니다:

- [ ] `latest.json` (버전 정보)
- [ ] `TMS-Setup-latest.exe` (설치 파일)
- [ ] `TMS-Integrated-Management-latest.exe` (Portable 파일)
- [ ] `latest.yml` (업데이트 메타데이터)
- [ ] `*.blockmap` 파일들 (Delta 업데이트용)

---

## latest.json 생성 스크립트 (PowerShell)

로컬에서 `latest.json`을 생성하려면:

```powershell
# 버전 설정
$VERSION = "0.1.14"

# 설치 파일 찾기
$INSTALLER_FILE = Get-ChildItem dist -Filter "TMS-Setup-*.exe" | Select-Object -First 1

# 파일 크기 구하기
$FILE_SIZE = $INSTALLER_FILE.Length

# 현재 시간 (UTC)
$PUBLISHED_AT = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

# latest.json 생성
$json = @{
    version = $VERSION
    fileName = "TMS-Setup-latest.exe"
    size = $FILE_SIZE
    publishedAt = $PUBLISHED_AT
} | ConvertTo-Json -Depth 10

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText("latest.json", $json, $utf8NoBom)

Write-Host "latest.json 생성 완료:"
Get-Content latest.json
```

---

## 참고사항

1. **파일 크기 제한**: Firebase Storage의 무료 플랜은 5GB까지 제공됩니다.
2. **공개 읽기 권한**: `storage.rules`에 `allow read: if true;`가 설정되어 있어야 합니다.
3. **CORS 설정**: 웹에서 접근하려면 CORS가 올바르게 설정되어 있어야 합니다.
4. **파일 덮어쓰기**: 같은 이름으로 업로드하면 자동으로 덮어쓰기됩니다.

