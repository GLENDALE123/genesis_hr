'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { 
  Save, 
  X, 
  Plus, 
  Trash2,
  Package,
  Calendar,
  Clock,
  Users,
  FileText
} from 'lucide-react';
import { PackagingReport, PackagedBox, PackagingFormData } from '@/features/production/types';

interface ProductionReportFormProps {
  report?: PackagingReport | null;
  isEditMode?: boolean;
  onSubmit: (data: PackagingFormData) => void;
  onCancel: () => void;
}

const productionLineOptions = [
  '증착1', '증착2', '증착1하도', '증착1상도', '증착2하도', '증착2상도', 
  '2코팅', '1코팅', '내부코팅1호기', '내부코팅2호기', '내부코팅3호기',
  '증착1하도(아)', '증착1상도(아)', '증착2하도(아)', '증착2상도(아)'
];

const boxTypeOptions = ['정상', 'B급', '구분출하'];

const initialFormData: PackagingFormData = {
  workDate: '',
  authorName: '',
  productionLine: '',
  orderNumbers: [''],
  supplier: '',
  productName: '',
  partName: '',
  orderQuantity: '',
  specification: '',
  lineRatio: '',
  productionPerMinute: '',
  uph: '',
  inputQuantity: '',
  goodQuantity: '',
  defectQuantity: '',
  yieldRate: '',
  defectRate: '',
  personnelCount: '',
  startTime: '',
  endTime: '',
  packagingUnit: '',
  boxCount: '',
  remainder: '',
  packagedBoxes: [],
  memo: ''
};

