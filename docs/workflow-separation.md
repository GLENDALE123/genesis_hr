# GitHub Actions 워크플로우 분리

## 현재 설정 (이미 완료됨)

### 워크플로우별 역할

| 워크플로우 | 트리거 | 목적 | 실행 리소스 |
|-----------|--------|------|-------------|
| `firebase-hosting-merge.yml` | main 브랜치 푸시 | 웹 호스팅 배포 | Ubuntu |
| `release.yml` | v* 태그 푸시 | Electron 빌드+배포 | Windows |

### 병렬 실행

두 워크플로우는 **완전히 독립적으로** 실행됩니다.

```bash
# main 브랜치에 푸시
git push origin main
→ firebase-hosting-merge.yml만 실행 (약 5분)

# 태그 푸시
git tag v0.3.0 && git push origin v0.3.0
→ release.yml만 실행 (약 15-20분)
```

### 실행 시나리오

#### 시나리오 1: 웹만 업데이트 (빠름)
```bash
git commit -m "UI 개선"
git push origin main
```
→ `firebase-hosting-merge.yml`만 실행  
→ 약 5분 소요

#### 시나리오 2: Electron만 업데이트
```bash
git tag v0.3.0
git push origin v0.3.0
```
→ `release.yml`만 실행  
→ 약 15-20분 소요 (빌드 시간)

#### 시나리오 3: 둘 다 업데이트
```bash
git commit -m "기능 추가"
git push origin main        # 웹 배포
git tag v0.3.0
git push origin v0.3.0      # Electron 배포
```
→ 병렬로 각각 실행 (간섭 없음)

---

## 성능 개선 이미 적용됨

### ✅ 완료된 최적화

1. **빌드 폴더 분리**
   - Electron: `electron-out/`
   - Web: `out/`
   - 충돌 없음

2. **별도 워크플로우**
   - 호스팅: Ubuntu (간단, 빠름)
   - Electron: Windows (복잡, 느림)

3. **트리거 분리**
   - main 푸시: 웹만 배포
   - 태그 푸시: Electron만 배포

---

## 추가 최적화 (필요 시)

### 옵션 1: 캐싱 추가

호스팅 워크플로우에 캐시 추가:

```yaml
- uses: actions/cache@v3
  with:
    path: |
      ~/.npm
      node_modules
    key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
```

### 옵션 2: 병렬 빌드

Electron 빌드를 병렬로:

```yaml
- name: Build NSIS
  run: ...
  
- name: Build Portable
  run: ...
```

하지만 이미 타겟 분리가 되어 있어서 추가 최적화 필요 없음.

---

## 현재 상태

**호스팅이 느린 이유는 다른 이유입니다:**
- 네트워크 속도
- 의존성 다운로드
- 빌드 시간

두 워크플로우가 서로 간섭하는 것은 아닙니다!

