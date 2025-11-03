'use client';

import React, { useState, useRef, ChangeEvent, useCallback } from 'react';
import { JigMasterItem, UserProfile } from '../types';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent } from '@/shared/components/ui/card';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/shared/components/ui/alert-dialog';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/shared/components/ui/dialog';
import { ImageLightbox } from '@/shared/components/common/ImageLightbox';
import { UploadingImageGrid, ImageGalleryGrid } from '@/shared/components/common';
import { toast } from 'sonner';
import { useImageUpload } from '@/shared/hooks';
import { createUnifiedImagePath, deleteImagesWithThumbnails } from '@/shared/utils/imagePathMigration';
import { 
  Edit, 
  Trash2, 
  Camera, 
  Upload,
  Image as ImageIcon,
  Save,
  RotateCcw,
  X
} from 'lucide-react';

interface JigMasterDetailProps {
  jig: JigMasterItem | null;
  onSave: (id: string, updates: Partial<Omit<JigMasterItem, 'id' | 'createdAt'>>) => Promise<void>;
  onDelete: (id: string) => void;
  currentUserProfile: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
}


export const JigMasterDetail: React.FC<JigMasterDetailProps> = ({ 
  jig, 
  onSave, 
  onDelete, 
  currentUserProfile, 
  isOpen, 
  onClose 
}) => {
  // 이미지 업로드 훅 사용
  const imageUploadHook = useImageUpload();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    requestType: '',
    orderNumber: '',
    supplier: '',
    productName: '',
    partName: '',
    jigNumber: '',
    remarks: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  // 삭제된 이미지 URL 추적을 위한 로컬 상태
  const [deletedImageUrls, setDeletedImageUrls] = useState<string[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const canManage = currentUserProfile?.role !== 'Member';

  // jig가 변경될 때마다 폼 데이터 초기화 (품질검사 작성폼과 동일한 로직)
  React.useEffect(() => {
    if (jig) {
      setFormData({
        requestType: jig.requestType || '',
        orderNumber: jig.orderNumber || '',
        supplier: jig.supplier || '',
        productName: jig.productName || jig.itemName || '', // 기존 데이터 호환
        partName: jig.partName || '',
        jigNumber: jig.jigNumber || jig.itemNumber || '', // 기존 데이터 호환
        remarks: jig.remarks || '',
      });
      setIsEditing(false);
      
      // 이미지 상태 완전 초기화 (품질검사 작성폼과 동일)
      imageUploadHook.clearImages();
      imageUploadHook.clearDeletedUrls();
      
      // 기존 이미지 설정은 수정 모드에서만 (품질검사 작성폼과 동일)
      // 모달이 열릴 때는 기존 이미지를 설정하지 않음
    }
  }, [jig]);

  // 수정 모드로 전환할 때마다 기존 이미지 설정 (Fast Refresh 대응)
  React.useEffect(() => {
    if (isEditing && jig?.imageUrls && jig.imageUrls.length > 0) {
      imageUploadHook.setExistingImages(jig.imageUrls);
    }
  }, [isEditing, jig?.imageUrls]); // imageUploadHook 제거

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 파일 선택 핸들러
  const handleFileInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length > 0) {
      try {
        await imageUploadHook.handleFileSelect(files);
      } catch (error) {
        console.error('파일 선택 처리 실패:', error);
      }
    }
    
    // input 초기화 (같은 파일을 다시 선택할 수 있도록)
    if (e.target) {
      e.target.value = '';
    }
  };

  const removeImage = useCallback((index: number) => {
    // imageUploadHook의 removeImage 사용 (품질검사 작성폼과 동일)
    imageUploadHook.removeImage(index);
  }, [imageUploadHook]);


  const handleSave = async () => {
    if (!jig) return;

    setIsSaving(true);
    try {
      // 이미지 업로드 처리 (품질검사 작성폼과 동일한 로직)
      let imageUrls: string[] = [];
      
      if (imageUploadHook.uploadingImages.length > 0) {
        // 업로드 시작 토스트 표시
        toast.info('이미지 업로드 중...', { id: 'image-upload-progress' });
        
        const folder = createUnifiedImagePath(jig.id);
        
        try {
          // 진행률 콜백과 함께 업로드
          const uploadFunction = () => imageUploadHook.uploadImages(folder, (progress) => {
            toast.info(`이미지 업로드 중... ${Math.round(progress)}%`, { 
              id: 'image-upload-progress' 
            });
          });
          const newImageUrls = await uploadFunction();
          
          // 수정 모드에서는 기존 이미지와 새 이미지를 합쳐서 저장
          const existingImageUrls = imageUploadHook.uploadingImages
            .filter(item => item.file === null && item.preview) // 기존 이미지들
            .map(item => item.preview!)
            .filter(url => !imageUploadHook.deletedImageUrls.includes(url)); // 삭제된 이미지 제외
          
          
          imageUrls = [...existingImageUrls, ...(newImageUrls as string[])];
          toast.dismiss('image-upload-progress');
          
        } catch (error: any) {
          console.error('이미지 업로드 실패:', error);
          
          if (error.message?.includes('취소')) {
            toast.error('이미지 업로드가 취소되었습니다.');
          } else if (error.message?.includes('시간이 초과')) {
            toast.error('업로드 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.');
          } else {
            toast.error(`이미지 업로드에 실패했습니다: ${error.message || '알 수 없는 오류'}`);
          }
          
          setIsSaving(false);
          toast.dismiss('image-upload-progress');
          return;
        }
      } else {
        // 이미지가 없는 경우 기존 이미지 URL만 사용
        imageUrls = jig.imageUrls || [];
      }

      // 삭제된 이미지 URL 처리 (썸네일 포함) - 품질검사 작성폼과 동일
      if (imageUploadHook.deletedImageUrls.length > 0) {
        try {
          const deleteResult = await deleteImagesWithThumbnails(imageUploadHook.deletedImageUrls);
          
          // 삭제 성공한 이미지들을 imageUrls에서 제거
          imageUrls = imageUrls.filter(url => !deleteResult.success.includes(url));
          
          // 삭제된 URL 목록 초기화
          imageUploadHook.clearDeletedUrls();
        } catch (error) {
          console.error('❌ 이미지 삭제 실패:', error);
          toast.error('이미지 삭제에 실패했습니다.');
        }
      }
      
      // 업데이트된 데이터로 저장
      // jig.id는 이미 실제 데이터베이스의 ID이므로 그대로 사용
      await onSave(jig.id, { 
        ...formData, 
        imageUrls: imageUrls 
      });
      
      // 상태 초기화 (품질검사 작성폼과 동일)
      imageUploadHook.clearImages();
      imageUploadHook.clearDeletedUrls();
      
      toast.success('지그 정보가 성공적으로 저장되었습니다.');
      
      // 수정 모드에서 읽기 모드로 즉시 전환
      setIsEditing(false);
      
    } catch (error) {
      console.error("Save failed", error);
      
      // 구체적인 오류 메시지 표시
      if (error instanceof Error) {
        if (error.message.includes('이미지 업로드')) {
          toast.error('이미지 업로드에 실패했습니다. 다시 시도해주세요.');
        } else {
          toast.error(`저장에 실패했습니다: ${error.message}`);
        }
      } else {
        toast.error('저장에 실패했습니다.');
      }
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleConfirmDelete = async () => {
    if (!jig) return;
    
    try {
      await onDelete(jig.id);
      setIsDeleteDialogOpen(false);
      onClose();
    } catch (error) {
      console.error('지그 삭제 실패:', error);
      toast.error('지그 삭제에 실패했습니다.');
    }
  };
  
  const handleCancelEdit = () => {
    if (!jig) return;
    
    setFormData({
      requestType: jig.requestType || '',
      orderNumber: jig.orderNumber || '',
      supplier: jig.supplier || '',
      productName: jig.productName || jig.itemName || '', // 기존 데이터 호환
      partName: jig.partName || '',
      jigNumber: jig.jigNumber || jig.itemNumber || '', // 기존 데이터 호환
      remarks: jig.remarks || '',
    });
    
    // 이미지 상태 완전 초기화 (품질검사 작성폼과 동일)
    imageUploadHook.clearImages();
    imageUploadHook.clearDeletedUrls();
    
    setIsEditing(false);
  };

  if (!jig) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className="max-w-4xl max-h-[90vh]"
          stickyHeader={
            <DialogHeader>
              <DialogTitle>지그 상세 정보</DialogTitle>
            </DialogHeader>
          }
          stickyFooter={
            <div className="flex justify-end gap-2">
              {isEditing ? (
                <>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    취소
                  </Button>
                  <Button 
                    type="button" 
                    onClick={handleSave} 
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? '저장 중...' : '변경사항 저장'}
                  </Button>
                </>
              ) : (
                <>
                  {canManage && (
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        onClick={() => {
                          setIsEditing(true);
                          // 기존 이미지 설정은 useEffect에서 자동으로 처리됨
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        수정
                      </Button>
                      
                      {currentUserProfile?.role !== 'Manager' && (
                        <Button 
                          type="button" 
                          variant="destructive"
                          onClick={() => {
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          삭제
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          }
        >
          <div ref={detailRef} className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="requestType">생산구분</Label>
                    {isEditing ? (
                      <Input
                        id="requestType"
                        name="requestType"
                        value={formData.requestType}
                        onChange={handleChange}
                        placeholder="생산구분을 입력하세요"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">{jig.requestType}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="orderNumber">발주번호</Label>
                    {isEditing ? (
                      <Input
                        id="orderNumber"
                        name="orderNumber"
                        value={formData.orderNumber}
                        onChange={handleChange}
                        placeholder="발주번호를 입력하세요"
                        required
                      />
                    ) : (
                      <p className="text-lg font-semibold">{jig.orderNumber}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supplier">발주처</Label>
                    {isEditing ? (
                      <Input
                        id="supplier"
                        name="supplier"
                        value={formData.supplier}
                        onChange={handleChange}
                        placeholder="발주처를 입력하세요"
                        required
                      />
                    ) : (
                      <p className="text-lg font-semibold">{jig.supplier}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="productName">제품명</Label>
                    {isEditing ? (
                      <Input
                        id="productName"
                        name="productName"
                        value={formData.productName}
                        onChange={handleChange}
                        placeholder="제품명을 입력하세요"
                        required
                      />
                    ) : (
                      <p className="text-lg font-semibold">{jig.productName || jig.itemName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="partName">부속명</Label>
                    {isEditing ? (
                      <Input
                        id="partName"
                        name="partName"
                        value={formData.partName}
                        onChange={handleChange}
                        placeholder="부속명을 입력하세요"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">{jig.partName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jigNumber">지그번호</Label>
                    {isEditing ? (
                      <Input
                        id="jigNumber"
                        name="jigNumber"
                        value={formData.jigNumber}
                        onChange={handleChange}
                        placeholder="지그번호를 입력하세요"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">{jig.jigNumber || jig.itemNumber}</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2 mt-6">
                  <Label htmlFor="remarks">특이사항</Label>
                  {isEditing ? (
                    <Textarea
                      id="remarks"
                      name="remarks"
                      value={formData.remarks}
                      onChange={handleChange}
                      placeholder="특이사항을 입력하세요"
                      rows={5}
                    />
                  ) : (
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm whitespace-pre-wrap">
                        {jig.remarks || '없음'}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* 첨부 이미지 섹션 */}
                <div className="mt-6">
                  <h3 className="text-sm font-medium mb-2">이미지 첨부</h3>
                  <div className="space-y-4">
                    {/* 기존 이미지들 - 상세보기에서는 ImageGalleryGrid 사용 */}
                    {!isEditing && jig.imageUrls && jig.imageUrls.length > 0 && (
                      <ImageGalleryGrid 
                        images={jig.imageUrls}
                        gridClassName="grid-cols-[repeat(auto-fill,minmax(100px,1fr))]"
                        imageClassName="h-24"
                        useThumbnails={true}
                        enableLazyLoading={true}
                      />
                    )}
                    
                    
                    {/* 수정 모드 - 파일 선택 버튼들 (품질검사와 동일) */}
                    {isEditing && (
                      <>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            파일 선택
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => cameraInputRef.current?.click()}
                          >
                            사진 촬영
                          </Button>
                        </div>
                        
                        {/* 파일 입력 */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,image/heic,image/heif"
                          multiple
                          onChange={handleFileInputChange}
                          className="hidden"
                        />
                        <input
                          ref={cameraInputRef}
                          type="file"
                          accept="image/*,image/heic,image/heif"
                          capture="environment"
                          onChange={handleFileInputChange}
                          className="hidden"
                        />
                      </>
                    )}
                    
                    {/* 이미지 그리드 - 수정 모드에서 모든 이미지 표시 (품질검사와 동일) */}
                    {isEditing && (
                      <UploadingImageGrid
                        items={imageUploadHook.uploadingImages}
                        onRemove={imageUploadHook.removeImage}
                        gridClassName="grid-cols-[repeat(auto-fill,minmax(100px,1fr))]"
                        imageClassName="h-24"
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 모달 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>지그 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 '{jig.productName || jig.itemName}' 지그 정보를 삭제하시겠습니까? 
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 이미지 라이트박스 - 품질검사와 동일한 로직 */}
      <ImageLightbox 
        images={
          isEditing 
            ? imageUploadHook.uploadingImages.map(item => item.preview || '').filter(Boolean)
            : (jig.imageUrls || [])
        } 
        initialIndex={lightboxIndex} 
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)} 
      />
    </>
  );
};
