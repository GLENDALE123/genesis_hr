/**
 * Google Sheets API 서비스 (클라이언트)
 * Firebase Functions를 통해 스프레드시트 데이터 읽기
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '@/shared/services/firebase/config';

/**
 * 스프레드시트 데이터 읽기
 * @param spreadsheetId 스프레드시트 ID
 * @param sheetName 시트 이름 (기본값: 첫 번째 시트)
 * @returns 2D 배열 (첫 번째 행이 헤더, 나머지가 데이터)
 */
export const readSpreadsheetData = async (
  spreadsheetId: string,
  sheetName?: string
): Promise<string[][]> => {
  try {
    if (!functions) {
      throw new Error('Firebase Functions가 초기화되지 않았습니다.');
    }

    const syncGoogleSheets = httpsCallable(functions, 'syncGoogleSheets');
    const result = await syncGoogleSheets({ spreadsheetId, sheetName });

    const data = result.data as {
      success: boolean;
      headers: string[];
      rows: Array<{ rowIndex: number; data: (string | number)[] }>;
    };

    if (!data.success) {
      throw new Error('스프레드시트 데이터 읽기 실패');
    }

    // 헤더와 데이터를 합쳐서 2D 배열로 변환
    const allData: string[][] = [data.headers];
    data.rows.forEach((row) => {
      allData.push(row.data.map((cell) => String(cell || '')));
    });

    return allData;
  } catch (error) {
    console.error('❌ 스프레드시트 데이터 읽기 실패:', error);
    throw error;
  }
};

/**
 * 스프레드시트의 헤더와 데이터 분리하여 반환
 * @param spreadsheetId 스프레드시트 ID
 * @param sheetName 시트 이름
 * @returns 헤더 배열과 데이터 행들
 */
export const readSpreadsheetWithHeaders = async (
  spreadsheetId: string,
  sheetName?: string
): Promise<{ headers: string[]; rows: string[][] }> => {
  try {
    if (!functions) {
      throw new Error('Firebase Functions가 초기화되지 않았습니다.');
    }

    const syncGoogleSheets = httpsCallable(functions, 'syncGoogleSheets');
    const result = await syncGoogleSheets({ spreadsheetId, sheetName });

    const data = result.data as {
      success: boolean;
      headers: string[];
      rows: Array<{ rowIndex: number; data: (string | number)[] }>;
    };

    if (!data.success) {
      throw new Error('스프레드시트 데이터 읽기 실패');
    }

    const headers = data.headers;
    const rows = data.rows.map((row) => row.data.map((cell) => String(cell || '')));

    return { headers, rows };
  } catch (error) {
    console.error('❌ 스프레드시트 데이터 읽기 실패:', error);
    throw error;
  }
};

// =====================================================================
// 생산일보 → Google Sheets 동기화
// =====================================================================

export interface SyncDailyReportsPayload {
  spreadsheetId: string;
  sheetName?: string;
  forceFullSync?: boolean;
}

export interface SyncDailyReportsResult {
  success: boolean;
  sheetName: string;
  inserted: number;
  updated: number;
  skipped: number;
  totalReports: number;
  forceFullSync: boolean;
  message?: string;
}

export const syncDailyReportsToSheets = async (
  payload: SyncDailyReportsPayload
): Promise<SyncDailyReportsResult> => {
  if (!functions) {
    throw new Error('Firebase Functions가 초기화되지 않았습니다.');
  }

  const callable = httpsCallable(functions, 'syncDailyReportsToSheets');
  const result = await callable(payload);
  return result.data as SyncDailyReportsResult;
};
