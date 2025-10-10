import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';

interface LogisticsNotificationProps {
  title: string;
  requestType: string;
  requester: string;
  requesterAvatar?: string;
  productName: string;
  content: string;
  timestamp: Date;
}

export const LogisticsNotification: React.FC<LogisticsNotificationProps> = ({
  title,
  requestType,
  requester,
  requesterAvatar,
  productName,
  content,
  timestamp
}) => {
  return (
    <>
      {/* 좌측상단: 타이틀 + 중앙상단: 요청유형 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted-foreground">
          {title}
        </span>
        <span className="text-xs font-semibold text-primary">
          {requestType}
        </span>
      </div>

      <div className="flex items-start gap-3">
        {/* 요청자 아바타 */}
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={requesterAvatar} alt={requester} />
          <AvatarFallback className="bg-muted">
            {requester.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {/* 좌측중앙: 요청자 이름 + 우측: 제품명 */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-foreground">
              {requester}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-sm font-medium text-foreground truncate">
              {productName}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              {timestamp.toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
          
          {/* 하단: 요청내용 */}
          <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">
            {content}
          </p>
        </div>
      </div>
    </>
  );
};

