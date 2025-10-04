'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signUp } from '@/shared/services/firebase/auth';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';

export function LoginForm() {
  const [emailOrLoginId, setEmailOrLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loginId, setLoginId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { user } = useAuth();

  // 이미 로그인된 사용자는 홈으로 리다이렉트
  if (user) {
    router.push('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        // 회원가입 시 이메일 형식 검증
        if (!emailOrLoginId.includes('@')) {
          setError('회원가입 시에는 이메일을 입력해주세요.');
          setLoading(false);
          return;
        }
        
        if (!loginId.trim()) {
          setError('로그인 아이디를 입력해주세요.');
          setLoading(false);
          return;
        }

        await signUp({
          email: emailOrLoginId,
          password,
          loginId: loginId.trim(),
          displayName: displayName.trim() || undefined,
        });
      } else {
        await signIn({
          emailOrLoginId,
          password,
        });
      }
      router.push('/');
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">
          {isSignUp ? '회원가입' : '로그인'}
        </CardTitle>
        <CardDescription>
          {isSignUp ? '새 계정을 만들어 시작하세요' : '계정에 로그인하세요'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emailOrLoginId">
              {isSignUp ? '이메일' : '이메일 또는 로그인 아이디'}
            </Label>
            <Input
              id="emailOrLoginId"
              name="emailOrLoginId"
              type={isSignUp ? 'email' : 'text'}
              placeholder={isSignUp ? 'm@example.com' : '이메일 또는 로그인 아이디'}
              value={emailOrLoginId}
              onChange={(e) => setEmailOrLoginId(e.target.value)}
              required
            />
          </div>
          
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="loginId">로그인 아이디</Label>
              <Input
                id="loginId"
                name="loginId"
                type="text"
                placeholder="로그인 아이디를 입력하세요"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                required
              />
            </div>
          )}
          
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="displayName">표시 이름 (선택사항)</Label>
              <Input
                id="displayName"
                name="displayName"
                type="text"
                placeholder="표시할 이름을 입력하세요"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '처리 중...' : isSignUp ? '회원가입' : '로그인'}
          </Button>
        </form>
        
        <div className="text-center text-sm">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary hover:text-primary/80 font-medium"
          >
            {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
