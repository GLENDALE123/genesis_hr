'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { cn } from '@/shared/lib/utils';
import Link from 'next/link';
import { ROUTE_ICONS } from '@/shared/constants/navigation';
import { useGlobalStore } from '@/app/store';
import {
  Factory,
  TestTube,
  Shield,
  LayoutDashboard,
  Settings,
  HelpCircle,
  Wrench
} from 'lucide-react';

interface AppSidebarProps {
  className?: string;
  collapsed?: boolean;
  onMobileClose?: () => void;
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
      { title: '생산일보', href: '/production/daily-report', icon: ROUTE_ICONS['/production/daily-report'] },
      { title: '생산일정', href: '/production/schedule', icon: ROUTE_ICONS['/production/schedule'] },
      { title: '생산관리부', href: '/production/management', icon: ROUTE_ICONS['/production/management'] },
      { title: '부족분관리', href: '/production/shortage-management', icon: ROUTE_ICONS['/production/shortage-management'] },
    ],
  },
  {
    title: '품질센터',
    href: '/quality/issues',
    icon: Shield,
    children: [
      { title: '품질이슈', href: '/quality/issues', icon: ROUTE_ICONS['/quality/issues'] },
      { title: '품질 종합 이력', href: '/quality/history', icon: ROUTE_ICONS['/quality/history'] },
    ],
  },
  {
    title: '샘플센터',
    href: '/sample-center',
    icon: TestTube,
    children: [
      { title: '요청목록', href: '/sample-center/requests', icon: ROUTE_ICONS['/sample-center/requests'] },
    ],
  },
  {
    title: '지그센터',
    href: '/jig/management',
    icon: Wrench,
    children: [
      { title: '지그 요청/관리', href: '/jig/management', icon: ROUTE_ICONS['/jig/management'] },
      { title: '지그목록표', href: '/jig/master-list', icon: ROUTE_ICONS['/jig/master-list'] },
    ],
  },
];

// 서브 메뉴 (작은 메뉴들)
const subNavigationItems: NavItem[] = [
  {
    title: '공지사항',
    href: '/announcements',
    icon: ROUTE_ICONS['/announcements'],
  },
  {
    title: '근무계획',
    href: '/work-schedule',
    icon: ROUTE_ICONS['/work-schedule'],
  },
];

