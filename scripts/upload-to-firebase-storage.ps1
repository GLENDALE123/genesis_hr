# Firebase Storage에 Electron 릴리스 수동 업로드 스크립트
# 사용법: .\scripts\upload-to-firebase-storage.ps1 -Version "0.1.14"

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    
    [string]$ServiceAccountKeyPath = "",
    
    [string]$Bucket = "hs-jig-b2093.firebasestorage.app"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Firebase Storage 수동 업로드 시작 ===" -ForegroundColor Green
Write-Host "버전: $Version" -ForegroundColor Cyan
Write-Host "버킷: $Bucket" -ForegroundColor Cyan

# 1. latest.json 생성
Write-Host "`n[1/5] latest.json 생성 중..." -ForegroundColor Yellow

$INSTALLER_FILE = Get-ChildItem dist -Filter "TMS-Setup-*.exe" | Select-Object -First 1
if (-not $INSTALLER_FILE) {
    Write-Host "ERROR: 설치 파일을 찾을 수 없습니다 (dist/TMS-Setup-*.exe)" -ForegroundColor Red
    exit 1
}

$FILE_SIZE = $INSTALLER_FILE.Length
$PUBLISHED_AT = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

$json = @{
    version = $Version
    fileName = "TMS-Setup-latest.exe"
    size = $FILE_SIZE
    publishedAt = $PUBLISHED_AT
} | ConvertTo-Json -Depth 10

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText("latest.json", $json, $utf8NoBom)

Write-Host "latest.json 생성 완료" -ForegroundColor Green
Get-Content latest.json | Write-Host

# 2. 업로드 방법 선택
Write-Host "`n[2/5] 업로드 방법 선택" -ForegroundColor Yellow
Write-Host "1. Firebase Console (수동)" -ForegroundColor Cyan
Write-Host "2. gsutil (자동, 서비스 계정 키 필요)" -ForegroundColor Cyan

$uploadMethod = Read-Host "선택 (1 또는 2)"

