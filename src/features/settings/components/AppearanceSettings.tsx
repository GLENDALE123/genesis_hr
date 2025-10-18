/**
 * 화면 설정 탭
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import { useSettings } from '../hooks/useSettings';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor, Type } from 'lucide-react';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/utils';

export const AppearanceSettings: React.FC = () => {
  const { settings, updateAppearanceSettings, isLoading } = useSettings();
  const { theme, setTheme } = useTheme();
  const [isSaving, setIsSaving] = useState(false);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    // next-themes만 업데이트 (localStorage 자동 저장)
    // 기기별로 독립적인 테마 설정
    setTheme(newTheme);
    toast.success('테마가 변경되었습니다.');
  };

  const handleFontSizeChange = async (fontSize: 'small' | 'medium' | 'large') => {
    try {
      setIsSaving(true);
      await updateAppearanceSettings({ fontSize });
      toast.success('폰트 크기가 변경되었습니다.');
    } catch {
      toast.error('폰트 크기 변경에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <LoadingSpinner 
        size="lg" 
        label="화면 설정을 불러오는 중..." 
        variant="default"
        className="h-64"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 테마 설정 */}
      <Card>
        <CardHeader>
          <CardTitle>테마</CardTitle>
          <CardDescription>
            다크 모드 또는 라이트 모드를 선택하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={theme || 'system'}
            onValueChange={(value) => handleThemeChange(value as 'light' | 'dark' | 'system')}
            className="space-y-3"
          >
            {/* 라이트 모드 */}
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="light" id="theme-light" />
              <Label
                htmlFor="theme-light"
                className={cn(
                  "flex items-center gap-3 cursor-pointer flex-1 p-3 rounded-lg border-2 transition-colors",
                  theme === 'light' 
                    ? "border-primary bg-primary/5" 
                    : "border-transparent hover:bg-accent"
                )}
              >
                <Sun className="h-5 w-5" />
                <div>
                  <p className="font-medium">라이트 모드</p>
                  <p className="text-sm text-muted-foreground">밝은 화면</p>
                </div>
              </Label>
            </div>

            {/* 다크 모드 */}
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="dark" id="theme-dark" />
              <Label
                htmlFor="theme-dark"
                className={cn(
                  "flex items-center gap-3 cursor-pointer flex-1 p-3 rounded-lg border-2 transition-colors",
                  theme === 'dark' 
                    ? "border-primary bg-primary/5" 
                    : "border-transparent hover:bg-accent"
                )}
              >
                <Moon className="h-5 w-5" />
                <div>
                  <p className="font-medium">다크 모드</p>
                  <p className="text-sm text-muted-foreground">어두운 화면</p>
                </div>
              </Label>
            </div>

            {/* 시스템 설정 따라가기 */}
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="system" id="theme-system" />
              <Label
                htmlFor="theme-system"
                className={cn(
                  "flex items-center gap-3 cursor-pointer flex-1 p-3 rounded-lg border-2 transition-colors",
                  theme === 'system' 
                    ? "border-primary bg-primary/5" 
                    : "border-transparent hover:bg-accent"
                )}
              >
                <Monitor className="h-5 w-5" />
                <div>
                  <p className="font-medium">시스템 설정</p>
                  <p className="text-sm text-muted-foreground">운영체제 설정 따라가기</p>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* 폰트 크기 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            폰트 크기
          </CardTitle>
          <CardDescription>
            화면에 표시되는 글자 크기를 조절합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={settings.appearance.fontSize}
            onValueChange={(value) => handleFontSizeChange(value as 'small' | 'medium' | 'large')}
            disabled={isSaving}
            className="space-y-3"
          >
            {/* 작게 */}
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="small" id="fontSize-small" />
              <Label
                htmlFor="fontSize-small"
                className={cn(
                  "cursor-pointer flex-1 p-3 rounded-lg border-2 transition-colors",
                  settings.appearance.fontSize === 'small' 
                    ? "border-primary bg-primary/5" 
                    : "border-transparent hover:bg-accent"
                )}
              >
                <div className="space-y-1">
                  <p className="font-medium text-sm">작게</p>
                  <p className="text-xs text-muted-foreground">더 많은 정보를 한 화면에</p>
                </div>
              </Label>
            </div>

            {/* 보통 */}
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="medium" id="fontSize-medium" />
              <Label
                htmlFor="fontSize-medium"
                className={cn(
                  "cursor-pointer flex-1 p-3 rounded-lg border-2 transition-colors",
                  settings.appearance.fontSize === 'medium' 
                    ? "border-primary bg-primary/5" 
                    : "border-transparent hover:bg-accent"
                )}
              >
                <div className="space-y-1">
                  <p className="font-medium text-base">보통</p>
                  <p className="text-sm text-muted-foreground">기본 크기 (권장)</p>
                </div>
              </Label>
            </div>

            {/* 크게 */}
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="large" id="fontSize-large" />
              <Label
                htmlFor="fontSize-large"
                className={cn(
                  "cursor-pointer flex-1 p-3 rounded-lg border-2 transition-colors",
                  settings.appearance.fontSize === 'large' 
                    ? "border-primary bg-primary/5" 
                    : "border-transparent hover:bg-accent"
                )}
              >
                <div className="space-y-1">
                  <p className="font-medium text-lg">크게</p>
                  <p className="text-base text-muted-foreground">더 편한 가독성</p>
                </div>
              </Label>
            </div>
          </RadioGroup>

          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              💡 폰트 크기 변경이 즉시 적용됩니다. 현재 설정: <strong>{settings.appearance.fontSize}</strong>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


