import {
  LayoutDashboard,
  Factory,
  FileText,
  CalendarDays,
  CalendarClock,
  AlertTriangle,
  Shield,
  ShieldAlert,
  History,
  TestTube,
  ClipboardList,
  Calendar,
  Bell,
  MessageSquare,
  Settings,
  HelpCircle,
  User,
  Wrench,
  Megaphone,
  Palette,
  Info,
  Users,
  Package
} from 'lucide-react';

// 경로별 아이콘 매핑
export const ROUTE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  '/dashboard': LayoutDashboard,
  '/production/daily-report': FileText,
  '/production/schedule': CalendarDays,
  '/production/management': CalendarClock,
  '/production/shortage-management': AlertTriangle,
  '/production/product-management': Package,
  '/quality/issues': ShieldAlert,
  '/quality/history': History,
  '/sample-center': TestTube,
  '/sample-center/requests': ClipboardList,
  '/jig/management': Wrench,
  '/jig/master-list': ClipboardList,
  '/calendar': Calendar,
  '/work-schedule': Calendar,
  '/chat': MessageSquare,
  '/announcements': Megaphone,
  '/notifications': Bell,
  '/messages': MessageSquare,
  '/settings': Settings,
  '/help': HelpCircle,
  '/profile': User,
};

// 경로별 페이지 제목 매핑
export const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': '대시보드',
  '/production/daily-report': '생산일보',
  '/production/schedule': '생산일정',
  '/production/management': '생산관리부',
  '/production/shortage-management': '부족분관리',
  '/production/product-management': '종합관리테이블',
  '/quality/issues': '품질 이슈',
  '/quality/history': '품질 종합이력',
  '/sample-center': '샘플센터',
  '/sample-center/requests': '샘플 요청목록',
  '/jig/management': '지그 요청/관리',
  '/jig/master-list': '지그목록표',
  '/calendar': '일정 관리',
  '/work-schedule': '근무계획',
  '/chat': '메시지',
  '/announcements': '공지사항',
  '/notifications': '알림',
  '/messages': '메시지',
  '/settings': '설정',
  '/help': '도움말',
  '/profile': '프로필',
};

// 경로 정규화 함수 (쿼리 파라미터 및 끝 슬래시 제거)
const normalizePath = (pathname: string): string => {
  // 쿼리 파라미터 제거
  const pathWithoutQuery = pathname.split('?')[0];
  // 끝 슬래시 제거 (단, 루트 경로 '/'는 유지)
  const normalized = pathWithoutQuery === '/' ? '/' : pathWithoutQuery.replace(/\/$/, '');
  return normalized;
};

// 경로에서 아이콘을 가져오는 함수
export const getRouteIcon = (pathname: string): React.ComponentType<{ className?: string }> => {
  // 경로 정규화
  const normalizedPath = normalizePath(pathname);
  
  // 정확히 일치하는 경로가 있으면 반환
  if (ROUTE_ICONS[normalizedPath]) {
    return ROUTE_ICONS[normalizedPath];
  }

  // 부분 매칭 (상위 경로 확인)
  if (normalizedPath.startsWith('/production/daily-report')) {
    return FileText;
  }
  if (normalizedPath.startsWith('/production')) {
    return Factory;
  }
  if (normalizedPath.startsWith('/quality')) {
    return Shield;
  }
  if (normalizedPath.startsWith('/sample-center')) {
    return TestTube;
  }
  if (normalizedPath.startsWith('/jig')) {
    return Wrench;
  }

  return LayoutDashboard;
};

// 경로에서 페이지 제목을 가져오는 함수
export const getRouteTitle = (pathname: string): string => {
  // 경로 정규화
  const normalizedPath = normalizePath(pathname);
  
  // 정확히 일치하는 경로가 있으면 반환
  if (ROUTE_TITLES[normalizedPath]) {
    return ROUTE_TITLES[normalizedPath];
  }

  // 부분 매칭 (상위 경로 확인)
  if (normalizedPath.startsWith('/production/daily-report')) {
    return '생산일보';
  }
  if (normalizedPath.startsWith('/production')) {
    return '생산센터';
  }
  if (normalizedPath.startsWith('/quality')) {
    return '품질관리';
  }
  if (normalizedPath.startsWith('/sample-center')) {
    return '샘플센터';
  }
  if (normalizedPath.startsWith('/jig')) {
    return '지그센터';
  }

  return '대시보드';
};