const AppSidebarComponent = ({
  className,
  collapsed = false,
  onMobileClose
}: {
  className: string;
  collapsed?: boolean;
  onMobileClose?: () => void;
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isHovered, setIsHovered] = React.useState(false);
  const { updatePreferences } = useGlobalStore();
  
  // 모바일/태블릿/데스크톱 구분
  const [isMobile, setIsMobile] = React.useState(false);
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768); // 모바일
      setIsDesktop(width >= 1280); // 데스크톱 (use-device와 정합)
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // 모바일에서는 항상 확장된 상태로 표시, 데스크톱에서는 collapsed 상태에 따라
  const isExpanded = isMobile ? true : (collapsed ? isHovered : !collapsed);

  const isActive = React.useCallback((href: string, exact = false) => {
    if (exact) {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + '/');
  }, [pathname]);



  // 클릭/탭 네비게이션 핸들러
  const handleClick = React.useCallback((href: string, event?: React.MouseEvent) => {
    // 이벤트 전파 중지
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const isTablet = !isMobile && !isDesktop;
    
    // 같은 페이지여도 태블릿에서는 사이드바 접기만 실행
    if (pathname === href) {
      if (isTablet && !onMobileClose) {
        // 태블릿에서 같은 메뉴를 다시 선택하면 사이드바 접기
        updatePreferences({ sidebarCollapsed: true });
      }
      return;
    }
    
    // 모바일 Sheet에서 메뉴 클릭 후 사이드바 닫기 (페이지 이동 전에)
    if (onMobileClose) {
      onMobileClose();
      setTimeout(() => {
        router.push(href);
      }, 200);
    } else if (isTablet) {
      // 태블릿: 먼저 네비게이션 후 사이드바 접기
      router.push(href);
      // 네비게이션 후 약간의 딜레이 후 사이드바 접기 (애니메이션 고려)
      setTimeout(() => {
        updatePreferences({ sidebarCollapsed: true });
      }, 100);
    } else {
      // 데스크톱
      router.push(href);
    }
  }, [pathname, router, isMobile, isDesktop, onMobileClose, updatePreferences]);

  const renderNavItem = React.useCallback((item: NavItem, level = 0) => {
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
      <button
        onClick={(event) => handleClick(item.href, event)}
        className={cn(
          "flex items-center group cursor-pointer rounded-md text-sm font-medium transition-colors",
          // 태블릿 최적화: 터치 영역 최소 44px 보장
          "min-h-[44px]",
          // 접힌 상태와 확장 상태에 따른 스타일 분기
          isExpanded 
            ? "px-2 py-2 md:px-2 md:py-2 text-left" 
            : "justify-center px-1 py-2 md:px-1 md:py-2 min-w-[44px] md:min-w-[40px]",
          // 서브메뉴는 버튼 너비를 줄임
          level === 0 ? "w-full max-w-full" : "w-[calc(100%-1.5rem)] ml-6 max-w-full",
          active
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        <div className={cn(
          "flex items-center min-w-0 overflow-hidden",
          isExpanded ? "gap-3 w-full" : ""
        )}>
          <item.icon className={cn(
            // 태블릿에서 아이콘 크기 증가 (모바일: 5x5, 데스크톱: 4x4)
            "h-5 w-5 md:h-4 md:w-4 flex-shrink-0",
            active && "text-primary-foreground"
          )} />
          {isExpanded && (
            <>
              <span className="truncate min-w-0 flex-1 whitespace-nowrap">{item.title}</span>
              {item.badge && (
                <Badge className="ml-auto bg-secondary text-secondary-foreground flex-shrink-0">
                  {item.badge}
                </Badge>
              )}
            </>
          )}
        </div>
      </button>
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
  }, [isActive, handleClick, isExpanded, pathname]);

  // 모바일에서는 Sheet 내에서 확장된 상태로 표시

  return (
    <div 
      className={cn(
        "flex h-full flex-col border-r transition-all duration-300 flex-shrink-0 overflow-x-hidden overflow-y-hidden",
        // 접힘 시 아이콘 폭 유지 (태블릿/데스크톱 동일 정책)
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
      <div className="flex h-16 items-center justify-center border-b px-3">
        {isExpanded ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">TMS</span>
            </div>
            <span className="font-semibold whitespace-nowrap overflow-hidden text-ellipsis">통합관리시스템</span>
          </div>
        ) : (
          <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">TMS</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        <div className="space-y-1">
          {/* 메인 메뉴 섹션 */}
          <div className="space-y-1 px-2">
            {mainNavigationItems.map(item => renderNavItem(item))}
          </div>
          
          {/* 세로 구분선 */}
          {isExpanded && (
            <div className="flex items-center px-2">
              <div className="h-px bg-border flex-1" />
            </div>
          )}
          
          {/* 서브 메뉴 섹션 */}
          <div className="space-y-1 px-2">
            {subNavigationItems.map(item => renderNavItem(item))}
          </div>
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="border-t p-3">
        <div className="space-y-2">
          {isExpanded && (
            <>
              <button
                onClick={(event) => handleClick('/settings', event)}
                className={cn(
                  "flex items-center group cursor-pointer rounded-md text-sm font-medium transition-colors text-left",
                  "min-h-[44px] px-2 py-2 md:px-2 md:py-2 w-full max-w-full overflow-hidden",
                  isActive('/settings')
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Settings className="mr-2 h-5 w-5 md:h-4 md:w-4 flex-shrink-0" />
                <span className="truncate whitespace-nowrap">설정</span>
              </button>
              <button
                onClick={(event) => handleClick('/help', event)}
                className={cn(
                  "flex items-center group cursor-pointer rounded-md text-sm font-medium transition-colors text-left",
                  "min-h-[44px] px-2 py-2 md:px-2 md:py-2 w-full max-w-full overflow-hidden",
                  isActive('/help')
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <HelpCircle className="mr-2 h-5 w-5 md:h-4 md:w-4 flex-shrink-0" />
                <span className="truncate whitespace-nowrap">도움말</span>
              </button>
            </>
          )}
          {!isExpanded && (
            <div className="flex flex-col gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(event) => handleClick('/settings', event)}
                      className={cn(
                        "flex items-center justify-center cursor-pointer rounded-md text-sm font-medium transition-colors",
                        "min-h-[44px] min-w-[44px] md:min-h-[40px] md:min-w-[40px]",
                        isActive('/settings')
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Settings className="h-5 w-5 md:h-4 md:w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="ml-2">
                    <p>설정</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(event) => handleClick('/help', event)}
                      className={cn(
                        "flex items-center justify-center cursor-pointer rounded-md text-sm font-medium transition-colors",
                        "min-h-[44px] min-w-[44px] md:min-h-[40px] md:min-w-[40px]",
                        isActive('/help')
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <HelpCircle className="h-5 w-5 md:h-4 md:w-4" />
                    </button>
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

AppSidebarComponent.displayName = 'AppSidebar';

export const AppSidebar = React.memo(AppSidebarComponent);
