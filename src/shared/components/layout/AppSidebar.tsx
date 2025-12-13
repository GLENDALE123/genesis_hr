import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Badge } from '@/shared/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { cn } from '@/shared/lib/utils';
import { ROUTE_ICONS } from '@/shared/constants/navigation';
import { useGlobalStore } from '@/shared/store/globalStore';
import {
  Factory,
  TestTube,
  Shield,
  LayoutDashboard,
  Settings,
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
      { title: '종합관리테이블', href: '/production/product-management', icon: ROUTE_ICONS['/production/product-management'] },
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
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = React.useState(false);
  const { updatePreferences } = useGlobalStore();
  
  // 낙관적 업데이트: 클릭 시 즉시 하이라이트 변경
  const [optimisticPath, setOptimisticPath] = React.useState<string | null>(null);
  
  // pathname 변경 시 낙관적 상태 초기화
  React.useEffect(() => {
    setOptimisticPath(null);
  }, [pathname]);
  
  // 모바일/태블릿/데스크톱 구분
  const [isMobile, setIsMobile] = React.useState(false);
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768); // 모바일
      setIsDesktop(width >= 1440); // 데스크톱 (use-device와 정합)
    };
    
    checkScreenSize();
    
    // 디바운싱된 resize 이벤트 리스너 (150ms)
    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(checkScreenSize, 150);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  // 모바일에서는 항상 확장된 상태로 표시, 데스크톱에서는 collapsed 상태에 따라
  const isExpanded = isMobile ? true : (collapsed ? isHovered : !collapsed);

  // 성능 최적화: isActive 함수 (낙관적 업데이트 포함)
  const checkIsActive = React.useCallback((href: string) => {
    // 낙관적 업데이트: 클릭한 경로는 즉시 활성화
    if (optimisticPath === href || optimisticPath?.startsWith(href + '/')) {
      return true;
    }
    // 실제 pathname 확인
    return pathname === href || pathname.startsWith(href + '/');
  }, [pathname, optimisticPath]);

  // 성능 최적화: 활성 경로를 미리 계산 (메모이제이션)
  const activePathMap = React.useMemo(() => {
    const map = new Map<string, boolean>();
    
    // 메뉴 항목들의 활성 상태를 미리 계산
    const checkItems = (items: NavItem[]) => {
      items.forEach(item => {
        map.set(item.href, checkIsActive(item.href));
        if (item.children) {
          checkItems(item.children);
        }
      });
    };
    
    checkItems(mainNavigationItems);
    checkItems(subNavigationItems);
    map.set('/settings', checkIsActive('/settings'));
    
    return map;
  }, [checkIsActive]);

  // 클릭 핸들러 (낙관적 업데이트 적용)
  const handleLinkClick = React.useCallback((href: string, event: React.MouseEvent) => {
    const isTablet = !isMobile && !isDesktop;
    
    // 항상 기본 동작 방지하고 router.push로 명시적 네비게이션
    event.preventDefault();
    event.stopPropagation();
    
    // 같은 페이지 클릭 시 태블릿에서는 사이드바 접기만 실행
    if (pathname === href) {
      if (isTablet && !onMobileClose) {
        updatePreferences({ sidebarCollapsed: true });
      }
      // 모바일에서 같은 페이지 클릭 시 사이드바만 닫기
      if (onMobileClose && isMobile) {
        onMobileClose();
      }
      return;
    }
    
    // 낙관적 업데이트: 즉시 하이라이트 변경
    setOptimisticPath(href);
    
    // 모바일: 사이드바 먼저 닫기
    if (onMobileClose && isMobile) {
      onMobileClose();
      setTimeout(() => {
        navigate(href);
      }, 50);
    } else if (onMobileClose && !isMobile) {
      // 태블릿/데스크톱: 사이드바 닫기와 네비게이션 동시 처리
      requestAnimationFrame(() => {
        onMobileClose();
        navigate(href);
      });
    } else if (isTablet) {
      // 태블릿: 네비게이션 후 사이드바 접기
      navigate(href);
      setTimeout(() => {
        updatePreferences({ sidebarCollapsed: true });
      }, 100);
    } else {
      // 데스크톱: 네비게이션만 처리
      navigate(href);
    }
  }, [pathname, isMobile, isDesktop, onMobileClose, navigate, updatePreferences]);

  // 성능 최적화: 자식 메뉴 확인 함수 메모이제이션
  const checkChildActive = React.useCallback((children: NavItem[] | undefined) => {
    if (!children) return false;
    return children.some(child => {
      return pathname === child.href || pathname.startsWith(child.href + '/');
    });
  }, [pathname]);

  const renderNavItem = React.useCallback((item: NavItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    
    // 성능 최적화: 활성 상태는 미리 계산된 맵에서 조회
    let active = activePathMap.get(item.href) || false;
    
    // 부모 메뉴의 경우: 자식 메뉴 중 하나가 활성화되면 부모도 활성화
    if (level === 0 && hasChildren && !active) {
      active = checkChildActive(item.children);
    }

    const navItemContent = (
      <div
        onClick={(event) => handleLinkClick(item.href, event)}
        className={cn(
          "flex items-center group cursor-pointer rounded-md text-sm font-medium transition-colors relative z-20",
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
        style={{
          pointerEvents: 'auto',
          WebkitAppRegion: 'no-drag',
          cursor: 'pointer',
        } as React.CSSProperties}
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
      </div>
    );

    return (
      <div key={item.title}>
        {!isExpanded ? (
          <Tooltip>
            <TooltipTrigger asChild>
              {navItemContent}
            </TooltipTrigger>
            <TooltipContent side="right" className="ml-2">
              <p>{item.title}</p>
            </TooltipContent>
          </Tooltip>
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
  }, [activePathMap, checkChildActive, handleLinkClick, isExpanded]);

  // 모바일에서는 Sheet 내에서 확장된 상태로 표시

  return (
    <TooltipProvider delayDuration={200}>
      <div 
        className={cn(
          "flex h-full flex-col border-r transition-all duration-300 flex-shrink-0 overflow-x-hidden overflow-y-hidden relative z-10",
          // 접힘 시 아이콘 폭 유지 (태블릿/데스크톱 동일 정책)
          isExpanded ? "w-56 md:w-52" : "w-16 md:w-16",
          className
        )}
        style={{
          backgroundColor: 'hsl(var(--sidebar-background))',
          color: 'hsl(var(--sidebar-foreground))',
          pointerEvents: 'auto',
          WebkitAppRegion: 'no-drag', // Electron: 사이드바는 드래그 불가능하도록 설정
        } as React.CSSProperties}
        onMouseEnter={() => isDesktop && collapsed && setIsHovered(true)}
        onMouseLeave={() => isDesktop && collapsed && setIsHovered(false)}
      >
      {/* Sidebar Header */}
      <div className="flex h-12 items-center justify-center border-b px-2">
        {isExpanded ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img 
                src="/tms-logo.png" 
                alt="TMS 로고" 
                width={28} 
                height={28}
                className="object-contain"
              />
            </div>
            <span className="font-semibold whitespace-nowrap overflow-hidden text-ellipsis text-xl">통합관리시스템</span>
          </div>
        ) : (
          <div className="h-7 w-7 rounded flex items-center justify-center overflow-hidden">
            <img 
              src="/tms-logo.png" 
              alt="TMS 로고" 
              width={28} 
              height={28}
              className="object-contain"
            />
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
            <div
              onClick={(event) => handleLinkClick('/settings', event)}
              className={cn(
                "flex items-center group cursor-pointer rounded-md text-sm font-medium transition-colors text-left relative z-20",
                "min-h-[44px] px-2 py-2 md:px-2 md:py-2 w-full max-w-full overflow-hidden",
                checkIsActive('/settings')
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              style={{
                pointerEvents: 'auto',
                WebkitAppRegion: 'no-drag',
                cursor: 'pointer',
              } as React.CSSProperties}
            >
              <Settings className="mr-2 h-5 w-5 md:h-4 md:w-4 flex-shrink-0" />
              <span className="truncate whitespace-nowrap">설정</span>
            </div>
          )}
          {!isExpanded && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  onClick={(event) => handleLinkClick('/settings', event)}
                  className={cn(
                    "flex items-center justify-center cursor-pointer rounded-md text-sm font-medium transition-colors relative z-20",
                    "min-h-[44px] min-w-[44px] md:min-h-[40px] md:min-w-[40px]",
                    checkIsActive('/settings')
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  style={{
                    pointerEvents: 'auto',
                    WebkitAppRegion: 'no-drag',
                    cursor: 'pointer',
                  } as React.CSSProperties}
                >
                  <Settings className="h-5 w-5 md:h-4 md:w-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="ml-2">
                <p>설정</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
};

AppSidebarComponent.displayName = 'AppSidebar';

// AppSidebar는 pathname 변경에 따라 리렌더링되어야 하므로
// React.memo를 사용하되 pathname은 props가 아니므로 내부에서 처리
export const AppSidebar = React.memo(AppSidebarComponent, (prevProps, nextProps) => {
  // collapsed와 className, onMobileClose만 비교
  return prevProps.collapsed === nextProps.collapsed &&
         prevProps.className === nextProps.className &&
         prevProps.onMobileClose === nextProps.onMobileClose;
});
