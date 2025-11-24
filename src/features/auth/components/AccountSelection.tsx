/**
 * 계정 선택 페이지
 * 네이버/구글 스타일의 저장된 계정 선택 UI
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { 
  getSavedAccount, 
  clearSavedAccount, 
  getDecryptedPassword,
  getDeviceId,
  saveLoginAccount,
  type SavedAccount 
} from '@/features/auth/utils/savedAccounts';
import { registerSession } from '@/features/auth/services/sessionService';
import { AuthService } from '@/features/auth/services';
import { getUserInitial } from '@/shared/utils/userUtils';
import { X, LogIn, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';

export function AccountSelection() {
  const navigate = useNavigate();
  const { user, isLoading, refreshUserProfile } = useAuthStore();
  const [savedAccount, setSavedAccount] = useState<SavedAccount | null>(null);
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const account = getSavedAccount();
    setSavedAccount(account);
    
    // 저장된 계정이 없으면 로그인 페이지로
    if (!account) {
      navigate('/login?mode=signin');
    }
  }, [navigate]);

  // 로그인된 사용자는 즉시 대시보드로 리다이렉트
  useEffect(() => {
    if (!isLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isLoading, navigate]);

  // 로그인된 사용자는 아무것도 렌더링하지 않음 (리다이렉트 중)
  if (!isLoading && user) {
    return null;
  }

  // 저장된 계정으로 자동 로그인
  const handleAutoLogin = async () => {
    if (!savedAccount) return;
    
    setIsAutoLoggingIn(true);
    
    try {
      const decryptedPassword = getDecryptedPassword(savedAccount);
      
      // 로그인 시도
      const loggedInUser = await AuthService.signIn({
        email: savedAccount.email,
        password: decryptedPassword,
      });
      
      // 프로필 로드
      try {
        await refreshUserProfile();
      } catch (profileError) {
        console.warn('⚠️ [AccountSelection] 프로필 로드 실패, 재시도 중...', profileError);
        await new Promise(resolve => setTimeout(resolve, 200));
        await refreshUserProfile();
      }
      
      // 세션 등록 및 계정 저장 (업데이트)
      try {
        const deviceId = getDeviceId();
        
        // 세션 등록 전에 약간 대기 (AuthProvider 리스너 등록 시간 확보)
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await registerSession(loggedInUser.uid, deviceId);
        
        // 세션 등록 시간 기록 (로컬 스토리지에 임시 저장)
        const sessionRegistrationTime = Date.now();
        sessionStorage.setItem(`session-reg-time-${loggedInUser.uid}`, sessionRegistrationTime.toString());
        
        await new Promise(resolve => setTimeout(resolve, 300));
        await refreshUserProfile();
        const { userProfile: currentUserProfile, user: currentUser } = useAuthStore.getState();
        
        // 프로필 사진 URL 가져오기 (Firebase Auth에서)
        const photoURL = currentUser?.photoURL || loggedInUser.photoURL;
        
        // HMR 업데이트 중 모듈이 변경될 수 있으므로 안전하게 처리
        try {
          await saveLoginAccount(
            savedAccount.email,
            loggedInUser.displayName || savedAccount.displayName,
            currentUserProfile?.position || savedAccount.position,
            decryptedPassword,
            photoURL
          );
        } catch (saveAccountError) {
          // HMR 업데이트로 인한 모듈 에러는 조용히 처리 (로그인은 이미 성공)
          const errorMessage = saveAccountError instanceof Error ? saveAccountError.message : String(saveAccountError);
          if (errorMessage.includes('HMR') || errorMessage.includes('module factory')) {
            // HMR 관련 에러는 무시 (개발 환경에서만 발생)
            console.warn('⚠️ [AccountSelection] 계정 저장 중 HMR 업데이트 감지 - 무시됨');
          } else {
            console.error('⚠️ [AccountSelection] 계정 저장 실패:', saveAccountError);
          }
        }
      } catch (sessionError) {
        // 세션 등록 실패도 조용히 처리 (로그인은 이미 성공)
        console.error('⚠️ [AccountSelection] 세션 등록 실패:', sessionError);
      }
      
      toast.success('로그인되었습니다!', {
        duration: 1500,
      });
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '자동 로그인에 실패했습니다.';
      toast.error('자동 로그인 실패', {
        description: '비밀번호를 다시 입력해주세요.',
      });
      
      // 자동 로그인 실패 시 일반 로그인 페이지로 이동 (이메일 자동 입력)
<<<<<<< HEAD
      navigate(`/login?mode=signin&email=${encodeURIComponent(savedAccount.email)}`, { replace: true });
=======
      navigate(`/login?mode=signin&email=${encodeURIComponent(savedAccount.email)}`);
>>>>>>> develop
    } finally {
      setIsAutoLoggingIn(false);
    }
  };

  // 저장된 계정 삭제
  const handleDeleteSavedAccount = () => {
    if (!savedAccount) return;
    
    clearSavedAccount();
    setSavedAccount(null);
    setDeleteDialogOpen(false);
    toast.success('로그인 기록이 삭제되었습니다.');
    
    // 일반 로그인 페이지로 이동
    navigate('/login?mode=signin');
  };

  // 다른 계정으로 로그인
  const handleOtherAccount = () => {
    if (savedAccount) {
<<<<<<< HEAD
      navigate(`/login?mode=signin&email=${encodeURIComponent(savedAccount.email)}`, { replace: true });
=======
      navigate(`/login?mode=signin&email=${encodeURIComponent(savedAccount.email)}`);
>>>>>>> develop
    } else {
      navigate('/login?mode=signin');
    }
  };

  if (!savedAccount) {
    return null;
  }

  const userInitial = getUserInitial({ displayName: savedAccount.displayName });

  return (
    <div className="w-full bg-gradient-to-br from-background via-background to-muted/30 p-4 sm:p-6 flex items-center justify-center">
      <div className="max-w-md w-full space-y-6">
        {/* 로고/타이틀 영역 */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">로그인</h1>
          <p className="text-muted-foreground text-base">계정을 선택하여 로그인하세요</p>
        </div>

        {/* 계정 선택 카드 - 중앙 배치 */}
        <Card className="border shadow-xl w-full">
          <CardContent className="p-6 sm:p-8">
            <div className="space-y-5">
              {/* 저장된 계정 표시 */}
              <div className="relative group">
                <button
                  onClick={handleAutoLogin}
                  disabled={isAutoLoggingIn}
                  className="w-full flex items-center gap-5 p-5 rounded-xl border-2 border-transparent hover:border-primary/20 hover:bg-muted/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-transparent disabled:hover:bg-transparent active:scale-[0.98]"
                >
                  {/* 아바타 */}
                  <Avatar className="h-14 w-14 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all shrink-0">
                    {savedAccount.photoURL ? (
                      <AvatarImage 
                        src={savedAccount.photoURL} 
                        alt={savedAccount.displayName}
                        className="object-cover"
                      />
                    ) : null}
                    <AvatarFallback className="text-xl font-semibold bg-primary/10 text-primary">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>

                  {/* 계정 정보 */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-lg truncate">
                        {savedAccount.displayName}
                        {savedAccount.position && (
                          <span className="text-muted-foreground font-normal ml-2 text-base">
                            {savedAccount.position}
                          </span>
                        )}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {savedAccount.email}
                    </p>
                    {isAutoLoggingIn && (
                      <p className="text-xs text-primary mt-2 animate-pulse font-medium">
                        로그인 중...
                      </p>
                    )}
                  </div>
                </button>

                {/* 삭제 버튼 (hover 시 표시) - 외부로 분리 */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 z-10 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteDialogOpen(true);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* 구분선 */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-3 text-muted-foreground font-medium">또는</span>
                </div>
              </div>

              {/* 다른 계정으로 로그인 */}
              <Button
                variant="outline"
                className="w-full h-11 text-base font-medium"
                onClick={handleOtherAccount}
                disabled={isAutoLoggingIn}
              >
                <LogIn className="mr-2 h-4 w-4" />
                다른 계정으로 로그인
              </Button>

              {/* 회원가입 */}
              <Button
                variant="ghost"
                className="w-full h-11 text-base font-medium"
<<<<<<< HEAD
                onClick={() => navigate('/login?mode=signup', { replace: true })}
=======
                onClick={() => navigate('/login?mode=signup')}
>>>>>>> develop
                disabled={isAutoLoggingIn}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                새 계정 만들기
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 계정 삭제 확인 다이얼로그 */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>로그인 기록 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                이 기기에서 저장된 로그인 기록을 삭제하시겠습니까?
                삭제 후에는 자동 로그인 기능을 사용할 수 없으며,
                다음 로그인 시 이메일과 비밀번호를 입력해야 합니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteSavedAccount}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

<<<<<<< HEAD


=======
>>>>>>> develop
