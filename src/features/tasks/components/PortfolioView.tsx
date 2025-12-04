/**
 * 포트폴리오 뷰 컴포넌트
 * 여러 프로젝트 통합 관리
 */

import React, { useMemo, useEffect } from 'react';
import { Task } from '../types/task.types';
import { Project } from '../types/project.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { 
  Folder, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Users,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useTaskStore } from '../store/taskStore';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface PortfolioViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onProjectClick?: (project: Project) => void;
}

const PROJECT_COLORS: Record<string, string> = {
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  gray: 'bg-gray-500',
};

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  tasks,
  onTaskClick,
  onProjectClick,
}) => {
  const { projects, fetchProjects, setSelectedProject } = useProjectStore();
  const { setProjectFilter } = useTaskStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // 프로젝트별 태스크 통계
  const projectStats = useMemo(() => {
    const stats: Record<string, {
      project: Project;
      totalTasks: number;
      completedTasks: number;
      inProgressTasks: number;
      overdueTasks: number;
      progress: number;
    }> = {};

    projects.forEach(project => {
      const projectTasks = tasks.filter(t => t.projectId === project.id);
      const total = projectTasks.length;
      const completed = projectTasks.filter(t => t.status === 'done').length;
      const inProgress = projectTasks.filter(t => t.status === 'in-progress').length;
      const now = new Date();
      const overdue = projectTasks.filter(t => 
        t.dueDate && new Date(t.dueDate) < now && t.status !== 'done' && t.status !== 'cancelled'
      ).length;
      const progress = total > 0 ? (completed / total) * 100 : 0;

      stats[project.id] = {
        project,
        totalTasks: total,
        completedTasks: completed,
        inProgressTasks: inProgress,
        overdueTasks: overdue,
        progress,
      };
    });

    return stats;
  }, [projects, tasks]);

  // 전체 통계
  const overallStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const now = new Date();
    const overdue = tasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < now && t.status !== 'done' && t.status !== 'cancelled'
    ).length;
    const progress = total > 0 ? (completed / total) * 100 : 0;

    return {
      total,
      completed,
      inProgress,
      overdue,
      progress,
      totalProjects: projects.length,
      activeProjects: projects.filter(p => !p.isArchived).length,
    };
  }, [tasks, projects]);

  const handleProjectClick = (project: Project) => {
    if (onProjectClick) {
      onProjectClick(project);
    } else {
      setSelectedProject(project);
      setProjectFilter(project.id);
    }
  };

  const sortedProjects = useMemo(() => {
    return [...projects]
      .filter(p => !p.isArchived)
      .sort((a, b) => {
        const aStats = projectStats[a.id];
        const bStats = projectStats[b.id];
        
        // 진행률이 높은 순
        if (aStats && bStats) {
          return bStats.progress - aStats.progress;
        }
        return 0;
      });
  }, [projects, projectStats]);

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* 전체 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 프로젝트</CardTitle>
            <Folder className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              활성 {overallStats.activeProjects}개
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 업무</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.total}</div>
            <p className="text-xs text-muted-foreground">
              완료율 {overallStats.progress.toFixed(1)}%
            </p>
            <Progress value={overallStats.progress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">진행 중</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.inProgress}</div>
            <p className="text-xs text-muted-foreground">
              활성 업무
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">지연된 업무</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overallStats.overdue}</div>
            <p className="text-xs text-muted-foreground">
              마감일 지남
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 프로젝트 목록 */}
      <div>
        <h2 className="text-lg font-semibold mb-4">프로젝트</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedProjects.map((project) => {
            const stats = projectStats[project.id];
            if (!stats) return null;

            const colorClass = project.color 
              ? PROJECT_COLORS[project.color] || 'bg-gray-500'
              : 'bg-gray-500';

            return (
              <Card
                key={project.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleProjectClick(project)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={cn('w-4 h-4 rounded-full flex-shrink-0', colorClass)} />
                      <CardTitle className="text-base truncate">{project.name}</CardTitle>
                    </div>
                    {project.isFavorite && (
                      <Badge variant="outline" className="text-xs">
                        즐겨찾기
                      </Badge>
                    )}
                  </div>
                  {project.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* 진행률 */}
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">진행률</span>
                        <span className="font-semibold">{stats.progress.toFixed(0)}%</span>
                      </div>
                      <Progress value={stats.progress} className="h-2" />
                    </div>

                    {/* 통계 */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-lg font-bold">{stats.totalTasks}</div>
                        <div className="text-xs text-muted-foreground">전체</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-blue-600">{stats.inProgressTasks}</div>
                        <div className="text-xs text-muted-foreground">진행 중</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-600">{stats.completedTasks}</div>
                        <div className="text-xs text-muted-foreground">완료</div>
                      </div>
                    </div>

                    {/* 지연된 업무 */}
                    {stats.overdueTasks > 0 && (
                      <div className="flex items-center gap-1 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span>지연된 업무 {stats.overdueTasks}개</span>
                      </div>
                    )}

                    {/* 멤버 수 */}
                    {project.members && project.members.length > 0 && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>멤버 {project.members.length}명</span>
                      </div>
                    )}

                    {/* 업데이트 날짜 */}
                    {project.updatedAt && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {format(new Date(project.updatedAt), 'yyyy년 MM월 dd일', { locale: ko })}
                        </span>
                      </div>
                    )}

                    {/* 프로젝트 보기 버튼 */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProjectClick(project);
                      }}
                    >
                      프로젝트 보기
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {sortedProjects.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Folder className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>프로젝트가 없습니다.</p>
            <p className="text-sm mt-1">새 프로젝트를 생성해보세요.</p>
          </div>
        )}
      </div>
    </div>
  );
};

