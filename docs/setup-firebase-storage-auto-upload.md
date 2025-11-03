# Firebase Storage 자동 업로드 설정

## 개요

GitHub Actions를 사용하여 태그가 푸시될 때 자동으로 Firebase Storage에 Electron 릴리스 파일을 업로드합니다.

## 설정 방법

### 1. Firebase 서비스 계정 키 생성

**방법 A: 새 서비스 계정 만들기** (권장)

1. [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts) 접속
2. 프로젝트 선택 (`hs-jig-b2093`)
3. **서비스 계정** 메뉴 클릭
4. **서비스 계정 만들기** 클릭
5. 계정 정보 입력:
   - 서비스 계정 이름: `github-actions-uploader`
   - 서비스 계정 ID: 자동 생성
6. **생성** 클릭
7. **역할** 추가:
   - `Storage Admin` 역할 부여 (Firebase Storage 읽기/쓰기 권한)
8. **핵심 만들기** 클릭
9. **키 유형**: JSON 선택
10. **생성** 클릭 → JSON 파일 다운로드

**방법 B: 기존 firebase-adminsdk 계정 사용**

이미 Firebase Functions용 서비스 계정이 있다면:
1. [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts) 접속
2. `firebase-adminsdk`로 시작하는 계정 찾기
3. 클릭하여 **키** 탭 열기
4. **키 추가** → **JSON** 선택
5. 다운로드

### 2. GitHub Secret 확인

이미 `FIREBASE_SERVICE_ACCOUNT_HS_JIG_B2093` Secret이 설정되어 있습니다!

설정이 없는 경우:
1. GitHub 저장소 페이지 접속
2. **Settings** → **Secrets and variables** → **Actions**
3. 다음 이름으로 Secret 추가:
   - **Name**: `FIREBASE_SERVICE_ACCOUNT_HS_JIG_B2093`
   - **Secret**: Firebase 서비스 계정 JSON 전체 내용

### 3. GitHub Actions 워크플로우 확인

`.github/workflows/release.yml` 파일이 이미 설정되어 있습니다:

```yaml
- name: Authenticate with Google Cloud
  run: |
    echo "${{ secrets.FIREBASE_SERVICE_ACCOUNT_HS_JIG_B2093 }}" | Out-File -FilePath firebase-service-account.json
    gcloud auth activate-service-account --key-file=firebase-service-account.json

- name: Upload to Firebase Storage
  # gsutil을 사용하여 latest.json, 설치 파일, portable 파일, 메타데이터 업로드
```

## 사용 방법

### 새 버전 릴리스

```bash
# 1. 버전 태그 생성
git tag v0.3.0

# 2. 태그 푸시
git push origin v0.3.0
```

**자동 실행되는 작업**:
1. ✅ 버전 자동 설정
2. ✅ Electron 빌드
3. ✅ GitHub Release 생성
4. ✅ **Firebase Storage 자동 업로드** ← 새로 추가됨!

### 업로드되는 파일

```
electron-releases/
  ├── latest.json                    # 최신 버전 메타데이터
  ├── TMS-Setup-latest.exe          # 설치 파일 (덮어쓰기)
  ├── TMS-Integrated-Management-latest.exe  # portable 파일 (덮어쓰기)
  ├── latest.yml                     # electron-updater 메타데이터
  └── *.blockmap                     # delta 업데이트용
```

### 업로드 결과

- ✅ Firebase Console에서 확인 가능
- ✅ 웹 브라우저 사용자가 설정 페이지에서 새 버전 확인
- ✅ Electron 앱 사용자가 자동 업데이트 받음

## 확인 방법

### GitHub Actions 로그 확인

1. GitHub 저장소 → **Actions** 탭
2. 최근 워크플로우 실행 클릭
3. **Upload to Firebase Storage** 단계 확인

### Firebase Console 확인

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택 (`hs-jig-b2093`)
3. **Storage** 메뉴 클릭
4. `electron-releases` 폴더 확인

### 웹 앱에서 확인

1. 설정 페이지 접속
2. "데스크탑용 앱" 카드 확인
3. 버전 정보가 업데이트되었는지 확인

## 문제 해결

### 업로드 실패 시

**오류**: `firebase auth:activate-service-account` 명령어를 찾을 수 없음

**해결**: Firebase CLI 버전 확인
```yaml
- name: Setup Firebase CLI
  run: npm install -g firebase-tools
```

**오류**: 인증 실패

**해결**: 
1. 서비스 계정 JSON 확인
2. Storage Admin 역할이 부여되었는지 확인
3. GitHub Secret이 올바르게 설정되었는지 확인

### 수동 업로드 방법

자동 업로드가 실패했을 경우 수동으로 업로드:

1. Firebase Console → Storage
2. `electron-releases` 폴더 열기
3. 파일 드래그 앤 드롭하여 업로드

## 정리

✅ **자동화됨**: 태그 푸시 시 자동 업로드  
✅ **용량 관리**: 같은 파일명으로 덮어쓰기  
✅ **사용자 경험**: 즉시 새 버전 사용 가능  

이제 `git tag v0.3.0 && git push origin v0.3.0`만 하면 자동으로 Firebase Storage에 업로드됩니다!

