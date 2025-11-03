# 모바일 앱 수동 릴리스 가이드

## Firebase Storage 구조

### 폴더 명명 규칙

```
firebase-storage/
  ├── electron-releases/        # 데스크톱 앱
  │   ├── latest.json
  │   ├── TMS-Setup-latest.exe
  │   └── ...
  │
  └── mobile-releases/          # 모바일 앱
      ├── latest.json
      ├── TMS-Mobile-latest.apk
      └── ...
```

## 파일 명명 규칙

### APK 파일
- **이름**: `TMS-Mobile-latest.apk` (항상 고정)
- **위치**: `mobile-releases/`

### latest.json 형식

```json
{
  "version": "1.0.0",
  "fileName": "TMS-Mobile-latest.apk",
  "size": 52428800,
  "publishedAt": "2025-11-03T17:00:00Z"
}
```

**주요 필드**:
- `version`: 앱 버전 (Semantic Versioning)
- `fileName`: 항상 `TMS-Mobile-latest.apk` (고정)
- `size`: 파일 크기 (바이트 단위)
- `publishedAt`: 출시일 (ISO 8601 형식)

---

## 수동 업로드 절차

### 1. APK 빌드

```bash
cd MobileApp/android
./gradlew assembleRelease
```

**생성 위치**: `MobileApp/android/app/build/outputs/apk/release/app-release.apk`

### 2. Firebase Storage 업로드

#### 방법 A: Firebase Console 사용 (권장)

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택 (`hs-jig-b2093`)
3. **Storage** 메뉴 클릭
4. `mobile-releases` 폴더 생성
5. 다음 파일 업로드:
   - **이름 변경**: `app-release.apk` → `TMS-Mobile-latest.apk`
   - **latest.json** 생성 및 업로드

#### 방법 B: Firebase CLI 사용

```bash
# latest.json 업로드
firebase storage:upload mobile-releases/latest.json mobile-releases/latest.json

# APK 업로드 (이름 변경하여)
firebase storage:upload MobileApp/android/app/build/outputs/apk/release/app-release.apk \
  mobile-releases/TMS-Mobile-latest.apk
```

---

## 버전 관리

### MobileApp/package.json
```json
{
  "version": "1.0.0"
}
```

### MobileApp/android/app/build.gradle
```gradle
defaultConfig {
    versionCode 1      // 자동 증가
    versionName "1.0.0" // package.json과 동기화
}
```

**주의**: 버전은 수동으로 관리합니다.

---

## 업로드 체크리스트

### 새 버전 배포 시

- [ ] `MobileApp/package.json` 버전 업데이트
- [ ] `MobileApp/android/app/build.gradle` 버전 업데이트
- [ ] APK 빌드 (`./gradlew assembleRelease`)
- [ ] `latest.json` 생성
- [ ] Firebase Storage 업로드
  - [ ] `TMS-Mobile-latest.apk` 업로드
  - [ ] `latest.json` 업로드

---

## 파일 구조 정리

### Firebase Storage 최종 구조

```
electron-releases/
  ├── latest.json
  ├── TMS-Setup-latest.exe
  ├── TMS-Integrated-Management-latest.exe
  ├── latest.yml
  └── *.blockmap

mobile-releases/
  ├── latest.json
  └── TMS-Mobile-latest.apk
```

### 장점

✅ **명확한 구조**: 폴더별 분리  
✅ **고정 파일명**: 용량 자동 관리  
✅ **간단한 유지보수**: 수동 관리로 충분  

---

## 예시: 버전 1.0.0 → 1.1.0 업데이트

```bash
# 1. 버전 업데이트
# MobileApp/package.json: "1.1.0"
# MobileApp/android/app/build.gradle: versionName "1.1.0"

# 2. APK 빌드
cd MobileApp/android
./gradlew assembleRelease

# 3. Firebase Storage 업로드
# - TMS-Mobile-latest.apk (덮어쓰기)
# - latest.json (버전 정보 업데이트)
```

**결과**: 사용자가 모바일 브라우저에서 설정 페이지 → Android 버튼 클릭 → 자동 다운로드

