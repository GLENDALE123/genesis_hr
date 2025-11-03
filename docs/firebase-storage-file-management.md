# Firebase Storage 파일 관리

## 파일 업로드 동작

### 같은 파일명으로 업로드 시
- ✅ **덮어쓰기 (Overwrite)**: 기존 파일이 새 파일로 교체됨
- 💾 **Storage 용량**: 용량이 같거나 작으면 변화 없음, 크면 증가

예시:
```
TMS-Setup-0.2.0.exe (200MB) 업로드
→ 같은 이름으로 다시 업로드 (덮어쓰기)
→ Storage에는 1개 파일만 존재 (200MB)
```

### 다른 파일명으로 업로드 시
- ❌ **기존 파일 유지**: 기존 파일은 그대로 남아있음
- 📁 **Storage 용량**: 누적됨 (새 파일 + 기존 파일)

예시:
```
1. TMS-Setup-0.1.0.exe (200MB) 업로드
2. TMS-Setup-0.2.0.exe (220MB) 업로드
→ Storage에는 2개 파일 존재 (총 420MB)
```

---

## 현재 구조에서의 동작

### latest.json 업데이트
```json
{
  "version": "0.2.0",
  "fileName": "TMS-Setup-0.2.0.exe",  // ← 파일명 변경
  ...
}
```

**동작**:
1. `latest.json`만 업데이트하면 새 파일명을 가리킴
2. 기존 `TMS-Setup-0.1.0.exe`는 Storage에 그대로 남아있음
3. 다운로드는 새 파일(`TMS-Setup-0.2.0.exe`)로 연결됨

### 문제점
- 📊 **Storage 비용 증가**: 이전 버전 파일들이 계속 쌓임
- 💰 **비용**: 예를 들어 5개 버전 × 200MB = 1GB

---

## 해결 방법

### 방법 1: 수동 삭제 (현재)
Firebase Console에서 직접 삭제:
1. Storage → `electron-releases` 폴더
2. 이전 버전 파일 선택
3. 삭제

### 방법 2: 항상 같은 파일명 사용 (권장)

업로드 시 항상 **같은 파일명** 사용:
```
항상: TMS-Setup-latest.exe
```

**장점**:
- 자동 덮어쓰기 → Storage 용량 관리 용이
- `latest.json`만 업데이트하면 됨

**단점**:
- 이전 버전 다운로드 불가

### 방법 3: 자동 삭제 스크립트

업로드 전에 이전 버전 파일 자동 삭제:

```javascript
// 업로드 전 이전 버전 삭제
async function cleanupOldVersions(currentVersion) {
  const files = await listAll(ref(storage, 'electron-releases'));
  
  for (const fileRef of files.items) {
    const fileName = fileRef.name;
    
    // latest.json과 현재 버전 파일 제외
    if (fileName === 'latest.json') continue;
    if (fileName.includes(currentVersion)) continue;
    
    // .exe 파일만 삭제
    if (fileName.endsWith('.exe')) {
      await deleteObject(fileRef);
      console.log(`삭제: ${fileName}`);
    }
  }
}
```

### 방법 4: 버전별 폴더 구성

버전별로 폴더 분리:
```
electron-releases/
  ├── latest.json
  ├── 0.1.0/
  │   └── TMS-Setup-0.1.0.exe
  └── 0.2.0/
      └── TMS-Setup-0.2.0.exe
```

**장점**:
- 버전 관리 명확
- 이전 버전 다운로드 가능

**단점**:
- Storage 용량 증가
- 정리 필요

---

## 추천 방법

### 단기: 방법 2 (같은 파일명 사용)

`latest.json`만 업데이트하고, 실제 파일은 항상 같은 이름으로 업로드:

```json
// latest.json
{
  "version": "0.2.0",
  "fileName": "TMS-Setup-latest.exe",  // 항상 같은 이름
  ...
}
```

**업로드 시**:
```
TMS-Setup-0.2.0.exe → TMS-Setup-latest.exe로 업로드
```

### 장기: 방법 3 (자동 정리)

업로드 스크립트에 자동 정리 기능 추가:
- 최신 2개 버전만 유지
- 나머지 자동 삭제

---

## Storage 용량 모니터링

Firebase Console에서 확인:
1. Firebase Console → Storage
2. `electron-releases` 폴더 용량 확인
3. 필요 시 수동 정리

