import { useState, useEffect } from 'react';
import { WorkScheduleService } from '../services/workScheduleService';
import { WorkType, WORK_TYPES } from '../types';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth';
import { getUserDisplayName } from '@/shared/utils/user/userUtils';

export const useScheduleActions = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, userProfile } = useAuthStore();

  // 지난 날짜 근무계획 자동 삭제 (하루 1회)
  useEffect(() => {
    const deleteExpiredSchedules = async () => {
      const lastCleanupDate = localStorage.getItem('lastScheduleCleanup');
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
      
      if (lastCleanupDate === todayStr) {
        return; // 오늘 이미 실행됨
      }

      try {
        const totalDeleted = await WorkScheduleService.deleteExpiredSchedules();
        
        // 실행 완료 기록
        localStorage.setItem('lastScheduleCleanup', todayStr);
        
        if (totalDeleted > 0) {
          toast.info(`지난 날짜 근무계획 ${totalDeleted}개가 자동으로 삭제되었습니다.`);
        }
      } catch (error) {
        console.error('지난 날짜 근무계획 삭제 실패:', error);
        toast.error('지난 날짜 근무계획 자동 삭제 중 오류가 발생했습니다.');
      }
    };

    // 초기 데이터 로드 후 실행
    const timeoutId = setTimeout(deleteExpiredSchedules, 2000);
    return () => clearTimeout(timeoutId);
  }, []);

  // 근무계획 적용
  const applySchedule = async (type: WorkType, dates: Set<string>): Promise<boolean> => {
    if (dates.size === 0) {
      toast.error('날짜를 먼저 선택하세요.');
      return false;
    }

    setIsSubmitting(true);
    try {
      const scheduleData = WORK_TYPES[type];
      await WorkScheduleService.applySchedule(
        type, 
        dates, 
        scheduleData.description,
        getUserDisplayName(user, userProfile, '관리자'),
        user?.uid || 'unknown'
      );
      
      toast.success(`${dates.size}개 날짜에 '${type}' 적용됨`);
      return true;
    } catch (error) {
      console.error('근무계획 적용 실패:', error);
      toast.error('근무계획 적용 중 오류가 발생했습니다.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // 근무계획 삭제
  const deleteSchedule = async (dates: Set<string>): Promise<boolean> => {
    if (dates.size === 0) {
      toast.error('날짜를 먼저 선택하세요.');
      return false;
    }

    setIsSubmitting(true);
    try {
      await WorkScheduleService.deleteSchedule(dates);
      toast.success(`${dates.size}개 날짜의 계획 삭제됨`);
      return true;
    } catch (error) {
      console.error('근무계획 삭제 실패:', error);
      toast.error('근무계획 삭제 중 오류가 발생했습니다.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    applySchedule,
    deleteSchedule
  };
};
