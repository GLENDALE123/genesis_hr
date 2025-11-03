# 업데이트/릴리스 프로세스 상세 설명

## 🔄 Git Push ≠ 자동 업데이트

**중요**: Git push를 해도 **자동으로 업데이트가 배포되지 않습니다**.

---

## 📋 전체 프로세스

### 1️⃣ 코드 개발 및 커밋 (일상 작업)

```bash
# 코드 수정
git add .
git commit -m "기능 추가"
git push origin main
```

이 단계에서는:
- ✅ 소스 코드만 저장됨
- ❌ Electron 앱은 업데이트되지 않음
- ❌ Firebase Storage에 파일이 업로드되지 않음

---

### 2️⃣ 새 버전 릴리스 (필요할 때만)

사용자에게 새 버전을 배포하려면 **수동으로 릴리스**해야 합니다.

#### 2-1. 버전 준비

```bash
# package.json 버전 업데이트
# 예: 0.2.0 → 0.3.0
```

```json
{
  "version": "0.3.0"
}
```

#### 2-2. Electron 빌드

```bash
npm run electron:build
```

**생성되는 파일**:
```
dist/
  ├── TMS-Setup-0.3.0.exe
  ├── TMS-Integrated-Management-0.3.0.exe
  ├── latest.yml
  └── *.blockmap
```

#### 2-3. Firebase Storage 업로드

**방법 1: Firebase Console** (권장)

1. Firebase Console → Storage → `electron-releases`
2. **기존 파일 삭제 또는 덮어쓰기**:
   - `latest.json` 업로드 (버전 정보 업데이트)
   - `TMS-Setup-latest.exe` 업로드 (빌드된 파일을 이 이름으로)
   - `TMS-Integrated-Management-latest.exe` 업로드 (portable 파일)
   - `latest.yml` 업로드 (electron-updater용)
   - `*.blockmap` 업로드 (delta 업데이트용)

**방법 2: Firebase CLI**

```bash
# latest.json 업로드
firebase storage:upload dist/latest.json electron-releases/latest.json

# 설치 파일 업로드 (항상 같은 이름으로)
firebase storage:upload dist/TMS-Setup-0.3.0.exe electron-releases/TMS-Setup-latest.exe

# portable 파일 업로드
firebase storage:upload dist/TMS-Integrated-Management-0.3.0.exe electron-releases/TMS-Integrated-Management-latest.exe

# latest.yml 업로드
firebase storage:upload dist/latest.yml electron-releases/latest.yml
```

---

## 🎯 사용자 경험

### 웹 브라우저 사용자

1. 설정 페이지 접속
2. Firebase Storage에서 `latest.json` 자동 읽기
3. 버전 정보 표시
4. "Windows" 버튼 클릭 → 최신 버전 다운로드

### Electron 앱 사용자

1. 앱 실행 중 백그라운드 체크
2. Firebase Storage 확인 (30분마다)
3. 새 버전 발견 시 알림 표시
4. "지금 업데이트" 클릭 → 자동 다운로드 및 설치

---

## 📊 타임라인 예시

### 예시: 버전 0.2.0 → 0.3.0 업데이트

```
Day 1 (개발)
  ✅ 버그 수정
  ✅ git commit
  ✅ git push
  → 아직 배포 안 됨

Day 2 (개발)
  ✅ 기능 추가
  ✅ git commit
  ✅ git push
  → 아직 배포 안 됨

Day 5 (릴리스 준비)
  ✅ 테스트 완료
  ✅ 버전 0.3.0으로 변경
  ✅ npm run electron:build

Day 5 (릴리스 배포)
  ✅ Firebase Storage 업로드
    - latest.json (version: 0.3.0)
    - TMS-Setup-latest.exe (덮어쓰기)
  → 이제 사용자가 새 버전 받을 수 있음

Day 6
  📱 Electron 앱 사용자들이 자동으로 업데이트 받음
  🌐 웹 브라우저 사용자들이 설정 페이지에서 새 버전 확인
```

---

## ⚡ 자동화 (선택사항)

### GitHub Actions로 자동화 (추가 개발 필요)

현재는 수동 업로드지만, 나중에 자동화 가능:

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags:
      - 'v*'

jobs:
  build-and-release:
    steps:
      - name: Build
        run: npm run electron:build
      
      - name: Upload to Firebase Storage
        run: |
          # latest.json 생성
          firebase storage:upload latest.json electron-releases/latest.json
          # 설치 파일 업로드
          firebase storage:upload dist/TMS-Setup-*.exe electron-releases/TMS-Setup-latest.exe
```

사용법:
```bash
git tag v0.3.0
git push origin v0.3.0
→ 자동으로 빌드 및 업로드
```

---

## 📝 정리

### Git Push할 때
- ❌ **업데이트되지 않음**
- ✅ 소스 코드만 저장됨
- ✅ 웹 앱은 자동 배포 가능 (Netlify 등)

### 수동 릴리스할 때
- ✅ Electron 앱 빌드
- ✅ Firebase Storage 업로드
- ✅ 사용자가 새 버전 받을 수 있음

### 장점
- 🎯 **명시적 릴리스**: 언제 배포하는지 정확히 제어
- 🛡️ **안정성**: 테스트 완료 후에만 배포
- 🚫 **실수 방지**: 개발 중인 코드가 실수로 배포되지 않음

---

## ❓ FAQ

**Q: 매번 빌드/업로드하기 번거로운데?**  
A: GitHub Actions로 자동화할 수 있습니다 (추가 개발 필요).

**Q: 웹 앱은 자동 배포되는데?**  
A: 네, 웹 앱은 Netlify 등에서 자동 배포됩니다. Electron 앱은 별도로 관리해야 합니다.

**Q: 테스트는 어떻게 하나요?**  
A: 로컬에서 `npm run electron:dev`로 테스트하거나, 개발 버전을 따로 빌드하여 테스트할 수 있습니다.

