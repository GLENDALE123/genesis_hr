// 품질이슈 관련 타입 정의

export interface IssueItem {
  content: string;
  createdAt: string;
  status?: string;
}

export interface QualityIssue {
  id: string;
  department: string;
  registrationKeyword: string;
  orderNumber: string;
  supplier: string;
  productName: string;
  partName: string;
  issues: string[] | IssueItem[]; // 기존 호환성을 위해 union type
  keywordPairs: KeywordPair[];
  imageUrls?: string[];
  createdAt: Date | string;
  author: string | { uid: string; displayName: string; email: string };
  status: 'open' | 'in-progress' | 'resolved' | 'closed' | '미해결' | '진행중' | '해결완료';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: string;
  assignedTo?: string;
  resolution?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface KeywordPair {
  process: string;
  defect: string;
}

export interface QualityIssueFormData {
  department: string;
  registrationKeyword: string;
  orderNumber: string;
  supplier: string;
  productName: string;
  partName: string;
  issues: string[];
  keywordPairs: KeywordPair[];
  category: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assignedTo?: string;
}

export interface QualityIssueCreateData extends Omit<QualityIssueFormData, 'issues' | 'keywordPairs'> {
  issues: string[];
  keywordPairs: KeywordPair[];
}

// 상수는 constants/index.ts에서 관리
