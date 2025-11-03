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
import { logout } from '@/shared/services/firebase';
import { useRouter } from 'next/navigation';
import { Info, LogOut, Package, Calendar, Users, ExternalLink, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useGitHubRelease } from '@/shared/hooks/useGitHubRelease';
import { WindowsIcon } from '@/shared/components/icons/WindowsIcon';
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
  
  // Electron 환경 확인
  const isElectron = typeof window !== 'undefined' && 
    (window as unknown as Record<string, unknown>).__ELECTRON__ === true;
  
  // GitHub 릴리스 정보
  const { latestRelease, installerAsset, isLoading: releaseLoading } = useGitHubRelease();

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
            TMS 통합관리시스템
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">버전</span>
            </div>
            <Badge variant="secondary">
              {releaseLoading 
                ? '...' 
                : latestRelease?.tag_name.replace('v', '') || '0.1.0'}
            </Badge>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">최종 업데이트</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {releaseLoading 
                ? '...' 
                : latestRelease?.published_at 
                  ? new Date(latestRelease.published_at).toLocaleDateString('ko-KR', { 
                      year: 'numeric', 
                      month: 'long' 
                    })
                  : '-'}
            </span>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">개발</span>
            </div>
            <span className="text-sm text-muted-foreground">TMS Team</span>
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

      {/* 데스크탑용 앱 다운로드 (웹 브라우저 환경에서만 표시) */}
      {!isElectron && (
        <Card>
          <CardHeader>
            <CardTitle>데스크탑용 앱</CardTitle>
            <CardDescription>
              데스크톱 앱을 다운로드하여 더 나은 사용 경험을 누리세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {releaseLoading ? (
              <div className="flex items-center justify-center py-4">
                <span className="text-sm text-muted-foreground">최신 버전 확인 중...</span>
              </div>
            ) : (
              <>
                <Button 
                  variant="default" 
                  className="w-full" 
                  size="lg"
                  onClick={() => {
                    if (installerAsset?.browser_download_url) {
                      // 설치 파일이 있으면 다운로드
                      const link = document.createElement('a');
                      link.href = installerAsset.browser_download_url;
                      link.download = installerAsset.name;
                      link.target = '_blank';
                      link.rel = 'noopener noreferrer';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      toast.success('다운로드가 시작되었습니다.');
                    } else {
                      // 설치 파일이 없으면 GitHub 릴리스 페이지로 이동
                      window.open('https://github.com/mir1102/HS-Jig/releases', '_blank', 'noopener,noreferrer');
                      toast.info('GitHub 릴리스 페이지로 이동합니다.');
                    }
                  }}
                >
                  <WindowsIcon className="mr-2" size={20} />
                  Windows
                </Button>
                {installerAsset && (
                  <div className="text-xs text-muted-foreground space-y-1 pt-2">
                    <p>• 파일 크기: {(installerAsset.size / 1024 / 1024).toFixed(1)} MB</p>
                    <p>• 출시일: {latestRelease?.published_at ? new Date(latestRelease.published_at).toLocaleDateString('ko-KR') : '-'}</p>
                    <p>• 버전: {latestRelease?.tag_name.replace('v', '') || '-'}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

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

