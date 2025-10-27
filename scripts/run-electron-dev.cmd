@echo off
setlocal
cd /d "%~dp0.."
set ELECTRON_DEV=true
set ELECTRON_DEV_SERVER_URL=http://210.103.41.103:3000
start "" "%cd%\dist\win-unpacked\TMS 통합관리시스템.exe"
endlocal
exit /b 0


