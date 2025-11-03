; NSIS Custom Installer Script for TMS 통합관리시스템

; === 설치 전 프로세스 종료 함수 ===
Function CloseRunningApp
  DetailPrint "기존 TMS 인스턴스 확인 중..."
  
  ; 간단한 방법: tasklist로 모든 electron 프로세스 찾기
  nsExec::ExecToStack 'tasklist /FI "IMAGENAME eq electron.exe" /NH /FO CSV'
  Pop $0 ; 에러 코드
  Pop $1 ; 출력
  
  ; 출력에서 TMS 찾기 (대소문자 구분 안함)
  Push $1
  Push "TMS"
  Call StrStr
  Pop $2
  
  StrCmp $2 "" done found
  
  found:
    ; TMS 프로세스 발견
    DetailPrint "TMS 통합관리시스템이 실행 중입니다."
    MessageBox MB_YESNO|MB_ICONQUESTION "TMS 통합관리시스템이 실행 중입니다.$\n$\n자동으로 종료하고 설치를 계속하시겠습니까?" IDYES kill IDNO abort
  
  kill:
    DetailPrint "TMS 프로그램 종료 중..."
    
    ; wmic으로 TMS electron 프로세스만 종료
    nsExec::Exec 'wmic process where "name=''electron.exe'' and commandline like ''%TMS%''' delete'
    Pop $0
    
    Sleep 2000
    
    ; 종료 확인 - TMS가 commandline에 있는 electron만 확인
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

; === 제거용 프로세스 종료 함수 ===
Function un.CloseRunningApp
  DetailPrint "기존 TMS 프로그램 종료 중..."
  
  ; wmic으로 TMS electron 프로세스만 종료
  nsExec::Exec 'wmic process where "name=''electron.exe'' and commandline like ''%TMS%''' delete'
  Sleep 1000
FunctionEnd

; === electron-builder가 호출하는 매크로 ===
!macro customInit
  Call CloseRunningApp
!macroend

!macro customUnInit
  Call un.CloseRunningApp
!macroend

!macro customHeader
  ; MUI2 이후에 다시 상세 로그 활성화
!macroend
