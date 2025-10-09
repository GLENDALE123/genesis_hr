'use client';

import React from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
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

interface AppHeaderProps {
  className?: string;
  onMenuClick?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ 
  className,
  onMenuClick 
}) => {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { dummyRole, setDummyRole, clearDummyRole } = useDevStore();

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
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              3
            </Badge>
          </Button>

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
              <DropdownMenuItem onClick={() => router.push('/profile')}>
                <User className="mr-2 h-4 w-4" />
                <span>프로필</span>
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
