'use client';

import React, { useState, useRef, ChangeEvent } from 'react';
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
import { toast } from 'sonner';
import { useImageUpload } from '@/shared/hooks';
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
  const [formData, setFormData] = useState({
    requestType: '',
    itemName: '',
    partName: '',
    itemNumber: '',
    remarks: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [deletedImages, setDeletedImages] = useState<string[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const canManage = currentUserProfile?.role !== 'Member';

  // jig가 변경될 때마다 폼 데이터 초기화
  React.useEffect(() => {
    if (jig) {
      setFormData({
        requestType: jig.requestType,
        itemName: jig.itemName,
        partName: jig.partName,
        itemNumber: jig.itemNumber,
        remarks: jig.remarks,
      });
      setExistingImages(jig.imageUrls || []);
      setIsEditing(false);
      
      // 이미지 상태 초기화
      imageUploadHook.clearImages();
      imageUploadHook.clearDeletedUrls();
      setDeletedImages([]);
    }
  }, [jig]);

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

  const removeImage = (index: number, isExisting: boolean = false) => {
    if (isExisting) {
      // 기존 이미지 삭제
      const imageToDelete = existingImages[index];
      setExistingImages(prev => prev.filter((_, i) => i !== index));
      setDeletedImages(prev => [...prev, imageToDelete]);
    } else {
      // 새로 추가한 이미지 삭제
      imageUploadHook.removeImage(index);
    }
  };


  const handleSave = async () => {
    if (!jig) return;
    
    setIsSaving(true);
    try {
      let updatedImageUrls = [...existingImages];
      
      // 새 이미지 업로드 (실제 구현에서는 Firebase Storage 사용)
      if (imageUploadHook.uploadingImages.length > 0) {
        toast.info('이미지 업로드 중...');
        
        // 임시로 URL.createObjectURL 사용 (실제로는 Firebase Storage에 업로드)
        const uploadedUrls = imageUploadHook.uploadingImages
          .filter(item => item.file !== null)
          .map(item => URL.createObjectURL(item.file!));
        updatedImageUrls = [...updatedImageUrls, ...uploadedUrls];
      }
      
      // 업데이트된 데이터로 저장
      await onSave(jig.id, { 
        ...formData, 
        imageUrls: updatedImageUrls 
      });
      
      // 상태 초기화
      imageUploadHook.clearImages();
      setExistingImages(updatedImageUrls);
      setDeletedImages([]);
      
      toast.success('지그 정보가 성공적으로 저장되었습니다.');
      setIsEditing(false);
    } catch (error) {
      console.error("Save failed", error);
      toast.error('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleConfirmDelete = () => {
    if (!jig) return;
    onDelete(jig.id);
    setIsDeleteModalOpen(false);
    onClose();
  };
  
  const handleCancelEdit = () => {
    if (!jig) return;
    
    setFormData({
      requestType: jig.requestType,
      itemName: jig.itemName,
      partName: jig.partName,
      itemNumber: jig.itemNumber,
      remarks: jig.remarks,
    });
    // 이미지 상태 초기화
    setImageFiles([]);
    setImagePreviews([]);
    setExistingImages(jig.imageUrls || []);
    setDeletedImages([]);
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
                  {currentUserProfile?.role === 'Admin' && (
                    <Button 
                      type="button" 
                      variant="destructive"
                      onClick={() => setIsDeleteModalOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      삭제
                    </Button>
                  )}
                  {canManage && (
                    <Button 
                      type="button" 
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      수정
                    </Button>
                  )}
                </>
              )}
            </div>
          }
        >
          <div ref={detailRef} className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4 md:col-span-2">
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
                      <Label htmlFor="itemName">제품명</Label>
                      {isEditing ? (
                        <Input
                          id="itemName"
                          name="itemName"
                          value={formData.itemName}
                          onChange={handleChange}
                          placeholder="제품명을 입력하세요"
                          required
                        />
                      ) : (
                        <p className="text-lg font-semibold">{jig.itemName}</p>
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
                      <Label htmlFor="itemNumber">지그번호</Label>
                      {isEditing ? (
                        <Input
                          id="itemNumber"
                          name="itemNumber"
                          value={formData.itemNumber}
                          onChange={handleChange}
                          placeholder="지그번호를 입력하세요"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">{jig.itemNumber}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <div className="space-y-2">
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
                  </div>
                  
                  {/* 첨부 이미지 섹션 */}
                  <div className="md:col-span-2">
                    <Label>첨부 이미지</Label>
                    
                    {/* 기존 이미지들 */}
                    {existingImages.length > 0 && (
                      <div className="mt-2 mb-4">
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
                          {existingImages.map((url, index) => (
                            <div key={`existing-${index}`} className="group relative">
                              <img
                                src={url}
                                alt=""
                                aria-label={`첨부 이미지 ${index + 1}`}
                                width={160}
                                height={96}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-24 object-cover rounded-md cursor-pointer transition-transform hover:scale-105"
                                onClick={() => {
                                  if (!isEditing) {
                                    setLightboxIndex(index);
                                    setLightboxOpen(true);
                                  }
                                }}
                              />
                              {isEditing && (
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="absolute top-1 right-1 w-6 h-6 p-0"
                                  onClick={() => removeImage(index, true)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* 새로 추가된 이미지들 */}
                    {imagePreviews.length > 0 && (
                      <div className="mt-2 mb-4">
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
                          {imagePreviews.map((preview, index) => (
                            <div key={`new-${index}`} className="group relative">
                              <img
                                src={preview}
                                alt=""
                                aria-label={`첨부 이미지 ${index + 1}`}
                                width={160}
                                height={96}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-24 object-cover rounded-md cursor-pointer transition-transform hover:scale-105"
                                onClick={() => {
                                  setLightboxIndex(index);
                                  setLightboxOpen(true);
                                }}
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute top-1 right-1 w-6 h-6 p-0"
                                onClick={() => removeImage(index, false)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* 이미지 업로드 버튼 (수정 모드에서만) */}
                    {isEditing && (
                      <div className="mt-4">
                        <div className="flex items-center gap-2">
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileInputChange} 
                            multiple 
                            accept="image/*,image/heic,image/heif" 
                            className="hidden" 
                          />
                          <input 
                            type="file" 
                            ref={cameraInputRef} 
                            onChange={handleFileInputChange} 
                            accept="image/*,image/heic,image/heif" 
                            className="hidden" 
                          />
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            파일 선택
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => cameraInputRef.current?.click()}
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            사진 촬영
                          </Button>
                        </div>
                        
                        {/* 이미지 미리보기 */}
                        {imageUploadHook.uploadingImages.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium mb-2">새로 추가된 이미지</h4>
                            <div className="grid grid-cols-4 gap-2">
                              {imageUploadHook.uploadingImages.map((item, index) => (
                                <div key={index} className="relative">
                                  <img
                                    src={item.preview || URL.createObjectURL(item.file!)}
                                    alt={`새 이미지 ${index + 1}`}
                                    className="w-full h-20 object-cover rounded border"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeImage(index, false)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 모달 */}
      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>지그 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 '{jig.itemName}' 지그 정보를 삭제하시겠습니까? 
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

      {/* 이미지 라이트박스 */}
      <ImageLightbox 
        images={[...existingImages, ...imagePreviews]} 
        initialIndex={lightboxIndex} 
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)} 
      />
    </>
  );
};
