'use client';

import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { useUserRole, useIsAdmin, useIsManager } from '@/features/auth/hooks';
import { useAuthStore } from '@/features/auth/store/authStore';
import { isAdmin as checkIsAdmin } from '@/shared/utils/userUtils';
import { useDashboardStore } from '@/features/dashboard';
import { useDevStore } from '@/app/store';
import { useState, useEffect } from 'react';
import { addDocument, getDocuments } from '@/shared/services/firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { toast } from 'sonner';
import { Spinner } from '@/shared/components/ui/spinner';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { Shield, Lock, TestTube, Bell, Send } from 'lucide-react';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date | { toDate?: () => Date };
}

export default function DashboardPage() {
  const { user, userProfile } = useAuthStore();
  const currentRole = useUserRole();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const { dummyRole } = useDevStore();
  const { stats, isLoading: dashboardLoading, fetchStats } = useDashboardStore();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [loading, setLoading] = useState(false);

  // 컴포넌트 마운트 로그
  useEffect(() => {
    return () => {
    };
  }, []);

  // UserProfile 콘솔 로그
  useEffect(() => {
    // UserProfile이 null인 경우 수동으로 프로필 조회 시도
    if (user && !userProfile) {
      console.warn('⚠️ UserProfile이 null입니다. 수동으로 프로필 조회를 시도합니다...');
      import('@/shared/services/firebase/userProfile').then(({ getUserProfile }) => {
        getUserProfile(user.uid).then(profile => {
        }).catch(err => {
          console.error('❌ [Manual Fetch] 프로필 조회 실패:', err);
        });
      });
    }
  }, [user, userProfile]);

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

  // Electron 커스텀 알림 테스트 함수
  const testElectronCustomNotification = async () => {
    if (typeof window !== 'undefined' && window.__ELECTRON__ && window.electron) {
      try {
        const result = await window.electron.showNotification({
          title: '생산관리부 요청사항',
          subtitle: '100ml진공(스크류타입) 외 6건 (일체형민자펌프숄더, 받침, 어깨장식, 뽕무숄더, 외용기, 외캡)/커버',
          body: '@유호령 긴급 확인 부탁드립니다! 😊',  // ✅ 실제 댓글 내용 (멘션 포함)
          senderName: '이현석',  // 댓글 작성자 (본부장)
          senderAvatar: null,
          timestamp: new Date().toISOString(),
          useCustom: true
        });

        toast.success('커스텀 알림이 표시되었습니다!');
      } catch (error) {
        console.error('❌ [Dashboard] 커스텀 알림 실패:', error);
        toast.error('커스텀 알림 표시 실패');
      }
    } else {
      toast.error('Electron 환경이 아닙니다.');
    }
  };

  // Electron 시스템 알림 테스트 함수
  const testElectronSystemNotification = async () => {
    if (typeof window !== 'undefined' && window.__ELECTRON__ && window.electron) {
      try {
        const result = await window.electron.showNotification({
          title: 'HS 인사관리 시스템',
          body: '시스템 알림 테스트입니다! Windows 알림 센터로 표시됩니다.',
          useCustom: false // 시스템 알림 사용
        });

        toast.success('시스템 알림이 표시되었습니다!');
      } catch (error) {
        console.error('❌ [Dashboard] 시스템 알림 실패:', error);
        toast.error('시스템 알림 표시 실패');
      }
    } else {
      toast.error('Electron 환경이 아닙니다.');
    }
  };

  // 백그라운드 알림 테스트 (5초 후 알림)
  const testBackgroundNotification = async () => {
    if (typeof window !== 'undefined' && window.__ELECTRON__ && window.electron) {
      const electron = window.electron; // 변수에 할당하여 타입 안정성 확보
      
      toast.success('5초 후 알림이 표시됩니다. 지금 창을 최소화하세요!', {
        duration: 5000,
      });

      setTimeout(async () => {
        try {
          const result = await electron.showNotification({
            title: '생산관리부 요청사항',
            subtitle: '엔진A/실린더커버B',
            body: '@관리자 백그라운드에서도 알림이 잘 표시되나요? 🎉',
            senderName: '관리자',
            senderAvatar: null,
            timestamp: new Date().toISOString(),
            useCustom: true
          });
        } catch (error) {
          console.error('❌ [Dashboard] 백그라운드 알림 실패:', error);
        }
      }, 5000);
    } else {
      toast.error('Electron 환경이 아닙니다.');
    }
  };

  // 물류이동 알림 테스트
  const testLogisticsNotification = async () => {
    if (!user || !userProfile) {
      toast.error('사용자 정보가 없습니다.');
      return;
    }

    try {
      const { createTestLogisticsNotification } = await import('@/features/production/services/notificationService');
      await createTestLogisticsNotification(userProfile.displayName);
      toast.success('물류이동 테스트 알림이 Admin/Manager에게 발송되었습니다!');
    } catch (error) {
      console.error('물류이동 알림 발송 실패:', error);
      toast.error('물류이동 알림 발송에 실패했습니다.');
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

          {/* 권한별 UI 테스트 카드 (개발용) */}
          {checkIsAdmin(userProfile) && (
            <Card className="border-2 border-primary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    <CardTitle>권한별 UI 테스트 (개발 전용)</CardTitle>
                  </div>
                  {dummyRole && (
                    <Badge variant="destructive">
                      테스트 모드: {dummyRole}
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  우측 상단 유저 메뉴에서 권한을 변경하면 아래 카드들이 동적으로 변경됩니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 현재 권한 표시 */}
                <div className="p-4 bg-muted rounded-lg">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">실제 권한:</span>
                      <Badge variant="default">{userProfile?.role}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">현재 보고 있는 권한:</span>
                      <Badge variant={dummyRole ? 'destructive' : 'secondary'}>
                        {currentRole || 'None'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* 물류이동 알림 테스트 버튼 */}
                <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Send className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-semibold text-blue-800 dark:text-blue-200">물류이동 알림 테스트</h3>
                  </div>
                  <div className="space-y-3 mb-3">
                    <div className="text-sm space-y-1">
                      <p className="font-medium text-blue-700 dark:text-blue-300">알림 내용:</p>
                      <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1 ml-4 list-disc">
                        <li><strong>요청유형:</strong> 물류이동</li>
                        <li><strong>요청자:</strong> {userProfile?.displayName || '테스트 사용자'}</li>
                        <li><strong>제품명:</strong> 테스트제품A 외 2건</li>
                        <li><strong>요청내용:</strong> 3건의 물류이동 상세 정보</li>
                      </ul>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Button 
                      onClick={testLogisticsNotification}
                      variant="default"
                      size="sm"
                      className="w-full"
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      물류이동 알림 발송 (Admin/Manager에게)
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Admin과 Manager의 inbox에 알림 추가
                    </p>
                  </div>
                </div>

                {/* Electron 알림 테스트 버튼 */}
                <div className="p-4 border-2 border-purple-200 rounded-lg bg-purple-50">
                  <div className="flex items-center gap-2 mb-3">
                    <TestTube className="h-5 w-5 text-purple-600" />
                    <span className="font-semibold text-purple-800">Electron 알림 테스트</span>
                    <Badge variant="secondary">개발용</Badge>
                  </div>
                  <p className="text-sm text-purple-700 mb-3">
                    Electron 환경에서 커스텀 알림과 시스템 알림을 테스트할 수 있습니다.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      onClick={testElectronCustomNotification}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      🖥️ 커스텀 알림
                    </Button>
                    <Button 
                      onClick={testElectronSystemNotification}
                      variant="outline"
                      className="border-purple-600 text-purple-600 hover:bg-purple-50"
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      시스템 알림
                    </Button>
                    <Button 
                      onClick={testBackgroundNotification}
                      variant="outline"
                      className="border-orange-500 text-orange-600 hover:bg-orange-50"
                    >
                      ⏰ 백그라운드 테스트 (5초 후)
                    </Button>
                  </div>
                </div>

                {/* 권한별 표시 예시 */}
                <div className="grid gap-4">
                  {/* Admin 전용 */}
                  {isAdmin && (
                    <div className="p-4 border-2 border-primary rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <span className="font-semibold">Admin 전용 기능</span>
                        <Badge variant="default">Admin</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        이 카드는 Admin 권한이 있을 때만 표시됩니다.
                      </p>
                      <Button size="sm" className="mt-2" variant="default">
                        관리자 작업 수행
                      </Button>
                    </div>
                  )}

                  {/* Manager 이상 */}
                  {isManager && (
                    <div className="p-4 border-2 border-secondary rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-5 w-5 text-secondary-foreground" />
                        <span className="font-semibold">Manager 이상 기능</span>
                        <Badge variant="secondary">Manager+</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        이 카드는 Manager 또는 Admin 권한이 있을 때 표시됩니다.
                      </p>
                      <Button size="sm" className="mt-2" variant="secondary">
                        매니저 작업 수행
                      </Button>
                    </div>
                  )}

                  {/* 모든 사용자 */}
                  <div className="p-4 border-2 border-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="h-5 w-5 text-muted-foreground" />
                      <span className="font-semibold">모든 사용자 기능</span>
                      <Badge variant="outline">All Users</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      이 카드는 권한과 상관없이 모든 로그인 사용자에게 표시됩니다.
                    </p>
                    <Button size="sm" className="mt-2" variant="outline">
                      일반 작업 수행
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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

          {/* Sonner 토스트 테스트 */}
          <Card>
            <CardHeader>
              <CardTitle>Sonner 토스트 테스트</CardTitle>
              <CardDescription>
                다양한 유형의 알림 테스트
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  onClick={() => toast.success('성공 알림입니다!', {
                    description: '작업이 성공적으로 완료되었습니다.',
                  })}
                  variant="default"
                >
                  성공 알림
                </Button>
                
                <Button
                  onClick={() => toast.error('에러 알림입니다!', {
                    description: '작업 중 오류가 발생했습니다.',
                  })}
                  variant="destructive"
                >
                  에러 알림
                </Button>
                
                <Button
                  onClick={() => toast.info('정보 알림입니다!', {
                    description: '새로운 정보가 있습니다.',
                  })}
                  variant="secondary"
                >
                  정보 알림
                </Button>
                
                <Button
                  onClick={() => toast.warning('경고 알림입니다!', {
                    description: '주의가 필요한 사항입니다.',
                  })}
                  variant="outline"
                >
                  경고 알림
                </Button>
                
                <Button
                  onClick={() => toast('기본 알림입니다!', {
                    description: '일반 메시지입니다.',
                  })}
                  variant="secondary"
                  className="col-span-2"
                >
                  기본 알림
                </Button>
                
                <Button
                  onClick={() => toast.promise(
                    new Promise((resolve) => setTimeout(resolve, 2000)),
                    {
                      loading: '처리 중...',
                      success: '작업 완료!',
                      error: '작업 실패',
                    }
                  )}
                  variant="outline"
                  className="col-span-2"
                >
                  프로미스 알림
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 스피너 컴포넌트 테스트 */}
          <Card>
            <CardHeader>
              <CardTitle>✅ 스피너 컴포넌트 통일 완료</CardTitle>
              <CardDescription>
                프로젝트 전체에서 통일된 2가지 스피너 컴포넌트 사용 중
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* 스피너 통일 완료 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">✅ 스피너 통일 완료</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 1. Spinner 컴포넌트 */}
                  <div className="p-6 bg-muted/50 rounded-lg border-2 border-primary/20">
                    <div className="flex flex-col items-center gap-4">
                      <Spinner size="lg" />
                      <div className="text-center">
                        <h4 className="font-semibold text-sm">Spinner</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Shadcn/ui 기반 원형 테두리 회전<br/>
                          간단한 로딩 상태 표시<br/>
                          <span className="text-green-600 font-semibold">✓ 표준 컴포넌트</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 2. LoadingSpinner 컴포넌트 */}
                  <div className="p-6 bg-muted/50 rounded-lg border-2 border-green-500/20">
                    <div className="flex flex-col items-center gap-4">
                      <LoadingSpinner size="lg" label="" />
                      <div className="text-center">
                        <h4 className="font-semibold text-sm">LoadingSpinner</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Spinner 래퍼 컴포넌트<br/>
                          레이블/오버레이/전체화면 지원<br/>
                          <span className="text-green-600 font-semibold">✓ 고급 기능 제공</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 사용 위치 정보 */}
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="font-semibold text-sm mb-2">✅ 스피너 사용 현황 (통일 완료)</h4>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>✅ <strong>PackagingReportListView.tsx</strong> → LoadingSpinner 사용</li>
                    <li>✅ <strong>PackagingDailyReportContainer.tsx</strong> → Spinner 사용 (DIV 스피너 제거)</li>
                    <li>✅ <strong>PackagingReportForm.tsx</strong> → Spinner 사용 (SVG 스피너 제거)</li>
                  </ul>
                </div>

                {/* 사용 가이드 */}
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-sm mb-2">📖 사용 가이드</h4>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div>
                      <p className="font-semibold text-foreground mb-1">1. 간단한 로딩</p>
                      <code className="bg-muted px-2 py-1 rounded block">{'<Spinner size="lg" label="로딩 중..." />'}</code>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground mb-1">2. 버튼 내부</p>
                      <code className="bg-muted px-2 py-1 rounded block">{'<Spinner size="sm" className="mr-2" />'}</code>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground mb-1">3. 전체 화면 로딩</p>
                      <code className="bg-muted px-2 py-1 rounded block">{'<LoadingSpinner fullScreen={true} />'}</code>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground mb-1">4. 오버레이 로딩</p>
                      <code className="bg-muted px-2 py-1 rounded block">{'<LoadingSpinner overlay={true} label="저장 중..." />'}</code>
                    </div>
                  </div>
                </div>
              </div>
              {/* Spinner 컴포넌트 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">1. Spinner (기본 스피너)</h3>
                <p className="text-sm text-muted-foreground">
                  Shadcn/ui 스타일의 원형 회전 스피너 - 다양한 크기와 색상 variant 지원
                </p>
                
                {/* 크기별 */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">크기별 (Size)</h4>
                  <div className="flex items-center gap-6 p-4 bg-muted/50 rounded-lg">
                    <div className="flex flex-col items-center gap-2">
                      <Spinner size="sm" />
                      <span className="text-xs text-muted-foreground">Small</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Spinner size="default" />
                      <span className="text-xs text-muted-foreground">Default</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Spinner size="lg" />
                      <span className="text-xs text-muted-foreground">Large</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Spinner size="xl" />
                      <span className="text-xs text-muted-foreground">XL</span>
                    </div>
                  </div>
                </div>

                {/* 색상별 */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">색상별 (Variant)</h4>
                  <div className="flex items-center gap-6 p-4 bg-muted/50 rounded-lg">
                    <div className="flex flex-col items-center gap-2">
                      <Spinner variant="default" />
                      <span className="text-xs text-muted-foreground">Default</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Spinner variant="secondary" />
                      <span className="text-xs text-muted-foreground">Secondary</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Spinner variant="muted" />
                      <span className="text-xs text-muted-foreground">Muted</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Spinner variant="destructive" />
                      <span className="text-xs text-muted-foreground">Destructive</span>
                    </div>
                  </div>
                </div>

                {/* 레이블과 함께 */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">레이블과 함께</h4>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <Spinner size="lg" label="로딩 중..." />
                  </div>
                </div>
              </div>

              {/* LoadingSpinner 컴포넌트 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">2. LoadingSpinner (고급 래퍼)</h3>
                <p className="text-sm text-muted-foreground">
                  Spinner를 래핑한 고급 컴포넌트 - 전체 화면, 오버레이 옵션 지원
                </p>

                {/* 기본 사용 */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">기본 사용</h4>
                  <div className="p-8 bg-muted/50 rounded-lg">
                    <LoadingSpinner label="데이터 로딩 중..." />
                  </div>
                </div>

                {/* 크기별 */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">크기별 LoadingSpinner</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-6 bg-muted/50 rounded-lg">
                      <LoadingSpinner size="sm" label="Small" />
                    </div>
                    <div className="p-6 bg-muted/50 rounded-lg">
                      <LoadingSpinner size="default" label="Default" />
                    </div>
                    <div className="p-6 bg-muted/50 rounded-lg">
                      <LoadingSpinner size="lg" label="Large" />
                    </div>
                    <div className="p-6 bg-muted/50 rounded-lg">
                      <LoadingSpinner size="xl" label="XL" />
                    </div>
                  </div>
                </div>

                {/* 색상별 */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">색상별 LoadingSpinner</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-6 bg-muted/50 rounded-lg">
                      <LoadingSpinner variant="default" label="Default" />
                    </div>
                    <div className="p-6 bg-muted/50 rounded-lg">
                      <LoadingSpinner variant="secondary" label="Secondary" />
                    </div>
                    <div className="p-6 bg-muted/50 rounded-lg">
                      <LoadingSpinner variant="muted" label="Muted" />
                    </div>
                    <div className="p-6 bg-muted/50 rounded-lg">
                      <LoadingSpinner variant="destructive" label="Error" />
                    </div>
                  </div>
                </div>

                {/* 실제 사용 예시 */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">실제 사용 예시 - 카드 내부</h4>
                  <Card className="min-h-[200px] relative">
                    <CardContent className="p-0">
                      <LoadingSpinner 
                        size="lg"
                        variant="default"
                        label="데이터를 불러오는 중..."
                        overlay={true}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* 코드 예시 */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">코드 사용 예시</h3>
                <div className="p-4 bg-slate-900 text-slate-50 rounded-lg font-mono text-xs space-y-2 overflow-x-auto">
                  <div>
                    <p className="text-green-400">// Spinner 사용</p>
                    <p className="text-blue-300">import {'{'} Spinner {'}'} from '@/shared/components/ui/spinner';</p>
                    <p className="text-yellow-200">&lt;Spinner size="lg" variant="default" label="로딩 중..." /&gt;</p>
                  </div>
                  <div className="pt-2">
                    <p className="text-green-400">// LoadingSpinner 사용</p>
                    <p className="text-blue-300">import {'{'} LoadingSpinner {'}'} from '@/shared/components/common/LoadingSpinner';</p>
                    <p className="text-yellow-200">&lt;LoadingSpinner size="default" overlay={'{true}'} /&gt;</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
      </div>
    </ProtectedRoute>
  );
}
