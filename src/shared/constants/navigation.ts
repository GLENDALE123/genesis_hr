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
  Megaphone
} from 'lucide-react';

// 경로별 아이콘 매핑
export const ROUTE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  '/dashboard': LayoutDashboard,
  '/production/daily-report': FileText,
  '/production/schedule': CalendarDays,
  '/production/management': CalendarClock,
  '/production/shortage-management': AlertTriangle,
  '/quality/issues': ShieldAlert,
  '/quality/history': History,
  '/sample-center': TestTube,
  '/sample-center/requests': ClipboardList,
  '/jig/management': Wrench,
  '/jig/master-list': ClipboardList,
  '/calendar': Calendar,
  '/work-schedule': Calendar,
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
  '/quality/issues': '품질 이슈',
  '/quality/history': '품질 종합이력',
  '/sample-center': '샘플센터',
  '/sample-center/requests': '샘플 요청목록',
  '/jig/management': '지그 요청/관리',
  '/jig/master-list': '지그목록표',
  '/calendar': '일정 관리',
  '/work-schedule': '근무계획',
  '/announcements': '공지사항',
  '/notifications': '알림',
  '/messages': '메시지',
  '/settings': '설정',
  '/help': '도움말',
  '/profile': '프로필',
};

// 경로에서 아이콘을 가져오는 함수
export const getRouteIcon = (pathname: string): React.ComponentType<{ className?: string }> => {
  // 정확히 일치하는 경로가 있으면 반환
  if (ROUTE_ICONS[pathname]) {
    return ROUTE_ICONS[pathname];
  }

  // 부분 매칭 (상위 경로 확인)
  if (pathname.startsWith('/production')) {
    return Factory;
  }
  if (pathname.startsWith('/quality')) {
    return Shield;
  }
  if (pathname.startsWith('/sample-center')) {
    return TestTube;
  }
  if (pathname.startsWith('/jig')) {
    return Wrench;
  }

  return LayoutDashboard;
};

// 경로에서 페이지 제목을 가져오는 함수
export const getRouteTitle = (pathname: string): string => {
  // 정확히 일치하는 경로가 있으면 반환
  if (ROUTE_TITLES[pathname]) {
    return ROUTE_TITLES[pathname];
  }

  // 부분 매칭 (상위 경로 확인)
  if (pathname.startsWith('/production')) {
    return '생산센터';
  }
  if (pathname.startsWith('/quality')) {
    return '품질관리';
  }
  if (pathname.startsWith('/sample-center')) {
    return '샘플센터';
  }
  if (pathname.startsWith('/jig')) {
    return '지그센터';
  }

  return '대시보드';
};

