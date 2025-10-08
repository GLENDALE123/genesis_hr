'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { cn } from '@/shared/lib/utils';
import {
  Users,
  FileText,
  BarChart3,
  Settings,
  Calendar,
  MessageSquare,
  Bell,
  HelpCircle,
  LayoutDashboard,
  UserCheck,
  CreditCard,
  Building,
  PieChart,
  Factory,
  CalendarDays,
  ClipboardList,
  AlertTriangle
} from 'lucide-react';

interface AppSidebarProps {
  className?: string;
  collapsed?: boolean;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  children?: NavItem[];
}

// 메인 메뉴 (큰 메뉴들)
const mainNavigationItems: NavItem[] = [
  {
    title: '대시보드',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: '생산센터',
    href: '/production/daily-report',
    icon: Factory,
    children: [
      { title: '생산일보', href: '/production/daily-report', icon: FileText },
      { title: '생산일정', href: '/production/schedule', icon: CalendarDays },
      { title: '생산관리부', href: '/production/management', icon: ClipboardList },
      { title: '부족분관리', href: '/production/shortage', icon: AlertTriangle },
    ],
  },
  {
    title: '직원 관리',
    href: '/employees',
    icon: Users,
    children: [
      { title: '직원 목록', href: '/employees', icon: UserCheck },
      { title: '부서 관리', href: '/employees/departments', icon: Building },
      { title: '직급 관리', href: '/employees/positions', icon: UserCheck },
    ],
  },
  {
    title: '급여 관리',
    href: '/payroll',
    icon: CreditCard,
    children: [
      { title: '급여 계산', href: '/payroll/calculate', icon: PieChart },
      { title: '급여 내역', href: '/payroll/history', icon: FileText },
      { title: '세금 관리', href: '/payroll/taxes', icon: CreditCard },
    ],
  },
  {
    title: '보고서',
    href: '/reports',
    icon: BarChart3,
    children: [
      { title: '인사 보고서', href: '/reports/hr', icon: FileText },
      { title: '급여 보고서', href: '/reports/payroll', icon: BarChart3 },
      { title: '통계 분석', href: '/reports/analytics', icon: PieChart },
    ],
  },
];

// 서브 메뉴 (작은 메뉴들)
const subNavigationItems: NavItem[] = [
  {
    title: '일정 관리',
    href: '/calendar',
    icon: Calendar,
  },
  {
    title: '알림',
    href: '/notifications',
    icon: Bell,
    badge: '3',
  },
  {
    title: '메시지',
    href: '/messages',
    icon: MessageSquare,
    badge: '12',
  },
];

