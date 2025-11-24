import { AnnouncementContainer } from '@/features/announcements';
import { ProtectedRoute } from '@/shared/components/auth';

export default function AnnouncementsPage() {
  return (
    <ProtectedRoute>
      <AnnouncementContainer />
    </ProtectedRoute>
  );
}

