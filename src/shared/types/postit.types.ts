/**
 * 포스트잇 관련 타입 정의
 */

export type PostItColor = 'yellow' | 'blue' | 'pink' | 'green' | 'purple';

export interface PostIt {
  id: string;
  content: string; // HTML 콘텐츠 (리치 텍스트 지원)
  color: PostItColor;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  visible?: boolean; // 포스트잇 표시 여부 (기본값: true)
  folderId?: string; // 포스트잇이 속한 폴더 ID
  createdAt: number;
  updatedAt: number;
}

export interface PostItFolder {
  id: string;
  name: string;
  postitIds: string[]; // 폴더에 포함된 포스트잇 ID 목록
  createdAt: number;
  updatedAt: number;
}

export interface PostItStorage {
  postits: PostIt[];
  folders: PostItFolder[];
  version: string;
}

