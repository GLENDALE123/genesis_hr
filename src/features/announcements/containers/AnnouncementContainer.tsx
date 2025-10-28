'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Grid3X3, List, Search } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/components/ui/alert-dialog';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { toast } from 'sonner';

import { AnnouncementService } from '../services/announcementService';
import { AnnouncementForm } from '../components/AnnouncementForm';
import { AnnouncementCard } from '../components/AnnouncementCard';
import { AnnouncementList } from '../components/AnnouncementList';
import { AnnouncementDetailModal } from '../components/AnnouncementDetailModal';
import { Announcement, AnnouncementFormData, ViewMode } from '../types/announcement.types';
import { useAuthStore } from '@/features/auth/store/authStore';
import { UnifiedNotificationService } from '@/shared/services/notificationService';

interface AnnouncementContainerProps {
  className?: string;
}

export const AnnouncementContainer: React.FC<AnnouncementContainerProps> = ({
  className
}) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [searchTerm, setSearchTerm] = useState('');
  
  // 모달 상태
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [deletingAnnouncement, setDeletingAnnouncement] = useState<Announcement | null>(null);

  // 인증 상태 및 권한 체크
  const { user, userProfile, isLoading: authLoading } = useAuthStore();
  
  // 권한 체크: Admin 또는 Manager만 관리 가능
  const canManage = userProfile?.role === 'Admin' || userProfile?.role === 'Manager';

  // 공지사항 실시간 구독
  useEffect(() => {
    const unsubscribe = AnnouncementService.subscribeToAnnouncements(
      (data) => {
        setAnnouncements(data);
        setIsLoading(false);
      },
      100
    );

    return () => unsubscribe();
  }, []);

  // 검색 필터링
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredAnnouncements(announcements);
    } else {
      const filtered = announcements.filter(announcement =>
        announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        announcement.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        announcement.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        announcement.cooperationRequest?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredAnnouncements(filtered);
    }
  }, [announcements, searchTerm]);

  const handleCreateAnnouncement = () => {
    setEditingAnnouncement(null);
    setIsFormOpen(true);
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setIsFormOpen(true);
  };

  const handleDeleteAnnouncement = (announcement: Announcement) => {
    setDeletingAnnouncement(announcement);
  };

  const handleViewAnnouncement = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setIsDetailOpen(true);
  };

  const handleFormSubmit = async (data: AnnouncementFormData) => {
    setIsSubmitting(true);
    try {
      // 이미지 업로드 처리
      const imageFiles = (data.imageUrls || []).filter(url => url instanceof File) as File[];
      const existingImageUrls = (data.imageUrls || []).filter(url => typeof url === 'string') as string[];
      
      let uploadedImageUrls: string[] = [];
      if (imageFiles.length > 0) {
        uploadedImageUrls = await AnnouncementService.uploadAnnouncementImages(imageFiles);
      }

      const finalImageUrls = [...existingImageUrls, ...uploadedImageUrls];

      if (editingAnnouncement) {
        // 수정
        await AnnouncementService.updateAnnouncement(editingAnnouncement.id, {
          ...data,
          imageUrls: finalImageUrls,
        });
        toast.success('공지사항이 수정되었습니다.');
      } else {
        // 생성
        await AnnouncementService.createAnnouncement(
          {
            ...data,
            imageUrls: finalImageUrls,
          },
          userProfile?.displayName || userProfile?.name || '관리자'
        );
        
        // 알림 생성
        try {
          await UnifiedNotificationService.sendAnnouncementNotification(
            data.title,
            data.content || '공지사항 본문',
            data.cooperationRequest || '',
            'new-announcement'
          );
        } catch (notificationError) {
          console.warn('알림 생성 실패:', notificationError);
        }
        
        toast.success('공지사항이 등록되었습니다.');
      }

      setIsFormOpen(false);
      setEditingAnnouncement(null);
    } catch (error) {
      console.error('공지사항 저장 실패:', error);
      toast.error('공지사항 저장에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingAnnouncement) return;

    try {
      await AnnouncementService.deleteAnnouncement(deletingAnnouncement.id);
      toast.success('공지사항이 삭제되었습니다.');
      setDeletingAnnouncement(null);
    } catch (error) {
      console.error('공지사항 삭제 실패:', error);
      toast.error('공지사항 삭제에 실패했습니다.');
    }
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingAnnouncement(null);
  };

  if (isLoading) {
    return (
      <LoadingSpinner 
        loadingVariant="card"
        label="공지사항을 불러오는 중..."
        size="lg"
      />
    );
  }

  return (
    <div className={`${className || ''}`}>
      <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
        {canManage && (
          <Button onClick={handleCreateAnnouncement} className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            새 공지사항
          </Button>
        )}
      </div>

      {/* 검색 및 뷰 모드 */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* 검색 */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="공지사항 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* 뷰 모드 전환 */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
              <Button
                onClick={() => setViewMode('card')}
                className={`h-8 px-3 ${viewMode === 'card' ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground hover:bg-muted'}`}
              >
                <Grid3X3 className="h-4 w-4 mr-1" />
                카드
              </Button>
              <Button
                onClick={() => setViewMode('list')}
                className={`h-8 px-3 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground hover:bg-muted'}`}
              >
                <List className="h-4 w-4 mr-1" />
                리스트
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 공지사항 목록 */}
      {filteredAnnouncements.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-muted-foreground">
              <Grid3X3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">
                {searchTerm ? '검색 결과가 없습니다' : '등록된 공지사항이 없습니다'}
              </p>
              <p className="text-sm">
                {searchTerm 
                  ? '다른 검색어를 시도해보세요' 
                  : canManage 
                    ? '새 공지사항을 작성해보세요' 
                    : '새로운 공지사항을 기다려주세요'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {filteredAnnouncements.map((announcement) => (
                <AnnouncementCard
                  key={announcement.id}
                  announcement={announcement}
                  onClick={() => handleViewAnnouncement(announcement)}
                  onEdit={canManage ? () => handleEditAnnouncement(announcement) : undefined}
                  onDelete={canManage ? () => handleDeleteAnnouncement(announcement) : undefined}
                  canManage={canManage}
                />
              ))}
            </div>
          ) : (
            <AnnouncementList
              announcements={filteredAnnouncements}
              onRowClick={handleViewAnnouncement}
              onEdit={canManage ? handleEditAnnouncement : undefined}
              onDelete={canManage ? handleDeleteAnnouncement : undefined}
              canManage={canManage}
            />
          )}
        </>
      )}

      {/* 폼 모달 */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAnnouncement ? '공지사항 수정' : '새 공지사항 작성'}
            </DialogTitle>
          </DialogHeader>
          <AnnouncementForm
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            initialData={editingAnnouncement || undefined}
            isSubmitting={isSubmitting}
            currentUser={userProfile || undefined}
          />
        </DialogContent>
      </Dialog>

      {/* 상세 모달 */}
      <AnnouncementDetailModal
        announcement={selectedAnnouncement}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onEdit={canManage ? () => {
          setIsDetailOpen(false);
          handleEditAnnouncement(selectedAnnouncement!);
        } : undefined}
        onDelete={canManage ? () => {
          setIsDetailOpen(false);
          handleDeleteAnnouncement(selectedAnnouncement!);
        } : undefined}
        canManage={canManage}
      />

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deletingAnnouncement} onOpenChange={() => setDeletingAnnouncement(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>공지사항 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &apos;{deletingAnnouncement?.title}&apos; 공지사항을 정말 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
};
