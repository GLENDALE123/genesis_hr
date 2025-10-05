'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/features/auth/services';
import { useAuth } from '@/features/auth/hooks/useAuth';
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
  const router = useRouter();
  const { user } = useAuth();

  // 이미 로그인된 사용자는 홈으로 리다이렉트
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

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
          position: position.trim() || undefined,
          department: department.trim() || undefined,
        });
      } else {
        await AuthService.signIn({
          email: email.trim(),
          password,
        });
      }
      router.push('/');
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
