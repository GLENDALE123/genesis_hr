'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { ProductionSchedule } from '@/features/production/types';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/shared/components/ui/sheet';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { toast } from 'sonner';

type ParsedSchedule = Omit<ProductionSchedule, 'id' | 'createdAt' | 'updatedAt'>;

interface ProductionScheduleUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (schedules: ParsedSchedule[]) => Promise<void>;
  currentDate: string;
}

// 헤더 매핑 (HS-Jig과 동일)
const headerMapping: { [key: string]: keyof ParsedSchedule } = {
  '계획일자': 'planDate',
  '진행': 'progress',
  '출하': 'shipping',
  '라인': 'line',
  '사출': 'injection',
  '발주번호': 'orderNumber',
  '발주처': 'client',
  '제품명': 'productName',
  '부속명': 'partName',
  '발주': 'orderQuantity',
  '사양': 'specification',
  '후공정': 'postProcess',
  '참고': 'remarks',
  '담당자': 'manager',
  '내/수': 'domesticOrExport',
  '사용지그': 'jigUsed',
  '신/재': 'newOrRe',
  '부족수량': 'shortageQuantity'
};

// 고정된 헤더 순서
const fixedHeaderOrder: (keyof ParsedSchedule)[] = [
  'planDate', 'progress', 'shipping', 'line', 'injection', 'orderNumber', 'client',
  'productName', 'partName', 'orderQuantity', 'specification', 'postProcess',
  'remarks', 'manager', 'domesticOrExport', 'jigUsed', 'newOrRe', 'shortageQuantity'
];

