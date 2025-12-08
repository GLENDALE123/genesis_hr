import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/shared/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { useAuthStore } from '@/features/auth/store/authStore';
import { WorkspaceService } from '../services/workspaceService';
import { ChannelService } from '../channels';
import { ProjectService } from '../services/projectService';
import type { Workspace } from '../types/workspace.types';
import type { Channel } from '../channels/types/channel.types';
import { Loader2 } from 'lucide-react';

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTitle: string;
    initialContent: string;
    sourceId?: string;
    sourceType?: 'quality-issue' | 'task' | 'other';
    initialImages?: string[];
    onSuccess: (workspaceId: string, channelId: string, projectId: string) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
    isOpen,
    onClose,
    initialTitle,
    initialContent,
    sourceId,
    sourceType = 'other',
    initialImages = [],
    onSuccess,
}) => {
    const { user } = useAuthStore();
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
    const [selectedChannelId, setSelectedChannelId] = useState<string>('');
    const [projectTitle, setProjectTitle] = useState('');
    const [projectContent, setProjectContent] = useState('');

    const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);
    const [isLoadingChannels, setIsLoadingChannels] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 워크스페이스 목록 로드
    useEffect(() => {
        if (!isOpen || !user?.uid) return;
        const loadWorkspaces = async () => {
            setIsLoadingWorkspaces(true);
            try {
                const userWorkspaces = await WorkspaceService.getUserWorkspaces(user.uid);
                setWorkspaces(userWorkspaces);
                if (userWorkspaces.length > 0) setSelectedWorkspaceId(userWorkspaces[0].id);
            } catch (error) {
                console.error('Failed to load workspaces:', error);
            } finally {
                setIsLoadingWorkspaces(false);
            }
        };
        loadWorkspaces();
    }, [isOpen, user?.uid]);

    // 채널 목록 로드
    useEffect(() => {
        if (!selectedWorkspaceId || !user?.uid) {
            setChannels([]);
            return;
        }
        const loadChannels = async () => {
            setIsLoadingChannels(true);
            try {
                const userChannels = await ChannelService.getUserChannels(selectedWorkspaceId, user.uid);
                // 품질이슈에서 프로젝트 생성 시 프로젝트 뷰 채널만 필터링
                const filteredChannels = sourceType === 'quality-issue'
                    ? userChannels.filter(channel => channel.viewType === 'project')
                    : userChannels;
                setChannels(filteredChannels);
                setSelectedChannelId('');
            } catch (error) {
                console.error('Failed to load channels:', error);
            } finally {
                setIsLoadingChannels(false);
            }
        };
        loadChannels();
    }, [selectedWorkspaceId, user?.uid, sourceType]);

    // 초기값 설정
    useEffect(() => {
        if (isOpen) {
            setProjectTitle(initialTitle);
            setProjectContent(initialContent);
        }
    }, [isOpen, initialTitle, initialContent]);

    // 프로젝트 생성 핸들러
    const handleSubmit = async () => {
        if (!selectedWorkspaceId || !selectedChannelId || !projectTitle.trim() || !user) {
            return;
        }

        setIsSubmitting(true);
        try {
            const projectId = await ProjectService.createProject(
                {
                    title: projectTitle.trim(),
                    description: projectContent.trim(),
                    workspaceId: selectedWorkspaceId,
                    channelId: selectedChannelId,
                    source: sourceId
                        ? {
                              type: sourceType,
                              id: sourceId,
                          }
                        : undefined,
                    status: 'planning',
                    priority: 'medium',
                    imageUrls: initialImages.length > 0 ? initialImages : undefined,
                },
                {
                    uid: user.uid,
                    displayName: user.displayName || user.email || 'Unknown',
                    photoURL: user.photoURL,
                }
            );

            onSuccess(selectedWorkspaceId, selectedChannelId, projectId);
            onClose();
        } catch (error) {
            console.error('Failed to create project:', error);
            // TODO: 에러 토스트 메시지 표시
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
                <DialogTitle>프로젝트 생성</DialogTitle>
                <DialogDescription>
                    선택한 워크스페이스와 채널에 프로젝트를 생성합니다.
                    생성 시 해당 채널에 알림 메시지가 전송됩니다.
                </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="workspace">워크스페이스</Label>
                    <Select
                        value={selectedWorkspaceId}
                        onValueChange={setSelectedWorkspaceId}
                        disabled={isLoadingWorkspaces || isSubmitting}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={isLoadingWorkspaces ? "로딩 중..." : "워크스페이스 선택"} />
                        </SelectTrigger>
                        <SelectContent>
                            {workspaces.map((ws) => (
                                <SelectItem key={ws.id} value={ws.id}>
                                    {ws.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="channel">채널</Label>
                    <Select
                        value={selectedChannelId}
                        onValueChange={setSelectedChannelId}
                        disabled={!selectedWorkspaceId || isLoadingChannels || isSubmitting}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={isLoadingChannels ? "로딩 중..." : "채널 선택"} />
                        </SelectTrigger>
                        <SelectContent>
                            {channels.length === 0 ? (
                                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                    {sourceType === 'quality-issue' 
                                        ? '프로젝트 뷰 채널이 없습니다. 먼저 프로젝트 뷰 채널을 생성해주세요.'
                                        : '사용 가능한 채널이 없습니다.'}
                                </div>
                            ) : (
                                channels.map((channel) => (
                                    <SelectItem key={channel.id} value={channel.id}>
                                        {channel.name}
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                    {sourceType === 'quality-issue' && (
                        <p className="text-xs text-muted-foreground">
                            품질이슈 프로젝트는 프로젝트 뷰 채널에만 생성할 수 있습니다.
                        </p>
                    )}
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="title">프로젝트 명</Label>
                    <Textarea
                        id="title"
                        value={projectTitle}
                        onChange={(e) => setProjectTitle(e.target.value)}
                        placeholder="프로젝트 명을 입력하세요"
                        className="min-h-[40px] resize-none"
                        disabled={isSubmitting}
                        rows={1}
                    />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="description">프로젝트 설명</Label>
                    <Textarea
                        id="description"
                        value={projectContent}
                        onChange={(e) => setProjectContent(e.target.value)}
                        placeholder="프로젝트 설명을 입력하세요"
                        className="min-h-[150px]"
                        disabled={isSubmitting}
                    />
                </div>
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                    취소
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={!selectedWorkspaceId || !selectedChannelId || !projectTitle.trim() || isSubmitting}
                >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    생성
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);
};