export const AppSidebar: React.FC<AppSidebarProps> = ({ 
  className,
  collapsed = false
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isHovered, setIsHovered] = React.useState(false);
  
  // 데스크톱에서만 호버 효과 적용 (1024px 이상)
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // 실제 표시 상태: 데스크톱에서 접혀있을 때 호버하면 펼침
  const isExpanded = isDesktop && collapsed ? isHovered : !collapsed;

  const isActive = (href: string, exact = false) => {
    if (exact) {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  const renderNavItem = (item: NavItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    
    // 부모 메뉴의 경우: 자식 메뉴 중 하나가 활성화되면 부모도 활성화
    let active = false;
    if (level === 0 && hasChildren) {
      // 자식 메뉴 중 현재 경로와 일치하는 것이 있는지 확인
      const childMatch = item.children?.some(child => 
        pathname === child.href || pathname.startsWith(child.href + '/')
      );
      if (childMatch) {
        active = true; // 자식이 활성화되면 부모도 활성화
      } else {
        active = isActive(item.href); // 그렇지 않으면 기존 로직 사용
      }
    } else {
      // 자식 메뉴나 자식이 없는 메뉴의 경우
      // 정확한 매칭 또는 하위 경로 매칭 모두 허용
      active = pathname === item.href || pathname.startsWith(item.href + '/');
    }

    const navItemContent = (
      <div
        className={cn(
          "flex items-center group cursor-pointer rounded-md text-sm font-medium transition-colors",
          // 태블릿 최적화: 터치 영역 최소 44px 보장
          "min-h-[44px] px-3 py-3 md:px-3 md:py-2",
          level > 0 && "ml-6",
          active
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          // 접힌 상태에서는 정사각형 터치 영역
          !isExpanded && "justify-center px-2 py-3 md:px-2 md:py-2 min-w-[44px] md:min-w-[40px]"
        )}
        onClick={() => handleNavigation(item.href)}
      >
        <div className="flex items-center gap-3">
          <item.icon className={cn(
            // 태블릿에서 아이콘 크기 증가 (모바일: 5x5, 데스크톱: 4x4)
            "h-5 w-5 md:h-4 md:w-4 flex-shrink-0",
            active && "text-accent-foreground"
          )} />
          {isExpanded && (
            <>
              <span className="truncate">{item.title}</span>
              {item.badge && (
                <Badge variant="secondary" className="ml-auto">
                  {item.badge}
                </Badge>
              )}
            </>
          )}
        </div>
      </div>
    );

    return (
      <div key={item.title}>
        {!isExpanded ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {navItemContent}
              </TooltipTrigger>
              <TooltipContent side="right" className="ml-2">
                <p>{item.title}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          navItemContent
        )}
        
        {/* 서브메뉴 항상 표시 (접힌 상태가 아닐 때만) */}
        {isExpanded && hasChildren && (
          <div className="mt-1 space-y-1 relative">
            {/* 서브메뉴 왼쪽 세로선 */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            {item.children?.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className={cn(
        "flex h-full flex-col border-r transition-all duration-300 flex-shrink-0",
        // 태블릿에서 사이드바 너비 조정 (모바일: 더 넓게, 데스크톱: 기존 유지)
        isExpanded ? "w-72 md:w-64" : "w-16 md:w-16",
        className
      )}
      style={{
        backgroundColor: 'hsl(var(--sidebar-background))',
        color: 'hsl(var(--sidebar-foreground))',
      }}
      onMouseEnter={() => isDesktop && collapsed && setIsHovered(true)}
      onMouseLeave={() => isDesktop && collapsed && setIsHovered(false)}
    >
      {/* Sidebar Header */}
      <div className="flex h-16 items-center justify-center border-b px-4">
        {isExpanded && (
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">HS</span>
            </div>
            <span className="font-semibold">HS Next</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1">
          {/* 메인 메뉴 섹션 */}
          <div className="space-y-1 px-3">
            {mainNavigationItems.map(item => renderNavItem(item))}
          </div>
          
          {/* 세로 구분선 */}
          {isExpanded && (
            <div className="flex items-center px-3">
              <div className="h-px bg-border flex-1" />
            </div>
          )}
          
          {/* 서브 메뉴 섹션 */}
          <div className="space-y-1 px-3">
            {subNavigationItems.map(item => renderNavItem(item))}
          </div>
        </nav>
      </ScrollArea>

      {/* Sidebar Footer */}
      <div className="border-t p-4">
        <div className="space-y-2">
          {isExpanded && (
            <>
              <Button
                variant="ghost"
                className="w-full justify-start min-h-[44px] md:min-h-[40px]"
                onClick={() => handleNavigation('/settings')}
              >
                <Settings className="mr-2 h-5 w-5 md:h-4 md:w-4" />
                설정
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start min-h-[44px] md:min-h-[40px]"
                onClick={() => handleNavigation('/help')}
              >
                <HelpCircle className="mr-2 h-5 w-5 md:h-4 md:w-4" />
                도움말
              </Button>
            </>
          )}
          {!isExpanded && (
            <div className="flex flex-col gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="min-h-[44px] min-w-[44px] md:min-h-[40px] md:min-w-[40px]"
                      onClick={() => handleNavigation('/settings')}
                    >
                      <Settings className="h-5 w-5 md:h-4 md:w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="ml-2">
                    <p>설정</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="min-h-[44px] min-w-[44px] md:min-h-[40px] md:min-w-[40px]"
                      onClick={() => handleNavigation('/help')}
                    >
                      <HelpCircle className="h-5 w-5 md:h-4 md:w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="ml-2">
                    <p>도움말</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
