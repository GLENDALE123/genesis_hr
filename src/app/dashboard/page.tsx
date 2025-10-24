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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import { Label } from '@/shared/components/ui/label';
import { toast } from 'sonner';
import { Shield, Lock, TestTube, Bell, Send, Users, User } from 'lucide-react';
// import { createTestShortageNotification } from '@/shared/services/notificationService';

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
  const [selectedRequestType, setSelectedRequestType] = useState('물류이동');
  const [notificationTarget, setNotificationTarget] = useState<'admin-manager' | 'current-user'>('admin-manager');

  // UserProfile은 authStore의 initializeAuth에서 자동으로 로드됨 (재시도 로직 포함)

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
        await window.electron.showNotification({
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
        await window.electron.showNotification({
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
          await electron.showNotification({
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
  // const testLogisticsNotification = async () => {
  //   if (!user || !userProfile) {
  //     toast.error('사용자 정보가 없습니다.');
  //     return;
  //   }

  //   try {
  //     const { createTestLogisticsNotification } = await import('@/shared/services/notificationService');
  //     await createTestLogisticsNotification(userProfile.displayName, user.uid, user.photoURL || undefined);
  //     toast.success('물류이동 테스트 알림이 Admin/Manager에게 발송되었습니다!');
  //   } catch (error) {
  //     console.error('물류이동 알림 발송 실패:', error);
  //     toast.error('물류이동 알림 발송에 실패했습니다.');
  //   }
  // };

  // 부족분 알림 테스트
  // const testShortageNotification = async () => {
  //   if (!user || !userProfile) {
  //     toast.error('사용자 정보가 없습니다.');
  //     return;
  //   }

  //   try {
  //     const { createTestShortageNotification } = await import('@/shared/services/notificationService');
  //     await createTestShortageNotification(userProfile.displayName, user.uid, user.photoURL || undefined);
  //     toast.success('부족분 신청 테스트 알림이 Admin/Manager에게 발송되었습니다!');
  //   } catch (error) {
  //     console.error('부족분 알림 테스트 실패:', error);
  //     toast.error('알림 테스트에 실패했습니다.');
  //   }
  // };

  // 로그인한 사용자에게만 알림을 보내는 함수
  // const sendNotificationToCurrentUser = async (type: string, content: Record<string, unknown>) => {
  //   if (!user || !userProfile) {
  //     toast.error('사용자 정보가 없습니다.');
  //     return;
  //   }

  //   try {
  //     // Firebase Functions URL 설정
  //     const functionsUrl = 'https://asia-northeast3-hs-jig-b2093.cloudfunctions.net';
      
  //     const payload = {
  //       targetUsers: [user.uid], // 로그인한 사용자에게만
  //       type: type,
  //       title: content.title,
  //       body: content.body,
  //       requestId: `TEST-${Date.now()}`,
  //       subtitle: content.subtitle,
  //       senderName: userProfile.displayName,
  //       senderUid: user.uid,
  //       senderAvatar: user.photoURL || undefined,
  //       priority: 'normal'
  //     };

  //     const response = await fetch(`${functionsUrl}/createNotification`, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify(payload)
  //     });

  //     if (!response.ok) {
  //       throw new Error(`알림 전송 실패: ${response.status}`);
  //     }

  //     toast.success(`${selectedRequestType} 테스트 알림이 본인에게 발송되었습니다!`);
  //   } catch (error) {
  //     console.error('알림 발송 실패:', error);
  //     toast.error('알림 발송에 실패했습니다.');
  //   }
  // };

  // 통합 알림 테스트 함수
  const testNotification = async () => {
    if (!user || !userProfile) {
      toast.error('사용자 정보가 없습니다.');
      return;
    }

    try {
      // 본인에게만 발송하는 경우 - 실제 비즈니스 로직을 사용하되 targetUsers를 본인으로만 제한
      if (notificationTarget === 'current-user') {
        const functionsUrl = 'https://asia-northeast3-hs-jig-b2093.cloudfunctions.net';
        
        // 실제 비즈니스 로직에서 생성할 payload 데이터
        let payload: Record<string, unknown> = {};
        
        if (selectedRequestType === '물류이동') {
          payload = {
            targetUsers: [user.uid], // 본인에게만
            type: 'production-request',
            title: '생산관리부 요청사항',
            body: `통합 물류 이동 요청 (3건):
---------------------
- 제품: 테스트제품A / 부속A
- 발주번호: PO-TEST-001
- 발주처: 테스트공급사
- 사양: 테스트사양
- 양품수량: 10,000 EA
- 포장단위: 100
- 박스수량: 100
- 잔량: 0
- 도착처: 군포공장
- 추가 요청: 긴급 배송 요청

---------------------
- 제품: 테스트제품B / 부속B
- 발주번호: PO-TEST-002
- 발주처: 테스트공급사2
- 사양: 테스트사양2
- 양품수량: 5,000 EA
- 포장단위: 50
- 박스수량: 100
- 잔량: 0
- 도착처: 화성공장
- 추가 요청: 오후 3시까지 도착 요망`,
            requestId: 'P-TEST-001',
            subtitle: '테스트제품A 외 2건',
            centerInfo: '물류이동 요청',
            senderName: userProfile.displayName,
            senderUid: user.uid,
            senderAvatar: user.photoURL || undefined
          };
        } else if (selectedRequestType === '부족분관리') {
          payload = {
            targetUsers: [user.uid], // 본인에게만
            type: 'shortage-request',
            title: '부족분 신청',
            body: '1,000EA, 사유: 테스트용 부족분 신청입니다.',
            requestId: 'TEST-SHORTAGE-001',
            subtitle: '테스트크림 / 외용기',
            centerInfo: '부족분 신청',
            senderName: userProfile.displayName,
            senderUid: user.uid,
            senderAvatar: user.photoURL || undefined
          };
        } else if (selectedRequestType === '긴급건') {
          payload = {
            targetUsers: [user.uid], // 본인에게만
            type: 'production-request',
            title: '생산관리부 요청사항',
            body: `긴급 생산 요청사항입니다.

제품: 테스트크림 / 외용기
발주번호: PO-URGENT-001
발주처: 긴급테스트공급사
수량: 5,000 EA

긴급 처리 요청드립니다.`,
            requestId: 'P-TEST-001',
            subtitle: '테스트크림 / 외용기',
            centerInfo: '긴급건',
            senderName: userProfile.displayName,
            senderUid: user.uid,
            senderAvatar: user.photoURL || undefined
          };
        } else if (selectedRequestType === '영업부 긴급요청') {
          payload = {
            targetUsers: [user.uid], // 본인에게만
            type: 'production-request',
            title: '생산관리부 요청사항',
            body: `영업부 긴급 요청사항입니다.

제품: 프리미엄로션 / 펌프
발주번호: PO-SALES-001
발주처: 영업테스트공급사
수량: 3,000 EA

고객 납기 요청으로 긴급 처리 필요합니다.`,
            requestId: 'P-TEST-001',
            subtitle: '프리미엄로션 / 펌프',
            centerInfo: '영업부 긴급요청',
            senderName: userProfile.displayName,
            senderUid: user.uid,
            senderAvatar: user.photoURL || undefined
          };
        } else if (selectedRequestType === '생산일정') {
          payload = {
            targetUsers: [user.uid], // 본인에게만
            type: 'production-schedule',
            title: '생산일정',
            body: `${userProfile.displayName}님이 생산일정을 변경했습니다.`,
            requestId: `TEST-SCHEDULE-${Date.now()}`,
            subtitle: '테스트제품A 생산일정',
            senderName: userProfile.displayName,
            senderUid: user.uid,
            priority: 'normal'
          };
        } else if (selectedRequestType === '생산일보 상태 변경') {
          payload = {
            targetUsers: [user.uid], // 본인에게만
            type: 'daily-report',
            title: '생산일보 상태 변경',
            body: `${userProfile.displayName}님이 생산일보 상태를 "작업중"으로 변경했습니다.

제품: 테스트제품 / 테스트부속
라인: 증착1
작업일: ${new Date().toISOString().split('T')[0]}
이전 상태: 대기
현재 상태: 작업중`,
            requestId: `TEST-DAILY-REPORT-STATUS-${Date.now()}`,
            subtitle: '테스트제품 / 증착1',
            senderName: userProfile.displayName,
            senderUid: user.uid,
            priority: 'normal',
            centerInfo: '생산일보 상태 변경'
          };
        } else if (selectedRequestType === '샘플 요청 상태 변경') {
          payload = {
            targetUsers: [user.uid], // 본인에게만
            type: 'sample-status',
            title: '샘플 요청 상태 변경',
            body: `${userProfile.displayName}님이 샘플 요청 상태를 "진행중"으로 변경했습니다.

제품: 테스트제품
고객사: 테스트고객사
요청일: ${new Date().toISOString().split('T')[0]}
이전 상태: 접수
현재 상태: 진행중`,
            requestId: `TEST-SAMPLE-STATUS-${Date.now()}`,
            subtitle: '테스트제품 / 테스트고객사',
            senderName: userProfile.displayName,
            senderUid: user.uid,
            priority: 'normal',
            centerInfo: '샘플 요청 상태 변경'
          };
        } else if (selectedRequestType === '샘플 요청') {
          payload = {
            targetUsers: [user.uid], // 본인에게만
            type: 'sample-request',
            title: '샘플 요청',
            body: `${userProfile.displayName}님이 샘플 요청을 등록했습니다.`,
            requestId: `TEST-SAMPLE-${Date.now()}`,
            subtitle: '테스트크림 / 외용기',
            senderName: userProfile.displayName,
            senderUid: user.uid,
            priority: 'normal'
          };
        } else if (selectedRequestType === '생산관리부 댓글') {
          payload = {
            targetUsers: [user.uid], // 본인에게만
            type: 'comment-mention',
            title: '생산관리부 요청사항',
            body: `${userProfile.displayName}님이 생산관리부 요청사항에 댓글을 남겼습니다.`,
            requestId: `TEST-COMMENT-${Date.now()}`,
            subtitle: '테스트크림 / 외용기',
            senderName: userProfile.displayName,
            senderUid: user.uid,
            priority: 'normal'
          };
        } else if (selectedRequestType === '샘플요청 댓글') {
          payload = {
            targetUsers: [user.uid], // 본인에게만
            type: 'comment-mention',
            title: '샘플 요청',
            body: `${userProfile.displayName}님이 샘플 요청에 댓글을 남겼습니다.`,
            requestId: `TEST-SAMPLE-COMMENT-${Date.now()}`,
            subtitle: '테스트샘플 / 내용기',
            senderName: userProfile.displayName,
            senderUid: user.uid,
            priority: 'normal'
          };
        } else if (selectedRequestType === '품질이슈 등록') {
          payload = {
            targetUsers: [user.uid],
            type: 'quality-issue-created',
            title: '품질이슈 등록',
            body: `${userProfile.displayName}님이 품질이슈를 등록했습니다.`,
            requestId: `TEST-QUALITY-${Date.now()}`,
            subtitle: '테스트제품 / 테스트부속',
            centerInfo: '미해결',
            senderName: userProfile.displayName,
            senderUid: user.uid,
            priority: 'normal'
          };
        } else if (selectedRequestType === '품질이슈사항 추가') {
          payload = {
            targetUsers: [user.uid],
            type: 'quality-issue-status',
            title: '품질이슈 상태 변경',
            body: `${userProfile.displayName}님이 품질이슈사항을 추가했습니다.`,
            requestId: `TEST-QUALITY-ITEM-${Date.now()}`,
            subtitle: '테스트제품 / 테스트부속',
            centerInfo: '진행중',
            senderName: userProfile.displayName,
            senderUid: user.uid,
            priority: 'normal'
          };
        }

        // Firebase Functions로 직접 전송
        const response = await fetch(`${functionsUrl}/createNotification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`알림 전송 실패: ${response.status}`);
        }

        toast.success(`${selectedRequestType} 테스트 알림이 본인에게 발송되었습니다!`);
        return;
      }

      // Admin/Manager에게 발송하는 경우 - 실제 비즈니스 로직 서비스들을 호출
      const { 
        createTestLogisticsNotification,
        createTestShortageNotification,
        createTestProductionRequestNotification
      } = await import('@/shared/services/notificationService');

      if (selectedRequestType === '물류이동') {
        await createTestLogisticsNotification(userProfile.displayName, user.uid, user.photoURL || undefined);
      } else if (selectedRequestType === '부족분관리') {
        await createTestShortageNotification(userProfile.displayName, user.uid, user.photoURL || undefined);
      } else if (selectedRequestType === '긴급건') {
        await createTestProductionRequestNotification(userProfile.displayName, user.uid, user.photoURL || undefined, '긴급건');
      } else if (selectedRequestType === '영업부 긴급요청') {
        await createTestProductionRequestNotification(userProfile.displayName, user.uid, user.photoURL || undefined, '영업부 긴급요청');
      } else if (selectedRequestType === '생산일정') {
        // 생산일정 알림 테스트 - 실제 비즈니스 로직 호출
        const { sendProductionScheduleNotification } = await import('@/shared/services/notificationService');
        await sendProductionScheduleNotification(
          'created',
          {
            productName: '테스트제품A',
            partName: '부속A',
            planDate: '2024-01-15',
            planQuantity: 1000,
            productionLine: '라인1'
          },
          {
            uid: user.uid,
            displayName: userProfile.displayName,
            photoURL: user.photoURL || undefined
          }
        );
      } else if (selectedRequestType === '생산일보 상태 변경') {
        // 생산일보 상태 변경 알림 테스트 - 실제 비즈니스 로직 호출
        const { DailyReportNotificationService } = await import('@/shared/services/notificationService');
        const { ProductionStatus } = await import('@/features/production/types');
        await DailyReportNotificationService.sendTestDailyReportStatusNotification(
          ProductionStatus.Pending,
          ProductionStatus.InProgress,
          {
            uid: user.uid,
            displayName: userProfile.displayName,
            photoURL: user.photoURL || undefined
          }
        );
      } else if (selectedRequestType === '샘플 요청 상태 변경') {
        // 샘플 요청 상태 변경 알림 테스트 - 실제 비즈니스 로직 호출
        const { SampleStatusNotificationService } = await import('@/shared/services/notificationService');
        const { SampleStatus } = await import('@/features/sample/types/sample.types');
        await SampleStatusNotificationService.sendTestSampleStatusNotification(
          SampleStatus.Received,
          SampleStatus.InProgress,
          {
            uid: user.uid,
            displayName: userProfile.displayName,
            photoURL: user.photoURL || undefined
          }
        );
      } else if (selectedRequestType === '샘플 요청') {
        // 샘플 요청 알림 테스트 - 실제 비즈니스 로직 호출
        const { SampleService } = await import('@/features/sample/services/sampleService');
        await SampleService.sendNewSampleRequestNotification(
          `TEST-SAMPLE-${Date.now()}`,
          {
            productName: '테스트크림',
            items: [{
              partName: '외용기',
              colorSpec: '테스트 색상',
              quantity: 100,
              postProcessing: ['인쇄'],
              coatingMethod: '스프레이'
            }],
            requestDate: new Date().toISOString().split('T')[0],
            requesterName: userProfile.displayName,
            contact: '010-1234-5678',
            clientName: '테스트 고객사',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            remarks: '테스트 알림용 샘플 요청입니다.'
          },
          {
            uid: user.uid,
            displayName: userProfile.displayName
          }
        );
      } else if (selectedRequestType === '생산관리부 댓글') {
        // 댓글 알림 테스트 - 실제 비즈니스 로직 호출
        const { CommentsService } = await import('@/shared/services/comments/commentsService');
        await CommentsService.sendTestCommentNotification(
          userProfile.displayName,
          user.uid,
          user.photoURL || undefined,
          '생산관리부'
        );
      } else if (selectedRequestType === '샘플요청 댓글') {
        // 샘플요청 댓글 알림 테스트 - 실제 비즈니스 로직 호출
        const { CommentsService } = await import('@/shared/services/comments/commentsService');
        await CommentsService.sendTestCommentNotification(
          userProfile.displayName,
          user.uid,
          user.photoURL || undefined,
          '샘플요청'
        );
      } else if (selectedRequestType === '품질이슈 등록') {
        // 품질이슈 등록 알림 테스트 - 실제 비즈니스 로직 호출
        const { QualityIssueNotificationService } = await import('@/shared/services/notificationService');
        await QualityIssueNotificationService.sendTestQualityIssueNotification({
          uid: user.uid,
          displayName: userProfile.displayName,
          photoURL: user.photoURL || undefined
        });
      } else if (selectedRequestType === '품질이슈사항 추가') {
        // 품질이슈사항 추가 알림 테스트 - 실제 비즈니스 로직 호출
        const { QualityIssueNotificationService } = await import('@/shared/services/notificationService');
        await QualityIssueNotificationService.sendTestQualityIssueStatusNotification(
          '열림',
          '해결됨',
          {
            uid: user.uid,
            displayName: userProfile.displayName,
            photoURL: user.photoURL || undefined
          }
        );
      }

      toast.success(`${selectedRequestType} 테스트 알림이 성공적으로 발송되었습니다!`);
    } catch (error) {
      console.error('알림 테스트 실패:', error);
      toast.error('알림 테스트에 실패했습니다.');
    }
  };

  useEffect(() => {
    loadTodos();
    fetchStats(); // 대시보드 통계 데이터 로드
  }, [fetchStats]);

  return (
    <ProtectedRoute>
      <div className="space-y-6 max-w-7xl mx-auto">
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

                {/* 통합 알림 테스트 */}
                <div className="p-4 border-2 border-purple-200 rounded-lg bg-purple-50 dark:bg-purple-950/20 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Send className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <h3 className="font-semibold text-purple-800 dark:text-purple-200">알림 테스트</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {/* 알림 대상 선택 라디오 버튼 */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-purple-700 dark:text-purple-300">
                        알림 대상 선택
                      </Label>
                      <RadioGroup
                        value={notificationTarget}
                        onValueChange={(value) => setNotificationTarget(value as 'admin-manager' | 'current-user')}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="admin-manager" id="admin-manager" />
                          <Label htmlFor="admin-manager" className="flex items-center gap-2 cursor-pointer">
                            <Users className="h-4 w-4" />
                            <span>Admin/Manager에게 발송</span>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="current-user" id="current-user" />
                          <Label htmlFor="current-user" className="flex items-center gap-2 cursor-pointer">
                            <User className="h-4 w-4" />
                            <span>본인에게만 발송 (임시용)</span>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="flex items-center gap-3">
                      <Select value={selectedRequestType} onValueChange={setSelectedRequestType}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="요청유형 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="물류이동">물류이동</SelectItem>
                          <SelectItem value="긴급건">긴급건</SelectItem>
                          <SelectItem value="영업부 긴급요청">영업부 긴급요청</SelectItem>
                          <SelectItem value="부족분관리">부족분관리</SelectItem>
                          <SelectItem value="생산일정">생산일정</SelectItem>
                          <SelectItem value="생산일보 상태 변경">생산일보 상태 변경</SelectItem>
        <SelectItem value="샘플 요청 상태 변경">샘플 요청 상태 변경</SelectItem>
                          <SelectItem value="샘플 요청">샘플 요청</SelectItem>
                          <SelectItem value="생산관리부 댓글">생산관리부 댓글</SelectItem>
                          <SelectItem value="샘플요청 댓글">샘플요청 댓글</SelectItem>
                          <SelectItem value="품질이슈 등록">품질이슈 등록</SelectItem>
                          <SelectItem value="품질이슈사항 추가">품질이슈사항 추가</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button 
                        onClick={testNotification}
                        variant="default"
                        size="sm"
                        className="flex-1"
                      >
                        <Bell className="h-4 w-4 mr-2" />
                        {selectedRequestType} 알림 발송
                        {notificationTarget === 'current-user' && (
                          <span className="ml-2 text-xs opacity-75">(본인에게)</span>
                        )}
                      </Button>
                    </div>
                    
                    <div className="text-sm space-y-1">
                      <p className="font-medium text-purple-700 dark:text-purple-300">알림 내용:</p>
                      <ul className="text-xs text-purple-600 dark:text-purple-400 space-y-1 ml-4 list-disc">
            <li><strong>알림 타이틀:</strong> {
              selectedRequestType === '부족분관리' ? '부족분 신청' :
              selectedRequestType === '생산일정' ? '생산일정' :
              selectedRequestType === '생산일보 상태 변경' ? '생산일보 상태 변경' :
              selectedRequestType === '샘플 요청 상태 변경' ? '샘플 요청 상태 변경' :
              selectedRequestType === '샘플 요청' ? '샘플 요청' :
              selectedRequestType === '생산관리부 댓글' ? '생산관리부 요청사항' :
              selectedRequestType === '샘플요청 댓글' ? '샘플 요청' :
              selectedRequestType === '품질이슈 등록' ? '품질이슈 등록' :
              selectedRequestType === '품질이슈사항 추가' ? '품질이슈사항 추가' :
              '생산관리부 요청사항'
            }</li>
                        <li><strong>발신자:</strong> {userProfile?.displayName || '테스트 사용자'}</li>
                        {(selectedRequestType === '생산관리부 댓글' || selectedRequestType === '샘플요청 댓글') ? (
                          <>
                            <li><strong>댓글 내용:</strong> {
                              selectedRequestType === '생산관리부 댓글' 
                                ? '생산관리부 요청사항에 대한 댓글입니다. 확인 부탁드립니다.'
                                : '샘플 요청 건에 대한 피드백이 도착했습니다.'
                            }</li>
                            <li><strong>알림 타입:</strong> 웹 UI 포그라운드 알림</li>
                          </>
                        ) : (
                          <>
                            <li><strong>요청유형:</strong> {selectedRequestType}</li>
                            {selectedRequestType === '물류이동' && (
                              <>
                                <li><strong>제품명:</strong> 테스트제품A 외 2건</li>
                                <li><strong>요청내용:</strong> 3건의 물류이동 상세 정보</li>
                              </>
                            )}
                            {selectedRequestType === '긴급건' && (
                              <>
                                <li><strong>제품명:</strong> 테스트크림 / 외용기</li>
                                <li><strong>요청내용:</strong> 긴급 생산 요청사항</li>
                              </>
                            )}
                            {selectedRequestType === '영업부 긴급요청' && (
                              <>
                                <li><strong>제품명:</strong> 프리미엄로션 / 펌프</li>
                                <li><strong>요청내용:</strong> 영업부 긴급 요청사항</li>
                              </>
                            )}
                            {selectedRequestType === '생산일정' && (
                              <>
                                <li><strong>제품명:</strong> 테스트제품A</li>
                                <li><strong>일정내용:</strong> 생산일정 변경</li>
                                <li><strong>변경일시:</strong> 2024-01-15 14:30</li>
                              </>
                            )}
                            {selectedRequestType === '생산일보 상태 변경' && (
                              <>
                                <li><strong>제품명:</strong> 테스트제품 / 테스트부속</li>
                                <li><strong>라인:</strong> 증착1</li>
                                <li><strong>상태변경:</strong> 대기 → 작업중</li>
                                <li><strong>변경일시:</strong> {new Date().toLocaleString()}</li>
                              </>
                            )}
                            {selectedRequestType === '샘플 요청 상태 변경' && (
                              <>
                                <li><strong>제품명:</strong> 테스트제품</li>
                                <li><strong>고객사:</strong> 테스트고객사</li>
                                <li><strong>상태변경:</strong> 접수 → 진행중</li>
                                <li><strong>변경일시:</strong> {new Date().toLocaleString()}</li>
                              </>
                            )}
                            {selectedRequestType === '샘플 요청' && (
                              <>
                                <li><strong>제품명:</strong> 테스트크림 / 외용기</li>
                                <li><strong>요청내용:</strong> 샘플 요청 등록</li>
                              </>
                            )}
                            {selectedRequestType === '부족분관리' && (
                              <>
                                <li><strong>제품명:</strong> 테스트크림 / 외용기</li>
                                <li><strong>요청수량:</strong> 1,000 EA</li>
                                <li><strong>사유:</strong> 테스트용 부족분 신청</li>
                              </>
                            )}
                          </>
                        )}
                      </ul>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      {notificationTarget === 'admin-manager' 
                        ? '실제 비즈니스 로직을 통해 Admin과 Manager에게 알림 발송'
                        : '실제 비즈니스 로직을 사용하되 본인에게만 발송 (임시용)'
                      }
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
                <div className="text-xl font-bold">
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
                <div className="text-xl font-bold">
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
                <div className="text-xl font-bold">
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
                <div className="text-xl font-bold">
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
      </div>
    </ProtectedRoute>
  );
}
