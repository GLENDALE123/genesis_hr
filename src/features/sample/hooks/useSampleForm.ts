/**
 * 샘플 요청 폼 상태 관리 훅
 */

import { useState, useCallback } from 'react';
import { SampleFormData, SampleFormItem } from '../types';
import { createQuickThumbnail } from '@/shared/utils/imageUpload';
import { UploadingImageItem } from '@/shared/components/common/UploadingImageGrid';

/**
 * 샘플 요청 폼 관리 훅
 */
export const useSampleForm = (initialData?: SampleFormData) => {
  const getLocalDate = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().split('T')[0];
  };

  // 폼 데이터 상태
  const [formData, setFormData] = useState<Omit<SampleFormData, 'items'>>({
    requestDate: (initialData && initialData.requestDate) || getLocalDate(),
    requesterName: (initialData && initialData.requesterName) || '',
    contact: (initialData && initialData.contact) || '',
    clientName: (initialData && initialData.clientName) || '',
    productName: (initialData && initialData.productName) || '',
    dueDate: (initialData && initialData.dueDate) || '',
    remarks: (initialData && initialData.remarks) || '',
  });

  // 품목 리스트 (문자열 수량)
  const [items, setItems] = useState<SampleFormItem[]>(
    (initialData && initialData.items)
      ? initialData.items.map(item => ({
          ...item,
          quantity: String(item.quantity)
        }))
      : [{ partName: '', colorSpec: '', quantity: '', postProcessing: [], coatingMethod: '' }]
  );

  // 이미지 미리보기 상태
  const [imagePreviewItems, setImagePreviewItems] = useState<UploadingImageItem[]>([]);

  /**
   * 폼 데이터 변경
   */
  const handleFormChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  /**
   * 품목 필드 변경
   */
  const handleItemChange = useCallback((
    index: number,
    field: keyof Omit<SampleFormItem, 'postProcessing'>,
    value: string
  ) => {
    setItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };
      return newItems;
    });
  }, []);

  /**
   * 품목 후가공 변경
   */
  const handlePostProcessingChange = useCallback((
    itemIndex: number,
    option: string
  ) => {
    setItems(prev => {
      const newItems = [...prev];
      const currentPostProcessing = newItems[itemIndex].postProcessing || [];
      const newSelection = currentPostProcessing.includes(option)
        ? currentPostProcessing.filter(item => item !== option)
        : [...currentPostProcessing, option];
      newItems[itemIndex] = { ...newItems[itemIndex], postProcessing: newSelection };
      return newItems;
    });
  }, []);

  /**
   * 품목 추가
   */
  const addItem = useCallback(() => {
    setItems(prev => [
      ...prev,
      { partName: '', colorSpec: '', quantity: '', postProcessing: [], coatingMethod: '' }
    ]);
  }, []);

  /**
   * 품목 삭제
   */
  const removeItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * 이미지 파일 선택
   */
  const handleImageSelect = useCallback(async (files: File[]) => {
    // 1단계: 즉시 로딩 상태로 추가
    const newItems = files.map(file => ({ file, preview: null }));
    setImagePreviewItems(prev => [...prev, ...newItems]);

    // 2단계: 썸네일 생성
    const startIndex = imagePreviewItems.length;
    for (let i = 0; i < files.length; i++) {
      try {
        const thumbnail = await createQuickThumbnail(files[i]);
        setImagePreviewItems(prev => {
          const updated = [...prev];
          updated[startIndex + i] = { file: files[i], preview: thumbnail };
          return updated;
        });
      } catch (error) {
        console.error('썸네일 생성 실패:', error);
        // 실패 시 원본 Blob URL 사용
        setImagePreviewItems(prev => {
          const updated = [...prev];
          updated[startIndex + i] = { file: files[i], preview: URL.createObjectURL(files[i]) };
          return updated;
        });
      }
    }
  }, [imagePreviewItems.length]);

  /**
   * 이미지 삭제
   */
  const removeImage = useCallback((index: number) => {
    setImagePreviewItems(prev => {
      const item = prev[index];
      if (item.preview && item.preview.startsWith('blob:')) {
        URL.revokeObjectURL(item.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  /**
   * 폼 검증
   */
  const validateForm = useCallback((): string | null => {
    if (!formData.requestDate) return '요청일을 입력해주세요.';
    if (!formData.requesterName) return '요청담당자명을 입력해주세요.';
    if (!formData.contact) return '연락처를 입력해주세요.';
    if (!formData.clientName) return '고객사명을 입력해주세요.';
    if (!formData.productName) return '제품명을 입력해주세요.';
    if (!formData.dueDate) return '납기요청일을 입력해주세요.';

    const validItems = items.filter(
      item => item.partName && item.colorSpec && item.quantity && item.coatingMethod
    );

    if (validItems.length === 0) {
      return '최소 하나 이상의 유효한 품목을 입력해주세요.';
    }

    return null;
  }, [formData, items]);

  /**
   * 폼 데이터 가져오기 (제출용)
   */
  const getFormData = useCallback((): {
    data: SampleFormData;
    images: File[];
  } => {
    const validItems = items
      .filter(item => item.partName && item.colorSpec && item.quantity && item.coatingMethod)
      .map(item => ({
        ...item,
        quantity: parseInt(item.quantity, 10) || 0
      }));

    return {
      data: {
        ...formData,
        items: validItems
      },
      images: imagePreviewItems.map(item => item.file).filter((file): file is File => file !== null)
    };
  }, [formData, items, imagePreviewItems]);

  /**
   * 폼 초기화
   */
  const resetForm = useCallback(() => {
    setFormData({
      requestDate: getLocalDate(),
      requesterName: '',
      contact: '',
      clientName: '',
      productName: '',
      dueDate: '',
      remarks: '',
    });
    setItems([
      { partName: '', colorSpec: '', quantity: '', postProcessing: [], coatingMethod: '' }
    ]);
    setImagePreviewItems([]);
  }, []);

  return {
    formData,
    items,
    imagePreviewItems,
    handleFormChange,
    handleItemChange,
    handlePostProcessingChange,
    addItem,
    removeItem,
    handleImageSelect,
    removeImage,
    validateForm,
    getFormData,
    resetForm
  };
};

