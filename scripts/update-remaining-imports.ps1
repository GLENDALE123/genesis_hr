# 나머지 유틸리티 파일 import 경로 일괄 업데이트

# Platform 관련
$platformFiles = Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" | 
    Select-String -Pattern "@/shared/utils/platform" | 
    Select-Object -ExpandProperty Path -Unique

Write-Host "Updating platform imports: $($platformFiles.Count) files"
foreach ($file in $platformFiles) {
    $content = Get-Content $file -Raw -Encoding UTF8
    $updated = $content -replace '@/shared/utils/platform', '@/shared/utils/platform/platform'
    if ($content -ne $updated) {
        Set-Content -Path $file -Value $updated -Encoding UTF8 -NoNewline
        Write-Host "Updated: $file"
    }
}

# PhoneUtils 관련
$phoneFiles = Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" | 
    Select-String -Pattern "@/shared/utils/phoneUtils" | 
    Select-Object -ExpandProperty Path -Unique

Write-Host "Updating phoneUtils imports: $($phoneFiles.Count) files"
foreach ($file in $phoneFiles) {
    $content = Get-Content $file -Raw -Encoding UTF8
    $updated = $content -replace '@/shared/utils/phoneUtils', '@/shared/utils/platform/phoneUtils'
    if ($content -ne $updated) {
        Set-Content -Path $file -Value $updated -Encoding UTF8 -NoNewline
        Write-Host "Updated: $file"
    }
}

# StatusColors 관련
$statusFiles = Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" | 
    Select-String -Pattern "@/shared/utils/statusColors" | 
    Select-Object -ExpandProperty Path -Unique

Write-Host "Updating statusColors imports: $($statusFiles.Count) files"
foreach ($file in $statusFiles) {
    $content = Get-Content $file -Raw -Encoding UTF8
    $updated = $content -replace '@/shared/utils/statusColors', '@/shared/utils/ui/statusColors'
    if ($content -ne $updated) {
        Set-Content -Path $file -Value $updated -Encoding UTF8 -NoNewline
        Write-Host "Updated: $file"
    }
}

Write-Host "Done!"


