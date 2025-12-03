/**
 * 메시지 유틸리티 함수
 * 복사, 링크 생성 등
 */

/**
 * 메시지 링크 생성
 */
export function createMessageLink(
  workspaceId: string,
  channelId: string,
  messageId: string
): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/messages?mode=workspace&workspace=${workspaceId}&channel=${channelId}&message=${messageId}`;
}

/**
 * 메시지 텍스트 복사
 */
export async function copyMessageText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy text:', error);
    // 폴백: 텍스트 영역 생성
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  }
}

/**
 * 메시지 링크 복사
 */
export async function copyMessageLink(
  workspaceId: string,
  channelId: string,
  messageId: string
): Promise<boolean> {
  const link = createMessageLink(workspaceId, channelId, messageId);
  return copyMessageText(link);
}

