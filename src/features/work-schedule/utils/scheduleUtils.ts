import { WorkSchedule, CalendarDay, HOLIDAYS } from '../types';

export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export const generateMonthCalendar = (
  year: number,
  month: number,
  schedules: Map<string, WorkSchedule>
): CalendarDay[][] => {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  
  const calendar: CalendarDay[][] = [];
  let currentWeek: CalendarDay[] = [];
  
  // 이전 달의 마지막 날들
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const date = new Date(year, month - 1, day);
    const dateString = `${year}-${(month).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    currentWeek.push({
      day,
      dateString,
      isCurrentMonth: false,
      dayOfWeek: date.getDay(),
      holiday: HOLIDAYS[year]?.[`${month}-${day}`],
      schedule: schedules.get(dateString)
    });
  }
  
  // 현재 달의 날들
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateString = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    currentWeek.push({
      day,
      dateString,
      isCurrentMonth: true,
      dayOfWeek: date.getDay(),
      holiday: HOLIDAYS[year]?.[`${month + 1}-${day}`],
      schedule: schedules.get(dateString)
    });
    
    // 주가 끝나면 새 주 시작
    if (currentWeek.length === 7) {
      calendar.push(currentWeek);
      currentWeek = [];
    }
  }
  
  // 다음 달의 첫 날들
  let nextMonthDay = 1;
  while (currentWeek.length < 7) {
    const date = new Date(year, month + 1, nextMonthDay);
    const dateString = `${year}-${(month + 2).toString().padStart(2, '0')}-${nextMonthDay.toString().padStart(2, '0')}`;
    
    currentWeek.push({
      day: nextMonthDay,
      dateString,
      isCurrentMonth: false,
      dayOfWeek: date.getDay(),
      holiday: HOLIDAYS[year]?.[`${month + 2}-${nextMonthDay}`],
      schedule: schedules.get(dateString)
    });
    
    nextMonthDay++;
  }
  
  if (currentWeek.length > 0) {
    calendar.push(currentWeek);
  }
  
  return calendar;
};

export const formatDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseDateString = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const isToday = (dateString: string): boolean => {
  const today = new Date();
  const todayString = formatDateString(today);
  return dateString === todayString;
};

export const isPastDate = (dateString: string): boolean => {
  const today = new Date();
  const todayString = formatDateString(today);
  return dateString < todayString;
};

export const getMonthRange = (year: number, month: number): { start: string; end: string } => {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  
  return {
    start: formatDateString(startDate),
    end: formatDateString(endDate)
  };
};

export const getYearRange = (year: number): { start: string; end: string } => {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`
  };
};
