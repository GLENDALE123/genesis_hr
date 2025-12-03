import { MessageStatus } from '../types/chat.types';
import type { ChatMessage } from '../types/chat.types';
import type { PendingUpload } from '../types/pendingUpload.types';

export type CombinedMessageItem =
  | {
      type: 'message';
      message: ChatMessage;
      pending?: undefined;
    }
  | {
      type: 'pending';
      message: ChatMessage;
      pending: PendingUpload;
    };

export interface MessageGroupingState {
  showAvatar: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
}

interface BuildCombinedMessagesParams {
  nonPendingMessages: ChatMessage[];
  pendingUploads: PendingUpload[];
  chatRoomId: string;
  currentUserId: string;
  currentUserDisplayName: string;
  currentUserPhotoURL?: string;
}

export const mergeHistoricalMessages = (
  historicalMessages: ChatMessage[],
  roomMessages: ChatMessage[]
): ChatMessage[] => {
  if (historicalMessages.length === 0) {
    return roomMessages;
  }

  const map = new Map<string, ChatMessage>();
  historicalMessages.forEach((message) => {
    map.set(message.id, message);
  });
  roomMessages.forEach((message) => {
    map.set(message.id, message);
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
};

export const buildCombinedMessages = ({
  nonPendingMessages,
  pendingUploads,
  chatRoomId,
  currentUserId,
  currentUserDisplayName,
  currentUserPhotoURL,
}: BuildCombinedMessagesParams) => {
  const normalItems: CombinedMessageItem[] = nonPendingMessages.map((message) => ({
    type: 'message',
    message,
    pending: undefined,
  }));

  if (pendingUploads.length === 0) {
    const combinedIndexMap = createMessageIndexMap(normalItems);
    return {
      combinedMessages: normalItems,
      combinedIndexMap,
    };
  }

  const pendingItems: CombinedMessageItem[] = pendingUploads.map((pending) => {
    const pendingMessage: ChatMessage = {
      id: `pending-${pending.id}`,
      directMessageRoomId: chatRoomId,
      chatRoomId,
      text: pending.text,
      sender: {
        uid: currentUserId,
        displayName: currentUserDisplayName,
        photoURL: currentUserPhotoURL,
      },
      timestamp: new Date(pending.createdAt).toISOString(),
      status: MessageStatus.SENDING,
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
  const combinedIndexMap = createMessageIndexMap(combinedMessages);

  return {
    combinedMessages,
    combinedIndexMap,
  };
};

export const createMessageIndexMap = (items: CombinedMessageItem[]) => {
  const map = new Map<string, number>();
  items.forEach((item, index) => {
    map.set(item.message.id, index);
  });
  return map;
};

export const createMessageGroupingMap = (
  messages: ChatMessage[]
): Map<string, MessageGroupingState> => {
  const map = new Map<string, MessageGroupingState>();

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


