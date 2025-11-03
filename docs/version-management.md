# 버전 관리 가이드

## 자동 버전 관리

### 현재 설정

버전은 **Git 태그에서 자동으로 추출**됩니다:

```bash
git tag v0.3.0
git push origin v0.3.0
```

**자동 실행**:
1. 태그에서 버전 추출 (`v0.3.0` → `0.3.0`)
2. `package.json` 업데이트
3. `build/installer.nsi` 업데이트
4. 빌드 및 배포

---

## 버전 업데이트 방법

### 방법 1: 태그 푸시 (자동 - 권장)

```bash
# 1. package.json을 건드리지 않아도 됨
# 2. 태그만 생성하고 푸시
git tag v0.3.0

# 3. 태그 푸시
git push origin v0.3.0
```

**자동으로 처리됨**:
- ✅ package.json 버전 업데이트
- ✅ installer.nsi 버전 업데이트
- ✅ Electron 빌드
- ✅ Firebase Storage 업로드

### 방법 2: 수동 업데이트 (로컬 빌드)

```bash
# package.json 수정
"version": "0.3.0"

# 로컬 빌드
npm run electron:build

# 수동으로 Firebase Storage 업로드
```

---

## 버전 번호 규칙

### Semantic Versioning

```
MAJOR.MINOR.PATCH

예: 0.3.0
- MAJOR (0): 호환되지 않는 API 변경
- MINOR (3): 호환되는 기능 추가
- PATCH (0): 버그 수정
```

### 예시

- `0.1.0` → `0.2.0`: 기능 추가
- `0.2.0` → `0.2.1`: 버그 수정
- `0.2.1` → `0.3.0`: 새로운 기능 추가
- `0.3.0` → `1.0.0`: 정식 버전

---

## 버전이 사용되는 곳

### 1. package.json
```json
{
  "version": "0.3.0"
}
```

### 2. build/installer.nsi
```nsis
!define APP_VERSION "0.3.0"
```

### 3. Firebase Storage latest.json
```json
{
  "version": "0.3.0",
  "fileName": "TMS-Setup-latest.exe",
  ...
}
```

### 4. Electron 빌드 파일명
```
TMS-Setup-0.3.0.exe
TMS-Integrated-Management-0.3.0.exe
```

### 5. 앱 내에서 표시
- 설정 페이지 → 앱 정보 → 버전

---

## 주의사항

⚠️ **태그 이름 형식**: 반드시 `v0.3.0` 형식이어야 함

❌ 잘못된 예:
- `0.3.0` (v 없음)
- `v0.3` (PATCH 없음)
- `version-0.3.0` (prefix 다름)

✅ 올바른 예:
- `v0.3.0`
- `v1.0.0`
- `v2.5.10`

---

## 실전 사용 예시

### 시나리오: 버그 수정 후 새 버전 배포

```bash
# 1. 코드 수정 및 커밋
git add .
git commit -m "버그 수정"
git push origin main

# 2. 테스트 완료 후 새 버전 태그 생성
git tag v0.3.1

# 3. 태그 푸시 → 자동 배포!
git push origin v0.3.1
```

**결과**:
- ✅ Electron 앱 빌드 (v0.3.1)
- ✅ Firebase Storage 업로드
- ✅ GitHub Release 생성
- ✅ 사용자들이 자동 업데이트 받음

---

## 요약

**질문**: 버전은 어디다가 쓰면 되나요?

**답**: 어디에도 쓰지 않아도 됩니다! 

태그만 생성하면 자동으로:
1. package.json 업데이트
2. installer.nsi 업데이트  
3. 빌드
4. 배포

모두 자동 처리됩니다! 🎉

