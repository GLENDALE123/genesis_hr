'use client';

import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, Camera, Image as ImageIcon, X } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { UploadingImageGrid } from '@/shared/components/common/UploadingImageGrid';
import { Spinner } from '@/shared/components/ui/spinner';
import { useImageUpload } from '@/shared/hooks';
import { toast } from 'sonner';
import { AnnouncementFormData } from '../types/announcement.types';
import { getUserDisplayName } from '@/shared/utils/userUtils';
import { useAuthStore } from '@/features/auth/store/authStore';

const announcementSchema = z.object({
  title: z.string().min(1, '제목은 필수입니다.').max(100, '제목은 100자 이하여야 합니다.'),
  content: z.string().min(1, '내용은 필수입니다.').max(2000, '내용은 2000자 이하여야 합니다.'),
  cooperationRequest: z.string().max(200, '협조요청은 200자 이하여야 합니다.'),
  planStartDate: z.string().optional(),
  planEndDate: z.string().optional(),
  imageUrls: z.array(z.union([z.string(), z.instanceof(File)])).optional(),
});

interface AnnouncementFormProps {
  onSubmit: (data: AnnouncementFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<AnnouncementFormData>;
  isSubmitting?: boolean;
  currentUser?: {
    displayName?: string;
    name?: string;
    role?: string;
  };
}

export const AnnouncementForm: React.FC<AnnouncementFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isSubmitting = false,
  currentUser
}) => {
  // 사용자 정보 가져오기
  const { user, userProfile } = useAuthStore();
  
  // 이미지 업로드 훅 사용
  const imageUploadHook = useImageUpload();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: initialData?.title || '',
      content: initialData?.content || '',
      cooperationRequest: initialData?.cooperationRequest || '',
      planStartDate: initialData?.planStartDate || '',
      planEndDate: initialData?.planEndDate || '',
      imageUrls: initialData?.imageUrls || [],
    }
  });

  const planStartDate = watch('planStartDate');

  // 기존 이미지 URL들을 UploadingImageItem으로 변환
  React.useEffect(() => {
    if (initialData?.imageUrls && initialData.imageUrls.length > 0) {
      const existingItems = initialData.imageUrls
        .filter((url): url is string => typeof url === 'string')
        .map(url => ({
          file: null,
          preview: url
        }));
      imageUploadHook.setExistingImages(existingItems as any);
    }
  }, [initialData?.imageUrls, imageUploadHook]);

  // 파일 선택 핸들러
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length > 0) {
      try {
        await imageUploadHook.handleFileSelect(files);
      } catch (error) {
        console.error('파일 선택 처리 실패:', error);
        toast.error(error instanceof Error ? error.message : '파일 선택에 실패했습니다.');
      }
    }
    
    // input 초기화 (같은 파일을 다시 선택할 수 있도록)
    if (e.target) {
      e.target.value = '';
    }
  };


  const handleFormSubmit = async (data: AnnouncementFormData) => {
    try {
      // 기존 이미지 URL들 추출
      const existingImageUrls = imageUploadHook.uploadingImages
        .filter((item: any) => item.file === null)
        .map((item: any) => item.preview!)
        .filter((url: any) => typeof url === 'string') as string[];

      // 새로 업로드할 파일들 추출
      const newImageFiles = imageUploadHook.uploadingImages
        .filter((item: any) => item.file !== null)
        .map((item: any) => item.file!);

      const formData: AnnouncementFormData = {
        ...data,
        imageUrls: [...existingImageUrls, ...newImageFiles] as string[], // 실제로는 파일 업로드 후 URL로 변환됨
      };

      await onSubmit(formData);
    } catch (error) {
      console.error('폼 제출 실패:', error);
      toast.error('공지사항 제출에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const openFileDialog = () => fileInputRef.current?.click();
  const openCameraDialog = () => cameraInputRef.current?.click();

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          {initialData ? '공지사항 수정' : '새 공지사항 작성'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* 제목 */}
          <div className="space-y-2">
            <Label htmlFor="title">제목 *</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="공지사항 제목을 입력하세요"
              className={errors.title ? 'border-destructive' : ''}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* 작성자 정보 */}
          <div className="space-y-2">
            <Label>작성자</Label>
            <Input
              value={getUserDisplayName(user, userProfile, '관리자')}
              disabled
              className="bg-muted"
            />
          </div>

          {/* 협조요청 */}
          <div className="space-y-2">
            <Label htmlFor="cooperationRequest">협조요청</Label>
            <Input
              id="cooperationRequest"
              {...register('cooperationRequest')}
              placeholder="협조를 요청할 부서 또는 인원"
              className={errors.cooperationRequest ? 'border-destructive' : ''}
            />
            {errors.cooperationRequest && (
              <p className="text-sm text-destructive">{errors.cooperationRequest.message}</p>
            )}
          </div>

          {/* 공지기간 */}
          <div className="space-y-2">
            <Label>공지 해당일자 (시작일 ~ 종료일)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                {...register('planStartDate')}
                className="flex-1"
              />
              <span className="text-muted-foreground">~</span>
              <Input
                type="date"
                {...register('planEndDate')}
                min={planStartDate}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              종료일을 비워두면 시작일 하루만 적용됩니다.
            </p>
          </div>

          {/* 내용 */}
          <div className="space-y-2">
            <Label htmlFor="content">내용 *</Label>
            <Textarea
              id="content"
              {...register('content')}
              placeholder="공지사항 내용을 입력하세요"
              rows={10}
              className={errors.content ? 'border-destructive' : ''}
            />
            {errors.content && (
              <p className="text-sm text-destructive">{errors.content.message}</p>
            )}
          </div>

          {/* 이미지 첨부 */}
          <div className="space-y-2">
            <Label>이미지 첨부</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={openFileDialog}
                disabled={imageUploadHook.isUploading}
                className="flex items-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80"
              >
                <ImageIcon className="h-4 w-4" />
                갤러리에서 선택
              </Button>
              <Button
                type="button"
                onClick={openCameraDialog}
                disabled={imageUploadHook.isUploading}
                className="flex items-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80"
              >
                <Camera className="h-4 w-4" />
                사진 촬영
              </Button>
            </div>

            {/* 숨겨진 파일 입력 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />

            {/* 이미지 미리보기 */}
            {imageUploadHook.uploadingImages.length > 0 && (
              <UploadingImageGrid
                items={imageUploadHook.uploadingImages}
                onRemove={imageUploadHook.removeImage}
                gridClassName="grid-cols-[repeat(auto-fill,minmax(120px,1fr))]"
                imageClassName="h-24"
              />
            )}
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              취소
            </Button>
            <Button
              type="submit"
                disabled={isSubmitting || imageUploadHook.isUploading}
              className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting && (
                <Spinner className="size-4 text-inherit" />
              )}
              {isSubmitting ? '저장 중...' : '저장'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
