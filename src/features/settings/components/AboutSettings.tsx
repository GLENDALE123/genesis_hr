/**
 * 정보 탭
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Separator } from '@/shared/components/ui/separator';
import { Badge } from '@/shared/components/ui/badge';
import { useAuthStore } from '@/features/auth/store/authStore';
import { logout } from '@/shared/services/firebase/auth';
import { useRouter } from 'next/navigation';
import { Info, LogOut, Package, Calendar, Users, ExternalLink } from 'lucide-react';
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
  AlertDialogTrigger,
} from '@/shared/components/ui/alert-dialog';

export const AboutSettings: React.FC = () => {
  const { user } = useAuthStore();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      toast.success('로그아웃되었습니다.');
      router.push('/login');
    } catch {
      toast.error('로그아웃에 실패했습니다.');
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 앱 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            앱 정보
          </CardTitle>
          <CardDescription>
            HS Next 인사관리 시스템
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">버전</span>
            </div>
            <Badge variant="secondary">1.0.0</Badge>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">최종 업데이트</span>
            </div>
            <span className="text-sm text-muted-foreground">2025년 1월</span>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">개발</span>
            </div>
            <span className="text-sm text-muted-foreground">HS Team</span>
          </div>
        </CardContent>
      </Card>

      {/* 계정 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>계정 정보</CardTitle>
          <CardDescription>
            현재 로그인한 계정 정보입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">이메일</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium">사용자 ID</p>
            <p className="text-sm text-muted-foreground font-mono">{user?.uid}</p>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium">로그인 방식</p>
            <Badge variant="outline">이메일/비밀번호</Badge>
          </div>
        </CardContent>
      </Card>

      {/* 시스템 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>시스템 정보</CardTitle>
          <CardDescription>
            현재 실행 환경 정보입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">플랫폼</span>
            <Badge variant="secondary">
              {typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__ELECTRON__ 
                ? 'Electron Desktop' 
                : typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).ReactNativeWebView 
                  ? 'Mobile App' 
                  : 'Web Browser'}
            </Badge>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">브라우저</span>
            <span className="text-sm text-muted-foreground">
              {typeof window !== 'undefined' ? navigator.userAgent.split(' ').pop() : 'Unknown'}
            </span>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">화면 해상도</span>
            <span className="text-sm text-muted-foreground">
              {typeof window !== 'undefined' ? `${window.innerWidth} × ${window.innerHeight}` : 'Unknown'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 도움말 및 링크 */}
      <Card>
        <CardHeader>
          <CardTitle>도움말 및 지원</CardTitle>
          <CardDescription>
            문제가 있으신가요? 도움을 받으세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start" asChild>
            <a href="https://github.com/yourusername/hs-next" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              GitHub 저장소
            </a>
          </Button>

          <Button variant="outline" className="w-full justify-start" onClick={() => {
            toast.info('문의사항은 관리자에게 연락해주세요.');
          }}>
            <ExternalLink className="mr-2 h-4 w-4" />
            문의하기
          </Button>
        </CardContent>
      </Card>

      {/* 로그아웃 */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">로그아웃</CardTitle>
          <CardDescription>
            현재 계정에서 로그아웃합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full" disabled={isLoggingOut}>
                <LogOut className="mr-2 h-4 w-4" />
                {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>로그아웃하시겠습니까?</AlertDialogTitle>
                <AlertDialogDescription>
                  로그아웃하면 로그인 화면으로 이동합니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  로그아웃
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};

