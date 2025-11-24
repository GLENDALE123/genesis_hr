import React from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
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
  Shield,
  Palette,
  Info,
  Users,
  MessageSquare,
  ArrowLeft
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { logout } from '@/shared/services/firebase';
import { cn } from '@/shared/lib/utils';
import { getUserDisplayName, getUserInitial, getUserRoleText } from '@/shared/utils/userUtils';
import { toast } from 'sonner';
import { getRouteIcon, getRouteTitle } from '@/shared/constants/navigation';
import { useNotifications } from '@/shared/hooks/useNotifications';
import { NotificationPanel } from './NotificationPanel';
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger
} from '@/shared/components/ui/sheet';
import { useDeviceType } from '@/shared/hooks/use-device';

interface AppHeaderProps {
  className?: string;
  onMenuClick?: () => void;
}


const AppHeaderComponent: React.FC<AppHeaderProps> = ({ 
  className,
  onMenuClick 
}) => {
  const { user, userProfile } = useAuthStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { isSmartphone } = useDeviceType();
  
  // 알림 관리 훅 사용
  const { notifications, unreadCount } = useNotifications();
  const [isNotificationOpen, setIsNotificationOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [isMobileMarkingAllRead, setIsMobileMarkingAllRead] = React.useState(false);

  // 모바일 환경에서 마운트 상태 관리
  React.useEffect(() => {
    setMounted(true);
  }, []);
  
  // 현재 페이지 제목 및 아이콘 가져오기 (설정 페이지의 탭에 따라 동적으로 변경)
  const pageTitle = React.useMemo(() => {
    // 설정 페이지인 경우 탭에 따라 다른 제목 표시
    if (pathname === '/settings') {
      const tab = searchParams?.get('tab');
      const tabTitles: Record<string, string> = {
        'profile': '프로필',
        'notifications': '알림',
        'appearance': '화면',
        'about': '정보',
        'users': '유저 관리'
      };
      return tab && tabTitles[tab] ? tabTitles[tab] : '설정';
    }
    return getRouteTitle(pathname);
  }, [pathname, searchParams]);
  
  const PageIcon = React.useMemo(() => {
    // 설정 페이지인 경우 탭에 따라 다른 아이콘 표시
    if (pathname === '/settings') {
      const tab = searchParams?.get('tab');
      const tabIcons: Record<string, React.ComponentType<{ className?: string }>> = {
        'profile': User,
        'notifications': Bell,
        'appearance': Palette,
        'about': Info,
        'users': Users
      };
      return tab && tabIcons[tab] ? tabIcons[tab] : Settings;
    }
    return getRouteIcon(pathname);
  }, [pathname, searchParams]);

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

  const handleMobileMarkAllRead = async () => {
    if (isMobileMarkingAllRead) return;
    setIsMobileMarkingAllRead(true);
    try {
      await handleMarkAllRead();
    } finally {
      setIsMobileMarkingAllRead(false);
    }
  };

  const renderNotificationTriggerButton = () => (
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
  );

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
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
        WebkitAppRegion: 'no-drag', // Electron: 헤더는 드래그 불가능하도록 설정
      } as React.CSSProperties}
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

          {/* Messages */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/chat')}
            className="relative"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>

          {/* Notifications */}
          {isSmartphone ? (
            <Sheet open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
              <SheetTrigger asChild>
                {renderNotificationTriggerButton()}
              </SheetTrigger>
              <SheetContent
                className="w-full max-w-none overflow-hidden p-0 flex flex-col"
                fullscreen
                hideClose
              >
                <div className="flex h-full flex-col max-h-[100dvh]">
                  <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-background px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsNotificationOpen(false)}
                        className="-ml-2"
                        aria-label="뒤로가기"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                      <span className="text-base font-semibold text-foreground">
                        알림
                      </span>
                    </div>
                    {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={handleMobileMarkAllRead}
                        disabled={isMobileMarkingAllRead}
                      >
                        {isMobileMarkingAllRead ? '처리 중...' : '모두 읽음'}
                      </Button>
                    )}
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <NotificationPanel
                      notifications={notifications}
                      unreadCount={unreadCount}
                      isOpen={isNotificationOpen}
                      onOpenChange={setIsNotificationOpen}
                      onMarkAllRead={handleMarkAllRead}
                      onNotificationClick={handleNotificationClick}
                      userId={user?.uid}
                      layout="sheet"
                      showHeader={false}
                    />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <Popover open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
              <PopoverTrigger asChild>
                {renderNotificationTriggerButton()}
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
          )}

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 px-3 rounded-full flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.photoURL || ''} alt={getUserDisplayName(user, userProfile, '')} />
                  <AvatarFallback>
                    {getUserInitial(user || userProfile, 'U')}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-sm font-medium">
                  {getUserDisplayName(user, userProfile, '사용자')}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {getUserDisplayName(user, userProfile, '사용자')}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="default">
                      {getUserRoleText(userProfile)}
                    </Badge>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings?tab=profile">
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
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>설정</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              
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

AppHeaderComponent.displayName = 'AppHeader';

// AppHeader는 pathname과 searchParams 변경에 따라 리렌더링되어야 하므로
// React.memo를 사용하지 않고 내부에서 최적화
export const AppHeader = AppHeaderComponent;
