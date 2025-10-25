import { Metadata } from 'next';
import { AnnouncementContainer } from '@/features/announcements';
import { ProtectedRoute } from '@/shared/components/auth';

export const metadata: Metadata = {
  title: '공지사항 | HS Next',
  description: 'HS Next 공지사항 페이지입니다.',
};

export default function AnnouncementsPage() {
  return (
    <ProtectedRoute>
      <AnnouncementContainer />
    </ProtectedRoute>
  );
}
