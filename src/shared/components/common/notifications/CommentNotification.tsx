import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { MessageSquare, AtSign } from 'lucide-react';

interface CommentNotificationProps {
  senderName: string;
  senderAvatar?: string;
  title: string;
  body: string;
  timestamp: Date;
  type: 'comment' | 'mention' | 'info';
}

export const CommentNotification: React.FC<CommentNotificationProps> = ({
  senderName,
  senderAvatar,
  title,
  body,
  timestamp,
  type
}) => {
  const getTypeIcon = () => {
    // 멘션 알림
    if (type === 'mention' || title.includes('멘션')) {
      return <AtSign className="h-4 w-4 text-blue-600" />;
    }
    
    // 댓글 알림 (모두 MessageSquare)
    return <MessageSquare className="h-4 w-4 text-primary" />;
  };

  return (
    <div className="flex items-start gap-3">
      {/* 발신자 아바타 */}
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage src={senderAvatar} alt={senderName} />
        <AvatarFallback className="bg-muted">
          {senderName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* 알림 텍스트 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {getTypeIcon()}
          <span className="text-sm font-semibold text-foreground truncate">
            {senderName}
          </span>
          <span className="text-xs text-muted-foreground">
            {timestamp.toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>
        
        <p className="text-sm font-medium text-foreground mb-1">
          {title}
        </p>
        
        <p className="text-sm text-muted-foreground line-clamp-2">
          {body}
        </p>
      </div>
    </div>
  );
};


