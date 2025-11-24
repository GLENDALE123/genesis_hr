/**
 * 채팅 메인 페이지
 */

import { ChatPageClient } from './ChatPageClient';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <ChatPageClient />
    </ProtectedRoute>
  );
}

