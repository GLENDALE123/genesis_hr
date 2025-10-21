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
import { toast } from 'sonner';
import { 
  Edit, 
  Trash2, 
  Share2, 
  Camera, 
  Upload,
  Image as ImageIcon,
  Save,
  RotateCcw
} from 'lucide-react';

interface JigMasterDetailProps {
  jig: JigMasterItem | null;
  onSave: (id: string, updates: Partial<Omit<JigMasterItem, 'id' | 'createdAt'>>) => Promise<void>;
  onDelete: (id: string) => void;
  currentUserProfile: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

// 이미지 라이트박스 컴포넌트
const ImageLightbox: React.FC<{
  images: string[];
  initialIndex: number;
  onClose: () => void;
}> = ({ images, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft') handlePrevious();
    if (e.key === 'ArrowRight') handleNext();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] p-0"
        stickyHeader={
          <DialogHeader>
            <DialogTitle>이미지 뷰어 ({currentIndex + 1} / {images.length})</DialogTitle>
          </DialogHeader>
        }
        onKeyDown={handleKeyDown}
      >
        <div className="relative p-6">
          <div className="relative">
            <img
              src={images[currentIndex]}
              alt={`이미지 ${currentIndex + 1}`}
              className="w-full h-auto max-h-[60vh] object-contain rounded-lg"
            />
            
            {images.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  onClick={handlePrevious}
                >
                  ←
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  onClick={handleNext}
                >
                  →
                </Button>
              </>
            )}
          </div>
          
          {images.length > 1 && (
            <div className="flex justify-center mt-4 gap-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentIndex ? 'bg-primary' : 'bg-muted'
                  }`}
                  onClick={() => setCurrentIndex(index)}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const JigMasterDetail: React.FC<JigMasterDetailProps> = ({ 
  jig, 
  onSave, 
  onDelete, 
  currentUserProfile, 
  isOpen, 
  onClose 
}) => {
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
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [deletedImages, setDeletedImages] = useState<string[]>([]);
  const [lightboxData, setLightboxData] = useState<{ images: string[], initialIndex: number } | null>(null);
  
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
      setImageFiles([]);
      setImagePreviews([]);
      setDeletedImages([]);
    }
  }, [jig]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setImageFiles(prev => [...prev, ...files]);
      setImagePreviews(prev => [...prev, ...newPreviews]);
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
      setImageFiles(prev => prev.filter((_, i) => i !== index));
      setImagePreviews(prev => {
        URL.revokeObjectURL(prev[index]);
        return prev.filter((_, i) => i !== index);
      });
    }
  };

  const handleShare = async () => {
    if (!jig) return;
    
    const elementToCapture = detailRef.current;
    if (!elementToCapture) {
      toast.error('공유할 대상을 찾을 수 없습니다.');
      return;
    }
    
    toast.info('이미지 생성 중...');

    try {
      // html2canvas가 없으면 기본 공유 기능 사용
      if (typeof window !== 'undefined' && 'navigator' in window && navigator.share) {
        const shareData = {
          title: `지그 정보: ${jig.itemName}`,
          text: `T.M.S. 지그 마스터 정보 공유\n제품명: ${jig.itemName}\n부속명: ${jig.partName}\n지그번호: ${jig.itemNumber}`,
        };
        
        if (navigator.canShare && navigator.canShare(shareData)) {
          await navigator.share(shareData);
          toast.success('지그 정보가 공유되었습니다.');
        } else {
          // 클립보드에 복사
          await navigator.clipboard.writeText(shareData.text);
          toast.success('지그 정보가 클립보드에 복사되었습니다.');
        }
      } else {
        // 클립보드에 텍스트 복사
        const text = `지그 정보: ${jig.itemName}\n부속명: ${jig.partName}\n지그번호: ${jig.itemNumber}\n특이사항: ${jig.remarks || '없음'}`;
        await navigator.clipboard.writeText(text);
        toast.success('지그 정보가 클립보드에 복사되었습니다.');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Sharing failed:', err);
        toast.error('공유에 실패했습니다.');
      }
    }
  };

  const handleSave = async () => {
    if (!jig) return;
    
    setIsSaving(true);
    try {
      let updatedImageUrls = [...existingImages];
      
      // 새 이미지 업로드 (실제 구현에서는 Firebase Storage 사용)
      if (imageFiles.length > 0) {
        toast.info('이미지 업로드 중...');
        
        // 임시로 URL.createObjectURL 사용 (실제로는 Firebase Storage에 업로드)
        const uploadedUrls = imageFiles.map(file => URL.createObjectURL(file));
        updatedImageUrls = [...updatedImageUrls, ...uploadedUrls];
      }
      
      // 업데이트된 데이터로 저장
      await onSave(jig.id, { 
        ...formData, 
        imageUrls: updatedImageUrls 
      });
      
      // 상태 초기화
      setImageFiles([]);
      setImagePreviews([]);
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
                  <Button 
                    variant="outline" 
                    onClick={handleShare}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    공유
                  </Button>
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
                                    setLightboxData({ 
                                      images: existingImages, 
                                      initialIndex: index 
                                    });
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
                                onClick={() => setLightboxData({ 
                                  images: imagePreviews, 
                                  initialIndex: index 
                                })}
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
                            onChange={handleImageChange} 
                            multiple 
                            accept="image/*,image/heic,image/heif" 
                            className="hidden" 
                          />
                          <input 
                            type="file" 
                            ref={cameraInputRef} 
                            onChange={handleImageChange} 
                            accept="image/*,image/heic,image/heif" 
                            capture="environment" 
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
      {lightboxData && (
        <ImageLightbox 
          images={lightboxData.images} 
          initialIndex={lightboxData.initialIndex} 
          onClose={() => setLightboxData(null)} 
        />
      )}
    </>
  );
};
