/**
 * 채널 프로젝트 뷰 컴포넌트
 * 채널에 생성된 프로젝트들을 품질이슈 상세 UI 형태로 표시
 */

import React, { useEffect, useState } from 'react';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { ProjectService } from '@/features/workspace/services/projectService';
import { Project } from '@/features/workspace/types/project.types';
import { ProjectQualityIssueMessage } from '@/features/workspace/messages/components/ProjectQualityIssueMessage';
import { ChannelMessageService } from '@/features/workspace/messages';
import type { ChannelMessage } from '@/features/workspace/messages/types/channelMessage.types';
import type { Channel } from '../types/channel.types';

export interface ChannelProjectViewProps {
    channel: Channel;
}

export const ChannelProjectView: React.FC<ChannelProjectViewProps> = ({ channel }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [messages, setMessages] = useState<ChannelMessage[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProjects = async () => {
            setLoading(true);
            try {
                // 채널별 프로젝트 목록 조회
                const channelProjects = await ProjectService.getProjectsByChannel(
                    channel.id,
                    channel.workspaceId
                );
                setProjects(channelProjects);

                // 프로젝트 관련 메시지 조회 (품질이슈 프로젝트 메시지)
                const channelMessages = await ChannelMessageService.fetchInitialMessages(
                    channel.id,
                    channel.workspaceId,
                    100
                );
                
                // 프로젝트 품질이슈 메시지만 필터링
                const projectMessages = channelMessages.filter(
                    msg => msg.metadata?.type === 'project-quality-issue'
                );
                setMessages(projectMessages);
            } catch (error) {
                console.error('Failed to load projects:', error);
            } finally {
                setLoading(false);
            }
        };

        loadProjects();
    }, [channel.id, channel.workspaceId]);

    // 실시간 메시지 구독
    useEffect(() => {
        if (!channel.id || !channel.workspaceId) return;

        const unsubscribe = ChannelMessageService.subscribeToChannelMessages(
            channel.id,
            channel.workspaceId,
            (newMessages) => {
                // 프로젝트 품질이슈 메시지만 필터링
                const projectMessages = newMessages.filter(
                    msg => msg.metadata?.type === 'project-quality-issue'
                );
                setMessages(projectMessages);
            },
            (error) => {
                console.error('Error subscribing to channel messages:', error);
            },
            100
        );

        return () => {
            unsubscribe();
        };
    }, [channel.id, channel.workspaceId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (messages.length === 0) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground">
                <p>아직 프로젝트가 없습니다.</p>
            </div>
        );
    }

    return (
        <ScrollArea className="flex-1 h-full">
            <div className="p-4 space-y-4">
                {messages.map((message) => (
                    <ProjectQualityIssueMessage
                        key={message.id}
                        message={message}
                        onIssueUpdate={() => {
                            // 이슈 업데이트 시 메시지 다시 로드
                            const loadMessages = async () => {
                                try {
                                    const channelMessages = await ChannelMessageService.fetchInitialMessages(
                                        channel.id,
                                        channel.workspaceId,
                                        100
                                    );
                                    const projectMessages = channelMessages.filter(
                                        msg => msg.metadata?.type === 'project-quality-issue'
                                    );
                                    setMessages(projectMessages);
                                } catch (error) {
                                    console.error('Failed to reload messages:', error);
                                }
                            };
                            loadMessages();
                        }}
                    />
                ))}
            </div>
        </ScrollArea>
    );
};













