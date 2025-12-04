/**
 * 섹션 타입 정의
 */

export interface Section {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isArchived: boolean;
}

export interface CreateSectionData {
  projectId: string;
  name: string;
  description?: string;
  position?: number;
}

export interface UpdateSectionData {
  name?: string;
  description?: string;
  position?: number;
  isArchived?: boolean;
}

export interface MoveSectionData {
  sectionId: string;
  newPosition: number;
}
