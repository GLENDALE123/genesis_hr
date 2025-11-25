import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { db } from '@/shared/services/firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { WorkSchedule, ScheduleSummary, CalendarDay } from '../types';
import { generateMonthCalendar, getMonthRange, getYearRange } from '../utils/scheduleUtils';
import { WORK_TYPES } from '../types';

export type ViewType = 'year' | 'month';

export const useWorkSchedule = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [view, setView] = useState<ViewType>('month');
  const [schedules, setSchedules] = useState<Map<string, WorkSchedule>>(new Map());
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const isInitialLoad = useRef(true);

  // 달력 데이터 메모이제이션
  const calendarData = useMemo(() => {
    if (view === 'month') {
      return generateMonthCalendar(year, month, schedules);
    }
    return [];
  }, [year, month, schedules, view]);

  // 뷰가 변경될 때 초기 로딩 상태 리셋
  useEffect(() => {
    isInitialLoad.current = true;
  }, [view]);

  // 통계 계산
  const summary = useMemo((): ScheduleSummary => {
    const yearSchedules = Array.from(schedules.values());
    const daysInYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
    const totalDays = view === 'year' ? daysInYear : new Date(year, month + 1, 0).getDate();
    
    let workDays = 0;
    const typeCounts = Object.keys(WORK_TYPES).reduce((acc, key) => ({ ...acc, [key]: 0 }), {} as Record<string, number>);

    yearSchedules.forEach(schedule => {
      if (schedule.type !== '휴무') workDays++;
      if (typeCounts[schedule.type] !== undefined) {
        typeCounts[schedule.type]++;
      }
    });
    
    const restDays = totalDays - workDays;
    
    return {
      '총 근무일': workDays,
      '휴무/휴일': restDays,
      ...typeCounts
    };
  }, [schedules, view, year, month]);

  // Firestore 실시간 구독
  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    // 초기 로드일 때만 로딩 상태 표시
    const shouldShowLoading = isInitialLoad.current;
    if (shouldShowLoading) {
      setIsLoading(true);
    }
    
    let q = query(collection(db, 'work-schedules'));
    
    if (view === 'month') {
      // 현재 달 기준으로 이전 달, 현재 달, 다음 달 3개월치 데이터를 함께 로드
      // 이렇게 하면 화살표 클릭 시 깜빡임이 없음
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      
      const prevRange = getMonthRange(prevYear, prevMonth);
      const currentRange = getMonthRange(year, month);
      const nextRange = getMonthRange(nextYear, nextMonth);
      
      // 가장 이른 날짜와 가장 늦은 날짜 사용
      const start = prevRange.start;
      const end = nextRange.end;
      
      q = query(
        collection(db, 'work-schedules'),
        where('date', '>=', start),
        where('date', '<=', end)
      );
    } else {
      const { start, end } = getYearRange(year);
      q = query(
        collection(db, 'work-schedules'),
        where('date', '>=', start),
        where('date', '<=', end)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newSchedules = new Map<string, WorkSchedule>();
      snapshot.forEach(doc => {
        newSchedules.set(doc.id, { id: doc.id, ...doc.data() } as WorkSchedule);
      });
      setSchedules(newSchedules);
      
      // 첫 로드 완료 후 플래그 설정
      if (shouldShowLoading) {
        setIsLoading(false);
        isInitialLoad.current = false;
      }
    });

    return () => unsubscribe();
  }, [year, month, view]);

  // 년도 변경
  const changeYear = useCallback((delta: number) => {
    setYear(prev => prev + delta);
    setSelectedDates(new Set());
  }, []);

  // 월 변경
  const changeMonth = useCallback((delta: number) => {
    setMonth(prev => {
      const newMonth = prev + delta;
      if (newMonth < 0) {
        setYear(prevYear => prevYear - 1);
        return 11;
      } else if (newMonth > 11) {
        setYear(prevYear => prevYear + 1);
        return 0;
      }
      return newMonth;
    });
    setSelectedDates(new Set());
  }, []);

  // 오늘로 이동
  const goToToday = useCallback(() => {
    const today = new Date();
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDates(new Set());
  }, []);

  // 날짜 선택 토글
  const toggleDateSelection = useCallback((dateStr: string) => {
    setSelectedDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateStr)) {
        newSet.delete(dateStr);
      } else {
        newSet.add(dateStr);
      }
      return newSet;
    });
  }, []);

  // 선택 초기화
  const clearSelection = useCallback(() => {
    setSelectedDates(new Set());
  }, []);

  return {
    year,
    month,
    view,
    schedules,
    selectedDates,
    isLoading,
    summary,
    calendarData,
    setView,
    changeYear,
    changeMonth,
    goToToday,
    toggleDateSelection,
    clearSelection
  };
};
