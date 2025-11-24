import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '@/features/auth/services';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { 
  FORM_PLACEHOLDERS, 
  FORM_LABELS, 
  BUTTON_TEXTS, 
  CARD_TEXTS,
  AUTH_ERROR_MESSAGES 
} from '@/features/auth/constants';
import { 
  validateEmail, 
  validatePassword, 
  validateName,
  validateContact 
} from '@/features/auth/utils';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { formatPhoneNumber } from '@/shared/utils/phoneUtils';
import { DEPARTMENT_OPTIONS } from '@/shared/constants/departments';
import { 
  saveLoginAccount, 
  getDeviceId,
  type SavedAccount 
} from '@/features/auth/utils/savedAccounts';
import { registerSession } from '@/features/auth/services/sessionService';

interface LoginFormProps {
  initialEmail?: string;
}

export function LoginForm({ initialEmail }: LoginFormProps = {} as LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  
  // 필드별 에러 상태
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [nameError, setNameError] = useState('');
  const [phoneNumberError, setPhoneNumberError] = useState('');
  
  // shake 애니메이션 트리거 상태
  const [shakeEmail, setShakeEmail] = useState(false);
  const [shakePassword, setShakePassword] = useState(false);
  const [shakeName, setShakeName] = useState(false);
  const [shakeConfirmPassword, setShakeConfirmPassword] = useState(false);
  const [shakePhoneNumber, setShakePhoneNumber] = useState(false);
  
  const navigate = useNavigate();
  const { user, refreshUserProfile, userProfile } = useAuthStore();

  // 이미 로그인된 사용자는 홈으로 리다이렉트
  useEffect(() => {
    if (user) {
<<<<<<< HEAD
      navigate('/', { replace: true });
=======
      navigate('/');
>>>>>>> develop
    }
  }, [user, navigate]);

  // initialEmail이 있으면 이메일 필드에 설정
  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

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


  // shake 애니메이션 트리거 함수
  const triggerShake = (field: 'email' | 'password' | 'name' | 'confirmPassword' | 'phoneNumber') => {
    if (field === 'email') {
      setShakeEmail(true);
      setTimeout(() => setShakeEmail(false), 500);
    } else if (field === 'password') {
      setShakePassword(true);
      setTimeout(() => setShakePassword(false), 500);
    } else if (field === 'name') {
      setShakeName(true);
      setTimeout(() => setShakeName(false), 500);
    } else if (field === 'confirmPassword') {
      setShakeConfirmPassword(true);
      setTimeout(() => setShakeConfirmPassword(false), 500);
    } else if (field === 'phoneNumber') {
      setShakePhoneNumber(true);
      setTimeout(() => setShakePhoneNumber(false), 500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setEmailError('');
    setPasswordError('');
    setNameError('');
    setPhoneNumberError('');

    try {
      if (isSignUp) {
        // 회원가입 필드 검증
        const emailValidation = validateEmail(email);
        if (!emailValidation.isValid) {
          setEmailError(emailValidation.error || '');
          triggerShake('email');
          throw new Error(emailValidation.error);
        }
        
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
          setPasswordError(passwordValidation.error || '');
          triggerShake('password');
          throw new Error(passwordValidation.error);
        }
        
        if (password !== confirmPassword) {
          triggerShake('confirmPassword');
          throw new Error('비밀번호가 일치하지 않습니다.');
        }
        
        const nameValidation = validateName(name);
        if (!nameValidation.isValid) {
          setNameError(nameValidation.error || '');
          triggerShake('name');
          throw new Error(nameValidation.error);
        }
        
        // 전화번호 검증 (선택사항이므로 입력된 경우만)
        if (phoneNumber.trim()) {
          const phoneNumberValidation = validateContact(phoneNumber);
          if (!phoneNumberValidation.isValid) {
            setPhoneNumberError(phoneNumberValidation.error || '');
            triggerShake('phoneNumber');
            throw new Error(phoneNumberValidation.error);
          }
        }
        
        const signedUpUser = await AuthService.signUp({
          email: email.trim(),
          password,
          confirmPassword,
          name: name.trim(),
          displayName: name.trim(),
          position: position.trim() || undefined,
          department: department.trim() || undefined,
          phoneNumber: phoneNumber.trim() || undefined,
        });
        
        // 회원가입 성공 후 사용자 프로필 강제 새로고침
        // auth.currentUser가 즉시 설정되므로 빠르게 프로필 가져오기
        try {
          await refreshUserProfile();
        } catch (profileError) {
          console.warn('⚠️ [LoginForm] 프로필 로드 실패, 재시도 중...', profileError);
          // 프로필 로드 실패 시 약간 대기 후 재시도
          await new Promise(resolve => setTimeout(resolve, 200));
          await refreshUserProfile();
        }
        
        // 회원가입 성공 후 계정 저장 및 세션 등록
        try {
          const deviceId = getDeviceId();
          
          // Firestore에 세션 등록
          await registerSession(signedUpUser.uid, deviceId);
          
          // 프로필을 다시 가져오기 위해 약간 대기 (store 업데이트 대기)
          await new Promise(resolve => setTimeout(resolve, 300));
          await refreshUserProfile();
          const { userProfile: currentUserProfile, user: currentUser } = useAuthStore.getState();
          
          // 로컬에 계정 정보 저장 (프로필 사진 URL 포함)
          await saveLoginAccount(
            email.trim(),
            signedUpUser.displayName || name.trim(),
            currentUserProfile?.position || position.trim() || undefined,
            password,
            currentUser?.photoURL || signedUpUser.photoURL
          );
          
          console.log('✅ [LoginForm] 회원가입 후 로그인 기록 저장 완료');
        } catch (saveError) {
          console.error('⚠️ [LoginForm] 로그인 기록 저장 실패:', saveError);
          // 저장 실패해도 로그인은 진행
        }
        
        toast.success('회원가입이 완료되었습니다!', {
          description: '환영합니다. 로그인되었습니다.',
          duration: 1500,
        });
<<<<<<< HEAD
        navigate('/dashboard', { replace: true });
=======
        navigate('/dashboard');
>>>>>>> develop
      } else {
        // 로그인 필드 검증
        const emailValidation = validateEmail(email);
        if (!emailValidation.isValid) {
          setEmailError(emailValidation.error || '');
          triggerShake('email');
          throw new Error(emailValidation.error);
        }
        
        if (!password) {
          setPasswordError('비밀번호를 입력해주세요.');
          triggerShake('password');
          throw new Error('비밀번호를 입력해주세요.');
        }
        
        // 로그인 시도
        const loggedInUser = await AuthService.signIn({
          email: email.trim(),
          password,
        });
        
        // 로그인 성공 후 사용자 프로필 강제 새로고침
        // auth.currentUser가 즉시 설정되므로 빠르게 프로필 가져오기
        let userProfile = null;
        try {
<<<<<<< HEAD
          const loggedInUser = await AuthService.signIn({
            email: email.trim(),
            password,
          });
          
          // 로그인 성공 후 사용자 프로필 강제 새로고침
          // auth.currentUser가 즉시 설정되므로 빠르게 프로필 가져오기
          let userProfile = null;
          try {
            await refreshUserProfile();
            // 프로필 재조회 (refreshUserProfile이 void를 반환하므로 store에서 가져오기)
            await new Promise(resolve => setTimeout(resolve, 100));
            userProfile = await refreshUserProfile();
          } catch (profileError) {
            console.warn('⚠️ [LoginForm] 프로필 로드 실패, 재시도 중...', profileError);
            // 프로필 로드 실패 시 약간 대기 후 재시도
            await new Promise(resolve => setTimeout(resolve, 200));
            try {
              await refreshUserProfile();
            } catch (retryError) {
              console.error('❌ [LoginForm] 프로필 재시도 실패:', retryError);
            }
          }
          
          // 로그인 성공 후 계정 저장 및 세션 등록
          try {
            const deviceId = getDeviceId();
            
            // 세션 등록 전에 약간 대기 (AuthProvider 리스너 등록 시간 확보)
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Firestore에 세션 등록 (다른 기기 세션 무효화)
            await registerSession(loggedInUser.uid, deviceId);
            
            // 세션 등록 시간 기록 (로컬 스토리지에 임시 저장)
            const sessionRegistrationTime = Date.now();
            sessionStorage.setItem(`session-reg-time-${loggedInUser.uid}`, sessionRegistrationTime.toString());
            
            // 프로필을 다시 가져오기 위해 약간 대기 (store 업데이트 대기)
            await new Promise(resolve => setTimeout(resolve, 300));
            await refreshUserProfile();
            const { userProfile: currentUserProfile, user: currentUser } = useAuthStore.getState();
            
            // 로컬에 계정 정보 저장 (프로필 사진 URL 포함)
            await saveLoginAccount(
              email.trim(),
              loggedInUser.displayName || email.trim().split('@')[0],
              currentUserProfile?.position,
              password,
              currentUser?.photoURL || loggedInUser.photoURL
            );
            
            console.log('✅ [LoginForm] 로그인 기록 저장 완료');
          } catch (saveError) {
            console.error('⚠️ [LoginForm] 로그인 기록 저장 실패:', saveError);
            // 저장 실패해도 로그인은 진행
          }
          
          toast.success('로그인되었습니다!', {
            duration: 1500,
          });
          navigate('/dashboard', { replace: true });
        } catch (loginError: unknown) {
          throw loginError;
=======
          await refreshUserProfile();
          // 프로필 재조회 (refreshUserProfile이 void를 반환하므로 store에서 가져오기)
          await new Promise(resolve => setTimeout(resolve, 100));
          userProfile = await refreshUserProfile();
        } catch (profileError) {
          console.warn('⚠️ [LoginForm] 프로필 로드 실패, 재시도 중...', profileError);
          // 프로필 로드 실패 시 약간 대기 후 재시도
          await new Promise(resolve => setTimeout(resolve, 200));
          try {
            await refreshUserProfile();
          } catch (retryError) {
            console.error('❌ [LoginForm] 프로필 재시도 실패:', retryError);
          }
>>>>>>> develop
        }
        
        // 로그인 성공 후 계정 저장 및 세션 등록
        try {
          const deviceId = getDeviceId();
          
          // 세션 등록 전에 약간 대기 (AuthProvider 리스너 등록 시간 확보)
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Firestore에 세션 등록 (다른 기기 세션 무효화)
          await registerSession(loggedInUser.uid, deviceId);
          
          // 세션 등록 시간 기록 (로컬 스토리지에 임시 저장)
          const sessionRegistrationTime = Date.now();
          sessionStorage.setItem(`session-reg-time-${loggedInUser.uid}`, sessionRegistrationTime.toString());
          
          // 프로필을 다시 가져오기 위해 약간 대기 (store 업데이트 대기)
          await new Promise(resolve => setTimeout(resolve, 300));
          await refreshUserProfile();
          const { userProfile: currentUserProfile, user: currentUser } = useAuthStore.getState();
          
          // 로컬에 계정 정보 저장 (프로필 사진 URL 포함)
          await saveLoginAccount(
            email.trim(),
            loggedInUser.displayName || email.trim().split('@')[0],
            currentUserProfile?.position,
            password,
            currentUser?.photoURL || loggedInUser.photoURL
          );
          
          console.log('✅ [LoginForm] 로그인 기록 저장 완료');
        } catch (saveError) {
          console.error('⚠️ [LoginForm] 로그인 기록 저장 실패:', saveError);
          // 저장 실패해도 로그인은 진행
        }
        
        toast.success('로그인되었습니다!', {
          duration: 1500,
        });
        navigate('/dashboard');
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
        <CardTitle className="text-xl font-bold">
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
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError('');
              }}
              className={`${emailError ? 'border-destructive focus-visible:ring-destructive' : ''} ${shakeEmail ? 'animate-shake' : ''}`}
              required
            />
            {emailError && (
              <p className="text-sm text-destructive">{emailError}</p>
            )}
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
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                className={`pr-10 ${passwordError ? 'border-destructive focus-visible:ring-destructive' : ''} ${shakePassword ? 'animate-shake' : ''}`}
                required={!isSignUp}
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
            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}
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
                    className={`pr-10 ${passwordMismatch ? 'border-destructive focus-visible:ring-destructive' : ''} ${shakeConfirmPassword ? 'animate-shake' : ''}`}
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
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameError('');
                  }}
                  className={`${nameError ? 'border-destructive focus-visible:ring-destructive' : ''} ${shakeName ? 'animate-shake' : ''}`}
                  required
                />
                {nameError && (
                  <p className="text-sm text-destructive">{nameError}</p>
                )}
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
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="부서를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENT_OPTIONS.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">{FORM_LABELS.CONTACT}</Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  placeholder={FORM_PLACEHOLDERS.CONTACT}
                  value={phoneNumber}
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value);
                    setPhoneNumber(formatted);
                    setPhoneNumberError('');
                  }}
                  className={`${phoneNumberError ? 'border-destructive focus-visible:ring-destructive' : ''} ${shakePhoneNumber ? 'animate-shake' : ''}`}
                />
                {phoneNumberError && (
                  <p className="text-sm text-destructive">{phoneNumberError}</p>
                )}
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
              setPhoneNumber('');
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
