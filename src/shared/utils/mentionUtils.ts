/**
 * 멘션 관련 유틸리티 함수
 */

export interface MentionUser {
  id: string;
  displayName: string;
  uid: string;
}

/**
 * HTML에서 텍스트 추출 (멘션 태그를 @[DisplayName](UID) 형태로 변환)
 */
export const extractText = (html: string): string => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // 멘션 태그를 @[DisplayName](UID) 형태로 변환
  const mentions = tempDiv.querySelectorAll('.mention');
  mentions.forEach(mention => {
    const displayName = mention.getAttribute('data-display-name');
    const userId = mention.getAttribute('data-user-id');
    if (displayName && userId) {
      mention.textContent = `@[${displayName}](${userId})`;
    } else if (displayName) {
      mention.textContent = `@${displayName}`;
    }
  });
  
  return tempDiv.textContent || '';
};

/**
 * HTML에서 멘션된 사용자 ID 추출
 */
export const extractMentionedUserIds = (html: string): string[] => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  const mentions = tempDiv.querySelectorAll('.mention');
  const userIds: string[] = [];
  
  mentions.forEach(mention => {
    const userId = mention.getAttribute('data-user-id');
    if (userId && !userIds.includes(userId)) {
      userIds.push(userId);
    }
  });
  
  return userIds;
};

/**
 * @ 뒤의 텍스트로 사용자 필터링
 */
export const filterUsersForMention = <T extends { uid?: string }>(
  users: T[],
  searchQuery: string,
  getDisplayName: (user: T) => string | undefined,
  currentUserUid?: string
): T[] => {
  return users
    .filter(user => 
      user.uid !== currentUserUid && // 자기 자신 제외
      getDisplayName(user)?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .slice(0, 5); // 최대 5명만 표시
};


