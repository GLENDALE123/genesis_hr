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
  MessageSquare,
  CalendarClock,
  AlertTriangle,
  ShieldAlert,
  Shield,
  Megaphone,
  CalendarDays,
  FileText,
  TestTube
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { logout } from '@/shared/services/firebase/auth';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/shared/lib/utils';
import { getUserDisplayName, getUserInitial, getUserRoleBadgeVariant, getUserRoleText } from '@/shared/utils/userUtils';
import { ThemeCustomizer } from '@/shared/components/common';
import { useDevStore } from '@/app/store';
import { toast } from 'sonner';
import { getRouteIcon, getRouteTitle } from '@/shared/constants/navigation';

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
  
  const [notifications, setNotifications] = React.useState<Record<string, unknown>[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = React.useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = React.useState(false);
  const prevNotificationsRef = React.useRef<string>('');
  
  // 현재 페이지 제목 및 아이콘 가져오기
  const pageTitle = getRouteTitle(pathname);
  const PageIcon = getRouteIcon(pathname);

  // 실시간 알림 조회 (최적화된 버전)
  React.useEffect(() => {
    if (!user || !user.uid) return;

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
          })) as Record<string, unknown>[];
          
          // 변경 감지: 간단한 해시 비교로 불필요한 업데이트 방지
          const currentHash = JSON.stringify(notifs.map(n => ({ id: n.id, read: n.read })));
          if (prevNotificationsRef.current === currentHash) {
            return; // 변경사항 없음
          }
          
          prevNotificationsRef.current = currentHash;
          
          // 상태 업데이트 최소화
          setNotifications(prev => {
            // 길이와 주요 필드만 비교
            if (prev.length === notifs.length && 
                prev.every((p, i) => p.id === notifs[i]?.id && p.read === notifs[i]?.read)) {
              return prev; // 동일한 상태면 이전 배열 반환
            }
            return notifs;
          });
          
          setUnreadCount(notifs.length);
        });

        return () => {
          unsubscribe();
          prevNotificationsRef.current = '';
        };
      } catch (error) {
        console.error('알림 조회 실패:', error);
      }
    };

    const cleanup = fetchNotifications();
    
    return () => {
      if (cleanup) {
        cleanup.then(unsubscribe => unsubscribe && unsubscribe());
      }
    };
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
                    disabled={isMarkingAllRead}
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!user?.uid || isMarkingAllRead) return;
                      
                      // 즉시 UI 업데이트 (낙관적 업데이트)
                      setNotifications([]);
                      setUnreadCount(0);
                      setIsNotificationOpen(false);
                      toast.success('모든 알림을 읽음 처리했습니다.');
                      
                      // 백그라운드에서 읽음 처리 (서버는 3일 후 자동 삭제)
                      setIsMarkingAllRead(true);
                      try {
                        const { NotificationManager } = await import('@/shared/components/common/CustomNotification');
                        await NotificationManager.markAllAsRead(user.uid);
                      } catch (error) {
                        console.error('❌ 백그라운드 읽음 처리 실패:', error);
                      } finally {
                        setIsMarkingAllRead(false);
                      }
                    }}
                  >
                    {isMarkingAllRead ? '처리 중...' : '모두 읽음'}
                  </Button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    알림이 없습니다
                  </div>
                ) : (
                  notifications.map((notif) => {
                    // 알림 타입 감지 (실제 표시되는 필드)
                    const requestType = (notif.metadata as Record<string, unknown>)?.centerInfo;
                    const title = notif.title as string;
                    const isLogisticsType = requestType || title?.includes('생산관리부') || title?.includes('부족분') || title?.includes('품질이슈') || title?.includes('공지사항') || title?.includes('근무계획') || title?.includes('샘플') || title?.includes('생산일정') || title?.includes('생산일보');
                    const timestamp = (notif.createdAt as { toDate?: () => Date })?.toDate ? (notif.createdAt as { toDate: () => Date }).toDate() : new Date((notif.createdAt as string | number) || Date.now());
                    const senderName = (notif.metadata as Record<string, unknown>)?.senderName || '시스템';
                    const senderAvatar = (notif.metadata as Record<string, unknown>)?.senderAvatar;
                    const productName = (notif.metadata as Record<string, unknown>)?.productName;
                    const supplier = (notif.metadata as Record<string, unknown>)?.supplier;
                    
                    // 알림 타입별 아이콘 결정
                    const getNotificationIcon = (title: string) => {
                      if (title?.includes('댓글 : 생산관리부')) return <MessageSquare className="h-3.5 w-3.5 text-blue-500" />;
                      if (title?.includes('공지사항')) return <Megaphone className="h-3.5 w-3.5 text-blue-500" />;
                      if (title?.includes('근무계획')) return <CalendarClock className="h-3.5 w-3.5 text-purple-500" />;
                      if (title?.includes('생산일정')) return <CalendarDays className="h-3.5 w-3.5 text-green-500" />;
                      if (title?.includes('생산일보')) return <FileText className="h-3.5 w-3.5 text-green-500" />;
                      if (title?.includes('생산관리부') && !title?.includes('댓글 :')) return <CalendarClock className="h-3.5 w-3.5 text-blue-500" />;
                      if (title?.includes('부족분')) return <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />;
                      if (title?.includes('품질이슈')) return <ShieldAlert className="h-3.5 w-3.5 text-red-500" />;
                      if (title?.includes('샘플')) return <TestTube className="h-3.5 w-3.5 text-purple-500" />;
                      return <Bell className="h-3.5 w-3.5 text-gray-500" />;
                    };
                    
                    return (
                      <Link
                        key={notif.id as string}
                        href={notif.link || '#'}
                        className="block px-3 py-3 border-b cursor-pointer hover:bg-accent transition-colors bg-primary/5"
                        onClick={async (e) => {
                          if (!notif.link) {
                            e.preventDefault();
                          }
                          if (user?.uid) {
                            // 즉시 UI에서 제거 (낙관적 업데이트)
                            setNotifications(prev => prev.filter(n => n.id !== notif.id));
                            setUnreadCount(prev => Math.max(0, prev - 1));
                            
                            // 백그라운드에서 읽음 처리 (서버는 3일 후 자동 삭제)
                            const { NotificationManager } = await import('@/shared/components/common/CustomNotification');
                            NotificationManager.markAsRead(user.uid, notif.id as string).catch(err => {
                              console.error('❌ 알림 읽음 처리 실패:', err);
                            });
                            
                            setIsNotificationOpen(false);
                          }
                        }}
                      >
                        {isLogisticsType ? (
                          /* 물류이동/생산요청 알림 */
                          <>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                {getNotificationIcon(title)}
                                {title}
                              </span>
                              {(requestType as string) && (
                                <span className="text-xs font-semibold text-primary">
                                  {requestType as string}
                                </span>
                              )}
                            </div>
                            <div className="flex items-start gap-3">
                              <Avatar className="h-10 w-10 flex-shrink-0">
                                <AvatarImage src={senderAvatar as string} alt={senderName as string} />
                                <AvatarFallback className="bg-muted">
                                  {(senderName as string).charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-semibold text-foreground">{senderName as string}</span>
                                  <span className="text-xs text-muted-foreground">•</span>
                                  <span className="text-sm font-medium text-foreground truncate">
                                    {(supplier as string) && `${supplier as string} `}{productName as string}
                                  </span>
                                  <span className="text-xs text-muted-foreground ml-auto">
                                    {timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">{notif.body as string}</p>
                              </div>
                            </div>
                          </>
                        ) : (
                          /* 댓글/멘션 알림 */
                          <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10 flex-shrink-0">
                              <AvatarImage src={senderAvatar as string} alt={senderName as string} />
                              <AvatarFallback className="bg-muted">
                                {(senderName as string).charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {notif.type === 'mention' ? (
                                  <MessageSquare className="h-4 w-4 text-blue-600" />
                                ) : (
                                  <User className="h-4 w-4 text-green-600" />
                                )}
                                <span className="text-sm font-semibold text-foreground truncate">{senderName as string}</span>
                                <span className="text-xs text-muted-foreground">
                                  {timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-foreground mb-1">{notif.title as string}</p>
                              <p className="text-sm text-muted-foreground line-clamp-2">{notif.body as string}</p>
                            </div>
                          </div>
                        )}
                      </Link>
                    );
                  })
                )}
              </div>
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
