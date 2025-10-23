import { Metadata } from 'next';
import { AnnouncementContainer } from '@/features/announcements';

export const metadata: Metadata = {
  title: '공지사항 | HS Next',
  description: 'HS Next 공지사항 페이지입니다.',
};

export default function AnnouncementsPage() {
  return <AnnouncementContainer />;
}
