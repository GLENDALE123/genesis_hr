# Firebase 서비스 계정 키 파일 다운로드 방법

## 방법 1: Firebase Console에서 다운로드

### 1. Firebase Console 접속
1. https://console.firebase.google.com 접속
2. 프로젝트 **hs-jig-b2093** 선택

### 2. 서비스 계정 설정 이동
1. 왼쪽 메뉴에서 **⚙️ 프로젝트 설정** (기어 아이콘) 클릭
2. 상단 탭에서 **서비스 계정** 클릭

### 3. 새 비공개 키 생성
1. **새 비공개 키 생성** 버튼 클릭
2. 팝업에서 **키 생성** 클릭
3. JSON 파일이 자동으로 다운로드됩니다

### 4. 파일 저장 위치
- 다운로드 폴더에 저장됩니다 (예: `C:\Users\HRY\Downloads\hs-jig-b2093-xxxxx.json`)
- 파일 이름을 변경하여 프로젝트 폴더에 저장하는 것을 권장합니다:
  ```
  C:\Users\HRY\Desktop\HS_Next\hs-next\firebase-service-account.json
  ```

---

## 방법 2: 기존 서비스 계정 키 확인

이미 서비스 계정 키가 있다면:
1. 다운로드 폴더에서 `.json` 파일 찾기
2. 파일 이름이 `hs-jig-b2093-xxxxx.json` 형식일 것입니다
3. 파일 내용이 다음과 같은 JSON 형식이어야 합니다:

```json
{
  "type": "service_account",
  "project_id": "hs-jig-b2093",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "...@hs-jig-b2093.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

---

## 방법 3: Google Cloud Console에서 다운로드

### 1. Google Cloud Console 접속
1. https://console.cloud.google.com 접속
2. 프로젝트 **hs-jig-b2093** 선택

### 2. 서비스 계정으로 이동
1. 왼쪽 메뉴에서 **IAM 및 관리자** > **서비스 계정** 클릭
2. 서비스 계정 목록에서 적절한 계정 선택 (예: `github-action-1043949986@hs-jig-b2093.iam.gserviceaccount.com`)

### 3. 키 생성
1. **키** 탭 클릭
2. **키 추가** > **새 키 만들기** 클릭
3. **JSON** 형식 선택
4. **만들기** 클릭
5. JSON 파일이 자동으로 다운로드됩니다

---

## 업로드 스크립트 사용 시

서비스 계정 키 파일을 다운로드한 후:

```powershell
# 방법 1: 파일 경로를 직접 지정
.\scripts\upload-to-firebase-storage.ps1 -Version "0.2.0" -ServiceAccountKeyPath "C:\Users\HRY\Downloads\hs-jig-b2093-xxxxx.json"

# 방법 2: 프로젝트 폴더에 저장한 경우
.\scripts\upload-to-firebase-storage.ps1 -Version "0.2.0" -ServiceAccountKeyPath ".\firebase-service-account.json"
```

---

## 보안 주의사항

⚠️ **중요:** 서비스 계정 키 파일은 **절대** Git에 커밋하지 마세요!

- `.gitignore`에 `*service-account*.json` 추가되어 있는지 확인
- 파일이 GitHub에 업로드되지 않았는지 확인
- 필요시 키를 재생성하여 보안 유지

---

## 참고

- 서비스 계정 키는 한 번만 다운로드할 수 있습니다
- 키를 잃어버린 경우 새 키를 생성해야 합니다
- 키 파일은 안전한 곳에 보관하세요


