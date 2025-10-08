'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetFooter
} from '@/shared/components/ui/sheet';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Separator } from '@/shared/components/ui/separator';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Slider } from '@/shared/components/ui/slider';
import { Input } from '@/shared/components/ui/input';
import { Palette, Copy, RotateCcw, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';

interface ColorVariable {
  name: string;
  label: string;
  variable: string;
  category: string;
}

const COLOR_VARIABLES: ColorVariable[] = [
  // 레이아웃 색상
  { name: 'header-background', label: '헤더 배경', variable: '--header-background', category: 'layout' },
  { name: 'header-foreground', label: '헤더 전경', variable: '--header-foreground', category: 'layout' },
  { name: 'main-background', label: '메인 콘텐츠 배경', variable: '--main-background', category: 'layout' },
  { name: 'main-foreground', label: '메인 콘텐츠 전경', variable: '--main-foreground', category: 'layout' },
  { name: 'sidebar-background', label: '사이드바 배경', variable: '--sidebar-background', category: 'layout' },
  { name: 'sidebar-foreground', label: '사이드바 전경', variable: '--sidebar-foreground', category: 'layout' },
  
  // 기본 색상
  { name: 'background', label: '기본 배경', variable: '--background', category: 'basic' },
  { name: 'foreground', label: '기본 전경', variable: '--foreground', category: 'basic' },
  { name: 'card', label: '카드 배경', variable: '--card', category: 'basic' },
  { name: 'card-foreground', label: '카드 전경', variable: '--card-foreground', category: 'basic' },
  { name: 'popover', label: '팝오버 배경', variable: '--popover', category: 'basic' },
  { name: 'popover-foreground', label: '팝오버 전경', variable: '--popover-foreground', category: 'basic' },
  
  // 주요 색상
  { name: 'primary', label: '주요 색상', variable: '--primary', category: 'primary' },
  { name: 'primary-foreground', label: '주요 전경', variable: '--primary-foreground', category: 'primary' },
  { name: 'secondary', label: '보조 색상', variable: '--secondary', category: 'primary' },
  { name: 'secondary-foreground', label: '보조 전경', variable: '--secondary-foreground', category: 'primary' },
  { name: 'accent', label: '강조 색상', variable: '--accent', category: 'primary' },
  { name: 'accent-foreground', label: '강조 전경', variable: '--accent-foreground', category: 'primary' },
  
  // 상태 색상
  { name: 'destructive', label: '파괴적 색상', variable: '--destructive', category: 'status' },
  { name: 'destructive-foreground', label: '파괴적 전경', variable: '--destructive-foreground', category: 'status' },
  { name: 'success-bg', label: '성공 배경', variable: '--success-bg', category: 'status' },
  { name: 'success-text', label: '성공 텍스트', variable: '--success-text', category: 'status' },
  { name: 'warning-bg', label: '경고 배경', variable: '--warning-bg', category: 'status' },
  { name: 'warning-text', label: '경고 텍스트', variable: '--warning-text', category: 'status' },
  { name: 'muted', label: '뮤트 색상', variable: '--muted', category: 'status' },
  { name: 'muted-foreground', label: '뮤트 전경', variable: '--muted-foreground', category: 'status' },
  
  // UI 요소
  { name: 'border', label: '테두리', variable: '--border', category: 'ui' },
  { name: 'input', label: '입력', variable: '--input', category: 'ui' },
  { name: 'ring', label: '링', variable: '--ring', category: 'ui' },
];

const hslToHex = (h: number, s: number, l: number): string => {
  l = l / 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
};

export const ThemeCustomizer: React.FC = () => {
  const { theme, resolvedTheme } = useTheme();
  const [colors, setColors] = useState<Record<string, string>>({});
  const [alphas, setAlphas] = useState<Record<string, number>>({});
  const [radius, setRadius] = useState<number>(0.65);
  const [shadowIntensity, setShadowIntensity] = useState<number>(1);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && open) {
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      
      // 현재 적용된 테마(라이트/다크)의 색상 값 가져오기
      const initialColors: Record<string, string> = {};
      COLOR_VARIABLES.forEach((variable) => {
        const hslValue = computedStyle.getPropertyValue(variable.variable).trim();
        if (hslValue) {
          const [h, s, l] = hslValue.split(' ').map(v => parseFloat(v.replace('%', '')));
          initialColors[variable.name] = hslToHex(h || 0, s || 0, l || 0);
        }
      });
      
      setColors(initialColors);
      
      // 투명도 초기값 (모두 1.0으로 설정)
      const initialAlphas: Record<string, number> = {};
      COLOR_VARIABLES.forEach((variable) => {
        initialAlphas[variable.name] = 1.0;
      });
      setAlphas(initialAlphas);
      
      // 라운드 값 가져오기
      const radiusValue = computedStyle.getPropertyValue('--radius').trim();
      if (radiusValue) {
        setRadius(parseFloat(radiusValue.replace('rem', '')));
      }
    }
  }, [theme, resolvedTheme, open]);

  const handleColorChange = (variableName: string, variableCss: string, hexColor: string) => {
    const hsl = hexToHsl(hexColor);
    const alpha = alphas[variableName] || 1.0;
    const hslString = alpha < 1.0 
      ? `${hsl.h} ${hsl.s}% ${hsl.l}% / ${alpha}`
      : `${hsl.h} ${hsl.s}% ${hsl.l}%`;
    
    if (typeof window !== 'undefined') {
      document.documentElement.style.setProperty(variableCss, hslString);
    }
    
    setColors(prev => ({ ...prev, [variableName]: hexColor }));
  };

  const handleAlphaChange = (variableName: string, variableCss: string, alpha: number) => {
    const hexColor = colors[variableName];
    if (!hexColor) return;
    
    const hsl = hexToHsl(hexColor);
    const hslString = alpha < 1.0 
      ? `${hsl.h} ${hsl.s}% ${hsl.l}% / ${alpha}`
      : `${hsl.h} ${hsl.s}% ${hsl.l}%`;
    
    if (typeof window !== 'undefined') {
      document.documentElement.style.setProperty(variableCss, hslString);
    }
    
    setAlphas(prev => ({ ...prev, [variableName]: alpha }));
  };

  const handleRadiusChange = (value: number) => {
    setRadius(value);
    if (typeof window !== 'undefined') {
      document.documentElement.style.setProperty('--radius', `${value}rem`);
    }
  };

  const handleShadowIntensityChange = (value: number) => {
    setShadowIntensity(value);
    if (typeof window !== 'undefined') {
      const isDark = (resolvedTheme || theme) === 'dark';
      const baseOpacity = isDark ? 0.3 : 0.05;
      const intensity = value;
      
      document.documentElement.style.setProperty('--shadow-sm', `0 1px 2px 0 rgb(0 0 0 / ${baseOpacity * intensity})`);
      document.documentElement.style.setProperty('--shadow', `0 1px 3px 0 rgb(0 0 0 / ${(baseOpacity + 0.05) * intensity}), 0 1px 2px -1px rgb(0 0 0 / ${(baseOpacity + 0.05) * intensity})`);
      document.documentElement.style.setProperty('--shadow-md', `0 4px 6px -1px rgb(0 0 0 / ${(baseOpacity + 0.05) * intensity}), 0 2px 4px -2px rgb(0 0 0 / ${(baseOpacity + 0.05) * intensity})`);
      document.documentElement.style.setProperty('--shadow-lg', `0 10px 15px -3px rgb(0 0 0 / ${(baseOpacity + 0.05) * intensity}), 0 4px 6px -4px rgb(0 0 0 / ${(baseOpacity + 0.05) * intensity})`);
      document.documentElement.style.setProperty('--shadow-xl', `0 20px 25px -5px rgb(0 0 0 / ${(baseOpacity + 0.05) * intensity}), 0 8px 10px -6px rgb(0 0 0 / ${(baseOpacity + 0.05) * intensity})`);
      document.documentElement.style.setProperty('--shadow-2xl', `0 25px 50px -12px rgb(0 0 0 / ${(baseOpacity + 0.2) * intensity})`);
    }
  };

  const handleReset = () => {
    if (typeof window !== 'undefined') {
      COLOR_VARIABLES.forEach((variable) => {
        document.documentElement.style.removeProperty(variable.variable);
      });
      document.documentElement.style.removeProperty('--radius');
      document.documentElement.style.removeProperty('--shadow-sm');
      document.documentElement.style.removeProperty('--shadow');
      document.documentElement.style.removeProperty('--shadow-md');
      document.documentElement.style.removeProperty('--shadow-lg');
      document.documentElement.style.removeProperty('--shadow-xl');
      document.documentElement.style.removeProperty('--shadow-2xl');
      
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      
      const resetColors: Record<string, string> = {};
      COLOR_VARIABLES.forEach((variable) => {
        const hslValue = computedStyle.getPropertyValue(variable.variable).trim();
        if (hslValue) {
          const [h, s, l] = hslValue.split(' ').map(v => parseFloat(v.replace('%', '')));
          resetColors[variable.name] = hslToHex(h || 0, s || 0, l || 0);
        }
      });
      
      const radiusValue = computedStyle.getPropertyValue('--radius').trim();
      if (radiusValue) {
        setRadius(parseFloat(radiusValue.replace('rem', '')));
      }
      
      setColors(resetColors);
      
      // 투명도도 초기화
      const resetAlphas: Record<string, number> = {};
      COLOR_VARIABLES.forEach((variable) => {
        resetAlphas[variable.name] = 1.0;
      });
      setAlphas(resetAlphas);
      
      setShadowIntensity(1);
      toast.success('테마 초기화 완료');
    }
  };

  const handleCopyConfig = () => {
    const cssVariables = COLOR_VARIABLES.map((variable) => {
      const hexColor = colors[variable.name];
      if (!hexColor) return '';
      
      const hsl = hexToHsl(hexColor);
      const alpha = alphas[variable.name] || 1.0;
      
      if (alpha < 1.0) {
        return `  ${variable.variable}: ${hsl.h} ${hsl.s}% ${hsl.l}% / ${alpha};`;
      } else {
        return `  ${variable.variable}: ${hsl.h} ${hsl.s}% ${hsl.l}%;`;
      }
    }).filter(Boolean).join('\n');

    const isDark = (resolvedTheme || theme) === 'dark';
    const baseOpacity = isDark ? 0.3 : 0.05;
    const intensity = shadowIntensity;
    
    const shadowConfig = `  --radius: ${radius}rem;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / ${baseOpacity * intensity});
  --shadow: 0 1px 3px 0 rgb(0 0 0 / ${(baseOpacity + 0.05) * intensity}), 0 1px 2px -1px rgb(0 0 0 / ${(baseOpacity + 0.05) * intensity});
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / ${(baseOpacity + 0.05) * intensity}), 0 2px 4px -2px rgb(0 0 0 / ${(baseOpacity + 0.05) * intensity});
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / ${(baseOpacity + 0.05) * intensity}), 0 4px 6px -4px rgb(0 0 0 / ${(baseOpacity + 0.05) * intensity});
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / ${(baseOpacity + 0.05) * intensity}), 0 8px 10px -6px rgb(0 0 0 / ${(baseOpacity + 0.05) * intensity});
  --shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / ${(baseOpacity + 0.2) * intensity});`;

    const config = `/* 커스텀 테마 설정 */\n:root {\n${cssVariables}\n${shadowConfig}\n}\n\n.dark {\n${cssVariables}\n${shadowConfig}\n}`;

    navigator.clipboard.writeText(config);
    setCopied(true);
    toast.success('테마 설정 복사 완료');
    
    setTimeout(() => setCopied(false), 2000);
  };

  const renderColorPicker = (variable: ColorVariable) => {
    const alpha = alphas[variable.name] || 1.0;
    
    return (
      <div key={variable.name} className="space-y-2 py-2 border-b border-border last:border-0">
        <div className="flex items-center justify-between">
          <Label htmlFor={variable.name} className="text-sm font-medium">
            {variable.label}
          </Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              id={variable.name}
              value={colors[variable.name] || '#000000'}
              onChange={(e) => handleColorChange(variable.name, variable.variable, e.target.value)}
              className="w-10 h-10 rounded border border-border cursor-pointer"
            />
            <span className="text-xs text-muted-foreground font-mono w-20">
              {colors[variable.name]}
            </span>
          </div>
        </div>
        
        {/* 투명도 슬라이더 */}
        <div className="flex items-center gap-3 pl-1">
          <Label className="text-xs text-muted-foreground w-16">투명도</Label>
          <Slider
            value={[alpha]}
            onValueChange={(value) => handleAlphaChange(variable.name, variable.variable, value[0])}
            min={0}
            max={1}
            step={0.01}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground font-mono w-12 text-right">
            {Math.round(alpha * 100)}%
          </span>
        </div>
      </div>
    );
  };

  const layoutColors = COLOR_VARIABLES.filter(v => v.category === 'layout');
  const basicColors = COLOR_VARIABLES.filter(v => v.category === 'basic');
  const primaryColors = COLOR_VARIABLES.filter(v => v.category === 'primary');
  const statusColors = COLOR_VARIABLES.filter(v => v.category === 'status');
  const uiColors = COLOR_VARIABLES.filter(v => v.category === 'ui');

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Palette className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]" overlayClassName="bg-transparent">
        <SheetHeader>
          <SheetTitle>테마 커스터마이저 {(resolvedTheme || theme) === 'dark' ? '(다크 모드)' : '(라이트 모드)'}</SheetTitle>
          <SheetDescription>
            프로젝트의 색상 테마를 커스터마이징하고 설정을 복사하세요.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-200px)] mt-4 pr-4">
          <Tabs defaultValue="layout" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="layout">레이아웃</TabsTrigger>
              <TabsTrigger value="basic">기본</TabsTrigger>
              <TabsTrigger value="primary">주요</TabsTrigger>
              <TabsTrigger value="status">상태</TabsTrigger>
              <TabsTrigger value="ui">UI</TabsTrigger>
            </TabsList>

            <TabsContent value="layout" className="space-y-2 mt-4">
              {layoutColors.map(renderColorPicker)}
            </TabsContent>

            <TabsContent value="basic" className="space-y-2 mt-4">
              {basicColors.map(renderColorPicker)}
            </TabsContent>

            <TabsContent value="primary" className="space-y-2 mt-4">
              {primaryColors.map(renderColorPicker)}
            </TabsContent>

            <TabsContent value="status" className="space-y-2 mt-4">
              {statusColors.map(renderColorPicker)}
            </TabsContent>

            <TabsContent value="ui" className="space-y-2 mt-4">
              {uiColors.map(renderColorPicker)}
            </TabsContent>
          </Tabs>

          <Separator className="my-4" />

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-3">라운드 (Border Radius)</h4>
              <div className="flex items-center gap-4">
                <Slider
                  value={[radius]}
                  onValueChange={(value) => handleRadiusChange(value[0])}
                  min={0}
                  max={2}
                  step={0.05}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={radius}
                  onChange={(e) => handleRadiusChange(parseFloat(e.target.value) || 0)}
                  min={0}
                  max={2}
                  step={0.05}
                  className="w-20"
                />
                <span className="text-xs text-muted-foreground">rem</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                현재값: {radius}rem ({(radius * 16).toFixed(0)}px)
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">그림자 강도</h4>
              <div className="flex items-center gap-4">
                <Slider
                  value={[shadowIntensity]}
                  onValueChange={(value) => handleShadowIntensityChange(value[0])}
                  min={0}
                  max={3}
                  step={0.1}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={shadowIntensity}
                  onChange={(e) => handleShadowIntensityChange(parseFloat(e.target.value) || 0)}
                  min={0}
                  max={3}
                  step={0.1}
                  className="w-20"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                현재값: {shadowIntensity.toFixed(1)}x
              </p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <h4 className="text-sm font-medium">프리뷰</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-4 border" style={{ backgroundColor: 'hsl(var(--header-background))', color: 'hsl(var(--header-foreground))', borderRadius: `${radius}rem`, boxShadow: 'var(--shadow-md)' }}>
                <p className="text-sm">헤더 색상</p>
              </div>
              <div className="p-4 border" style={{ backgroundColor: 'hsl(var(--main-background))', color: 'hsl(var(--main-foreground))', borderRadius: `${radius}rem`, boxShadow: 'var(--shadow-md)' }}>
                <p className="text-sm">메인 색상</p>
              </div>
              <div className="p-4 border" style={{ backgroundColor: 'hsl(var(--sidebar-background))', color: 'hsl(var(--sidebar-foreground))', borderRadius: `${radius}rem`, boxShadow: 'var(--shadow-md)' }}>
                <p className="text-sm">사이드바 색상</p>
              </div>
              <div className="p-4 bg-card border" style={{ borderRadius: `${radius}rem`, boxShadow: 'var(--shadow-md)' }}>
                <p className="text-sm text-card-foreground">카드 색상</p>
              </div>
              <div className="p-4 bg-primary" style={{ borderRadius: `${radius}rem`, boxShadow: 'var(--shadow-lg)' }}>
                <p className="text-sm text-primary-foreground">주요 색상</p>
              </div>
              <div className="p-4 bg-secondary" style={{ borderRadius: `${radius}rem`, boxShadow: 'var(--shadow)' }}>
                <p className="text-sm text-secondary-foreground">보조 색상</p>
              </div>
              <div className="p-4 bg-destructive" style={{ borderRadius: `${radius}rem`, boxShadow: 'var(--shadow-lg)' }}>
                <p className="text-sm text-destructive-foreground">파괴적 색상</p>
              </div>
              <div className="p-4 bg-muted" style={{ borderRadius: `${radius}rem`, boxShadow: 'var(--shadow-sm)' }}>
                <p className="text-sm text-muted-foreground">뮤트 색상</p>
              </div>
              <div className="p-4" style={{ backgroundColor: 'hsl(var(--success-bg))', color: 'hsl(var(--success-text))', borderRadius: `${radius}rem`, boxShadow: 'var(--shadow-md)' }}>
                <p className="text-sm">성공 색상</p>
              </div>
              <div className="p-4" style={{ backgroundColor: 'hsl(var(--warning-bg))', color: 'hsl(var(--warning-text))', borderRadius: `${radius}rem`, boxShadow: 'var(--shadow-md)' }}>
                <p className="text-sm">경고 색상</p>
              </div>
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="mt-4">
          <div className="flex gap-2 w-full">
            <Button 
              variant="outline" 
              onClick={handleReset}
              className="flex-1"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              초기화
            </Button>
            <Button 
              onClick={handleCopyConfig}
              className="flex-1"
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  복사 완료
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  설정 복사
                </>
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