if ($uploadMethod -eq "1") {
    # Firebase Console 사용
    Write-Host "`n=== Firebase Console 업로드 안내 ===" -ForegroundColor Green
    Write-Host "1. https://console.firebase.google.com 접속"
    Write-Host "2. 프로젝트 'hs-jig-b2093' 선택"
    Write-Host "3. Storage > electron-releases 폴더로 이동"
    Write-Host "4. 다음 파일들을 업로드:" -ForegroundColor Yellow
    Write-Host "   - latest.json"
    Write-Host "   - dist/TMS-Setup-*.exe -> TMS-Setup-latest.exe로 이름 변경"
    Write-Host "   - dist/*-Integrated-Management*.exe -> TMS-Integrated-Management-latest.exe로 이름 변경"
    Write-Host "   - dist/*.yml -> latest.yml로 이름 변경"
    Write-Host "   - dist/*.blockmap"
    Write-Host "`n업로드할 파일 위치:" -ForegroundColor Yellow
    Write-Host "   - latest.json: $(Resolve-Path latest.json)"
    Write-Host "   - 설치 파일: $(Resolve-Path $INSTALLER_FILE.FullName)"
    
    $PORTABLE_FILE = Get-ChildItem dist -Filter "*Integrated-Management*.exe" | Select-Object -First 1
    if ($PORTABLE_FILE) {
        Write-Host "   - Portable 파일: $(Resolve-Path $PORTABLE_FILE.FullName)"
    }
    
    $YML_FILE = Get-ChildItem dist -Filter "*.yml" | Select-Object -First 1
    if ($YML_FILE) {
        Write-Host "   - YML 파일: $(Resolve-Path $YML_FILE.FullName)"
    }
    
    $BLOCKMAP_FILES = Get-ChildItem dist -Filter "*.blockmap"
    if ($BLOCKMAP_FILES) {
        Write-Host "   - Blockmap 파일들:"
        $BLOCKMAP_FILES | ForEach-Object {
            Write-Host "     - $(Resolve-Path $_.FullName)"
        }
    }
    
    Write-Host "`n업로드 완료 후 Enter 키를 누르세요..."
    Read-Host
    
} elseif ($uploadMethod -eq "2") {
    # gsutil 사용
    Write-Host "`n[3/5] gsutil 업로드 준비..." -ForegroundColor Yellow
    
    # gsutil 설치 확인
    $gsutil = Get-Command gsutil -ErrorAction SilentlyContinue
    if (-not $gsutil) {
        Write-Host "ERROR: gsutil을 찾을 수 없습니다." -ForegroundColor Red
        Write-Host "Google Cloud SDK를 설치하세요: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "gsutil 발견: $($gsutil.Source)" -ForegroundColor Green
    
    # 서비스 계정 키 파일 확인
    if ([string]::IsNullOrEmpty($ServiceAccountKeyPath)) {
        $ServiceAccountKeyPath = Read-Host "서비스 계정 키 파일 경로를 입력하세요"
    }
    
    if (-not (Test-Path $ServiceAccountKeyPath)) {
        Write-Host "ERROR: 서비스 계정 키 파일을 찾을 수 없습니다: $ServiceAccountKeyPath" -ForegroundColor Red
        exit 1
    }
    
    # 인증
    Write-Host "`n[4/5] 서비스 계정 인증 중..." -ForegroundColor Yellow
    gcloud auth activate-service-account --key-file="$ServiceAccountKeyPath"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: 인증 실패" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "인증 완료" -ForegroundColor Green
    
    # 파일 업로드
    Write-Host "`n[5/5] 파일 업로드 중..." -ForegroundColor Yellow
    
    # latest.json
    Write-Host "업로드 중: latest.json" -ForegroundColor Cyan
    gsutil cp latest.json "gs://$Bucket/electron-releases/latest.json"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: latest.json 업로드 실패" -ForegroundColor Red
        exit 1
    }
    
    # 설치 파일
    Write-Host "업로드 중: TMS-Setup-latest.exe" -ForegroundColor Cyan
    gsutil cp "$($INSTALLER_FILE.FullName)" "gs://$Bucket/electron-releases/TMS-Setup-latest.exe"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: 설치 파일 업로드 실패" -ForegroundColor Red
        exit 1
    }
    
    # Portable 파일
    $PORTABLE_FILE = Get-ChildItem dist -Filter "*Integrated-Management*.exe" | Select-Object -First 1
    if ($PORTABLE_FILE) {
        Write-Host "업로드 중: TMS-Integrated-Management-latest.exe" -ForegroundColor Cyan
        gsutil cp "$($PORTABLE_FILE.FullName)" "gs://$Bucket/electron-releases/TMS-Integrated-Management-latest.exe"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: Portable 파일 업로드 실패" -ForegroundColor Red
            exit 1
        }
    }
    
    # YML 파일
    $YML_FILE = Get-ChildItem dist -Filter "*.yml" | Select-Object -First 1
    if ($YML_FILE) {
        Write-Host "업로드 중: latest.yml" -ForegroundColor Cyan
        gsutil cp "$($YML_FILE.FullName)" "gs://$Bucket/electron-releases/latest.yml"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: YML 파일 업로드 실패" -ForegroundColor Red
            exit 1
        }
    }
    
    # Blockmap 파일들
    $BLOCKMAP_FILES = Get-ChildItem dist -Filter "*.blockmap"
    if ($BLOCKMAP_FILES) {
        foreach ($file in $BLOCKMAP_FILES) {
            Write-Host "업로드 중: $($file.Name)" -ForegroundColor Cyan
            gsutil cp "$($file.FullName)" "gs://$Bucket/electron-releases/$($file.Name)"
            if ($LASTEXITCODE -ne 0) {
                Write-Host "ERROR: $($file.Name) 업로드 실패" -ForegroundColor Red
                exit 1
            }
        }
    }
    
    Write-Host "`n=== 업로드 완료 ===" -ForegroundColor Green
}

Write-Host "`n업로드 프로세스 완료!" -ForegroundColor Green

