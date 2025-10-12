/**
 * 프로필 설정 탭
 */

'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { useSettings } from '../hooks/useSettings';
import { useAuthStore } from '@/features/auth/store/authStore';
import { User, Mail, Phone, Building2, Upload, Loader2, Edit, X } from 'lucide-react';
import { toast } from 'sonner';
import { getUserInitial } from '@/shared/utils/userUtils';
import { formatPhoneNumber } from '@/shared/utils/phoneUtils';
import { uploadProfilePhoto, compressImage, deleteProfilePhoto } from '@/shared/services/firebase/storage';
import { updateProfile } from 'firebase/auth';
import { auth } from '@/shared/services/firebase/config';
import { updateUserProfile } from '@/shared/services/firebase';

export const ProfileSettings: React.FC = () => {
  const { user, userProfile } = useAuthStore();
  const { settings, updateProfileSettings, isLoading } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    displayName: userProfile?.displayName || user?.displayName || '',
    phoneNumber: userProfile?.contact || settings.profile.phoneNumber || '',
    department: userProfile?.department || settings.profile.department || '',
  });

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
    setFormData({
      displayName: userProfile?.displayName || user?.displayName || '',
      phoneNumber: userProfile?.contact || settings.profile.phoneNumber || '',
      department: userProfile?.department || settings.profile.department || '',
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
      
      // 1. Firestore users/{userId} 문서 업데이트 (userProfile)
      await updateUserProfile(user.uid, {
        displayName: formData.displayName,
        department: formData.department || undefined,
        contact: formData.phoneNumber || undefined,
      });
      
      // 2. Firebase Auth 프로필 업데이트
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: formData.displayName,
        });
      }
      
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

  // 프로필 사진 업로드
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setIsUploadingPhoto(true);
      toast.info('이미지를 압축하는 중...');

      // 이미지 압축
      const compressedFile = await compressImage(file, 500, 500, 0.8);

      toast.info('이미지를 업로드하는 중...');

      // 기존 사진 삭제 (있는 경우)
      if (user.photoURL) {
        try {
          await deleteProfilePhoto(user.photoURL);
        } catch (error) {
          // 삭제 실패는 무시
          console.warn('기존 사진 삭제 실패:', error);
        }
      }

      // Storage에 업로드
      const photoURL = await uploadProfilePhoto(user.uid, compressedFile);

      // 1. Firebase Auth 프로필 업데이트
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL });
      }

      // 2. Firestore users/{userId} 문서 업데이트 (userProfile)
      await updateUserProfile(user.uid, { photoURL });

      // 3. Firestore 설정 업데이트
      await updateProfileSettings({ photoURL });

      toast.success('프로필 사진이 변경되었습니다.');

      // 파일 input 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('프로필 사진 업로드 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '프로필 사진 업로드에 실패했습니다.';
      toast.error(errorMessage);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // 파일 선택 대화상자 열기
  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  // userProfile 변경 시 formData 업데이트
  React.useEffect(() => {
    if (!isEditing) {
      setFormData({
        displayName: userProfile?.displayName || user?.displayName || '',
        phoneNumber: userProfile?.contact || settings.profile.phoneNumber || '',
        department: userProfile?.department || settings.profile.department || '',
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
    <div className="space-y-6">
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
                src={userProfile?.photoURL || user?.photoURL || ''} 
                alt={formData.displayName} 
              />
              <AvatarFallback className="text-2xl">
                {getUserInitial(user, 'U')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePhotoClick}
                disabled={isUploadingPhoto}
              >
                {isUploadingPhoto ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
            <Input
              id="department"
              value={formData.department}
              onChange={(e) => handleChange('department', e.target.value)}
              placeholder="예: 생산관리부"
              disabled={!isEditing || isSaving}
              className={!isEditing ? 'bg-muted' : ''}
            />
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
    </div>
  );
};

