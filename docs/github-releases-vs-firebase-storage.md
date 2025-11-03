# GitHub Releases vs Firebase Storage

## 현재 설정

### GitHub Releases (유지)
- ✅ **목적**: 공개 릴리스 노트, 변경 이력 공유
- ✅ **대상**: 외부 공개, 기록 보관

### Firebase Storage (주 사용)
- ✅ **목적**: 실제 다운로드/업데이트 서비스
- ✅ **대상**: Electron 업데이트

---

## 자동화된 흐름

```
git tag v0.3.0 && git push origin v0.3.0
  ↓
1. 빌드 (Electron 앱 패키징)
  ↓
2. Firebase Storage 업로드 ← 실제 다운로드/업데이트용
  ↓
3. GitHub Release 생성 ← 공개 노트/기록용 (선택사항)
```

---

## 각각의 용도

### Firebase Storage (필수)
- ✅ 웹 브라우저에서 설정 페이지 통해 다운로드
- ✅ Electron 앱 자동 업데이트
- ✅ 실제 설치 파일 제공

### GitHub Releases (선택)
- 📝 릴리스 노트 작성
- 📝 변경 이력 공유
- 📝 외부 공개/공유

---

## GitHub Releases 제거하려면?

필요 없다면 `.github/workflows/release.yml`에서 "Create Release" 단계만 삭제하면 됩니다.

**권장**: 유지하는 것이 좋습니다. 기록으로 유용합니다.

