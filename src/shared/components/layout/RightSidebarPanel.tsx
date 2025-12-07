/**
 * 우측 사이드바 패널
 * 업무관리 위주의 메뉴와 위젯을 표시
 * 탭으로 빠른 작업과 메뉴를 구분
 */

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';
import { useDirectMessageStore } from '@/features/chat/store/chatStore';
import {
  Calendar,
  Hash,
  MessageCircle,
  ChevronRight,
  StickyNote,
  CheckSquare,
  Menu,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs';
import { PostItWidget } from './widgets/PostItWidget';
import { isElectron } from '@/shared/utils/platform/platform';
import { TodoWidget } from './widgets/TodoWidget';

interface RightSidebarPanelProps {
  className?: string;
}

interface RightSidebarMenuItem {
  id: string;
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

// 우측 사이드바 메뉴 항목
const rightSidebarMenuItems: RightSidebarMenuItem[] = [
  {
    id: 'workspace',
    title: '워크스페이스',
    href: '/workspace',
    icon: Hash,
  },
  {
    id: 'direct-message',
    title: '다이렉트 메시지',
    href: '/direct-message',
    icon: MessageCircle,
  },
  {
    id: 'work-schedule',
    title: '근무계획',
    href: '/work-schedule',
    icon: Calendar,
  },
];

export const RightSidebarPanel: React.FC<RightSidebarPanelProps> = ({
  className,
}) => {
  // Electron 환경 확인
  const isElectronEnv = isElectron();
  
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCounts: directMessageUnreadCounts } = useDirectMessageStore();
  const [hoveredItem, setHoveredItem] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'quick' | 'menu'>('menu');

  // 다이렉트 메시지 읽지 않은 메시지 수 계산
  const totalDirectMessageUnread = React.useMemo(() => {
    return Object.values(directMessageUnreadCounts).reduce((sum, count) => sum + count, 0);
  }, [directMessageUnreadCounts]);

  const handleItemClick = (href: string) => {
    navigate(href);
  };

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  // 메뉴 항목에 배지 추가
  const getMenuItemBadge = (itemId: string): number | undefined => {
    if (itemId === 'direct-message' && totalDirectMessageUnread > 0) {
      return totalDirectMessageUnread;
    }
    return undefined;
  };

  return (
    <div className={cn('w-64 border-l bg-background flex flex-col', className)}>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 border-b h-12 flex-shrink-0">
        <h2 className="text-sm font-semibold text-foreground">업무</h2>
      </div>

      {/* 탭 */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'quick' | 'menu')} className="flex-1 flex flex-col min-h-0">
        <div className="px-2 pt-2 pb-0 flex-shrink-0">
          <TabsList className="grid w-full grid-cols-2 h-9">
            <TabsTrigger value="menu" className="text-xs flex items-center justify-center gap-1.5 h-full">
              <Menu className="h-3 w-3 flex-shrink-0" />
              <span>메뉴</span>
            </TabsTrigger>
            <TabsTrigger value="quick" className="text-xs flex items-center justify-center gap-1.5 h-full">
              <StickyNote className="h-3 w-3 flex-shrink-0" />
              <span>빠른 작업</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 탭 콘텐츠 영역 */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {activeTab === 'quick' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* 포스트잇 섹션 */}
              <div className="flex-1 flex flex-col min-h-0 border-b" style={{ minHeight: '200px' }}>
                <div className="px-3 py-2 border-b bg-muted/30 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <StickyNote className="h-3 w-3 text-muted-foreground" />
                    <h3 className="text-xs font-medium text-muted-foreground">포스트잇</h3>
                  </div>
                </div>
                {isElectronEnv && (
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <PostItWidget />
                  </div>
                )}
                {!isElectronEnv && (
                  <div className="flex-1 min-h-0 overflow-hidden flex items-center justify-center">
                    <p className="text-xs text-muted-foreground">포스트잇은 Electron 환경에서만 사용 가능합니다.</p>
                  </div>
                )}
              </div>

              {/* 할 일 섹션 */}
              <div className="flex-1 flex flex-col min-h-0" style={{ minHeight: '250px' }}>
                <div className="px-3 py-2 border-b bg-muted/30 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-3 w-3 text-muted-foreground" />
                    <h3 className="text-xs font-medium text-muted-foreground">할 일</h3>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <TodoWidget />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'menu' && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="w-full pb-2 pt-2">
                {rightSidebarMenuItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const badge = getMenuItemBadge(item.id);

                  return (
                    <div
                      key={item.id}
                      className="px-2"
                      onMouseEnter={() => setHoveredItem(item.id)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <button
                        onClick={() => handleItemClick(item.href)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors relative group',
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-4 w-4 flex-shrink-0',
                            active ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-accent-foreground'
                          )}
                        />
                        <span className="flex-1 text-left truncate">{item.title}</span>
                        {badge && (
                          <Badge
                            variant={active ? 'secondary' : 'default'}
                            className={cn(
                              'text-xs px-1.5 py-0.5 min-w-[20px] flex items-center justify-center',
                              !active && 'bg-primary text-primary-foreground'
                            )}
                          >
                            {badge}
                          </Badge>
                        )}
                        {hoveredItem === item.id && !active && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
};
