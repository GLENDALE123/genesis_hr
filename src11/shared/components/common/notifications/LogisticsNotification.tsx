import React from 'react';
import { CalendarClock, AlertTriangle, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';

interface LogisticsNotificationProps {
  title: string;
  requestType: string;
  requester: string;
  requesterAvatar?: string;
  productName: string;
  supplier?: string;
  content: string;
  timestamp: Date;
}

export const LogisticsNotification: React.FC<LogisticsNotificationProps> = ({
  title,
  requestType,
  requester,
  requesterAvatar,
  productName,
  supplier,
  content,
  timestamp
}) => {
  // 타이틀에 따른 아이콘 선택
  const getTitleIcon = () => {
    if (title.includes('생산관리부 요청사항')) {
      return <CalendarClock className="h-3.5 w-3.5 text-blue-500" />;
    } else if (title.includes('부족분 신청')) {
      return <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />;
    }
    return null;
  };

  return (
    <>
      {/* 좌측상단: 타이틀 + 중앙상단: 요청유형 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          {getTitleIcon()}
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
          {/* 좌측중앙: 요청자 이름 + 우측: 발주처 제품명 */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-foreground">
              {requester}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-sm font-medium text-foreground truncate">
              {supplier && `${supplier} `}{productName}
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

