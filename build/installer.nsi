; TMS 통합관리시스템 NSIS 설치 스크립트
; 빌드: makensis build/installer.nsi

; === 기본 설정 ===
!define APP_NAME "TMS 통합관리시스템"
!define APP_VERSION "0.2.0"
!define APP_PUBLISHER "HS-HR"
!define APP_URL "https://hs-hr.com"
!define APP_REGKEY "Software\HS-HR\TMS"
!define APP_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"
!define APP_EXE "TMS 통합관리시스템.exe"

Name "${APP_NAME}"
OutFile "..\dist\TMS-Setup-${APP_VERSION}.exe"
InstallDir "$LOCALAPPDATA\TMS-Integrated-Management"
RequestExecutionLevel user
ShowInstDetails show
ShowUnInstDetails show
Unicode true

; === MUI2 세팅 ===
!include "MUI2.nsh"

; 아이콘 (옵션 - electron-builder가 생성한 경우에만)
!if /FileExists("..\dist\.icon-ico\icon.ico")
  !define MUI_ICON "..\dist\.icon-ico\icon.ico"
  !define MUI_UNICON "..\dist\.icon-ico\icon.ico"
!endif

; 설치 마법사 페이지
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
    !define MUI_FINISHPAGE_RUN "$INSTDIR\${APP_EXE}"
    !define MUI_FINISHPAGE_RUN_TEXT "지금 ${APP_NAME} 실행"
    !define MUI_FINISHPAGE_RUN_PARAMETERS ""
!insertmacro MUI_PAGE_FINISH

; 제거 마법사 페이지
!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; 언어
!insertmacro MUI_LANGUAGE "Korean"
!insertmacro MUI_LANGUAGE "English"

; === 설치 시작 ===
Section -Main
  SectionIn RO
  
  ; 프로세스 종료
  Call CloseRunningApp
  
  ; 파일 복사
  DetailPrint "파일 복사 중..."
  SetOutPath "$INSTDIR"
  
  ; dist/win-unpacked의 모든 파일 복사
  File /r "..\dist\win-unpacked\*.*"
  
  ; 아이콘 파일 복사 (있는 경우)
  !if /FileExists("..\dist\.icon-ico\icon.ico")
    DetailPrint "아이콘 파일 복사 중..."
    SetOutPath "$INSTDIR"
    File "..\dist\.icon-ico\icon.ico"
  !endif
  
  ; 설치 경로 저장
  WriteRegStr HKCU "${APP_REGKEY}" "InstallPath" "$INSTDIR"
  WriteRegStr HKCU "${APP_REGKEY}" "Version" "${APP_VERSION}"
  
  ; 바탕화면 바로가기
  DetailPrint "바탕화면 바로가기 생성 중..."
  !if /FileExists("..\dist\.icon-ico\icon.ico")
    CreateShortcut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\${APP_EXE}" "" "$INSTDIR\icon.ico" 0 SW_SHOWNORMAL "" "${APP_NAME}"
  !else
    CreateShortcut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\${APP_EXE}" "" "" 0 SW_SHOWNORMAL "" "${APP_NAME}"
  !endif
  
  ; 시작 메뉴 바로가기
  DetailPrint "시작 메뉴 바로가기 생성 중..."
  CreateDirectory "$SMPROGRAMS\${APP_NAME}"
  !if /FileExists("..\dist\.icon-ico\icon.ico")
    CreateShortcut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" "$INSTDIR\${APP_EXE}" "" "$INSTDIR\icon.ico" 0 SW_SHOWNORMAL "" "${APP_NAME}"
    CreateShortcut "$SMPROGRAMS\${APP_NAME}\Uninstall.lnk" "$INSTDIR\uninstall.exe" "" "$INSTDIR\icon.ico" 0 SW_SHOWNORMAL "" "${APP_NAME} 제거"
  !else
    CreateShortcut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" "$INSTDIR\${APP_EXE}" "" "" 0 SW_SHOWNORMAL "" "${APP_NAME}"
    CreateShortcut "$SMPROGRAMS\${APP_NAME}\Uninstall.lnk" "$INSTDIR\uninstall.exe" "" "" 0 SW_SHOWNORMAL "" "${APP_NAME} 제거"
  !endif
  
  ; 레지스트리 등록
  WriteRegStr HKCU "${APP_UNINST_KEY}" "DisplayName" "${APP_NAME}"
  WriteRegStr HKCU "${APP_UNINST_KEY}" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKCU "${APP_UNINST_KEY}" "Publisher" "${APP_PUBLISHER}"
  WriteRegStr HKCU "${APP_UNINST_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${APP_UNINST_KEY}" "UninstallString" "$INSTDIR\uninstall.exe"
  WriteRegDWORD HKCU "${APP_UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${APP_UNINST_KEY}" "NoRepair" 1
  
  ; 제거 프로그램 생성
  WriteUninstaller "$INSTDIR\uninstall.exe"
  
  DetailPrint "설치 완료!"
