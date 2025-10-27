'use client';

import React from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Button } from '@/shared/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/shared/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { Badge } from '@/shared/components/ui/badge';
import { Switch } from '@/shared/components/ui/switch';
import { 
  Bell, 
  Search, 
  LogOut, 
  User,
  Menu,
  Sun,
  Moon,
  Settings,
  Shield
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { logout } from '@/shared/services/firebase/auth';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/shared/lib/utils';
import { getUserDisplayName, getUserInitial, getUserRoleBadgeVariant, getUserRoleText } from '@/shared/utils/userUtils';
import { useDevStore } from '@/app/store';
import { toast } from 'sonner';
import { getRouteIcon, getRouteTitle } from '@/shared/constants/navigation';
import { useNotifications } from '@/shared/hooks/useNotifications';
import { NotificationPanel } from './NotificationPanel';

interface AppHeaderProps {
  className?: string;
  onMenuClick?: () => void;
}


export const AppHeader: React.FC<AppHeaderProps> = ({ 
  className,
  onMenuClick 
}) => {
  const { user, userProfile } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { dummyRole, setDummyRole, clearDummyRole } = useDevStore();
  
  // 알림 관리 훅 사용
  const { notifications, unreadCount } = useNotifications();
  const [isNotificationOpen, setIsNotificationOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  // 모바일 환경에서 마운트 상태 관리
  React.useEffect(() => {
    setMounted(true);
  }, []);
  
  // 현재 페이지 제목 및 아이콘 가져오기
  const pageTitle = getRouteTitle(pathname);
  const PageIcon = getRouteIcon(pathname);

  // 알림 읽음 처리 핸들러
  const handleMarkAllRead = async () => {
    if (!user?.uid) return;
    
    // 즉시 UI 업데이트 (낙관적 업데이트)
    setIsNotificationOpen(false);
    
    // 백그라운드에서 읽음 처리 (서버는 3일 후 자동 삭제)
    try {
      const { NotificationManager } = await import('@/shared/components/common/CustomNotification');
      await NotificationManager.markAllAsRead(user.uid);
    } catch (error) {
      console.error('❌ 백그라운드 읽음 처리 실패:', error);
      toast.error('알림 읽음 처리 중 오류가 발생했습니다.');
    }
  };

  const handleNotificationClick = async (notificationId: string) => {
    if (!user?.uid) return;
    
    // 즉시 UI에서 제거 (낙관적 업데이트)
    // 백그라운드에서 읽음 처리 (서버는 3일 후 자동 삭제)
    const { NotificationManager } = await import('@/shared/components/common/CustomNotification');
    NotificationManager.markAsRead(user.uid, notificationId).catch(err => {
      console.error('❌ 알림 읽음 처리 실패:', err);
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  // 마운트되지 않은 상태에서는 기본 헤더만 렌더링
  if (!mounted) {
    return (
      <header 
        className={cn(
          "sticky top-0 z-50 w-full border-b",
          className
        )}
        style={{
          backgroundColor: 'hsl(var(--header-background))',
          color: 'hsl(var(--header-foreground))',
        }}
      >
        <div className="container max-w-none flex h-12 items-center justify-between px-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header 
      className={cn(
        "sticky top-0 z-50 w-full border-b",
        className
      )}
      style={{
        backgroundColor: 'hsl(var(--header-background))',
        color: 'hsl(var(--header-foreground))',
      }}
    >
      <div className="container max-w-none flex h-12 items-center justify-between px-3">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {/* Sidebar Toggle Button - Always visible */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          {/* Current Page Title */}
          <div className="hidden sm:flex sm:items-center sm:gap-2">
            <PageIcon className="h-5 w-5 text-foreground" />
            <h1 className="text-lg font-semibold text-foreground">
              {pageTitle}
            </h1>
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="검색..."
              className="w-full pl-10 pr-4 py-1 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Theme Customizer removed */}

          {/* Notifications */}
          <Popover open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" align="end">
              <NotificationPanel
                notifications={notifications}
                unreadCount={unreadCount}
                isOpen={isNotificationOpen}
                onOpenChange={setIsNotificationOpen}
                onMarkAllRead={handleMarkAllRead}
                onNotificationClick={handleNotificationClick}
                userId={user?.uid}
              />
            </PopoverContent>
          </Popover>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 px-3 rounded-full flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.photoURL || ''} alt={getUserDisplayName(userProfile || user, null, '')} />
                  <AvatarFallback>
                    {getUserInitial(userProfile || user, 'U')}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-sm font-medium">
                  {getUserDisplayName(userProfile || user, null, '사용자')}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {getUserDisplayName(userProfile || user, null, '사용자')}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="default">
                      {getUserRoleText(dummyRole ? { role: dummyRole } : userProfile)}
                    </Badge>
                    {dummyRole && (
                      <Badge variant="destructive" className="text-xs">
                        테스트 모드
                      </Badge>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings?tab=profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>프로필</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* Theme Switch */}
              <div className="flex items-center justify-between px-2 py-1.5 text-sm">
                <div className="flex items-center">
                  {(resolvedTheme || theme) === 'dark' ? (
                    <Moon className="mr-2 h-4 w-4" />
                  ) : (
                    <Sun className="mr-2 h-4 w-4" />
                  )}
                  <span>
                    {(resolvedTheme || theme) === 'dark' ? '다크 모드' : '라이트 모드'}
                  </span>
                </div>
                <Switch
                  checked={(resolvedTheme || theme) === 'dark'}
                  onCheckedChange={(checked: boolean) => {
                    const newTheme = checked ? 'dark' : 'light';
                    
                    // next-themes만 업데이트 (localStorage 자동 저장)
                    // 기기별로 독립적인 테마 설정
                    setTheme(newTheme);
                  }}
                />
              </div>
              {/* Settings menu */}
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>설정</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              
              {/* Admin 전용: 권한 테스트 모드 */}
              {userProfile?.role === 'Admin' && (
                <>
                  <DropdownMenuLabel>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <span>권한 테스트 (개발용)</span>
                    </div>
                  </DropdownMenuLabel>
                  <div className="px-2 py-2 space-y-2">
                    <Button
                      variant={dummyRole === 'Admin' ? 'default' : 'outline'}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setDummyRole(dummyRole === 'Admin' ? null : 'Admin')}
                    >
                      <Badge variant="default" className="mr-2">A</Badge>
                      Admin으로 보기
                    </Button>
                    <Button
                      variant={dummyRole === 'Manager' ? 'secondary' : 'outline'}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setDummyRole(dummyRole === 'Manager' ? null : 'Manager')}
                    >
                      <Badge variant="secondary" className="mr-2">M</Badge>
                      Manager로 보기
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setDummyRole(dummyRole === 'Member' ? null : 'Member')}
                    >
                      <Badge variant="outline" className="mr-2">U</Badge>
                      Member로 보기
                    </Button>
                    {dummyRole && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => clearDummyRole()}
                      >
                        원래 권한으로 복구
                      </Button>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                </>
              )}
              
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>로그아웃</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
