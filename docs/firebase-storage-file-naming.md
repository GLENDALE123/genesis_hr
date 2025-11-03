# Firebase Storage 파일명 규칙

## 고정 파일명 사용 (옵션 1)

### 규칙
- **설치 파일**: 항상 `TMS-Setup-latest.exe`로 업로드
- **Portable 파일**: 항상 `TMS-Integrated-Management-latest.exe`로 업로드
- **메타데이터**: `latest.json`에서 버전 정보만 업데이트

### 장점
✅ Storage 용량 자동 관리 (덮어쓰기로 인해 이전 버전 삭제)  
✅ 관리 간편 (파일명 고정)  
✅ 비용 절감 (불필요한 파일 저장 방지)

### 업로드 절차

1. **빌드 완료 후 파일 준비**
   ```
   dist/TMS-Setup-0.2.0.exe
   ```

2. **Firebase Storage에 업로드**
   - 파일명을 `TMS-Setup-latest.exe`로 변경하여 업로드
   - 또는 업로드 시 이름 변경:
     ```bash
     # Firebase Console에서 업로드 시 이름을 TMS-Setup-latest.exe로 지정
     # 또는 CLI 사용 시:
     firebase storage:upload dist/TMS-Setup-0.2.0.exe electron-releases/TMS-Setup-latest.exe
     ```

3. **latest.json 업데이트**
   ```json
   {
     "version": "0.2.0",
     "fileName": "TMS-Setup-latest.exe",
     "size": 224460800,
     "publishedAt": "2025-11-03T17:00:00Z"
   }
   ```

4. **결과**
   - Storage에는 `TMS-Setup-latest.exe` 파일 1개만 존재
   - 이전 버전은 자동으로 덮어쓰기됨

---

## 예시: 버전 0.2.0 → 0.3.0 업데이트

### 업로드 전
```
electron-releases/
  ├── latest.json (version: 0.2.0)
  └── TMS-Setup-latest.exe (0.2.0 버전, 200MB)
```

### 업로드 후
```
electron-releases/
  ├── latest.json (version: 0.3.0) ← 업데이트됨
  └── TMS-Setup-latest.exe (0.3.0 버전, 220MB) ← 덮어쓰기됨
```

### Storage 용량
- 업로드 전: 200MB
- 업로드 후: 220MB (증가량: 20MB만)
- ✅ 0.2.0 파일은 자동 삭제됨 (덮어쓰기)

---

## 주의사항

⚠️ **이전 버전 다운로드 불가**: 고정 파일명을 사용하면 이전 버전을 다운로드할 수 없습니다.

💡 **해결책**: 이전 버전이 필요하다면 버전별 폴더로 분리하거나, 버전 관리 시스템(예: Git)에 저장하세요.

