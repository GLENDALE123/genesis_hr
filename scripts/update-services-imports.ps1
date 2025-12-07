# shared/services/ import 경로 일괄 업데이트

# NotificationService 관련
$notificationFiles = Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" | 
    Select-String -Pattern "@/shared/services/notificationService" | 
    Select-Object -ExpandProperty Path -Unique

Write-Host "Updating notificationService imports: $($notificationFiles.Count) files"
foreach ($file in $notificationFiles) {
    $content = Get-Content $file -Raw -Encoding UTF8
    $updated = $content -replace '@/shared/services/notificationService', '@/shared/services/notifications/notificationService'
    if ($content -ne $updated) {
        Set-Content -Path $file -Value $updated -Encoding UTF8 -NoNewline
        Write-Host "Updated: $file"
    }
}

# OrderLookupService 관련
$lookupFiles = Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" | 
    Select-String -Pattern "@/shared/services/orderLookupService" | 
    Select-Object -ExpandProperty Path -Unique

Write-Host "Updating orderLookupService imports: $($lookupFiles.Count) files"
foreach ($file in $lookupFiles) {
    $content = Get-Content $file -Raw -Encoding UTF8
    $updated = $content -replace '@/shared/services/orderLookupService', '@/shared/services/lookup/orderLookupService'
    if ($content -ne $updated) {
        Set-Content -Path $file -Value $updated -Encoding UTF8 -NoNewline
        Write-Host "Updated: $file"
    }
}

Write-Host "Done!"


