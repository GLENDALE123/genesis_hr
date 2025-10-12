/**
 * 샘플센터 관련 타입 정의
 * HS-Jig 프로젝트의 샘플 타입 구조 참고
 */

/**
 * 샘플 요청 상태
 */
export enum SampleStatus {
  Received = '접수',
  InProgress = '진행중',
  Completed = '완료',
  OnHold = '보류',
  Rejected = '반려',
}

/**
 * 샘플 요청 품목
 */
export interface SampleRequestItem {
  partName: string;           // 부속명
  colorSpec: string;          // 색상(사양)
  quantity: number;           // 요청수량
  postProcessing: string[];   // 후가공 (인쇄, 박, 라벨, 조립)
  coatingMethod: string;      // 코팅/증착 방식
}

/**
 * 작업 코트 데이터 (하도/중도/상도)
 */
export interface WorkCoat {
  conditions?: string;        // 작업조건
  remarks?: string;           // 특이사항
}

/**
 * 샘플 요청 히스토리 아이템
 */
export interface SampleHistoryItem {
  status: SampleStatus;
  date: string;
  reason?: string;            // 보류/반려 사유
  by: string;                 // 변경자
}

/**
 * 댓글 인터페이스
 */
export interface SampleComment {
  id: string;
  text: string;
  user: string;               // 작성자 이름
  uid?: string;               // 작성자 UID
  userId?: string;            // 작성자 UID (대체)
  timestamp?: string;         // 작성 시간
  date?: string;              // 작성 시간 (대체)
  readBy?: string[];          // 읽음 표시
  editedAt?: string;          // 수정 시간
}

/**
 * 샘플 요청 전체 데이터
 */
export interface SampleRequest {
  id: string;
  requestDate: string;        // 요청일
  requesterName: string;      // 요청담당자명
  contact: string;            // 연락처
  clientName: string;         // 고객사명
  productName: string;        // 제품명
  items: SampleRequestItem[]; // 품목 리스트
  dueDate: string;            // 납기요청일
  remarks: string;            // 비고
  status: SampleStatus;       // 현재 상태
  imageUrls?: string[];       // 참고 이미지 (신규 요청 시 업로드)
  workImageUrls?: string[];   // 작업 이미지 (상세 모달에서 업로드)
  
  // 작업 데이터
  workData?: {
    undercoat?: WorkCoat;     // 하도
    midcoat?: WorkCoat;       // 중도
    topcoat?: WorkCoat;       // 상도
  };
  
  // 요청자 정보
  requesterInfo: {
    uid: string;
    displayName: string;
  };
  
  // 히스토리 및 댓글
  history: SampleHistoryItem[];
  comments: SampleComment[];
  
  // 생성 시간
  createdAt: string;
}

/**
 * 샘플 요청 폼 데이터 (생성/수정 시 사용)
 */
export interface SampleFormData {
  requestDate: string;
  requesterName: string;
  contact: string;
  clientName: string;
  productName: string;
  items: SampleRequestItem[];
  dueDate: string;
  remarks: string;
}

/**
 * 샘플 요청 품목 폼 데이터 (문자열 수량)
 */
export interface SampleFormItem {
  partName: string;
  colorSpec: string;
  quantity: string;           // 폼에서는 문자열로 관리
  postProcessing: string[];
  coatingMethod: string;
}


