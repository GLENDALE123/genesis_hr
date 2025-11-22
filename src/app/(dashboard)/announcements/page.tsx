import { Metadata } from 'next';
import { AnnouncementContainer } from '@/features/announcements';
import { ProtectedRoute } from '@/shared/components/auth';

export const metadata: Metadata = {
  title: '공지사항 | TMS 통합관리시스템',
  description: 'TMS 통합관리시스템 공지사항 페이지입니다.',
};

export default function AnnouncementsPage() {
  return (
    <ProtectedRoute>
      <AnnouncementContainer />
    </ProtectedRoute>
  );
}

