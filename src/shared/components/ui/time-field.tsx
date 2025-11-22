
import * as React from 'react';
import { cn } from '@/shared/lib/utils';

interface TimeFieldProps {
  value?: string; // "HH:mm" 형식
  onChange?: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showAmPm?: boolean; // AM/PM 표시 여부 (선택사항)
  format?: '12h' | '24h'; // 12시간제 또는 24시간제
  error?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

export const TimeField = React.forwardRef<HTMLDivElement, TimeFieldProps>(
  (
    {
      value = '',
      onChange,
      onBlur,
      disabled = false,
      className,
      showAmPm = false,
      format = '24h',
      error = false,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      ...props
    },
    ref
  ) => {
    // HH:mm 문자열을 시/분으로 파싱
    const parseTime = (timeStr: string): { hour: string; minute: string; period?: 'AM' | 'PM' } => {
      if (!timeStr) {
        return { hour: '', minute: '', period: format === '12h' ? 'AM' : undefined };
      }

      const [timePart, period] = timeStr.split(' ');
      const [hour, minute] = (timePart || '').split(':');

      let parsedHour = hour || '';
      let parsedMinute = minute || '';
      let parsedPeriod: 'AM' | 'PM' | undefined = period as 'AM' | 'PM' | undefined;

      // 12시간제 처리
      if (format === '12h' && parsedHour) {
        const hourNum = parseInt(parsedHour, 10);
        if (!isNaN(hourNum)) {
          if (hourNum === 0) {
            parsedHour = '12';
            parsedPeriod = 'AM';
          } else if (hourNum >= 1 && hourNum <= 12) {
            parsedPeriod = parsedPeriod || (hourNum < 12 ? 'AM' : 'PM');
          } else if (hourNum > 12 && hourNum <= 23) {
            parsedHour = String(hourNum - 12);
            parsedPeriod = parsedPeriod || 'PM';
          }
        }
      }

      return {
        hour: parsedHour,
        minute: parsedMinute,
        period: parsedPeriod || (format === '12h' ? 'AM' : undefined)
      };
    };

    // 시/분/AM-PM을 HH:mm 형식으로 변환
    const formatTimeToString = (
      hour: string,
      minute: string,
      period?: 'AM' | 'PM'
    ): string => {
      if (!hour && !minute) return '';

      let hourNum = parseInt(hour, 10);
      if (isNaN(hourNum)) hourNum = 0;

      // 12시간제 -> 24시간제 변환
      if (format === '12h' && period) {
        if (period === 'AM' && hourNum === 12) {
          hourNum = 0;
        } else if (period === 'PM' && hourNum !== 12) {
          hourNum += 12;
        }
      }

      const formattedHour = String(hourNum).padStart(2, '0');
      const formattedMinute = (minute || '00').padStart(2, '0');

      if (format === '12h' && showAmPm && period) {
        const displayHour = hourNum === 0 ? 12 : (hourNum > 12 ? hourNum - 12 : hourNum);
        return `${String(displayHour).padStart(2, '0')}:${formattedMinute} ${period}`;
      }

      return `${formattedHour}:${formattedMinute}`;
    };

    const { hour, minute, period } = parseTime(value);
    const [localHour, setLocalHour] = React.useState(hour);
    const [localMinute, setLocalMinute] = React.useState(minute);
    const [localPeriod, setLocalPeriod] = React.useState<'AM' | 'PM' | undefined>(period);

    // 외부 value 변경 시 로컬 상태 동기화
    React.useEffect(() => {
      const parsed = parseTime(value);
      setLocalHour(parsed.hour);
      setLocalMinute(parsed.minute);
      setLocalPeriod(parsed.period);
    }, [value, format]);

    // 시 입력 핸들러 (입력 중에는 부모 onChange 호출 지연)
    const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let newHour = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
      
      if (format === '12h') {
        const hourNum = parseInt(newHour, 10);
        if (!isNaN(hourNum) && hourNum > 12) {
          newHour = '12';
        }
      } else {
        const hourNum = parseInt(newHour, 10);
        if (!isNaN(hourNum) && hourNum > 23) {
          newHour = '23';
        }
      }

      setLocalHour(newHour);

      // 두 필드가 모두 2자리일 때만 상위 값 갱신
      if (onChange && newHour.length === 2 && localMinute.length === 2) {
        const formatted = formatTimeToString(newHour, localMinute, localPeriod);
        onChange(formatted);
      }
    };

    // 분 입력 핸들러 (입력 중에는 부모 onChange 호출 지연)
    const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let newMinute = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
      const minuteNum = parseInt(newMinute, 10);
      if (!isNaN(minuteNum) && minuteNum > 59) {
        newMinute = '59';
      }

      setLocalMinute(newMinute);

      // 두 필드가 모두 2자리일 때만 상위 값 갱신
      if (onChange && localHour.length === 2 && newMinute.length === 2) {
        const formatted = formatTimeToString(localHour, newMinute, localPeriod);
        onChange(formatted);
      }
    };

    // AM/PM 변경 핸들러
    const handlePeriodChange = (newPeriod: 'AM' | 'PM') => {
      setLocalPeriod(newPeriod);
      
      if (onChange && (localHour || localMinute)) {
        const formatted = formatTimeToString(localHour, localMinute, newPeriod);
        onChange(formatted);
      }
    };

    // 블러 시 포맷팅 완료
    const handleBlur = () => {
      const formatted = formatTimeToString(localHour, localMinute, localPeriod);
      if (onChange && formatted !== value) {
        onChange(formatted);
      }
      if (onBlur) {
        onBlur();
      }
    };

