import { Metadata } from 'next';
import { WorkScheduleContainer } from '@/features/work-schedule';

export const metadata: Metadata = {
  title: '근무계획 | HS Next',
  description: '월별 근무계획 관리 및 조회',
};

export default function WorkSchedulePage() {
  return <WorkScheduleContainer />;
}
