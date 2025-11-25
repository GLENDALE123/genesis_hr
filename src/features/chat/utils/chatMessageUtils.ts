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

    const showAvatar =
      !sameSenderAsPrevious || currentTime - previousTime > 5 * 60 * 1000;

    const isFirstInGroup =
      !sameSenderAsPrevious || currentTime - previousTime > 60 * 1000;

    const isLastInGroup =
      !sameSenderAsNext || nextTime - currentTime > 60 * 1000;

    map.set(current.id, {
      showAvatar,
      isFirstInGroup,
      isLastInGroup,
    });
  }

  return map;
};