    // 키보드 네비게이션 (화살표 키, 탭)
    const handleHourKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowRight' && e.currentTarget.selectionStart === e.currentTarget.value.length) {
        e.preventDefault();
        const minuteInput = e.currentTarget.parentElement?.querySelector<HTMLInputElement>('input:nth-of-type(2)');
        minuteInput?.focus();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const current = parseInt(localHour || '0', 10) || 0;
        const max = format === '12h' ? 12 : 23;
        const min = format === '12h' ? 1 : 0;
        let newValue = current;
        if (e.key === 'ArrowDown') {
          newValue = current <= min ? max : current - 1;
        } else {
          newValue = current >= max ? min : current + 1;
        }
        const newHour = String(newValue).padStart(format === '12h' && newValue !== 12 ? 1 : 2, '0');
        setLocalHour(newHour);
        if (onChange) {
          onChange(formatTimeToString(newHour, localMinute, localPeriod));
        }
      }
    };

    const handleMinuteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowLeft' && e.currentTarget.selectionStart === 0) {
        e.preventDefault();
        const hourInput = e.currentTarget.parentElement?.querySelector<HTMLInputElement>('input:nth-of-type(1)');
        hourInput?.focus();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const current = parseInt(localMinute || '0', 10) || 0;
        let newValue = current;
        if (e.key === 'ArrowDown') {
          newValue = current <= 0 ? 59 : current - 1;
        } else {
          newValue = current >= 59 ? 0 : current + 1;
        }
        const newMinute = String(newValue).padStart(2, '0');
        setLocalMinute(newMinute);
        if (onChange) {
          onChange(formatTimeToString(localHour, newMinute, localPeriod));
        }
      }
    };

    const hourPlaceholder = format === '12h' ? '12' : '00';

    // 포커스 시 전체 텍스트 선택
    const handleHourFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.select();
    };

    const handleMinuteFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.select();
    };

    // 시/분 입력 필드 ref
    const hourInputRef = React.useRef<HTMLInputElement>(null);
    const minuteInputRef = React.useRef<HTMLInputElement>(null);

    // 컨테이너 클릭 시 가장 가까운 필드에 포커스
    const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
      // 이미 input 필드나 버튼을 클릭한 경우는 처리하지 않음
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'BUTTON') {
        return;
      }

      if (disabled) return;

      // 클릭 위치와 각 필드의 위치 계산
      const containerRect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - containerRect.left;

      if (hourInputRef.current && minuteInputRef.current) {
        const hourRect = hourInputRef.current.getBoundingClientRect();
        const minuteRect = minuteInputRef.current.getBoundingClientRect();
        const containerLeft = containerRect.left;

        const hourCenter = (hourRect.left + hourRect.right) / 2 - containerLeft;
        const minuteCenter = (minuteRect.left + minuteRect.right) / 2 - containerLeft;

        // 클릭 위치가 어느 필드에 더 가까운지 확인
        const distanceToHour = Math.abs(clickX - hourCenter);
        const distanceToMinute = Math.abs(clickX - minuteCenter);

        if (distanceToHour < distanceToMinute) {
          hourInputRef.current.focus();
        } else {
          minuteInputRef.current.focus();
        }
      }
    };

    return (
      <div
        ref={ref}
        onClick={handleContainerClick}
        className={cn(
          'inline-flex items-center gap-1 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors',
          'focus-within:outline-none focus-within:ring-1 focus-within:ring-ring',
          'cursor-text',
          error && 'border-destructive',
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        {...props}
      >
        <input
          ref={hourInputRef}
          type="text"
          inputMode="numeric"
          value={localHour}
          onChange={handleHourChange}
          onFocus={handleHourFocus}
          onBlur={handleBlur}
          onKeyDown={handleHourKeyDown}
          placeholder={hourPlaceholder}
          disabled={disabled}
          maxLength={2}
          className={cn(
            'w-8 text-center bg-transparent border-none outline-none p-0',
            'focus:outline-none',
            disabled && 'cursor-not-allowed'
          )}
          aria-label={ariaLabel ? `${ariaLabel} - 시` : '시'}
        />
        <span className="text-muted-foreground select-none">:</span>
        <input
          ref={minuteInputRef}
          type="text"
          inputMode="numeric"
          value={localMinute}
          onChange={handleMinuteChange}
          onFocus={handleMinuteFocus}
          onBlur={handleBlur}
          onKeyDown={handleMinuteKeyDown}
          placeholder="00"
          disabled={disabled}
          maxLength={2}
          className={cn(
            'w-8 text-center bg-transparent border-none outline-none p-0',
            'focus:outline-none',
            disabled && 'cursor-not-allowed'
          )}
          aria-label={ariaLabel ? `${ariaLabel} - 분` : '분'}
        />
        {showAmPm && format === '12h' && (
          <>
            <span className="text-muted-foreground select-none mx-1"> </span>
            <button
              type="button"
              onClick={() => handlePeriodChange('AM')}
              disabled={disabled}
              className={cn(
                'px-2 py-0.5 text-xs rounded transition-colors',
                localPeriod === 'AM'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                disabled && 'cursor-not-allowed opacity-50'
              )}
              aria-label={ariaLabel ? `${ariaLabel} - 오전` : '오전'}
            >
              오전
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange('PM')}
              disabled={disabled}
              className={cn(
                'px-2 py-0.5 text-xs rounded transition-colors',
                localPeriod === 'PM'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                disabled && 'cursor-not-allowed opacity-50'
              )}
              aria-label={ariaLabel ? `${ariaLabel} - 오후` : '오후'}
            >
              오후
            </button>
          </>
        )}
      </div>
    );
  }
);

TimeField.displayName = 'TimeField';


