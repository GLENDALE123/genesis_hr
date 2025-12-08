import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/shared/components/ui/dialog';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Loader2, Users, Calendar, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { useProjectModalStore } from '@/features/workspace/store/projectModalStore';
import { ProjectService } from '@/features/workspace/services/projectService';
import { Project } from '@/features/workspace/types/project.types';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { ProjectQualityIssueView } from './ProjectQualityIssueView';

export const ProjectDetailModal = () => {
    const { isOpen, projectId, initialTab, closeProjectModal } = useProjectModalStore();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'info' | 'issue'>('info');

    useEffect(() => {
        if (isOpen && projectId) {
            const loadProject = async () => {
                setLoading(true);
                try {
                    const data = await ProjectService.getProject(projectId);
                    setProject(data);
                    
                    // 초기 탭 설정
                    if (initialTab) {
                        setActiveTab(initialTab);
                    } else if (data?.source?.type === 'quality-issue') {
                        setActiveTab('issue');
                    } else {
                        setActiveTab('info');
                    }
                } catch (error) {
                    console.error('Failed to load project:', error);
                } finally {
                    setLoading(false);
                }
            };
            loadProject();
        } else {
            setProject(null);
            setActiveTab('info');
        }
    }, [isOpen, projectId, initialTab]);

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && closeProjectModal()}>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <span className="text-2xl">🚀</span>
                        {loading ? '로딩 중...' : project?.title}
                    </DialogTitle>
                    <DialogDescription>
                        {project?.createdAt && new Date(project.createdAt).toLocaleString()} 에 생성됨
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : project ? (
                    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'info' | 'issue')} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="info">프로젝트 정보</TabsTrigger>
                            {project.source?.type === 'quality-issue' && (
                                <TabsTrigger value="issue">품질이슈</TabsTrigger>
                            )}
                        </TabsList>

                        <TabsContent value="info" className="space-y-6 mt-4">
                            {/* Status & Priority */}
                            <div className="flex gap-2">
                                <Badge variant="secondary" className="text-sm">
                                    {project.status.toUpperCase()}
                                </Badge>
                                <Badge variant={project.priority === 'urgent' ? 'destructive' : 'outline'} className="text-sm">
                                    {project.priority.toUpperCase()}
                                </Badge>
                            </div>

                            {/* Description */}
                            <div className="bg-muted/50 p-4 rounded-lg whitespace-pre-wrap text-sm leading-relaxed">
                                {project.description}
                            </div>

                            {/* Members */}
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <Users className="h-4 w-4" /> 참여자
                                </h4>
                                <div className="flex -space-x-2">
                                    {project.members.map((member, idx) => (
                                        <Avatar key={idx} className="border-2 border-background">
                                            <AvatarFallback>{member.uid.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                    ))}
                                </div>
                            </div>

                            {/* Source Link */}
                            {project.source && (
                                <div className="pt-4 border-t">
                                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        소스: {project.source.type} (ID: {project.source.id})
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        {project.source?.type === 'quality-issue' && project.source.id && (
                            <TabsContent value="issue" className="mt-4">
                                <ProjectQualityIssueView
                                    issueId={project.source.id}
                                    projectId={project.id}
                                    onStatusUpdate={(issueId, newStatus) => {
                                        // 상태 업데이트 후 프로젝트 정보 새로고침
                                        const loadProject = async () => {
                                            try {
                                                const data = await ProjectService.getProject(project.id);
                                                setProject(data);
                                            } catch (error) {
                                                console.error('Failed to reload project:', error);
                                            }
                                        };
                                        loadProject();
                                    }}
                                />
                            </TabsContent>
                        )}
                    </Tabs>
                ) : (
                    <div className="py-10 text-center text-muted-foreground">
                        프로젝트 정보를 찾을 수 없습니다.
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};
