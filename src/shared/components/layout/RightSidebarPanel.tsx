/**
 * 우측 사이드바 패널
 * Jandi 스타일의 업무 관련 사이드바
 */

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';
import { ROUTE_ICONS } from '@/shared/constants/navigation';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useDirectMessageStore } from '@/features/chat/store/chatStore';
import {
  Bell,
  Calendar,
  Hash,
  MessageCircle,
  CheckSquare,
  ChevronRight,
  Menu,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Badge } from '@/shared/components/ui/badge';

interface RightSidebarPanelProps {
  className?: string;
  collapsed?: boolean;
  onToggle?: () => void;
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
    id: 'todos',
    title: '할 일',
    href: '/todos',
    icon: CheckSquare,
  },
  {
    id: 'announcements',
    title: '공지사항',
    href: '/announcements',
    icon: Bell,
  },
  {
    id: 'work-schedule',
    title: '근무계획',
    href: '/work-schedule',
    icon: Calendar,
  },
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
];

export const RightSidebarPanel: React.FC<RightSidebarPanelProps> = ({
  className,
  collapsed = false,
  onToggle,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { unreadCounts: directMessageUnreadCounts } = useDirectMessageStore();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

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
    // 향후 다른 메뉴 항목의 unread count 추가 가능
    return undefined;
  };

  if (collapsed) {
    return (
      <div className={cn('w-12 border-l bg-background flex flex-col items-center py-2', className)}>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onToggle}
          title="사이드바 열기"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('w-64 border-l bg-background flex flex-col', className)}>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 border-b h-12">
        <h2 className="text-sm font-semibold text-foreground">업무</h2>
        {onToggle && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onToggle}
            title="사이드바 접기"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* 메뉴 목록 */}
      <ScrollArea className="flex-1">
        <div className="py-2">
          {rightSidebarMenuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

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
                  {(item.badge || getMenuItemBadge(item.id)) && (
                    <Badge
                      variant={active ? 'secondary' : 'default'}
                      className={cn(
                        'text-xs px-1.5 py-0.5 min-w-[20px] flex items-center justify-center',
                        !active && 'bg-primary text-primary-foreground'
                      )}
                    >
                      {item.badge || getMenuItemBadge(item.id)}
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
      </ScrollArea>
    </div>
  );
};

