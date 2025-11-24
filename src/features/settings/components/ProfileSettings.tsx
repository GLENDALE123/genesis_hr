/**
 * 프로필 설정 탭
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/shared/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/components/ui/alert-dialog';
import { useSettings } from '../hooks/useSettings';
import { useAuthStore } from '@/features/auth/store/authStore';
import { User, Mail, Phone, Building2, Upload, Edit, X, Check, Info, Trash2 } from 'lucide-react';
import { clearSavedAccount } from '@/features/auth/utils/savedAccounts';
import { clearSession } from '@/features/auth/services/sessionService';
import { Spinner } from '@/shared/components/ui/spinner';
import { toast } from 'sonner';
import { getUserInitial } from '@/shared/utils/userUtils';
import { formatPhoneNumber } from '@/shared/utils/phoneUtils';
import { uploadProfilePhoto, compressImage, deleteProfilePhoto } from '@/shared/services/firebase/storage';
import { updateUserProfile, updateAuthProfile } from '@/shared/services/firebase';
import Cropper, { Area } from 'react-easy-crop';
import { DEPARTMENT_OPTIONS, normalizeDepartmentName } from '@/shared/constants/departments';

export const ProfileSettings: React.FC = () => {
  const { user, userProfile } = useAuthStore();
  const { settings, updateProfileSettings, isLoading } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(() => {
    const rawDepartment = userProfile?.department || settings.profile.department || '';
    return {
      displayName: user?.displayName || '',
      phoneNumber: user?.phoneNumber ? formatPhoneNumber(user.phoneNumber.replace(/^\+82/, '0').replace(/-/g, '')) : '',
      department: normalizeDepartmentName(rawDepartment),
    };
  });

  // 이미지 크롭 관련 상태
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // 로그인 기록 삭제 다이얼로그 상태
  const [deleteLoginHistoryDialogOpen, setDeleteLoginHistoryDialogOpen] = useState(false);
  const [isDeletingLoginHistory, setIsDeletingLoginHistory] = useState(false);

  const handleChange = (field: string, value: string) => {
    // 연락처 필드인 경우 자동 포맷팅
    if (field === 'phoneNumber') {
      const formatted = formatPhoneNumber(value);
      setFormData((prev) => ({ ...prev, [field]: formatted }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    // 원래 값으로 되돌리기
    const rawDepartment = userProfile?.department || settings.profile.department || '';
    setFormData({
      displayName: user?.displayName || '',
      phoneNumber: user?.phoneNumber ? formatPhoneNumber(user.phoneNumber.replace(/^\+82/, '0').replace(/-/g, '')) : '',
      department: normalizeDepartmentName(rawDepartment),
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!user?.uid) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    try {
      setIsSaving(true);
      
      // 1. Firebase Auth 프로필 업데이트 (displayName, phoneNumber)
      await updateAuthProfile({
        displayName: formData.displayName || undefined,
        phoneNumber: formData.phoneNumber || undefined,
      });
      
      // 2. Firestore users/{userId} 문서 업데이트 (position, department만)
      await updateUserProfile(user.uid, {
        department: formData.department || undefined,
        });
      
      // 3. Settings 문서 업데이트
      await updateProfileSettings({
        displayName: formData.displayName,
        phoneNumber: formData.phoneNumber,
        department: formData.department,
      });
      
      toast.success('프로필이 저장되었습니다.');
      setIsEditing(false); // 수정 모드 종료
    } catch (error) {
      console.error('프로필 저장 실패:', error);
      toast.error('프로필 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 이미지 파일 선택 시 미리보기 모달 열기
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) {
      event.target.value = '';
      return;
    }

    // input 초기화 - 같은 파일을 다시 선택할 수 있도록
    event.target.value = '';

    try {
      // 이미지 파일 읽기
      const reader = new FileReader();
      
      // Promise로 FileReader 완료를 기다림
      await new Promise<void>((resolve, reject) => {
        reader.onloadend = () => {
          try {
            setSelectedImage(reader.result as string);
            setSelectedFile(file);
            // 다음 tick에서 모달 열기
            setTimeout(() => {
              setCropModalOpen(true);
              resolve();
            }, 100);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error('이미지 읽기 실패'));
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error('이미지 읽기 실패:', error);
      toast.error('이미지를 불러오는데 실패했습니다.');
      setSelectedImage(null);
      setSelectedFile(null);
    }
  };

  // 이미지 크롭 완료 시 호출
  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // 크롭된 이미지를 blob으로 변환
  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', error => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<File> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Canvas context not available');
    }

    const maxSize = Math.max(image.width, image.height);
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise<File>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }
          const file = new File([blob], selectedFile?.name || 'profile.jpg', { type: 'image/jpeg' });
          resolve(file);
        },
        'image/jpeg',
        0.95
      );
    });
  };

  // 크롭 완료 및 이미지 업로드
  const handleCropComplete = async () => {
    if (!selectedImage || !croppedAreaPixels || !user || !selectedFile) {
      toast.error('이미지를 처리할 수 없습니다.');
      return;
    }

    try {
      setIsUploadingPhoto(true);
      toast.info('이미지를 처리하는 중...');

      // 크롭된 이미지 생성
      const croppedFile = await getCroppedImg(selectedImage, croppedAreaPixels);

      // 이미지 압축
      const compressedFile = await compressImage(croppedFile, 500, 500, 0.8);

      toast.info('이미지를 업로드하는 중...');

      // 기존 사진 삭제 (있는 경우)
      if (user.photoURL) {
        try {
          await deleteProfilePhoto(user.photoURL);
        } catch (error) {
          console.warn('기존 사진 삭제 실패:', error);
        }
      }

      // Storage에 업로드
      const photoURL = await uploadProfilePhoto(user.uid, compressedFile);

      // 1. Firebase Auth 프로필 업데이트 (photoURL)
      await updateAuthProfile({ photoURL });

      // 2. Firestore 설정 업데이트
      await updateProfileSettings({ photoURL });

      toast.success('프로필 사진이 변경되었습니다.');
      
      // 모달 닫기 (handleDialogOpenChange에서 상태 초기화됨)
      setCropModalOpen(false);
    } catch (error) {
      console.error('프로필 사진 업로드 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '프로필 사진 업로드에 실패했습니다.';
      toast.error(errorMessage);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // 크롭 모달 닫기
  const handleCropCancel = () => {
    if (isUploadingPhoto) return; // 업로드 중에는 닫기 금지
    setCropModalOpen(false);
  };

  // 모달이 실제로 닫힐 때 상태 초기화
  const handleDialogOpenChange = (open: boolean) => {
    if (!open && !isUploadingPhoto) {
      // 모달이 닫히고 업로드 중이 아닐 때만 상태 초기화
      setSelectedImage(null);
      setSelectedFile(null);
      setCroppedAreaPixels(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    }
    setCropModalOpen(open);
  };

  // 파일 선택 대화상자 열기
  // 로그인 기록 삭제 핸들러
  const handleDeleteLoginHistory = async () => {
    if (!user?.uid) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    try {
      setIsDeletingLoginHistory(true);
      
      // 로컬 저장된 계정 삭제
      clearSavedAccount();
      
      // Firestore 세션 삭제
      await clearSession(user.uid);
      
      toast.success('이 기기에서 로그인 기록이 삭제되었습니다.');
      setDeleteLoginHistoryDialogOpen(false);
    } catch (error) {
      console.error('❌ [ProfileSettings] 로그인 기록 삭제 실패:', error);
      toast.error('로그인 기록 삭제에 실패했습니다.');
    } finally {
      setIsDeletingLoginHistory(false);
    }
  };

  const handlePhotoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 파일 선택은 input 요소의 onChange 이벤트로 처리됩니다
    const fileInput = document.getElementById('photo-upload') as HTMLInputElement;
    fileInput?.click();
  };

  // userProfile 변경 시 formData 업데이트
  React.useEffect(() => {
    if (!isEditing) {
      const rawDepartment = userProfile?.department || settings.profile.department || '';
      const normalizedDepartment = normalizeDepartmentName(rawDepartment);
      setFormData({
        displayName: user?.displayName || '',
        phoneNumber: user?.phoneNumber ? formatPhoneNumber(user.phoneNumber.replace(/^\+82/, '0').replace(/-/g, '')) : '',
        department: normalizedDepartment,
      });
    }
  }, [userProfile, user, settings.profile, isEditing]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">설정을 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-6">
      {/* 프로필 사진 */}
      <Card>
        <CardHeader>
          <CardTitle>프로필 사진</CardTitle>
          <CardDescription>
            프로필 사진을 업로드하거나 변경할 수 있습니다. (JPG, PNG, WEBP, 최대 5MB)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage 
                src={user?.photoURL || ''} 
                alt={formData.displayName} 
              />
              <AvatarFallback className="text-2xl">
                {getUserInitial(user, 'U')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <input
                id="photo-upload"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                onClick={handlePhotoClick}
                disabled={isUploadingPhoto}
              >
                {isUploadingPhoto ? (
                  <>
                    <Spinner className="mr-2 size-4 text-inherit" />
                    업로드 중...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    사진 변경
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                권장: 500x500px 이상, 정사각형 이미지
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>기본 정보</CardTitle>
              <CardDescription>
                회사 내에서 사용할 정보를 입력하세요.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {!isEditing ? (
                <Button 
                  onClick={handleEdit} 
                  size="sm"
                  variant="outline"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  수정
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={handleCancel} 
                    size="sm"
                    variant="outline"
                    disabled={isSaving}
                  >
                    <X className="mr-2 h-4 w-4" />
                    취소
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    size="sm"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Spinner className="mr-2 size-4 text-inherit" />
                        저장 중...
                      </>
                    ) : (
                      '저장'
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 이름과 직급 - 2열 그리드 */}
          <div className="grid grid-cols-2 gap-4">
            {/* 이름 */}
            <div className="space-y-2">
              <Label htmlFor="displayName" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                이름
              </Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e) => handleChange('displayName', e.target.value)}
                placeholder="이름을 입력하세요"
                disabled={!isEditing || isSaving}
                className={!isEditing ? 'bg-muted' : ''}
              />
            </div>

            {/* 직급 */}
            <div className="space-y-2">
              <Label htmlFor="position" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                직급
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>수정이 필요할 시 관리자에게 문의하세요</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                id="position"
                value={userProfile?.position || ''}
                disabled
                className="bg-muted"
                placeholder="직급"
              />
            </div>
          </div>

          {/* 이메일 (읽기 전용) */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              이메일
            </Label>
            <Input
              id="email"
              value={user?.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              이메일은 계정 생성 시 설정되며 변경할 수 없습니다.
            </p>
          </div>

          {/* 연락처 */}
          <div className="space-y-2">
            <Label htmlFor="phoneNumber" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              연락처
            </Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => handleChange('phoneNumber', e.target.value)}
              placeholder="010-1234-5678"
              disabled={!isEditing || isSaving}
              className={!isEditing ? 'bg-muted' : ''}
            />
          </div>

          {/* 부서 */}
          <div className="space-y-2">
            <Label htmlFor="department" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              부서
            </Label>
            <Select 
              value={formData.department}
              onValueChange={(value) => handleChange('department', value)}
              disabled={!isEditing || isSaving}
            >
              <SelectTrigger className={!isEditing ? 'bg-muted' : ''}>
                <SelectValue placeholder="부서를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENT_OPTIONS.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 비밀번호 변경 */}
      <Card>
        <CardHeader>
          <CardTitle>비밀번호</CardTitle>
          <CardDescription>
            계정 비밀번호를 변경할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            보안을 위해 주기적으로 비밀번호를 변경하는 것이 좋습니다.
          </p>
          <Button variant="outline" disabled>
            비밀번호 변경
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            💡 비밀번호 변경 기능은 곧 추가될 예정입니다.
          </p>
        </CardContent>
      </Card>

      {/* 로그인 기록 삭제 */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">로그인 기록</CardTitle>
          <CardDescription>
            이 기기에서 저장된 로그인 기록을 삭제할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            삭제 후에는 이 기기에서 자동 로그인 기능을 사용할 수 없습니다.
            다른 기기나 브라우저의 로그인 기록에는 영향을 주지 않습니다.
          </p>
          <AlertDialog open={deleteLoginHistoryDialogOpen} onOpenChange={setDeleteLoginHistoryDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full" disabled={isDeletingLoginHistory}>
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeletingLoginHistory ? '삭제 중...' : '이 기기에서 로그인 기록 삭제'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>로그인 기록 삭제 확인</AlertDialogTitle>
                <AlertDialogDescription>
                  이 기기에서 저장된 로그인 기록을 삭제하시겠습니까?
                  삭제 후에는 자동 로그인 기능을 사용할 수 없으며,
                  다음 로그인 시 이메일과 비밀번호를 입력해야 합니다.
                  다른 기기나 브라우저의 로그인 기록에는 영향을 주지 않습니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeletingLoginHistory}>취소</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteLoginHistory}
                  disabled={isDeletingLoginHistory}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeletingLoginHistory ? (
                    <>
                      <Spinner className="mr-2 size-4 text-inherit" />
                      삭제 중...
                    </>
                  ) : (
                    '삭제'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* 이미지 크롭 모달 */}
      <Dialog open={cropModalOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-3xl w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>프로필 사진 편집</DialogTitle>
          </DialogHeader>
          
          <div className="relative w-full aspect-square max-h-[400px] sm:max-h-[500px] md:max-h-[600px]" style={{ background: '#000' }}>
            {selectedImage && (
              <Cropper
                image={selectedImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                objectFit="contain"
                cropShape="round"
                showGrid={false}
              />
            )}
          </div>

          <div className="space-y-2 px-1">
            <Label htmlFor="zoom-slider">크기 조정</Label>
            <input
              id="zoom-slider"
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={handleCropCancel}
              disabled={isUploadingPhoto}
            >
              <X className="mr-2 h-4 w-4" />
              취소
            </Button>
            <Button 
              onClick={handleCropComplete}
              disabled={isUploadingPhoto}
            >
              {isUploadingPhoto ? (
                <>
                  <Spinner className="mr-2 size-4 text-inherit" />
                  저장 중...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  저장
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

