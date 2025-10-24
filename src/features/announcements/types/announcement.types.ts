export interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  imageUrls?: string[];
  planStartDate?: string;
  planEndDate?: string;
  cooperationRequest?: string;
}

export interface CreateAnnouncementData {
  title: string;
  content: string;
  cooperationRequest?: string;
  planStartDate?: string;
  planEndDate?: string;
  imageUrls?: string[];
}

export interface UpdateAnnouncementData extends CreateAnnouncementData {
  id: string;
}

export interface AnnouncementFormData {
  title: string;
  content: string;
  cooperationRequest: string;
  planStartDate?: string;
  planEndDate?: string;
  imageUrls?: (string | File)[];
}

export type ViewMode = 'card' | 'list';

export interface AnnouncementFilters {
  searchTerm?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  hasImages?: boolean;
  hasCooperationRequest?: boolean;
}
