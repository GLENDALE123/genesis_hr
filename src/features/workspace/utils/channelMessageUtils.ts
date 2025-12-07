/**
 * 워크스페이스 채널 메시지 유틸리티
 * 1:1 채팅과 독립적인 워크스페이스 전용 유틸리티
 */

import type { ChannelMessage } from '../messages';
import type { PendingUpload } from '@/features/chat/types/pendingUpload.types';

export type CombinedChannelMessageItem =
  | {
      type: 'message';
      message: ChannelMessage;
      pending?: undefined;
    }
  | {
      type: 'pending';
      message: ChannelMessage;
      pending: PendingUpload;
    };

export interface ChannelMessageGroupingState {
  showAvatar: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
}

interface BuildCombinedChannelMessagesParams {
  nonPendingMessages: ChannelMessage[];
  pendingUploads: PendingUpload[];
  channelId: string;
  workspaceId: string;
  currentUserId: string;
  currentUserDisplayName: string;
  currentUserPhotoURL?: string;
}

export const mergeHistoricalChannelMessages = (
  historicalMessages: ChannelMessage[],
  channelMessages: ChannelMessage[]
): ChannelMessage[] => {
  if (historicalMessages.length === 0) {
    return channelMessages;
  }

  const map = new Map<string, ChannelMessage>();
  historicalMessages.forEach((message) => {
    map.set(message.id, message);
  });
  channelMessages.forEach((message) => {
    map.set(message.id, message);
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
};

export const buildCombinedChannelMessages = ({
  nonPendingMessages,
  pendingUploads,
  channelId,
  workspaceId,
  currentUserId,
  currentUserDisplayName,
  currentUserPhotoURL,
}: BuildCombinedChannelMessagesParams) => {
  const normalItems: CombinedChannelMessageItem[] = nonPendingMessages.map((message) => ({
    type: 'message',
    message,
    pending: undefined,
  }));

  if (pendingUploads.length === 0) {
    const combinedIndexMap = createChannelMessageIndexMap(normalItems);
    return {
      combinedMessages: normalItems,
      combinedIndexMap,
    };
  }

  const pendingItems: CombinedChannelMessageItem[] = pendingUploads.map((pending) => {
    const pendingMessage: ChannelMessage = {
      id: `pending-${pending.id}`,
      channelId,
      workspaceId,
      text: pending.text,
      sender: {
        uid: currentUserId,
        displayName: currentUserDisplayName,
        photoURL: currentUserPhotoURL,
      },
      timestamp: new Date(pending.createdAt).toISOString(),
      readBy: currentUserId ? [currentUserId] : [],
      attachments: [],
      mentionedUserIds: pending.mentionedUserIds,
    };

    return {
      type: 'pending',
      message: pendingMessage,
      pending,
    };
  });

  const combinedMessages = [...normalItems, ...pendingItems];
  const combinedIndexMap = createChannelMessageIndexMap(combinedMessages);

  return {
    combinedMessages,
    combinedIndexMap,
  };
};

export const createChannelMessageIndexMap = (items: CombinedChannelMessageItem[]) => {
  const map = new Map<string, number>();
  items.forEach((item, index) => {
    map.set(item.message.id, index);
  });
  return map;
};

export const createChannelMessageGroupingMap = (
  messages: ChannelMessage[]
): Map<string, ChannelMessageGroupingState> => {
  const map = new Map<string, ChannelMessageGroupingState>();

  // 디스코드 스타일: 같은 사용자의 연속 메시지를 그룹화
  // 그룹 기준: 같은 사용자 + 5분 이내 + 메시지 간격 1분 이내
  const GROUP_TIME_THRESHOLD = 5 * 60 * 1000; // 5분
  const MESSAGE_GAP_THRESHOLD = 1 * 60 * 1000; // 1분

  for (let index = 0; index < messages.length; index += 1) {
    const current = messages[index];
    const previous = index > 0 ? messages[index - 1] : undefined;
    const next = index < messages.length - 1 ? messages[index + 1] : undefined;
    const currentTime = new Date(current.timestamp).getTime();

    const previousTime = previous ? new Date(previous.timestamp).getTime() : 0;
    const nextTime = next ? new Date(next.timestamp).getTime() : 0;

    const sameSenderAsPrevious = previous
      ? previous.sender.uid === current.sender.uid
      : false;
    const sameSenderAsNext = next ? next.sender.uid === current.sender.uid : false;

    // 아바타 표시: 이전 메시지와 다른 사용자이거나 5분 이상 경과
    const showAvatar =
      !sameSenderAsPrevious || currentTime - previousTime > GROUP_TIME_THRESHOLD;

    // 그룹의 첫 번째 메시지: 이전 메시지와 다른 사용자이거나 1분 이상 경과
    const isFirstInGroup =
      !sameSenderAsPrevious || currentTime - previousTime > MESSAGE_GAP_THRESHOLD;

    // 그룹의 마지막 메시지: 다음 메시지와 다른 사용자이거나 1분 이상 경과
    const isLastInGroup =
      !sameSenderAsNext || nextTime - currentTime > MESSAGE_GAP_THRESHOLD;

    map.set(current.id, {
      showAvatar,
      isFirstInGroup,
      isLastInGroup,
    });
  }

  return map;
};




