'use client';

import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useDashboardStore } from '@/features/dashboard';
// import { useGlobalStore } from '@/app/store'; // 향후 알림 기능에 사용 예정
import { useState, useEffect } from 'react';
import { addDocument, getDocuments } from '@/shared/services/firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Skeleton } from '@/shared/components/ui/skeleton';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date | { toDate?: () => Date };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { stats, isLoading: dashboardLoading, fetchStats } = useDashboardStore();
  // const { addNotification } = useGlobalStore(); // 향후 알림 기능에 사용 예정
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [loading, setLoading] = useState(false);

  // Firestore에서 할 일 목록 가져오기
  const loadTodos = async () => {
    try {
      setLoading(true);
      const data = await getDocuments('todos');
      setTodos(data as Todo[]);
    } catch (error) {
      console.error('할 일 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 새 할 일 추가
  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    try {
      const todoData = {
        text: newTodo,
        completed: false,
        userId: user?.uid,
        createdAt: new Date()
      };

      await addDocument('todos', todoData);
      setNewTodo('');
      loadTodos(); // 목록 새로고침
    } catch (error) {
      console.error('할 일 추가 실패:', error);
    }
  };

  useEffect(() => {
    loadTodos();
    fetchStats(); // 대시보드 통계 데이터 로드
  }, [fetchStats]);

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-bold">
                대시보드
              </CardTitle>
              <CardDescription>
                안녕하세요, {user?.email}님! Firebase Firestore를 사용한 간단한 할 일 관리 앱입니다.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* 대시보드 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  총 직원 수
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    stats.totalEmployees.toLocaleString()
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  활성 직원
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    stats.activeEmployees.toLocaleString()
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  총 급여
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    `₩${stats.totalPayroll.toLocaleString()}`
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  월 급여
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    `₩${stats.monthlyPayroll.toLocaleString()}`
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 할 일 추가 폼 */}
          <Card>
            <CardHeader>
              <CardTitle>새 할 일 추가</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addTodo} className="flex gap-2">
                <Input
                  type="text"
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  placeholder="새 할 일을 입력하세요..."
                  className="flex-1"
                />
                <Button type="submit">
                  추가
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* 할 일 목록 */}
          <Card>
            <CardHeader>
              <CardTitle>할 일 목록 ({todos.length}개)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-4 w-4 rounded" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : todos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  할 일이 없습니다. 위에서 새 할 일을 추가해보세요!
                </div>
              ) : (
                <div className="space-y-4">
                  {todos.map((todo) => (
                    <Card key={todo.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className={`${todo.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {todo.text}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {todo.createdAt instanceof Date 
                              ? todo.createdAt.toLocaleString()
                              : todo.createdAt?.toDate?.()?.toLocaleString() || '날짜 없음'}
                          </p>
                        </div>
                        <Badge variant={todo.completed ? 'default' : 'secondary'}>
                          {todo.completed ? '완료' : '진행중'}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Firebase 상태 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>Firebase 연결 상태</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default">✅</Badge>
                  <span>Authentication - 사용자 인증됨</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">✅</Badge>
                  <span>Firestore - 데이터 읽기/쓰기 가능</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">✅</Badge>
                  <span>Storage - 파일 업로드 준비됨</span>
                </div>
              </div>
            </CardContent>
          </Card>
      </div>
    </ProtectedRoute>
  );
}
