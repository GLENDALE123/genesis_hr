'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/features/auth/services';
import { MigrationService } from '@/features/auth/services/migrationService';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { 
  FORM_PLACEHOLDERS, 
  FORM_LABELS, 
  BUTTON_TEXTS, 
  CARD_TEXTS,
  AUTH_ERROR_MESSAGES 
} from '@/features/auth/constants';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const router = useRouter();
  const { user } = useAuthStore();

  // 회원가입/로그인 전환 시 Electron 윈도우 높이 조정
  useEffect(() => {
    if (typeof window !== 'undefined' && window.__ELECTRON__ && window.electron) {
      const height = isSignUp ? 850 : 650; // 회원가입: 850px, 로그인: 650px
      window.electron.window.resize({
        width: 550,
        height: height,
        center: true
      }).then(() => {
        console.log(`🔧 폼 전환 윈도우 크기 조정: 550x${height}`);
      }).catch((err) => {
        console.error('❌ 윈도우 크기 조정 실패:', err);
      });
    }
  }, [isSignUp]);

  // 이미 로그인된 사용자는 홈으로 리다이렉트
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  // 비밀번호 일치 여부 실시간 체크
  useEffect(() => {
    if (isSignUp && confirmPassword) {
      setPasswordMismatch(password !== confirmPassword);
    } else {
      setPasswordMismatch(false);
    }
  }, [password, confirmPassword, isSignUp]);

  // 로그인된 사용자는 렌더링하지 않음
  if (user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        await AuthService.signUp({
          email: email.trim(),
          password,
          confirmPassword,
          name: name.trim(),
          displayName: name.trim(),
          loginId: email.trim().split('@')[0], // 이메일의 @ 앞부분을 기본 로그인 ID로 사용
          position: position.trim() || undefined,
          department: department.trim() || undefined,
        });
        toast.success('회원가입이 완료되었습니다!', {
          description: '환영합니다. 로그인되었습니다.',
        });
        router.push('/dashboard');
      } else {
        // 로그인 시도
        try {
          await AuthService.signIn({
            emailOrLoginId: email.trim(),
            password,
          });
          toast.success('로그인되었습니다!');
          router.push('/dashboard');
        } catch (loginError: any) {
          // 로그인 실패 시 Firestore 프로필 확인 (마이그레이션)
          if (loginError.message?.includes('사용자') || loginError.message?.includes('존재하지') || loginError.code === 'auth/user-not-found') {
            const hasProfile = await MigrationService.checkFirestoreProfileExists(email.trim());
            
            if (hasProfile) {
              // Firestore에 프로필이 있으면 Auth 계정 생성 시도
              toast.info('기존 프로필을 찾았습니다. 계정을 연결하는 중...', {
                description: '잠시만 기다려주세요.'
              });
              
              const result = await MigrationService.createAuthFromFirestoreProfile(email.trim(), password);
              
              if (result.success) {
                // 마이그레이션 성공 후 중복 문서 정리
                try {
                  const deletedCount = await MigrationService.cleanupDuplicateProfiles(email.trim());
                  if (deletedCount > 0) {
                    console.log(`✅ ${deletedCount}개의 중복 프로필 정리 완료`);
                  }
                } catch (cleanupError) {
                  console.warn('중복 문서 정리 중 에러 (무시):', cleanupError);
                }
                
                toast.success('계정이 성공적으로 연결되었습니다!', {
                  description: '로그인되었습니다.'
                });
                router.push('/dashboard');
                return;
              } else {
                throw new Error(result.error || '계정 연결에 실패했습니다.');
              }
            }
          }
          
          // 마이그레이션도 실패하면 원래 에러 던지기
          throw loginError;
        }
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : AUTH_ERROR_MESSAGES.LOGIN_FAILED);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">
          {isSignUp ? CARD_TEXTS.SIGNUP_TITLE : CARD_TEXTS.LOGIN_TITLE}
        </CardTitle>
        <CardDescription>
          {isSignUp ? CARD_TEXTS.SIGNUP_DESCRIPTION : CARD_TEXTS.LOGIN_DESCRIPTION}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{FORM_LABELS.EMAIL}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={FORM_PLACEHOLDERS.EMAIL}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">{FORM_LABELS.PASSWORD}</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder={FORM_PLACEHOLDERS.PASSWORD}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          
          {isSignUp && (
            <>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{FORM_LABELS.CONFIRM_PASSWORD}</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder={FORM_PLACEHOLDERS.CONFIRM_PASSWORD}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={passwordMismatch ? "pr-10 border-destructive focus-visible:ring-destructive" : "pr-10"}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {passwordMismatch && (
                  <p className="text-sm text-destructive">
                    비밀번호가 일치하지 않습니다.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">{FORM_LABELS.NAME}</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder={FORM_PLACEHOLDERS.NAME}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="position">{FORM_LABELS.POSITION}</Label>
                <Input
                  id="position"
                  name="position"
                  type="text"
                  placeholder={FORM_PLACEHOLDERS.POSITION}
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="department">{FORM_LABELS.DEPARTMENT}</Label>
                <Input
                  id="department"
                  name="department"
                  type="text"
                  placeholder={FORM_PLACEHOLDERS.DEPARTMENT}
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>
            </>
          )}
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? BUTTON_TEXTS.PROCESSING : isSignUp ? BUTTON_TEXTS.SIGNUP : BUTTON_TEXTS.LOGIN}
          </Button>
        </form>
        
        <div className="text-center text-sm">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              // 폼 필드 초기화
              setEmail('');
              setPassword('');
              setConfirmPassword('');
              setName('');
              setPosition('');
              setDepartment('');
              setError('');
              setShowPassword(false);
              setShowConfirmPassword(false);
              setPasswordMismatch(false);
            }}
            className="text-primary hover:text-primary/80 font-medium"
          >
            {isSignUp ? BUTTON_TEXTS.SWITCH_TO_LOGIN : BUTTON_TEXTS.SWITCH_TO_SIGNUP}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
