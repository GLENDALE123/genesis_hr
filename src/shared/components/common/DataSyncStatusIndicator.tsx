import React from 'react';
import { Badge } from '@/shared/components/ui/badge';
import { useDataSyncStatus } from './DataSyncStatusProvider';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

/**
 * 데이터 동기화 상태를 표시하는 컴포넌트
 * 오프라인 상태에서 캐시 데이터를 보고 있을 때 사용자에게 알림
 */
export const DataSyncStatusIndicator: React.FC = () => {
  const { state } = useDataSyncStatus();
  const { status, hasCacheData, lastSyncTime, isStale } = state;

  const getStatusConfig = () => {
    switch (status) {
      case 'online':
        return {
          icon: CheckCircle2,
          label: '온라인',
          variant: 'default' as const,
          className: 'bg-green-500 hover:bg-green-600',
          tooltip: lastSyncTime
            ? `최신 데이터 (${formatDistanceToNow(lastSyncTime, { addSuffix: true, locale: ko })})`
            : '최신 데이터',
        };
      case 'offline':
        return {
          icon: WifiOff,
          label: '오프라인',
          variant: 'destructive' as const,
          className: 'bg-red-500 hover:bg-red-600',
          tooltip: isStale
            ? '오프라인 상태입니다. 캐시된 데이터를 보고 있습니다.'
            : '인터넷 연결이 끊어졌습니다.',
        };
      case 'syncing':
        return {
          icon: RefreshCw,
          label: '동기화 중',
          variant: 'secondary' as const,
          className: 'bg-yellow-500 hover:bg-yellow-600',
          tooltip: '최신 데이터를 동기화하고 있습니다.',
        };
      case 'cache-only':
        return {
          icon: AlertCircle,
          label: '캐시 데이터',
          variant: 'outline' as const,
          className: 'bg-orange-500 hover:bg-orange-600',
          tooltip: '캐시된 데이터를 보고 있습니다. 최신 데이터가 아닐 수 있습니다.',
        };
      default:
        return {
          icon: Wifi,
          label: '연결 확인 중',
          variant: 'secondary' as const,
          className: '',
          tooltip: '연결 상태를 확인하고 있습니다.',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;
  const isSpinning = status === 'syncing';

  // 오프라인이 아니고 최신 데이터면 표시하지 않음 (시각적 노이즈 감소)
  if (status === 'online' && !isStale && !hasCacheData) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={config.variant}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 text-xs font-medium cursor-help',
              config.className,
              isSpinning && 'animate-spin'
            )}
          >
            <Icon className={cn('h-3 w-3', isSpinning && 'animate-spin')} />
            <span>{config.label}</span>
            {isStale && (
              <AlertCircle className="h-3 w-3 animate-pulse" />
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{config.tooltip}</p>
          {isStale && lastSyncTime && (
            <p className="text-xs text-muted-foreground mt-1">
              마지막 동기화: {formatDistanceToNow(lastSyncTime, { addSuffix: true, locale: ko })}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};















