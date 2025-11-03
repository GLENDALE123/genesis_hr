# Firebase Storage 버킷 마이그레이션 가이드

Firebase Storage 파일을 `gs://hs-jig-b2093`에서 `gs://hs-jig-b2093.firebasestorage.app`로 마이그레이션하는 가이드입니다.

## 사전 요구사항

### 1. Google Cloud SDK 설치

gsutil을 사용하기 위해 Google Cloud SDK가 설치되어 있어야 합니다.

#### Windows
```powershell
# Chocolatey 사용
choco install gcloudsdk

# 또는 수동 설치
# https://cloud.google.com/sdk/docs/install-sdk 참고
```

#### macOS
```bash
# Homebrew 사용
brew install --cask google-cloud-sdk

# 또는 수동 설치
# https://cloud.google.com/sdk/docs/install-sdk 참고
```

#### Linux
```bash
# 설치 스크립트 실행
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

### 2. gcloud 인증 설정

```bash
# Google Cloud 계정으로 로그인
gcloud auth login

# 프로젝트 설정
gcloud config set project hs-jig-b2093

# 애플리케이션 기본 인증 정보 설정
gcloud auth application-default login
```

### 3. 버킷 접근 권한 확인

마이그레이션 전에 두 버킷 모두 접근 가능한지 확인하세요:

```bash
# 원본 버킷 확인
gsutil ls gs://hs-jig-b2093

# 대상 버킷 확인
gsutil ls gs://hs-jig-b2093.firebasestorage.app
```

## 마이그레이션 실행

### 방법 1: 스크립트 사용 (권장)

#### Windows (PowerShell)
```powershell
cd scripts
.\migrate-storage-bucket.ps1
```

#### macOS/Linux
```bash
cd scripts
chmod +x migrate-storage-bucket.sh
./migrate-storage-bucket.sh
```

### 방법 2: 수동 실행

gsutil 명령을 직접 실행할 수도 있습니다:

```bash
# 멀티스레딩으로 빠른 동기화 (권장)
gsutil -m rsync -r gs://hs-jig-b2093 gs://hs-jig-b2093.firebasestorage.app
```

**명령 옵션 설명:**
- `-m`: 멀티스레딩으로 여러 파일을 병렬로 전송 (빠름)
- `-r`: 재귀적 동기화 (모든 하위 디렉토리 포함)
- `-d`: 대상 버킷에 없는 파일 삭제 (기본값: 삭제하지 않음, 주의해서 사용)

## 마이그레이션 확인

### 1. 파일 목록 비교

```bash
# 원본 버킷 파일 수
gsutil ls -r gs://hs-jig-b2093 | wc -l

# 대상 버킷 파일 수
gsutil ls -r gs://hs-jig-b2093.firebasestorage.app | wc -l
```

### 2. 특정 파일 확인

```bash
# 원본 버킷의 특정 파일
gsutil ls -lh gs://hs-jig-b2093/electron-releases/latest.json

# 대상 버킷의 동일한 파일
gsutil ls -lh gs://hs-jig-b2093.firebasestorage.app/electron-releases/latest.json
```

### 3. 파일 해시 비교 (선택사항)

```bash
# 원본 파일 해시
gsutil hash gs://hs-jig-b2093/electron-releases/latest.json

# 대상 파일 해시
gsutil hash gs://hs-jig-b2093.firebasestorage.app/electron-releases/latest.json
```

## 프로젝트 설정 업데이트

마이그레이션 완료 후 다음 파일들이 이미 업데이트되어 있습니다:

- ✅ `firebase.json` - Storage bucket 설정
- ✅ `src/shared/services/firebase/config.ts` - Firebase config
- ✅ `env.example` - 환경 변수 예시

### .env 파일 업데이트 (중요!)

로컬 `.env` 파일이 있다면 수동으로 업데이트해야 합니다:

```bash
# .env 파일에서 다음 값을 변경
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=hs-jig-b2093.firebasestorage.app
```

## 애플리케이션 테스트

마이그레이션 완료 후 다음을 확인하세요:

1. **애플리케이션 재시작**
   ```bash
   npm run dev
   ```

2. **Storage 기능 테스트**
   - 파일 업로드/다운로드 기능 확인
   - 이미지 표시 확인
   - Electron 릴리스 다운로드 확인

3. **브라우저 콘솔 확인**
   - Storage 관련 오류가 없는지 확인
   - 새 버킷에서 파일을 올바르게 로드하는지 확인

## 문제 해결

### 오류: "AccessDeniedException"

버킷 접근 권한이 없습니다. 다음을 확인하세요:

```bash
# 현재 인증된 계정 확인
gcloud auth list

# 버킷 접근 권한 확인
gsutil iam get gs://hs-jig-b2093
gsutil iam get gs://hs-jig-b2093.firebasestorage.app
```

Firebase Console에서 버킷 권한을 확인하고 필요시 관리자에게 문의하세요.

### 오류: "BucketNotFoundException"

대상 버킷이 존재하지 않습니다. Firebase Console에서 버킷이 생성되어 있는지 확인하세요.

### 동기화가 너무 느림

대용량 파일이나 많은 파일이 있는 경우 시간이 걸릴 수 있습니다:

```bash
# 진행 상황 확인 (별도 터미널)
watch -n 5 "gsutil du -sh gs://hs-jig-b2093.firebasestorage.app"
```

또는 `-m` 옵션 없이 실행하면 진행 상황을 더 자세히 볼 수 있습니다:

```bash
gsutil rsync -r gs://hs-jig-b2093 gs://hs-jig-b2093.firebasestorage.app
```

## 롤백 방법

문제가 발생하여 원래 버킷으로 되돌리고 싶다면:

1. **설정 파일 되돌리기**
   - `firebase.json`의 bucket을 `hs-jig-b2093`으로 변경
   - `src/shared/services/firebase/config.ts`의 storageBucket을 `hs-jig-b2093`으로 변경
   - `env.example`의 값 변경

2. **애플리케이션 재시작**
   ```bash
   npm run dev
   ```

참고: 원본 버킷의 파일은 그대로 유지되므로 추가 작업 없이 되돌릴 수 있습니다.

## 추가 정보

- [gsutil rsync 문서](https://cloud.google.com/storage/docs/gsutil/commands/rsync)
- [Firebase Storage 문서](https://firebase.google.com/docs/storage)
- [Google Cloud Storage 문서](https://cloud.google.com/storage/docs)

