'use client';

import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { useAuth, useUserRole, useIsAdmin, useIsManager } from '@/features/auth/hooks';
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
import { Shield, Lock, MessageSquare, TestTube } from 'lucide-react';
import { NotificationManager } from '@/shared/components/common/CustomNotification';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date | { toDate?: () => Date };
}

export default function DashboardPage() {
  const { user, userProfile } = useAuth();
  const currentRole = useUserRole();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const { dummyRole } = useDevStore();
  const { stats, isLoading: dashboardLoading, fetchStats } = useDashboardStore();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [loading, setLoading] = useState(false);

  // UserProfile 콘솔 로그
  useEffect(() => {
    console.log('=====================================');
    console.log('🔍 [Dashboard] User:', user);
    console.log('🔍 [Dashboard] User UID:', user?.uid);
    console.log('🔍 [Dashboard] User Email:', user?.email);
    console.log('=====================================');
    console.log('🔍 [Dashboard] UserProfile:', userProfile);
    console.log('🔍 [Dashboard] UserProfile UID:', userProfile?.uid);
    console.log('🔍 [Dashboard] UserProfile Email:', userProfile?.email);
    console.log('🔍 [Dashboard] UserProfile Name:', userProfile?.name);
    console.log('🔍 [Dashboard] UserProfile Role:', userProfile?.role);
    console.log('=====================================');
    
    // UserProfile이 null인 경우 수동으로 프로필 조회 시도
    if (user && !userProfile) {
      console.warn('⚠️ UserProfile이 null입니다. 수동으로 프로필 조회를 시도합니다...');
      import('@/shared/services/firebase/userProfile').then(({ getUserProfile }) => {
        getUserProfile(user.uid).then(profile => {
          console.log('🔍 [Manual Fetch] 수동 조회 결과:', profile);
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

  // 멘션 알림 테스트 함수
  const testMentionNotification = async () => {
    try {
      console.log('🔔 [Dashboard] 포그라운드 알림 테스트 시작');
      console.log('🔍 [Dashboard] Tauri 환경:', typeof window !== 'undefined' && window.__TAURI__);
      
      // 테스트용 사용자 프로필 이미지
      const senderAvatar = (userProfile as any)?.photoURL;
      const senderName = '이현석본부장';
      
      console.log('📤 [Dashboard] 알림 데이터:', {
        senderName,
        senderAvatar,
        hasTauri: typeof window !== 'undefined' && window.__TAURI__
      });
      
      // 자체 알림 시스템 사용
      await NotificationManager.notify({
        title: '생산관리부 요청사항',
        body: '신30ML진공/캡 (@이현석본부장)본부장님 테스트입니다',
        senderName: senderName,
        senderAvatar: senderAvatar,
        type: 'mention',
        onClick: () => {
          console.log('멘션 알림 클릭됨!');
          // 실제로는 해당 요청 페이지로 이동
        }
      });
      
      toast.success('알림 요청이 전송되었습니다!');
      
    } catch (error) {
      console.error('❌ [Dashboard] 알림 테스트 실패:', error);
      toast.error('알림 테스트 중 오류가 발생했습니다.');
    }
  };

  // 백그라운드 알림 테스트 함수
  const testBackgroundNotification = async () => {
    try {
      console.log('🌙 [Dashboard] 백그라운드 알림 테스트 시작');
      
      // 앱을 백그라운드로 전환
      NotificationManager.setAppState(false);
      
      // 백그라운드 알림 테스트
      await NotificationManager.notify({
        title: '생산관리부 요청사항',
        body: '신30ML진공/캡 (@이현석본부장)백그라운드 테스트입니다',
        senderName: '이현석본부장',
        senderAvatar: (userProfile as any)?.photoURL,
        type: 'mention',
        onClick: () => {
          console.log('백그라운드 알림 클릭됨!');
        }
      });
      
      toast.success('백그라운드 알림이 전송되었습니다! (시스템 알림 확인)');
      
      // 3초 후 포그라운드로 복원
      setTimeout(() => {
        console.log('☀️ [Dashboard] 포그라운드로 복원');
        NotificationManager.setAppState(true);
      }, 3000);
      
    } catch (error) {
      console.error('❌ [Dashboard] 백그라운드 알림 테스트 실패:', error);
      toast.error('백그라운드 알림 테스트 중 오류가 발생했습니다.');
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

                {/* 멘션 알림 테스트 버튼 */}
                <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                  <div className="flex items-center gap-2 mb-3">
                    <TestTube className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-blue-800">멘션 알림 테스트</span>
                    <Badge variant="secondary">개발용</Badge>
                  </div>
                  <p className="text-sm text-blue-700 mb-3">
                    멘션 알림 기능을 테스트할 수 있습니다. 버튼을 클릭하면 우측 상단에 자체 알림이 표시됩니다.
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      onClick={testMentionNotification}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      포그라운드 알림
                    </Button>
                    <Button 
                      onClick={testBackgroundNotification}
                      variant="outline"
                      className="border-blue-600 text-blue-600 hover:bg-blue-50"
                    >
                      <TestTube className="h-4 w-4 mr-2" />
                      백그라운드 알림
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
