/**
 * 채팅 관련 날짜 포맷팅 유틸리티
 */

/**
 * 채팅방 목록에서 사용할 날짜 포맷
 * - 오늘: "오전/오후 HH:MM"
 * - 어제: "어제"
 * - 올해: "MM/DD"
 * - 작년 이전: "YYYY. MM. DD"
 */
export function formatChatDate(date: Date | string): string {
  const messageDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const messageDay = new Date(
    messageDate.getFullYear(),
    messageDate.getMonth(),
    messageDate.getDate()
  );

  // 오늘
  if (messageDay.getTime() === today.getTime()) {
    return formatChatTime(messageDate);
  }

  // 어제
  if (messageDay.getTime() === yesterday.getTime()) {
    return '어제';
  }

  // 올해
  if (messageDate.getFullYear() === now.getFullYear()) {
    const month = String(messageDate.getMonth() + 1).padStart(2, '0');
    const day = String(messageDate.getDate()).padStart(2, '0');
    return `${month}/${day}`;
  }

  // 작년 이전
  const year = messageDate.getFullYear();
  const month = String(messageDate.getMonth() + 1).padStart(2, '0');
  const day = String(messageDate.getDate()).padStart(2, '0');
  return `${year}. ${month}. ${day}`;
}

/**
 * 채팅방 목록에서 사용할 시간 포맷
 * "오전/오후 HH:MM"
 */
export function formatChatTime(date: Date | string): string {
  const messageDate = typeof date === 'string' ? new Date(date) : date;
  const hours = messageDate.getHours();
  const minutes = messageDate.getMinutes();
  const ampm = hours >= 12 ? '오후' : '오전';
  const displayHours = hours % 12 || 12;
  const displayMinutes = String(minutes).padStart(2, '0');
  return `${ampm} ${displayHours}:${displayMinutes}`;
}

/**
 * 채팅 메시지에서 사용할 날짜/시간 포맷
 * - 오늘: "오전/오후 HH:MM"
 * - 어제: "어제 오전/오후 HH:MM"
 * - 올해: "MM월 DD일 오전/오후 HH:MM"
 * - 작년 이전: "YYYY년 MM월 DD일 오전/오후 HH:MM"
 */
export function formatChatDateTime(date: Date | string): string {
  const messageDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const messageDay = new Date(
    messageDate.getFullYear(),
    messageDate.getMonth(),
    messageDate.getDate()
  );

  const timeStr = formatChatTime(messageDate);

  // 오늘
  if (messageDay.getTime() === today.getTime()) {
    return timeStr;
  }

  // 어제
  if (messageDay.getTime() === yesterday.getTime()) {
    return `어제 ${timeStr}`;
  }

  // 올해
  if (messageDate.getFullYear() === now.getFullYear()) {
    const month = messageDate.getMonth() + 1;
    const day = messageDate.getDate();
    return `${month}월 ${day}일 ${timeStr}`;
  }

  // 작년 이전
  const year = messageDate.getFullYear();
  const month = messageDate.getMonth() + 1;
  const day = messageDate.getDate();
  return `${year}년 ${month}월 ${day}일 ${timeStr}`;
}

