/**
 * 개별 채팅방 페이지
 */

import { ChatRoomPageClient } from './ChatRoomPageClient';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';

// 동적 라우트를 위한 설정
export const dynamicParams = true;

// 정적 생성 파라미터 (채팅방은 동적이므로 빈 배열 반환)
export function generateStaticParams() {
  return [];
}

export default function ChatRoomPage({ params }: { params: { id: string } }) {
  return (
    <ProtectedRoute>
      <ChatRoomPageClient chatRoomId={params.id} />
    </ProtectedRoute>
  );
}

