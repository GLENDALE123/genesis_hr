/**
 * 알림 설정 탭
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Switch } from '@/shared/components/ui/switch';
import { Label } from '@/shared/components/ui/label';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Separator } from '@/shared/components/ui/separator';
import { Input } from '@/shared/components/ui/input';
import { useSettings } from '../hooks/useSettings';
import { useNotificationPermission } from '../hooks/useNotificationPermission';
import { NOTIFICATION_CHANNELS, NotificationChannelType } from '@/shared/types/settings';
import { 
  Bell, 
  Clock, 
  Volume2, 
  Vibrate, 
  AlertCircle,
  CheckCircle2,
  Factory,
  AlertTriangle,
  ShieldAlert,
  MessageSquare,
  CalendarClock,
  TestTube,
  CalendarDays,
  FileText,
  Megaphone,
  Wrench,
  PackageCheck,
} from 'lucide-react';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/utils';

// 아이콘 맵핑
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  CalendarClock,
  AlertTriangle,
  ShieldAlert,
  CalendarDays,
  FileText,
  MessageSquare,
  TestTube,
  Megaphone,
  Wrench,
  PackageCheck,
};

export const NotificationSettings: React.FC = () => {
  const { settings, updateSettings, isLoading } = useSettings();
  const { permission, platform, canRequest, requestPermission } = useNotificationPermission();
  const [isSaving, setIsSaving] = useState(false);

  // 전체 알림 ON/OFF
  const handleToggleNotifications = async (enabled: boolean) => {
    try {
      setIsSaving(true);
      await updateSettings({
        notifications: {
          ...settings.notifications,
          enabled,
        },
      });
      toast.success(enabled ? '알림이 활성화되었습니다.' : '알림이 비활성화되었습니다.');
        } catch {
      toast.error('설정 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 채널별 ON/OFF
  const handleToggleChannel = async (channel: NotificationChannelType, enabled: boolean) => {
    try {
      setIsSaving(true);
      await updateSettings({
        notifications: {
          ...settings.notifications,
          channels: {
            ...settings.notifications.channels,
            [channel]: enabled,
          },
        },
      });
      toast.success(`${NOTIFICATION_CHANNELS[channel].label} 알림이 ${enabled ? '활성화' : '비활성화'}되었습니다.`);
        } catch {
      toast.error('설정 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 시간대 제한 ON/OFF
  const handleToggleSchedule = async (enabled: boolean) => {
    try {
      setIsSaving(true);
      await updateSettings({
        notifications: {
          ...settings.notifications,
          schedule: {
            ...settings.notifications.schedule,
            enabled,
          },
        },
      });
      toast.success(enabled ? '시간대 제한이 활성화되었습니다.' : '시간대 제한이 비활성화되었습니다.');
        } catch {
      toast.error('설정 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 평일/주말 알림 ON/OFF
  const handleToggleDayType = async (dayType: 'weekdays' | 'weekends', enabled: boolean) => {
    try {
      setIsSaving(true);
      await updateSettings({
        notifications: {
          ...settings.notifications,
          schedule: {
            ...settings.notifications.schedule,
            [dayType]: {
              ...settings.notifications.schedule[dayType],
              enabled,
            },
          },
        },
      });
      const label = dayType === 'weekdays' ? '평일' : '주말';
      toast.success(enabled ? `${label} 알림이 활성화되었습니다.` : `${label} 알림이 비활성화되었습니다.`);
        } catch {
      toast.error('설정 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 시간 설정 변경
  const handleTimeChange = async (
    dayType: 'weekdays' | 'weekends',
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    try {
      setIsSaving(true);
      await updateSettings({
        notifications: {
          ...settings.notifications,
          schedule: {
            ...settings.notifications.schedule,
            [dayType]: {
              ...settings.notifications.schedule[dayType],
              [field]: value,
            },
          },
        },
      });
        } catch {
      toast.error('설정 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 소리 ON/OFF
  const handleToggleSound = async (enabled: boolean) => {
    try {
      setIsSaving(true);
      await updateSettings({
        notifications: {
          ...settings.notifications,
          sound: enabled,
        },
      });
      toast.success(enabled ? '알림 소리가 활성화되었습니다.' : '알림 소리가 비활성화되었습니다.');
        } catch {
      toast.error('설정 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 진동 ON/OFF
  const handleToggleVibration = async (enabled: boolean) => {
    try {
      setIsSaving(true);
      await updateSettings({
        notifications: {
          ...settings.notifications,
          vibration: enabled,
        },
      });
      toast.success(enabled ? '진동이 활성화되었습니다.' : '진동이 비활성화되었습니다.');
        } catch {
      toast.error('설정 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 알림 권한 요청
  const handleRequestPermission = async () => {
    // 이미 거부된 상태라면 브라우저 설정 안내
    if (permission === 'denied') {
      toast.info('브라우저 설정에서 알림을 허용해주세요.\n주소창 옆의 자물쇠 아이콘을 클릭하거나 브라우저 설정 > 사이트 설정 > 알림에서 허용할 수 있습니다.', {
        duration: 8000,
      });
      return;
    }

    const granted = await requestPermission();
    if (granted) {
      toast.success('알림 권한이 허용되었습니다.');
    } else {
      toast.error('알림 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.');
    }
  };

  if (isLoading) {
    return (
      <LoadingSpinner 
        label="알림 설정을 불러오는 중..." 
        loadingVariant="card"
        className="h-64"
        size="lg"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 알림 권한 상태 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            알림 권한
          </CardTitle>
          <CardDescription>
            {platform === 'web' && '브라우저 알림 권한 상태입니다.'}
            {platform === 'desktop' && 'Electron 데스크톱 알림이 활성화되어 있습니다.'}
            {platform === 'mobile' && '모바일 앱 알림이 활성화되어 있습니다.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {permission === 'granted' ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium">허용됨</span>
                  <Badge variant="default">정상</Badge>
                </>
              ) : permission === 'denied' ? (
                <>
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <span className="text-sm font-medium">거부됨</span>
                  <Badge variant="destructive">차단됨</Badge>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm font-medium">대기 중</span>
                  <Badge variant="secondary">설정 필요</Badge>
                </>
              )}
            </div>
            {canRequest && permission !== 'granted' && (
              <div className="flex flex-col gap-2">
                <Button onClick={handleRequestPermission} size="sm">
                  {permission === 'denied' ? '브라우저 설정 열기' : '권한 요청'}
                </Button>
                {permission === 'denied' && (
                  <p className="text-xs text-muted-foreground">
                    브라우저 설정에서 알림을 허용해주세요
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 권한이 거부된 경우 안내 카드 */}
      {permission === 'denied' && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              알림 권한이 거부되었습니다
            </CardTitle>
            <CardDescription>
              브라우저 설정에서 알림을 허용해야 알림을 받을 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">권한 허용 방법:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>주소창 왼쪽의 자물쇠 아이콘을 클릭합니다</li>
                <li>&quot;알림&quot; 항목을 찾아 &quot;허용&quot;으로 변경합니다</li>
                <li>또는 브라우저 설정 → 사이트 설정 → 알림에서 허용할 수 있습니다</li>
              </ol>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                💡 권한을 허용한 후 이 페이지를 새로고침하면 알림 설정이 활성화됩니다.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 전체 알림 ON/OFF */}
      <Card>
        <CardHeader>
          <CardTitle>전체 알림</CardTitle>
          <CardDescription>
            모든 알림을 한 번에 켜거나 끌 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications-enabled" className="text-base font-medium">
              알림 활성화
            </Label>
            <Switch
              id="notifications-enabled"
              checked={settings.notifications.enabled}
              onCheckedChange={handleToggleNotifications}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>

      {/* 채널별 알림 설정 */}
      <Card>
        <CardHeader>
          <CardTitle>알림 종류</CardTitle>
          <CardDescription>
            받고 싶은 알림 종류를 선택하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 섹션별로 그룹화 */}
          {[
            {
              title: '생산센터',
              icon: Factory,
              channels: Object.entries(NOTIFICATION_CHANNELS).filter(([, config]) => config.section === 'production-center')
            },
            {
              title: '샘플센터',
              icon: Bell,
              channels: Object.entries(NOTIFICATION_CHANNELS).filter(([, config]) => config.section === 'sample-center')
            },
            {
              title: '지그센터',
              icon: Wrench,
              channels: Object.entries(NOTIFICATION_CHANNELS).filter(([, config]) => config.section === 'jig-center')
            },
            {
              title: '품질센터',
              icon: ShieldAlert,
              channels: Object.entries(NOTIFICATION_CHANNELS).filter(([, config]) => config.section === 'quality-center')
            },
            {
              title: '소통',
              icon: MessageSquare,
              channels: Object.entries(NOTIFICATION_CHANNELS).filter(([, config]) => config.section === 'communication')
            }
          ].map((section, sectionIndex) => (
            <div key={section.title} className="space-y-3">
              {/* 섹션 제목 */}
              <div className="pb-2 border-b">
                <h4 className="font-semibold text-lg">{section.title}</h4>
              </div>
              
              {/* 섹션 내 채널들 */}
              {section.channels.map(([key, config]) => {
                const IconComponent = iconMap[config.icon] || Bell;
                const isEnabled = settings.notifications.channels[key as NotificationChannelType];
                
                return (
                  <div key={key} className="pl-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <IconComponent className={cn(
                          "h-5 w-5 mt-0.5",
                          isEnabled ? "text-primary" : "text-muted-foreground"
                        )} />
                        <div className="flex-1">
                          <Label
                            htmlFor={`channel-${key}`}
                            className="text-base font-medium cursor-pointer"
                          >
                            {config.label}
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {config.description}
                          </p>
                        </div>
                      </div>
                      <Switch
                        id={`channel-${key}`}
                        checked={isEnabled}
                        onCheckedChange={(enabled) => handleToggleChannel(key as NotificationChannelType, enabled)}
                        disabled={!settings.notifications.enabled || isSaving}
                      />
                    </div>
                  </div>
                );
              })}
              
              {/* 섹션 간 구분선 */}
              {sectionIndex < 3 && <Separator className="my-4" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 시간대 제한 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            알림 시간 설정
          </CardTitle>
          <CardDescription>
            특정 시간대에만 알림을 받을 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="schedule-enabled" className="text-base font-medium">
              시간대 제한
            </Label>
            <Switch
              id="schedule-enabled"
              checked={settings.notifications.schedule.enabled}
              onCheckedChange={handleToggleSchedule}
              disabled={!settings.notifications.enabled || isSaving}
            />
          </div>

          {settings.notifications.schedule.enabled && (
            <>
              <Separator />
              
              {/* 평일 설정 */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <Label htmlFor="weekdays-enabled" className="text-base font-medium">
                    평일 (월-금)
                  </Label>
                  <Switch
                    id="weekdays-enabled"
                    checked={settings.notifications.schedule.weekdays.enabled}
                    onCheckedChange={(enabled) => handleToggleDayType('weekdays', enabled)}
                    disabled={isSaving}
                  />
                </div>
                
                {settings.notifications.schedule.weekdays.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="weekdays-start-time" className="text-sm">시작 시간</Label>
                      <Input
                        id="weekdays-start-time"
                        type="time"
                        value={settings.notifications.schedule.weekdays.startTime}
                        onChange={(e) => handleTimeChange('weekdays', 'startTime', e.target.value)}
                        disabled={isSaving}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weekdays-end-time" className="text-sm">종료 시간</Label>
                      <Input
                        id="weekdays-end-time"
                        type="time"
                        value={settings.notifications.schedule.weekdays.endTime}
                        onChange={(e) => handleTimeChange('weekdays', 'endTime', e.target.value)}
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 주말 설정 */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <Label htmlFor="weekends-enabled" className="text-base font-medium">
                    주말 (토-일)
                  </Label>
                  <Switch
                    id="weekends-enabled"
                    checked={settings.notifications.schedule.weekends.enabled}
                    onCheckedChange={(enabled) => handleToggleDayType('weekends', enabled)}
                    disabled={isSaving}
                  />
                </div>
                
                {settings.notifications.schedule.weekends.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="weekends-start-time" className="text-sm">시작 시간</Label>
                      <Input
                        id="weekends-start-time"
                        type="time"
                        value={settings.notifications.schedule.weekends.startTime}
                        onChange={(e) => handleTimeChange('weekends', 'startTime', e.target.value)}
                        disabled={isSaving}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weekends-end-time" className="text-sm">종료 시간</Label>
                      <Input
                        id="weekends-end-time"
                        type="time"
                        value={settings.notifications.schedule.weekends.endTime}
                        onChange={(e) => handleTimeChange('weekends', 'endTime', e.target.value)}
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 소리 및 진동 설정 */}
      <Card>
        <CardHeader>
          <CardTitle>알림 효과</CardTitle>
          <CardDescription>
            알림 소리와 진동을 설정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 소리 설정 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Volume2 className={cn(
                "h-5 w-5",
                settings.notifications.sound ? "text-primary" : "text-muted-foreground"
              )} />
              <div>
                <Label htmlFor="sound-enabled" className="text-base font-medium cursor-pointer">
                  알림 소리
                </Label>
                {platform === 'web' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    브라우저 설정에서 제어됩니다
                  </p>
                )}
              </div>
            </div>
            <Switch
              id="sound-enabled"
              checked={settings.notifications.sound}
              onCheckedChange={handleToggleSound}
              disabled={!settings.notifications.enabled || platform === 'web' || isSaving}
            />
          </div>

          <Separator />

          {/* 진동 설정 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Vibrate className={cn(
                "h-5 w-5",
                settings.notifications.vibration ? "text-primary" : "text-muted-foreground"
              )} />
              <div>
                <Label htmlFor="vibration-enabled" className="text-base font-medium cursor-pointer">
                  진동
                </Label>
                {platform !== 'mobile' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    모바일 전용 기능입니다
                  </p>
                )}
              </div>
            </div>
            <Switch
              id="vibration-enabled"
              checked={settings.notifications.vibration}
              onCheckedChange={handleToggleVibration}
              disabled={!settings.notifications.enabled || platform !== 'mobile' || isSaving}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

