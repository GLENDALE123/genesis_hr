/**
 * Spinner 컴포넌트 사용 예시
 * shadcn/ui 공식 문서 기반 다양한 형태 제공
 */


import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Spinner } from '@/shared/components/ui/spinner';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';

export const SpinnerExamples: React.FC = () => {
  return (
    <div className="space-y-8 p-6">
      <Card>
        <CardHeader>
          <CardTitle>기본 Spinner 사용법</CardTitle>
          <CardDescription>shadcn/ui 공식 문서 기반 다양한 형태</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* 크기 변형 */}
          <div>
            <h3 className="text-lg font-semibold mb-3">크기 변형</h3>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-2">
                <Spinner className="size-3" />
                <span className="text-xs text-muted-foreground">sm</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner className="size-4" />
                <span className="text-xs text-muted-foreground">default</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner className="size-5" />
                <span className="text-xs text-muted-foreground">lg</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner className="size-6" />
                <span className="text-xs text-muted-foreground">xl</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner className="size-8" />
                <span className="text-xs text-muted-foreground">2xl</span>
              </div>
            </div>
          </div>

          {/* 색상 변형 */}
          <div>
            <h3 className="text-lg font-semibold mb-3">색상 변형</h3>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-2">
                <Spinner className="size-4" />
                <span className="text-xs text-muted-foreground">default</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner className="size-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">secondary</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner className="size-4 text-muted" />
                <span className="text-xs text-muted-foreground">muted</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner className="size-4 text-destructive" />
                <span className="text-xs text-muted-foreground">destructive</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner className="size-4 text-green-500" />
                <span className="text-xs text-muted-foreground">success</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner className="size-4 text-yellow-500" />
                <span className="text-xs text-muted-foreground">warning</span>
              </div>
            </div>
          </div>

          {/* 아이콘 변형 */}
          <div>
            <h3 className="text-lg font-semibold mb-3">아이콘 변형</h3>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-2">
                <Spinner className="size-4" />
                <span className="text-xs text-muted-foreground">Loader2</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner className="size-4" />
                <span className="text-xs text-muted-foreground">Loader</span>
              </div>
            </div>
          </div>

          {/* 버튼 내 사용 */}
          <div>
            <h3 className="text-lg font-semibold mb-3">버튼 내 사용</h3>
            <div className="flex gap-4">
              <Button disabled>
                <Spinner className="mr-2 size-4 text-inherit" />
                로딩 중...
              </Button>
              <Button variant="secondary" disabled>
                <Spinner className="mr-2 size-4 text-inherit" />
                처리 중...
              </Button>
              <Button variant="destructive" disabled>
                <Spinner className="mr-2 size-4 text-inherit" />
                삭제 중...
              </Button>
            </div>
          </div>

          {/* 뱃지 내 사용 */}
          <div>
            <h3 className="text-lg font-semibold mb-3">뱃지 내 사용</h3>
            <div className="flex gap-4">
              <Badge variant="default">
                <Spinner className="mr-2 size-3 text-inherit" />
                동기화 중
              </Badge>
              <Badge variant="secondary">
                <Spinner className="mr-2 size-3 text-inherit" />
                업데이트 중
              </Badge>
              <Badge variant="destructive">
                <Spinner className="mr-2 size-3 text-inherit" />
                오류 발생
              </Badge>
            </div>
          </div>

          {/* 커스텀 스타일 */}
          <div>
            <h3 className="text-lg font-semibold mb-3">커스텀 스타일</h3>
            <div className="flex items-center gap-4">
              <Spinner className="text-blue-500 size-8" />
              <Spinner className="text-purple-500 size-6" />
              <Spinner className="text-pink-500 size-4" />
            </div>
          </div>

        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>LoadingSpinner 사용법</CardTitle>
          <CardDescription>고급 로딩 상태 컴포넌트</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* 기본 형태 */}
          <div>
            <h3 className="text-lg font-semibold mb-3">기본 형태</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2">Default</h4>
                <LoadingSpinner 
                  label="데이터 로딩 중..." 
                  loadingVariant="default"
                />
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2">Minimal</h4>
                <LoadingSpinner 
                  label="로딩 중..." 
                  loadingVariant="minimal"
                />
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2">Card</h4>
                <LoadingSpinner 
                  label="처리 중..." 
                  loadingVariant="card"
                />
              </div>
            </div>
          </div>

          {/* 색상별 LoadingSpinner */}
          <div>
            <h3 className="text-lg font-semibold mb-3">색상별 LoadingSpinner</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2">Success</h4>
                <LoadingSpinner 
                  label="성공적으로 처리되었습니다" 
                  loadingVariant="card"
                />
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2">Warning</h4>
                <LoadingSpinner 
                  label="경고: 처리 중입니다" 
                  loadingVariant="card"
                />
              </div>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};

