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
  Shield
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { logout } from '@/shared/services/firebase/auth';
import { useRouter } from 'next/navigation';
import { cn } from '@/shared/lib/utils';
import { getUserDisplayName, getUserInitial, getUserRoleBadgeVariant, getUserRoleText, isAdmin as checkIsAdmin } from '@/shared/utils/userUtils';
import { ThemeCustomizer } from '@/shared/components/common';
import { useDevStore } from '@/app/store';
import { toast } from 'sonner';

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
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { dummyRole, setDummyRole, clearDummyRole } = useDevStore();
  
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = React.useState(false);

  // 실시간 알림 조회
  React.useEffect(() => {
    if (!user?.uid) return;

    const fetchNotifications = async () => {
      try {
        const { collection, query, where, orderBy, limit, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('@/shared/services/firebase/config');
        
        if (!db) return;

        const q = query(
          collection(db, `users/${user.uid}/inbox`),
          where('read', '==', false), // 읽지 않은 알림만 조회
          orderBy('createdAt', 'desc'),
          limit(10)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const notifs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setNotifications(notifs);
          setUnreadCount(notifs.length); // 모두 읽지 않은 알림이므로 전체 개수
        });

        return unsubscribe;
      } catch (error) {
        console.error('알림 조회 실패:', error);
      }
    };

    fetchNotifications();
  }, [user?.uid]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

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
      <div className="container max-w-none flex h-12 items-center justify-between px-4">
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
          {/* Theme Customizer */}
          <ThemeCustomizer />

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
            <PopoverContent className="w-80 p-0" align="end">
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <h3 className="text-sm font-semibold">알림</h3>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (user?.uid) {
                        try {
                          const { NotificationManager } = await import('@/shared/components/common/CustomNotification');
                          await NotificationManager.markAllAsRead(user.uid);
                          toast.success(`${unreadCount}개의 알림을 읽음 처리했습니다.`);
                        } catch (error) {
                          console.error('모든 알림 읽음 처리 실패:', error);
                          toast.error('알림 읽음 처리에 실패했습니다.');
                        }
                      }
                    }}
                  >
                    모두 읽음
                  </Button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    알림이 없습니다
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <Link
                      key={notif.id}
                      href={notif.link || '#'}
                      className="block px-3 py-2 border-b cursor-pointer hover:bg-accent transition-colors bg-primary/5"
                      onClick={async (e) => {
                        if (!notif.link) {
                          e.preventDefault();
                        }
                        if (user?.uid) {
                          const { NotificationManager } = await import('@/shared/components/common/CustomNotification');
                          await NotificationManager.markAsRead(user.uid, notif.id);
                          setIsNotificationOpen(false);
                        }
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 mt-0.5">
                          <Bell className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium leading-tight">{notif.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-tight mt-0.5">
                            {notif.body}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-tight opacity-70">
                            {notif.metadata?.senderName || '시스템'}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-primary rounded-full mt-1" />
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user?.photoURL || ''} alt={getUserDisplayName(user, '')} />
                  <AvatarFallback>
                    {getUserInitial(user, 'U')}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {getUserDisplayName(user, '사용자')}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={getUserRoleBadgeVariant(dummyRole ? { role: dummyRole } : userProfile)}>
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
                <Link href="/profile">
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
                  <span>다크 모드</span>
                </div>
                <Switch
                  checked={(resolvedTheme || theme) === 'dark'}
                  onCheckedChange={(checked) => {
                    console.log('테마 변경:', checked ? 'dark' : 'light');
                    setTheme(checked ? 'dark' : 'light');
                  }}
                />
              </div>
              {/* Settings menu - 임시 비활성화 */}
              {/* <DropdownMenuItem onClick={() => router.push('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>설정</span>
              </DropdownMenuItem> */}
              <DropdownMenuSeparator />
              
              {/* Admin 전용: 권한 테스트 모드 */}
              {checkIsAdmin(userProfile) && (
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
                      variant={dummyRole === 'Member' ? 'outline' : 'outline'}
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