export const ProductionScheduleUploadModal: React.FC<ProductionScheduleUploadModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentDate,
}) => {
  const [pastedText, setPastedText] = useState('');
  const [parsedSchedules, setParsedSchedules] = useState<ParsedSchedule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 표시용 헤더 이름
  const displayHeaders = useMemo(() => {
    const reverseMapping: { [key in keyof ParsedSchedule]?: string } = {};
    for (const key in headerMapping) {
      reverseMapping[headerMapping[key as keyof typeof headerMapping]] = key;
    }
    return fixedHeaderOrder.map(key => reverseMapping[key] || String(key));
  }, []);

  // 날짜 파싱 함수
  const parseDateCell = useCallback((cell: string, year: number, monthFromFilter: number): string => {
    if (!cell || !cell.trim()) return '';

    // MM/DD 형식
    const match = cell.match(/(\d{1,2})\/(\d{1,2})/);
    if (match) {
      const month = match[1].padStart(2, '0');
      const day = match[2].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // YYYY-MM-DD 형식
    if (/^\d{4}-\d{2}-\d{2}$/.test(cell.trim())) {
      return cell.trim();
    }

    // DD만 있는 경우
    if (/^\d{1,2}$/.test(cell.trim())) {
      const day = cell.trim().padStart(2, '0');
      return `${year}-${String(monthFromFilter).padStart(2, '0')}-${day}`;
    }
    
    return '';
  }, []);

  // 데이터 파싱
  const parseData = useCallback((text: string) => {
    setError(null);
    if (!text.trim()) {
      setParsedSchedules([]);
      return;
    }

    const rows = text.trim().split('\n').map(row => row.split('\t'));
    if (rows.length === 0) {
      setError('데이터가 없습니다.');
      return;
    }

    const year = new Date(currentDate).getFullYear();
    const monthFromFilter = new Date(currentDate).getMonth() + 1;
    let lastValidDate = currentDate;

    const parsed: ParsedSchedule[] = [];
    
    for (const row of rows) {
      if (row.every(cell => !cell.trim())) continue;

      const scheduleData: { [key: string]: string | number } = {};
      fixedHeaderOrder.forEach((key, index) => {
        scheduleData[key] = row[index] || '';
      });

      if (!scheduleData.productName) {
        continue; // 제품명이 없으면 스킵
      }

      // 날짜 파싱
      const parsedDate = parseDateCell(String(scheduleData.planDate), year, monthFromFilter);
      if (parsedDate) {
        lastValidDate = parsedDate;
      }

      const schedule: ParsedSchedule = {
        planDate: lastValidDate,
        progress: String(scheduleData.progress || ''),
        shipping: String(scheduleData.shipping || ''),
        line: String(scheduleData.line || ''),
        injection: String(scheduleData.injection || ''),
        orderNumber: String(scheduleData.orderNumber || ''),
        client: String(scheduleData.client || ''),
        productName: String(scheduleData.productName),
        partName: String(scheduleData.partName || ''),
        orderQuantity: parseInt(String(scheduleData.orderQuantity).replace(/,/g, ''), 10) || 0,
        specification: String(scheduleData.specification || ''),
        postProcess: String(scheduleData.postProcess || ''),
        remarks: String(scheduleData.remarks || ''),
        manager: String(scheduleData.manager || ''),
        domesticOrExport: String(scheduleData.domesticOrExport || ''),
        jigUsed: String(scheduleData.jigUsed || ''),
        newOrRe: String(scheduleData.newOrRe || ''),
        shortageQuantity: parseInt(String(scheduleData.shortageQuantity).replace(/,/g, ''), 10) || 0,
      };
      
      parsed.push(schedule);
    }

    if (parsed.length === 0 && rows.length > 0) {
      setError('붙여넣은 데이터에서 유효한 일정을 찾을 수 없습니다. 제품명이 있는지, 데이터 형식이 올바른지 확인해주세요.');
    }

    setParsedSchedules(parsed);
  }, [currentDate, parseDateCell]);

  // 저장 핸들러
  const handleSaveClick = async () => {
    setIsSaving(true);
    try {
      await onSave(parsedSchedules);
      toast.success(`${parsedSchedules.length}개 일정이 등록되었습니다.`);
      onClose();
      setPastedText('');
      setParsedSchedules([]);
    } catch {
      toast.error('일정 등록에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 모달이 닫힐 때 상태 초기화
  const handleClose = () => {
    setPastedText('');
    setParsedSchedules([]);
    setError(null);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[90vh] flex flex-col">
        <SheetHeader>
          <SheetTitle>생산일정 등록/업데이트</SheetTitle>
          <SheetDescription>
            엑셀에서 데이터 영역만(컬럼명 제외) 복사하여 아래 칸에 붙여넣으세요.
            데이터는 정해진 순서대로 입력되어야 합니다.
            기존에 동일한 날짜에 등록된 일정은 모두 삭제되고 새로 붙여넣은 데이터로 덮어씌워집니다.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 flex flex-col gap-4 py-4 overflow-hidden">
          {/* 텍스트 입력 영역 */}
          <div className="flex-shrink-0">
            <Textarea
              className="w-full h-40 font-mono text-sm"
              placeholder="여기에 엑셀 데이터를 붙여넣으세요..."
              value={pastedText}
              onChange={(e) => {
                setPastedText(e.target.value);
                parseData(e.target.value);
              }}
            />
            {error && <p className="text-destructive text-sm mt-2">{error}</p>}
          </div>

          {/* 미리보기 영역 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <h3 className="font-semibold mb-2">미리보기 ({parsedSchedules.length}개 항목)</h3>
            <ScrollArea className="flex-1 border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-muted">
                  <TableRow>
                    {displayHeaders.map((h, index) => (
                      <TableHead 
                        key={h} 
                        className={`whitespace-nowrap ${index === 0 ? 'rounded-tl-lg' : ''} ${index === displayHeaders.length - 1 ? 'rounded-tr-lg' : ''}`}
                      >
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedSchedules.map((s, i) => (
                    <TableRow key={i}>
                      {fixedHeaderOrder.map(key => (
                        <TableCell key={key} className="whitespace-nowrap">
                          {typeof s[key] === 'number' ? (s[key] as number).toLocaleString() : s[key]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>

        <SheetFooter className="flex-shrink-0">
          <Button variant="outline" onClick={handleClose}>
            취소
          </Button>
          <Button
            onClick={handleSaveClick}
            disabled={parsedSchedules.length === 0 || isSaving}
          >
            {isSaving ? '저장 중...' : '저장하기'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

