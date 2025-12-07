import { AnnouncementContainer } from '@/features/announcements';
import { ProtectedRoute } from '@/features/auth';

export default function AnnouncementsPage() {
  return (
    <ProtectedRoute>
      <AnnouncementContainer />
    </ProtectedRoute>
  );
}


