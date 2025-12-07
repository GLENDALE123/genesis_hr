# userUtils import 경로 일괄 업데이트 스크립트
# @/shared/utils/userUtils -> @/shared/utils/user/userUtils

$files = Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" | 
    Select-String -Pattern "@/shared/utils/userUtils" | 
    Select-Object -ExpandProperty Path -Unique

Write-Host "Found $($files.Count) files to update"

foreach ($file in $files) {
    $content = Get-Content $file -Raw -Encoding UTF8
    $updated = $content -replace '@/shared/utils/userUtils', '@/shared/utils/user/userUtils'
    
    if ($content -ne $updated) {
        Set-Content -Path $file -Value $updated -Encoding UTF8 -NoNewline
        Write-Host "Updated: $file"
    }
}

Write-Host "Done!"


