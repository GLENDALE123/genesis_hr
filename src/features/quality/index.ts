// === 품질이슈 관련 ===

// Components
export { QualityIssueForm } from './components/QualityIssueForm';
export { QualityIssueTable } from './components/QualityIssueTable';
export { QualityIssueDetail } from './components/QualityIssueDetail';
export { QualityIssueStatsCards } from './components/QualityIssueStatsCards';
export { QualityIssueSearchFilter } from './components/QualityIssueSearchFilter';

// Hooks
export { useQualityIssues } from './hooks/useQualityIssues';
export { useQualityIssueForm } from './hooks/useQualityIssueForm';

// Services
export { 
  createQualityIssue, 
  updateQualityIssue, 
  deleteQualityIssue, 
  subscribeToQualityIssues, 
  getQualityIssue, 
  searchQualityIssues 
} from './services/qualityIssueService';

// Types
export type { 
  QualityIssue, 
  QualityIssueFormData, 
  KeywordPair 
} from './types';

// Constants
export { 
  DEPARTMENT_OPTIONS, 
  REGISTRATION_KEYWORD_OPTIONS, 
  PROCESS_KEYWORD_OPTIONS, 
  DEFECT_KEYWORD_OPTIONS, 
  PRIORITY_OPTIONS, 
  CATEGORY_OPTIONS,
  STATUS_COLORS, 
  PRIORITY_COLORS, 
  DEPARTMENT_COLORS 
} from './constants';

// === 품질검사 관련 ===

// Components
export { QualityInspectionTable } from './components/QualityInspectionTable';
export { QualityInspectionDetail } from './components/QualityInspectionDetail';
export { InspectionFilterPanel } from './components/InspectionFilterPanel';
export { InspectionStatusBadge } from './components/InspectionStatusBadge';

// Hooks
export { useQualityInspections } from './hooks/useQualityInspections';
export { useInspectionFilters } from './hooks/useInspectionFilters';

// Services
export {
  createQualityInspection,
  updateQualityInspection,
  deleteQualityInspection,
  subscribeToQualityInspections,
  getQualityInspection,
  groupInspectionsByOrder,
  filterInspectionsByDateRange,
  searchInspections
} from './services/qualityInspectionService';

// Types
export type {
  QualityInspection,
  GroupedInspectionData,
  InspectionType,
  InspectionResult,
  WorkerInspectionData,
  ProcessLineData,
  ReliabilityReview,
  TestResultDetail
} from './types';

// Constants
export {
  INSPECTION_RESULTS,
  INSPECTION_TYPE_LABELS,
  INSPECTION_TYPE_COLORS,
  INSPECTION_RESULT_COLORS,
  DEFECT_REASON_OPTIONS,
  INJECTION_MATERIAL_OPTIONS,
  INJECTION_COLOR_OPTIONS,
  POST_PROCESS_OPTIONS,
  WORK_LINE_OPTIONS
} from './constants';
