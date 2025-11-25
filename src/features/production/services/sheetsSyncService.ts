/**
 * Google 스프레드시트 동기화 서비스
 * 스프레드시트 데이터를 읽어서 Firestore에 저장
 */

import { readSpreadsheetWithHeaders } from '@/shared/services/google/sheetsService';
import { ProductionScheduleV0 } from '@/features/production/types';
import * as ProductionScheduleV0Service from './productionScheduleV0Service';

export interface SyncResult {
  added: number;
  updated: number;
  deleted: number;
  total: number;
}

/**
 * 스프레드시트와 Firestore 동기화
 * @param spreadsheetId 스프레드시트 ID
 * @param sheetName 시트 이름
 * @param user 동기화하는 사용자 정보
 * @returns 동기화 결과
 */
export const syncSpreadsheetToFirestore = async (
  spreadsheetId: string,
  sheetName: string | undefined,
  user: {
    uid: string;
    displayName: string;
  }
): Promise<SyncResult> => {
  try {
    // 1. 스프레드시트에서 데이터 읽기
    const { headers, rows } = await readSpreadsheetWithHeaders(spreadsheetId, sheetName);

    if (headers.length === 0) {
      throw new Error('스프레드시트에 헤더가 없습니다.');
    }

    if (rows.length === 0) {
      throw new Error('스프레드시트에 데이터 행이 없습니다.');
    }

    // 2. 기존 Firestore 데이터 가져오기
    const existingData = await ProductionScheduleV0Service.getLatestSync();

    // 3. 동기화 로직
    const now = new Date().toISOString();
    let added = 0;
    let updated = 0;
    let deleted = 0;

    // 기존 데이터가 있는 경우
    if (existingData) {
      // 기존 행 번호 맵 생성 (빠른 조회를 위해)
      const existingRowMap = new Map<number, ProductionScheduleV0['rows'][0]>();
      existingData.rows.forEach(row => {
        existingRowMap.set(row.rowIndex, row);
      });

      // 스프레드시트의 각 행 처리
      const newRows: ProductionScheduleV0['rows'] = [];
      const processedRowIndices = new Set<number>();

      rows.forEach((rowData, index) => {
        const rowIndex = index + 2; // 헤더가 1번 행이므로 데이터는 2번부터 시작

        // 데이터 타입 변환 (필요시)
        const convertedData = rowData.map(cell => {
          // 숫자로 변환 가능하면 숫자로, 아니면 문자열로
          const numValue = Number(cell);
          if (!isNaN(numValue) && cell !== '' && String(cell).trim() !== '') {
            return numValue;
          }
          return String(cell || '').trim();
        });

        if (existingRowMap.has(rowIndex)) {
          // 기존 행 업데이트
          const existingRow = existingRowMap.get(rowIndex)!;
          // 데이터가 변경되었는지 확인
          const hasChanged = JSON.stringify(existingRow.data) !== JSON.stringify(convertedData);
          
          if (hasChanged) {
            newRows.push({
              rowIndex,
              data: convertedData,
            });
            updated++;
          } else {
            // 변경 없으면 기존 데이터 유지
            newRows.push(existingRow);
          }
        } else {
          // 새로운 행 추가
          newRows.push({
            rowIndex,
            data: convertedData,
          });
          added++;
        }

        processedRowIndices.add(rowIndex);
      });

      // 스프레드시트에 없는 행 삭제
      existingData.rows.forEach(row => {
        if (!processedRowIndices.has(row.rowIndex)) {
          deleted++;
        }
      });

      // Firestore 업데이트
      await ProductionScheduleV0Service.updateSync({
        ...existingData,
        headers,
        rows: newRows,
        syncedAt: now,
        syncedBy: user,
      });
    } else {
      // 기존 데이터가 없는 경우 - 새로 생성
      const newRows: ProductionScheduleV0['rows'] = rows.map((rowData, index) => {
        const rowIndex = index + 2;
        const convertedData = rowData.map(cell => {
          const numValue = Number(cell);
          if (!isNaN(numValue) && cell !== '' && String(cell).trim() !== '') {
            return numValue;
          }
          return String(cell || '').trim();
        });

        return {
          rowIndex,
          data: convertedData,
        };
      });

      await ProductionScheduleV0Service.createSync({
        headers,
        rows: newRows,
        spreadsheetId,
        sheetName: sheetName || 'Sheet1',
        syncedAt: now,
        syncedBy: user,
      });

      added = newRows.length;
    }

    return {
      added,
      updated,
      deleted,
      total: rows.length,
    };
  } catch (error) {
    console.error('❌ 스프레드시트 동기화 실패:', error);
    throw error;
  }
};

