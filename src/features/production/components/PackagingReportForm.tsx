'use client';

import React from 'react';
import { Clock, CalendarIcon, Minus, Plus } from 'lucide-react';
import { PackagingReport, PackagingFormData } from '@/features/production/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Calendar } from '@/shared/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { Button } from '@/shared/components/ui/button';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { usePackagingForm } from '@/features/production/hooks/usePackagingForm';
import { 
  PRODUCTION_LINE_OPTIONS, 
  BOX_TYPE_OPTIONS, 
  RATIO_OPTIONS 
} from '@/features/production/constants';

interface PackagingReportFormProps {
  report?: PackagingReport | null;
  isEditMode?: boolean;
  onSubmit: (data: PackagingFormData) => void;
}

export const PackagingReportForm: React.FC<PackagingReportFormProps> = ({
  report,
  isEditMode = false,
  onSubmit
}) => {
  // 커스텀 훅으로 폼 로직 분리
  const {
    formData,
    isCalendarOpen,
    setIsSaving,
    setIsCalendarOpen,
    handleInputChange,
    handleOrderNumberChange,
    handleBoxChange,
    addBox,
    removeBox,
    handleStartTime,
    handleEndTime,
    validateAndPrepareSubmit
  } = usePackagingForm({ report, isEditMode });

  // 폼 제출
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const submitData = validateAndPrepareSubmit();
    if (!submitData) {
      setIsSaving(false);
      return;
    }

    onSubmit(submitData);
    setIsSaving(false);
  };

  return (
    <form 
      id="packaging-report-form"
      onSubmit={handleSubmit} 
      className="space-y-4"
    >
        {/* 기본 정보 행 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              작업일자 <span className="text-destructive ml-1">*</span>
            </label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.workDate ? format(new Date(formData.workDate), 'PPP', { locale: ko }) : '날짜를 선택하세요'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.workDate ? new Date(formData.workDate) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      handleInputChange('workDate', format(date, 'yyyy-MM-dd'));
                      setIsCalendarOpen(false); // 날짜 선택 시 Popover 닫기
                    }
                  }}
                  locale={ko}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <Input
            label="작성자"
            type="text"
            value={formData.authorName}
            disabled
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              생산라인 <span className="text-destructive ml-1">*</span>
            </label>
            <Select
              key={`productionLine-${formData.productionLine || 'empty'}`}
              value={formData.productionLine || ''}
              onValueChange={(value) => handleInputChange('productionLine', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="선택..." />
              </SelectTrigger>
              <SelectContent>
                {PRODUCTION_LINE_OPTIONS.map(line => (
                  <SelectItem key={line} value={line}>{line}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">라인비율</label>
            <Select
              key={`lineRatio-${formData.lineRatio || 'empty'}`}
              value={formData.lineRatio || ''}
              onValueChange={(value) => handleInputChange('lineRatio', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="선택..." />
              </SelectTrigger>
              <SelectContent>
                {RATIO_OPTIONS.X_TO_ONE.map(ratio => (
                  <SelectItem key={ratio} value={ratio}>{ratio}</SelectItem>
                ))}
                {RATIO_OPTIONS.ONE_TO_X.map(ratio => (
                  <SelectItem key={ratio} value={ratio}>{ratio}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Input
            label="인원"
            type="text"
            value={formData.personnelCount}
            onChange={(e) => handleInputChange('personnelCount', e.target.value)}
            inputMode="numeric"
          />
        </div>

        {/* 발주 정보 행 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label="발주번호"
            type="text"
            value={formData.orderNumbers[0] || ''}
            onChange={(e) => handleOrderNumberChange(0, e.target.value)}
            placeholder="발주번호 입력 시 자동완성 (쉼표로 구분)"
          />

          <Input
            label="발주처"
            required
            type="text"
            value={formData.supplier}
            onChange={(e) => handleInputChange('supplier', e.target.value)}
          />

          <Input
            label="제품명"
            required
            type="text"
            value={formData.productName}
            onChange={(e) => handleInputChange('productName', e.target.value)}
          />

          <Input
            label="부속명"
            type="text"
            value={formData.partName}
            onChange={(e) => handleInputChange('partName', e.target.value)}
          />
        </div>

        {/* 생산 정보 행 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label="발주수량"
            type="text"
            value={formData.orderQuantity}
            onChange={(e) => handleInputChange('orderQuantity', e.target.value)}
            inputMode="numeric"
          />

          <Input
            label="사양"
            type="text"
            value={formData.specification}
            onChange={(e) => handleInputChange('specification', e.target.value)}
          />

          <Input
            label="1분당생산량"
            type="text"
            value={formData.productionPerMinute}
            onChange={(e) => handleInputChange('productionPerMinute', e.target.value)}
            inputMode="numeric"
          />

          <Input
            label="시간당생산량(UPH)"
            type="text"
            value={formData.uph}
            disabled
          />
        </div>

        {/* 시작/종료 시간 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">시작시간</label>
            <div className="relative">
              <Input
                type="time"
                value={formData.startTime}
                onChange={(e) => handleInputChange('startTime', e.target.value)}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleStartTime}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2 text-xs"
              >
                <Clock className="h-3 w-3 mr-1" />
                현재
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">종료시간</label>
            <div className="relative">
              <Input
                type="time"
                value={formData.endTime}
                onChange={(e) => handleInputChange('endTime', e.target.value)}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleEndTime}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2 text-xs"
              >
                <Clock className="h-3 w-3 mr-1" />
                현재
              </Button>
            </div>
          </div>
        </div>

        {/* 포장 단위, 박스 수, 잔량, 투입 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label="포장단위"
            type="text"
            value={formData.packagingUnit}
            onChange={(e) => handleInputChange('packagingUnit', e.target.value)}
            inputMode="numeric"
          />

          <Input
            label="박스수량"
            type="text"
            value={formData.boxCount}
            onChange={(e) => handleInputChange('boxCount', e.target.value)}
            inputMode="numeric"
          />

          <Input
            label="잔량"
            type="text"
            value={formData.remainder}
            onChange={(e) => handleInputChange('remainder', e.target.value)}
            inputMode="numeric"
          />

          <Input
            label="투입"
            type="text"
            value={formData.inputQuantity}
            onChange={(e) => handleInputChange('inputQuantity', e.target.value)}
            inputMode="numeric"
          />
        </div>

        {/* 양품, 불량, 양품률, 불량률 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label="양품"
            type="text"
            value={formData.goodQuantity}
            onChange={(e) => handleInputChange('goodQuantity', e.target.value)}
            inputMode="numeric"
          />

          <Input
            label="불량"
            type="text"
            value={formData.defectQuantity}
            disabled
          />

          <Input
            label="양품률"
            type="text"
            value={formData.yieldRate}
            disabled
            className="font-bold"
          />

          <Input
            label="불량률"
            type="text"
            value={formData.defectRate}
            disabled
            className="font-bold text-red-500"
          />
        </div>

        {/* 포장 박스 정보 */}
        <div className="pt-4 border-t dark:border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center text-sm mb-2 font-medium text-foreground">
            <div>박스번호</div>
            <div>구분</div>
            <div>수량</div>
            <div>사유(B급/구분출하)</div>
          </div>

          {formData.packagedBoxes.map((box, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-start mb-2">
              <Input
                type="text"
                value={box.boxNumber}
                onChange={(e) => handleBoxChange(index, 'boxNumber', e.target.value)}
                placeholder="숫자만"
                inputMode="numeric"
              />
              
              <Select
                value={box.type}
                onValueChange={(value) => handleBoxChange(index, 'type', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  {BOX_TYPE_OPTIONS.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Input
                type="text"
                value={box.quantity}
                onChange={(e) => handleBoxChange(index, 'quantity', e.target.value)}
                placeholder="숫자만"
                inputMode="numeric"
              />
              
              <div className="flex items-start gap-2">
                <Input
                  type="text"
                  value={box.reason}
                  onChange={(e) => handleBoxChange(index, 'reason', e.target.value)}
                  className="flex-grow"
                  disabled={box.type === '정상'}
                />
                {formData.packagedBoxes.length > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => removeBox(index)}
                    className="h-9 w-9"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={addBox}
            className="w-full mt-2"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* 메모 */}
        <div className="pt-4 border-t dark:border-slate-700">
          <Textarea
            label="메모"
            value={formData.memo}
            onChange={(e) => handleInputChange('memo', e.target.value)}
            rows={3}
          />
        </div>
    </form>
  );
};
