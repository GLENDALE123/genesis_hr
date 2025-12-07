/**
 * 멘션 서비스
 * @here, @channel, @everyone 등 고급 멘션 처리
 */

import { ChannelService } from '@/features/workspace/channels';
import { WorkspaceService } from '@/features/workspace/services/workspaceService';
import { UserStatusService } from '@/features/chat/services/userStatusService';
import type { ChannelMentionType, MentionData } from '../types/message.types';

export class MentionService {
  /**
   * 멘션 텍스트 파싱
   * @here, @channel, @everyone 등을 감지
   */
  static parseMentions(text: string): MentionData[] {
    const mentions: MentionData[] = [];
    const patterns = [
      { regex: /@here\b/gi, type: 'here' as ChannelMentionType },
      { regex: /@channel\b/gi, type: 'channel' as ChannelMentionType },
      { regex: /@everyone\b/gi, type: 'everyone' as ChannelMentionType },
      { regex: /@(\w+)/g, type: 'user' as const },
    ];

    patterns.forEach((pattern) => {
      const matches = text.matchAll(pattern.regex);
      for (const match of matches) {
        if (pattern.type === 'user') {
          mentions.push({
            type: 'user',
            userId: match[1],
          });
        } else {
          mentions.push({
            type: pattern.type,
          });
        }
      }
    });

    return mentions;
  }

  /**
   * @here 멘션 대상 사용자 목록 가져오기
   * 현재 온라인인 채널 멤버만 반환
   */
  static async getHereMentionTargets(
    channelId: string,
    workspaceId: string
  ): Promise<string[]> {
    const channel = await ChannelService.getChannel(channelId, workspaceId);
    if (!channel) return [];

    // 채널 멤버 중 온라인 사용자만 필터링
    const onlineUsers: string[] = [];
    const statusPromises = channel.members.map(async (uid: string) => {
      const status = await UserStatusService.getUserStatus(uid);
      if (status?.status === 'online') {
        onlineUsers.push(uid);
      }
    });

    await Promise.all(statusPromises);
    return onlineUsers;
  }

  /**
   * @channel 멘션 대상 사용자 목록 가져오기
   * 채널의 모든 멤버 반환
   */
  static async getChannelMentionTargets(channelId: string, workspaceId: string): Promise<string[]> {
    const channel = await ChannelService.getChannel(channelId, workspaceId);
    if (!channel) return [];
    return channel.members;
  }

  /**
   * @everyone 멘션 대상 사용자 목록 가져오기
   * 워크스페이스의 모든 멤버 반환
   */
  static async getEveryoneMentionTargets(workspaceId: string): Promise<string[]> {
    const workspace = await WorkspaceService.getWorkspace(workspaceId);
    if (!workspace) return [];
    return workspace.members.map((member: { uid: string }) => member.uid);
  }

  /**
   * 멘션 대상 사용자 목록 가져오기
   */
  static async getMentionTargets(
    mentions: MentionData[],
    channelId: string,
    workspaceId: string
  ): Promise<string[]> {
    const targetSet = new Set<string>();

    for (const mention of mentions) {
      if (mention.type === 'user' && mention.userId) {
        targetSet.add(mention.userId);
      } else if (mention.type === 'here') {
        const hereTargets = await this.getHereMentionTargets(channelId, workspaceId);
        hereTargets.forEach((uid) => targetSet.add(uid));
      } else if (mention.type === 'channel') {
        const channelTargets = await this.getChannelMentionTargets(channelId, workspaceId);
        channelTargets.forEach((uid) => targetSet.add(uid));
      } else if (mention.type === 'everyone') {
        const everyoneTargets = await this.getEveryoneMentionTargets(workspaceId);
        everyoneTargets.forEach((uid) => targetSet.add(uid));
      }
    }

    return Array.from(targetSet);
  }
}