export const ProductionReportForm: React.FC<ProductionReportFormProps> = ({
  report,
  isEditMode = false,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState<PackagingFormData>(initialFormData);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (report && isEditMode) {
      setFormData({
        workDate: report.workDate,
        authorName: report.author.displayName,
        productionLine: report.productionLine,
        orderNumbers: report.orderNumbers.length > 0 ? report.orderNumbers : [''],
        supplier: report.supplier,
        productName: report.productName,
        partName: report.partName,
        orderQuantity: report.orderQuantity?.toString() || '',
        specification: report.specification,
        lineRatio: report.lineRatio,
        productionPerMinute: report.productionPerMinute?.toString() || '',
        uph: report.uph?.toString() || '',
        inputQuantity: report.inputQuantity?.toString() || '',
        goodQuantity: report.goodQuantity?.toString() || '',
        defectQuantity: report.defectQuantity?.toString() || '',
        yieldRate: '',
        defectRate: '',
        personnelCount: report.personnelCount?.toString() || '',
        startTime: report.startTime,
        endTime: report.endTime,
        packagingUnit: report.packagingUnit?.toString() || '',
        boxCount: report.boxCount?.toString() || '',
        remainder: report.remainder?.toString() || '',
        packagedBoxes: report.packagedBoxes || [],
        memo: report.memo || ''
      });
    } else {
      // 새로 등록할 때는 오늘 날짜로 설정
      const today = new Date().toISOString().split('T')[0];
      setFormData(prev => ({
        ...prev,
        workDate: today
      }));
    }
  }, [report, isEditMode]);

  const handleInputChange = (field: keyof PackagingFormData, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // 수율과 불량률 자동 계산
    if (field === 'inputQuantity' || field === 'goodQuantity' || field === 'defectQuantity') {
      const input = parseFloat(field === 'inputQuantity' ? value as string : formData.inputQuantity) || 0;
      const good = parseFloat(field === 'goodQuantity' ? value as string : formData.goodQuantity) || 0;
      const defect = parseFloat(field === 'defectQuantity' ? value as string : formData.defectQuantity) || 0;

      if (input > 0) {
        const yieldRate = ((good / input) * 100).toFixed(1);
        const defectRate = ((defect / input) * 100).toFixed(1);
        
        setFormData(prev => ({
          ...prev,
          yieldRate,
          defectRate
        }));
      }
    }
  };

  const handleOrderNumberChange = (index: number, value: string) => {
    const newOrderNumbers = [...formData.orderNumbers];
    newOrderNumbers[index] = value;
    setFormData(prev => ({
      ...prev,
      orderNumbers: newOrderNumbers
    }));
  };

  const addOrderNumber = () => {
    setFormData(prev => ({
      ...prev,
      orderNumbers: [...prev.orderNumbers, '']
    }));
  };

  const removeOrderNumber = (index: number) => {
    if (formData.orderNumbers.length > 1) {
      const newOrderNumbers = formData.orderNumbers.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        orderNumbers: newOrderNumbers
      }));
    }
  };

  const addPackagedBox = () => {
    const newBox: PackagedBox = {
      boxNumber: '',
      type: '',
      quantity: 0,
      reason: ''
    };
    setFormData(prev => ({
      ...prev,
      packagedBoxes: [...prev.packagedBoxes, newBox]
    }));
  };

  const updatePackagedBox = (index: number, field: keyof PackagedBox, value: string | number) => {
    const newBoxes = [...formData.packagedBoxes];
    newBoxes[index] = {
      ...newBoxes[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      packagedBoxes: newBoxes
    }));
  };

  const removePackagedBox = (index: number) => {
    const newBoxes = formData.packagedBoxes.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      packagedBoxes: newBoxes
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 필수 필드 검증
    const requiredFields = ['workDate', 'productionLine', 'supplier', 'productName'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof PackagingFormData]);
    
    if (missingFields.length > 0) {
      alert('필수 필드를 모두 입력해주세요.');
      return;
    }

    // 발주번호 필터링 (빈 문자열 제거)
    const filteredOrderNumbers = formData.orderNumbers.filter(num => num.trim() !== '');
    
    const submitData = {
      ...formData,
      orderNumbers: filteredOrderNumbers.length > 0 ? filteredOrderNumbers : ['']
    };

    onSubmit(submitData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {isEditMode ? '생산일보 수정' : '생산일보 등록'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">기본 정보</TabsTrigger>
              <TabsTrigger value="production">생산 정보</TabsTrigger>
              <TabsTrigger value="packaging">포장 정보</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="workDate">작업일 *</Label>
                  <Input
                    id="workDate"
                    type="date"
                    value={formData.workDate}
                    onChange={(e) => handleInputChange('workDate', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="productionLine">생산라인 *</Label>
                  <Select
                    value={formData.productionLine}
                    onValueChange={(value) => handleInputChange('productionLine', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="생산라인 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {productionLineOptions.map(line => (
                        <SelectItem key={line} value={line}>{line}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="supplier">발주처 *</Label>
                  <Input
                    id="supplier"
                    value={formData.supplier}
                    onChange={(e) => handleInputChange('supplier', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="productName">제품명 *</Label>
                  <Input
                    id="productName"
                    value={formData.productName}
                    onChange={(e) => handleInputChange('productName', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="partName">부속명</Label>
                  <Input
                    id="partName"
                    value={formData.partName}
                    onChange={(e) => handleInputChange('partName', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="specification">사양</Label>
                  <Input
                    id="specification"
                    value={formData.specification}
                    onChange={(e) => handleInputChange('specification', e.target.value)}
                  />
                </div>
              </div>

              {/* 발주번호 */}
              <div>
                <Label>발주번호</Label>
                <div className="space-y-2">
                  {formData.orderNumbers.map((orderNumber, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={orderNumber}
                        onChange={(e) => handleOrderNumberChange(index, e.target.value)}
                        placeholder="발주번호를 입력하세요"
                      />
                      {formData.orderNumbers.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeOrderNumber(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addOrderNumber}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    발주번호 추가
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="production" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="orderQuantity">발주수량</Label>
                  <Input
                    id="orderQuantity"
                    type="number"
                    value={formData.orderQuantity}
                    onChange={(e) => handleInputChange('orderQuantity', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="lineRatio">라인 비율</Label>
                  <Input
                    id="lineRatio"
                    value={formData.lineRatio}
                    onChange={(e) => handleInputChange('lineRatio', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="productionPerMinute">분당 생산량</Label>
                  <Input
                    id="productionPerMinute"
                    type="number"
                    value={formData.productionPerMinute}
                    onChange={(e) => handleInputChange('productionPerMinute', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="uph">UPH</Label>
                  <Input
                    id="uph"
                    type="number"
                    value={formData.uph}
                    onChange={(e) => handleInputChange('uph', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="inputQuantity">투입수량</Label>
                  <Input
                    id="inputQuantity"
                    type="number"
                    value={formData.inputQuantity}
                    onChange={(e) => handleInputChange('inputQuantity', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="goodQuantity">양품수량</Label>
                  <Input
                    id="goodQuantity"
                    type="number"
                    value={formData.goodQuantity}
                    onChange={(e) => handleInputChange('goodQuantity', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="defectQuantity">불량수량</Label>
                  <Input
                    id="defectQuantity"
                    type="number"
                    value={formData.defectQuantity}
                    onChange={(e) => handleInputChange('defectQuantity', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="personnelCount">인원수</Label>
                  <Input
                    id="personnelCount"
                    type="number"
                    value={formData.personnelCount}
                    onChange={(e) => handleInputChange('personnelCount', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="startTime">시작시간</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleInputChange('startTime', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="endTime">종료시간</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleInputChange('endTime', e.target.value)}
                  />
                </div>
              </div>

              {/* 수율 및 불량률 (자동 계산) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>수율 (자동계산)</Label>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <span className="text-lg font-semibold text-green-600">
                      {formData.yieldRate}%
                    </span>
                  </div>
                </div>

                <div>
                  <Label>불량률 (자동계산)</Label>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <span className="text-lg font-semibold text-red-600">
                      {formData.defectRate}%
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="packaging" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="packagingUnit">포장 단위</Label>
                  <Input
                    id="packagingUnit"
                    type="number"
                    value={formData.packagingUnit}
                    onChange={(e) => handleInputChange('packagingUnit', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="boxCount">박스 수</Label>
                  <Input
                    id="boxCount"
                    type="number"
                    value={formData.boxCount}
                    onChange={(e) => handleInputChange('boxCount', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="remainder">잔량</Label>
                  <Input
                    id="remainder"
                    type="number"
                    value={formData.remainder}
                    onChange={(e) => handleInputChange('remainder', e.target.value)}
                  />
                </div>
              </div>

              {/* 포장 박스 정보 */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label>포장 박스 정보</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addPackagedBox}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    박스 추가
                  </Button>
                </div>

                <div className="space-y-3">
                  {formData.packagedBoxes.map((box, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <Badge variant="outline">박스 {index + 1}</Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removePackagedBox(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div>
                            <Label>박스 번호</Label>
                            <Input
                              value={box.boxNumber}
                              onChange={(e) => updatePackagedBox(index, 'boxNumber', e.target.value)}
                            />
                          </div>
                          
                          <div>
                            <Label>구분</Label>
                            <Select
                              value={box.type}
                              onValueChange={(value) => updatePackagedBox(index, 'type', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="구분 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                {boxTypeOptions.map(type => (
                                  <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label>수량</Label>
                            <Input
                              type="number"
                              value={box.quantity}
                              onChange={(e) => updatePackagedBox(index, 'quantity', parseInt(e.target.value) || 0)}
                            />
                          </div>
                          
                          <div>
                            <Label>사유</Label>
                            <Input
                              value={box.reason || ''}
                              onChange={(e) => updatePackagedBox(index, 'reason', e.target.value)}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="memo">메모</Label>
                <Textarea
                  id="memo"
                  value={formData.memo}
                  onChange={(e) => handleInputChange('memo', e.target.value)}
                  rows={3}
                  placeholder="추가 메모를 입력하세요"
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* 버튼 */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              취소
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4 mr-2" />
              {isEditMode ? '수정' : '등록'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
