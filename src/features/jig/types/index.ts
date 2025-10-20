/**
 * 지그센터 타입 정의
 */

export enum JigStatus {
  Request = '요청',
  Hold = '보류',
  InProgress = '진행중',
  Receiving = '입고중',
  Rejected = '반려',
  Completed = '완료',
}

export interface HistoryEntry {
  status: JigStatus | string;
  date: string | { seconds: number; nanoseconds?: number }; // Firestore timestamp 지원
  user: string;
  reason?: string;
  action?: string; // HS-Jig 호환성
}

export interface JigComment {
  id: string;
  text: string;
  uid: string;
  userName: string;
  createdAt: string | { seconds: number; nanoseconds?: number };
  readBy?: string[];
  mentionedUserIds?: string[];
}

export interface JigRequest {
  id: string;
  requestDate: string;
  requestType: string;
  requester: string;
  destination: string;
  deliveryDate: string;
  itemName: string;
  partName: string;
  itemNumber: string;
  jigHandleLength?: number;
  specification: string;
  quantity: number;
  receivedQuantity: number;
  coreCost?: number;
  unitPrice?: number;
  remarks: string;
  imageUrls?: string[];
  status: JigStatus;
  history: HistoryEntry[];
  comments?: JigComment[];
}

export interface JigMasterItem {
  id: string;
  createdAt: string;
  requestType: string;
  itemName: string;
  partName: string;
  itemNumber: string;
  remarks: string;
  imageUrls?: string[];
  createdBy?: {
    uid: string;
    displayName: string;
  };
}

export interface MasterData {
  requesters: string[];
  destinations: string[];
  approvers: string[];
  requestTypes: string[];
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Member';
  department?: string;
  position?: string;
}

export type ViewMode = 'table' | 'card' | 'kanban';

export interface CreateJigRequestData {
  requestDate: string;
  requestType: string;
  requester: string;
  destination: string;
  deliveryDate: string;
  itemName: string;
  partName: string;
  itemNumber: string;
  jigHandleLength?: number;
  specification: string;
  quantity: number;
  receivedQuantity: number;
  coreCost?: number;
  unitPrice?: number;
  remarks: string;
  imageUrls?: string[];
  status: JigStatus;
}

export interface UpdateJigRequestData {
  requestDate?: string;
  requestType?: string;
  requester?: string;
  destination?: string;
  deliveryDate?: string;
  itemName?: string;
  partName?: string;
  itemNumber?: string;
  jigHandleLength?: number;
  specification?: string;
  quantity?: number;
  receivedQuantity?: number;
  coreCost?: number;
  unitPrice?: number;
  remarks?: string;
  imageUrls?: string[];
  status?: JigStatus;
}

export interface CreateJigMasterItemData {
  requestType: string;
  itemName: string;
  partName: string;
  itemNumber: string;
  remarks: string;
  imageUrls?: string[];
}

export interface UpdateJigMasterItemData {
  requestType?: string;
  itemName?: string;
  partName?: string;
  itemNumber?: string;
  remarks?: string;
  imageUrls?: string[];
}