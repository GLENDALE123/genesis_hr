/**
 * 워크스페이스 채널 메시지 날짜 포맷팅 유틸리티
 * 1:1 채팅과 독립적인 워크스페이스 전용 유틸리티
 */

/**
 * 채널 메시지에서 사용할 날짜/시간 포맷
 * - 오늘: "오전/오후 HH:MM"
 * - 어제: "어제 오전/오후 HH:MM"
 * - 올해: "MM월 DD일 오전/오후 HH:MM"
 * - 작년 이전: "YYYY년 MM월 DD일 오전/오후 HH:MM"
 */
export function formatChannelMessageDateTime(date: Date | string): string {
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

  const timeStr = formatChannelMessageTime(messageDate);

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

/**
 * 채널 메시지에서 사용할 시간 포맷
 * "오전/오후 HH:MM"
 */
export function formatChannelMessageTime(date: Date | string): string {
  const messageDate = typeof date === 'string' ? new Date(date) : date;
  const hours = messageDate.getHours();
  const minutes = messageDate.getMinutes();
  const ampm = hours >= 12 ? '오후' : '오전';
  const displayHours = hours % 12 || 12;
  const displayMinutes = String(minutes).padStart(2, '0');
  return `${ampm} ${displayHours}:${displayMinutes}`;
}


