# Electron 업데이트 전체 프로세스 요약

## 🎯 현재 상태

✅ **완료된 부분**:
- 웹 브라우저에서 Firebase Storage로부터 다운로드 (설정 페이지)
- Firebase Storage 규칙 설정

⚠️ **수정 필요**:
- Electron 앱 내 자동 업데이트가 아직 GitHub을 확인하고 있음

---

## 📋 전체 흐름도

### 시나리오 1: 웹 브라우저 사용자 (새 설치)

```
1. 웹 브라우저에서 설정 페이지 접속
   ↓
2. useFirebaseRelease 훅 실행
   ↓
3. Firebase Storage 접속
   └─> electron-releases/latest.json 읽기
   └─> 버전 정보 가져오기
   ↓
4. "데스크탑용 앱" 카드 표시
   └─> 버전, 파일 크기, 출시일 정보
   └─> "Windows" 다운로드 버튼
   ↓
5. 사용자가 버튼 클릭
   ↓
6. Firebase Storage에서 TMS-Setup-*.exe 직접 다운로드
   ↓
7. 설치 파일 실행 → Electron 앱 설치
```

### 시나리오 2: Electron 앱 사용자 (자동 업데이트)

```
1. Electron 앱 실행 중
   ↓
2. 백그라운드에서 업데이트 체크 (앱 시작 후 10초 + 30분마다)
   ↓
3. ❌ 현재: GitHub Releases API 호출 (작동 안 함)
   ✅ 수정 후: Firebase Storage 확인
   └─> electron-releases/latest.json 읽기
   └─> 현재 버전과 비교
   ↓
4. 새 버전 발견 시
   ↓
5. 좌측 하단 알림창 표시
   ├─> 버전 정보
   ├─> "지금 업데이트" 버튼
   └─> "나중에 알림" 링크 (30분 후 재체크)
   ↓
6. 사용자가 "지금 업데이트" 클릭
   ↓
7. 전체 화면 오버레이 모달 표시
   ├─> "TMS 통합관리시스템 버전 업데이트 중"
   ├─> 스피너
   └─> 다운로드 진행률 (%)
   ↓
8. 백그라운드 다운로드
   └─> Firebase Storage에서 설치 파일 다운로드
   └─> delta 업데이트 시: 변경된 부분만 다운로드
   └─> 전체 업데이트 시: 전체 파일 다운로드
   ↓
9. 다운로드 완료 (100%)
   ├─> "다운로드 완료" 메시지
   └─> "설치 후 자동으로 재시작됩니다..." 메시지
   ↓
10. 자동 설치 시작 (1초 후)
    └─> 사용자 동의 없이 자동 진행
    ↓
11. 앱 재시작
    └─> 새 버전으로 실행
```

---

## 🔧 현재 작업해야 할 것

### 1. Firebase Storage 업로드 (수동)

Firebase Console에서:
1. Storage → `electron-releases` 폴더 생성
2. 파일 업로드:
   - `latest.json` (메타데이터)
   - `TMS-Setup-0.2.0.exe` (설치 파일)
   - `TMS-Integrated-Management-0.2.0.exe` (portable 파일)
   - `latest.yml` (electron-updater 메타데이터)
   - `*.blockmap` (delta 업데이트용)

### 2. Storage 규칙 배포

```bash
firebase deploy --only storage
```

### 3. Electron 업데이트 로직 수정 (필요 시)

현재는 `package.json`에서 `publish: null`로 설정했으므로, `electron-updater`가 기본 동작을 하지 않을 수 있습니다.

**옵션**:
- 수동으로 Firebase Storage에서 업데이트 정보 가져오기
- 또는 `electron-updater`의 Custom Provider 구현

---

## 📝 파일 구조

```
Firebase Storage:
electron-releases/
  ├── latest.json              # 최신 버전 메타데이터
  ├── TMS-Setup-0.2.0.exe      # 설치 파일 (214MB)
  ├── TMS-Integrated-Management-0.2.0.exe  # portable 파일 (116MB)
  ├── latest.yml                # electron-updater 메타데이터
  └── *.blockmap                # delta 업데이트용
```

---

## 🚀 다음 단계

1. ✅ Storage 규칙 배포
2. ✅ Firebase Storage에 첫 릴리스 업로드
3. ⚠️ Electron 업데이트 로직 테스트 및 수정 (필요 시)
4. ✅ 웹 다운로드 테스트
5. ✅ Electron 자동 업데이트 테스트

