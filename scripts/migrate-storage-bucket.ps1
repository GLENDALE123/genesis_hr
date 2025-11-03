# Firebase Storage 버킷 마이그레이션 스크립트 (PowerShell)
# 원본: gs://hs-jig-b2093
# 대상: gs://hs-jig-b2093.firebasestorage.app

$ErrorActionPreference = "Stop"

$SOURCE_BUCKET = "gs://hs-jig-b2093"
$TARGET_BUCKET = "gs://hs-jig-b2093.firebasestorage.app"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Firebase Storage 버킷 마이그레이션 시작" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "원본 버킷: $SOURCE_BUCKET"
Write-Host "대상 버킷: $TARGET_BUCKET"
Write-Host ""

# gsutil이 설치되어 있는지 확인
try {
    $null = Get-Command gsutil -ErrorAction Stop
    Write-Host "✅ gsutil 확인 완료" -ForegroundColor Green
} catch {
    Write-Host "❌ 오류: gsutil이 설치되어 있지 않습니다." -ForegroundColor Red
    Write-Host "Google Cloud SDK를 설치하고 gsutil을 사용할 수 있도록 설정하세요."
    exit 1
}

Write-Host ""

# 사용자 확인
$response = Read-Host "계속하시겠습니까? (y/N)"
if ($response -ne "y" -and $response -ne "Y") {
    Write-Host "마이그레이션이 취소되었습니다." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "📦 버킷 동기화 시작..." -ForegroundColor Cyan
Write-Host "이 작업은 시간이 걸릴 수 있습니다."
Write-Host ""

# gsutil rsync 실행
# -m: 멀티스레딩으로 빠른 전송
# -r: 재귀적 동기화 (하위 디렉토리 포함)

try {
    & gsutil -m rsync -r $SOURCE_BUCKET $TARGET_BUCKET
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "✅ 마이그레이션 완료!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "다음 단계:" -ForegroundColor Cyan
    Write-Host "1. 대상 버킷의 파일들을 확인하세요:"
    Write-Host "   gsutil ls -r $TARGET_BUCKET"
    Write-Host ""
    Write-Host "2. 프로젝트 설정 파일을 업데이트하세요:"
    Write-Host "   - firebase.json"
    Write-Host "   - src/shared/services/firebase/config.ts"
    Write-Host "   - env.example"
    Write-Host ""
    Write-Host "3. 애플리케이션을 테스트하여 새 버킷이 정상 작동하는지 확인하세요."
} catch {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host "❌ 마이그레이션 중 오류 발생" -ForegroundColor Red
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host "오류 메시지: $_"
    Write-Host ""
    Write-Host "다음을 확인하세요:" -ForegroundColor Yellow
    Write-Host "1. gcloud 인증이 올바르게 설정되었는지 확인:"
    Write-Host "   gcloud auth list"
    Write-Host ""
    Write-Host "2. 버킷 접근 권한이 있는지 확인:"
    Write-Host "   gsutil ls $SOURCE_BUCKET"
    Write-Host "   gsutil ls $TARGET_BUCKET"
    exit 1
}

