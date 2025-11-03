# 모바일 APK 업로드 가이드

## 현재 파일 준비 완료

```
MobileApp/android/app/build/outputs/apk/release/
  ├── latest.json         ✅ 준비됨
  └── TMS-Mobile-latest.apk  ✅ 준비됨
```

## Firebase Storage 업로드

### 방법 1: Firebase Console 사용 (권장)

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택 (`hs-jig-b2093`)
3. **Storage** 메뉴 클릭
4. `mobile-releases` 폴더로 이동 (없으면 생성)
5. 파일 업로드:
   - `TMS-Mobile-latest.apk` (build 폴더에서 복사)
   - `latest.json` (build 폴더에서 복사)

### 방법 2: gsutil 사용 (개발 환경에서만)

Google Cloud SDK가 설치되어 있어야 합니다:

```bash
# PowerShell에서 실행
# gsutil 설정 확인
where.exe gsutil

# APK 업로드
gsutil cp MobileApp\android\app\build\outputs\apk\release\TMS-Mobile-latest.apk gs://hs-jig-b2093.firebasestorage.app/mobile-releases/TMS-Mobile-latest.apk

# latest.json 업로드
gsutil cp MobileApp\android\app\build\outputs\apk\release\latest.json gs://hs-jig-b2093.firebasestorage.app/mobile-releases/latest.json
```

## 확인

업로드 후 브라우저에서 페이지 새로고침:
- 설정 → 정보 탭 → Android 버튼 클릭
- 다운로드 시작

## Storage 규칙 확인

Storage 규칙이 이미 배포되었습니다:

```
mobile-releases/{allPaths=**}
  allow read: if true  ← 공개 읽기 허용
```

## CORS 설정 확인

Firebase Storage CORS가 이미 설정되었습니다:

```
[{"maxAgeSeconds": 3600, "method": ["GET"], "origin": ["*"]}]
```

모든 출처에서 GET 요청 허용되어 웹 브라우저에서 정상 다운로드 가능합니다.

