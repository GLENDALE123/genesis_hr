'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
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
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  UserCheck,
  CreditCard,
  Building,
  PieChart
} from 'lucide-react';

interface AppSidebarProps {
  className?: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  children?: NavItem[];
}

const navigationItems: NavItem[] = [
  {
    title: '대시보드',
    href: '/dashboard',
    icon: LayoutDashboard,
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
  collapsed = false,
  onToggle 
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    );
  };

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  const renderNavItem = (item: NavItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.title);
    const active = isActive(item.href);

    return (
      <div key={item.title}>
        <div
          className={cn(
            "flex items-center justify-between group cursor-pointer rounded-md px-3 py-2 text-sm font-medium transition-colors",
            level > 0 && "ml-4",
            active
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            collapsed && "justify-center px-2"
          )}
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.title);
            } else {
              handleNavigation(item.href);
            }
          }}
        >
          <div className="flex items-center gap-3">
            <item.icon className={cn(
              "h-4 w-4 flex-shrink-0",
              active && "text-accent-foreground"
            )} />
            {!collapsed && (
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
          {!collapsed && hasChildren && (
            <ChevronRight className={cn(
              "h-4 w-4 transition-transform",
              isExpanded && "rotate-90"
            )} />
          )}
        </div>
        
        {!collapsed && hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children?.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn(
      "flex h-full flex-col border-r bg-background transition-all duration-300",
      collapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Sidebar Header */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">HS</span>
            </div>
            <span className="font-semibold">HS Next</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-2">
          {navigationItems.map(item => renderNavItem(item))}
        </nav>
      </ScrollArea>

      {/* Sidebar Footer */}
      <div className="border-t p-4">
        <div className="space-y-2">
          {!collapsed && (
            <>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleNavigation('/settings')}
              >
                <Settings className="mr-2 h-4 w-4" />
                설정
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleNavigation('/help')}
              >
                <HelpCircle className="mr-2 h-4 w-4" />
                도움말
              </Button>
            </>
          )}
          {collapsed && (
            <div className="flex flex-col gap-2">
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
