; NSIS Custom Installer Script for TMS

; === Close running app function ===
Function CloseRunningApp
  DetailPrint "Checking for running TMS instances..."
  
  ; Find all electron processes
  nsExec::ExecToStack 'tasklist /FI "IMAGENAME eq electron.exe" /NH /FO CSV'
  Pop $0 ; error code
  Pop $1 ; output
  
  ; Find TMS in output
  Push $1
  Push "TMS"
  Call StrStr
  Pop $2
  
  StrCmp $2 "" done found
  
  found:
    ; TMS process found
    DetailPrint "TMS is running."
    MessageBox MB_YESNO|MB_ICONQUESTION "TMS is running.$\n$\nClose it automatically and continue installation?" IDYES kill IDNO abort
  
  kill:
    DetailPrint "Closing TMS process..."
    
    ; Close TMS electron process only
    nsExec::Exec 'wmic process where "name=''electron.exe'' and commandline like ''%TMS%''' delete'
    Pop $0
    
    Sleep 2000
    
    ; Verify close - check electron with TMS in commandline
    nsExec::ExecToStack 'wmic process where "name=''electron.exe'' and commandline like ''%TMS%''' get processid /format:list'
    Pop $0
    Pop $4
    
    StrLen $R0 $4
    IntCmp $R0 0 success failure
    
    success:
      DetailPrint "Process closed successfully."
      Goto done
    
    failure:
      MessageBox MB_OK|MB_ICONEXCLAMATION "Cannot close process.$\n$\nPlease close manually and try again."
      Abort
  
  abort:
    DetailPrint "User cancelled installation."
    Abort
  
  done:
FunctionEnd

; === String search function ===
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

; === Uninstall process close function ===
Function un.CloseRunningApp
  DetailPrint "Closing TMS process..."
  
  ; Close TMS electron process only
  nsExec::Exec 'wmic process where "name=''electron.exe'' and commandline like ''%TMS%''' delete'
  Sleep 1000
FunctionEnd

; === electron-builder macros ===
!macro customInit
  Call CloseRunningApp
!macroend

!macro customUnInit
  Call un.CloseRunningApp
!macroend

!macro customHeader
  ; Enable detailed logging after MUI2
!macroend
