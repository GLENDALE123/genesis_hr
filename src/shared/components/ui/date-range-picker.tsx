'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { Calendar } from '@/shared/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';

interface DatePickerWithRangeProps {
  date: { from: Date | undefined; to: Date | undefined };
  setDate: (date: { from: Date | undefined; to: Date | undefined }) => void;
  className?: string;
}

export function DatePickerWithRange({
  date,
  setDate,
  className
}: DatePickerWithRangeProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !date.from && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date.from ? (
              date.to ? (
                <>
                  {format(date.from, 'yyyy-MM-dd', { locale: ko })} -{' '}
                  {format(date.to, 'yyyy-MM-dd', { locale: ko })}
                </>
              ) : (
                format(date.from, 'yyyy-MM-dd', { locale: ko })
              )
            ) : (
              <span>날짜 범위 선택</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date.from}
            selected={date}
            onSelect={(range) => {
              setDate(range || { from: undefined, to: undefined });
              if (range?.from && range?.to) {
                setOpen(false);
              }
            }}
            numberOfMonths={2}
            locale={ko}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