SectionEnd

; === 설치 전 프로세스 종료 ===
Function CloseRunningApp
  DetailPrint "기존 TMS 인스턴스 확인 중..."
  
  ; tasklist로 electron 프로세스 찾기
  nsExec::ExecToStack 'tasklist /FI "IMAGENAME eq electron.exe" /NH /FO CSV'
  Pop $0
  Pop $1
  
  ; TMS 찾기
  Push $1
  Push "TMS"
  Call StrStr
  Pop $2
  
  StrCmp $2 "" done found
  
  found:
    DetailPrint "TMS 통합관리시스템이 실행 중입니다."
    MessageBox MB_YESNO|MB_ICONQUESTION "TMS 통합관리시스템이 실행 중입니다.$\n$\n자동으로 종료하고 설치를 계속하시겠습니까?" IDYES kill IDNO abort
  
  kill:
    DetailPrint "TMS 프로그램 종료 중..."
    nsExec::Exec 'wmic process where "name=''electron.exe'' and commandline like ''%TMS%''' delete'
    Pop $0
    Sleep 2000
    
    ; 종료 확인
    nsExec::ExecToStack 'wmic process where "name=''electron.exe'' and commandline like ''%TMS%''' get processid /format:list'
    Pop $0
    Pop $4
    
    StrLen $R0 $4
    IntCmp $R0 0 success failure
    
    success:
      DetailPrint "프로그램이 성공적으로 종료되었습니다."
      Goto done
    
    failure:
      MessageBox MB_OK|MB_ICONEXCLAMATION "프로그램을 종료할 수 없습니다.$\n$\n수동으로 종료한 후 다시 시도해주세요."
      Abort
  
  abort:
    DetailPrint "사용자가 설치를 취소했습니다."
    Abort
  
  done:
FunctionEnd

; === 문자열 검색 함수 ===
Function StrStr
  Exch $R1
  Exch
  Exch $R2
  Push $R3
  Push $R4
  Push $R5
  StrLen $R3 $R1
  StrCpy $R4 0
  loop:
    StrCpy $R5 $R2 $R3 $R4
    StrCmp $R5 $R1 done
    StrCmp $R5 "" done
    IntOp $R4 $R4 + 1
    Goto loop
  done:
    StrCpy $R1 $R2 "" $R4
    Pop $R5
    Pop $R4
    Pop $R3
    Pop $R2
    Exch $R1
FunctionEnd

; === 제거 ===
Section "Uninstall"
  ; 프로세스 종료
  DetailPrint "기존 TMS 프로그램 종료 중..."
  nsExec::Exec 'wmic process where "name=''electron.exe'' and commandline like ''%TMS%''' delete'
  Sleep 1000
  
  ; 파일 삭제
  DetailPrint "파일 삭제 중..."
  Delete "$INSTDIR\icon.ico"
  RMDir /r "$INSTDIR"
  
  ; 바로가기 삭제
  Delete "$DESKTOP\${APP_NAME}.lnk"
  RMDir /r "$SMPROGRAMS\${APP_NAME}"
  
  ; 레지스트리 삭제
  DeleteRegKey HKCU "${APP_UNINST_KEY}"
  DeleteRegKey HKCU "${APP_REGKEY}"
  
  DetailPrint "제거 완료!"
SectionEnd

