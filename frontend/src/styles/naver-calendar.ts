/**
 * 네이버 캘린더 스타일 시스템
 * Tailwind CSS 클래스 유틸리티
 */

export const naverStyles = {
  // 레이아웃
  layout: {
    container: 'min-h-screen bg-white',
    mainContainer: 'flex',
  },

  // 헤더
  header: {
    container: 'naver-header',
    left: 'flex items-center gap-3',
    logo: 'naver-logo',
    brandText: 'text-header-brand text-naver-gray-800',
    center: 'flex items-center gap-2',
    right: 'flex items-center gap-3',
    iconButton: 'naver-icon-button',
    bellContainer: 'relative',
    badge: 'absolute -top-1 -right-1 w-4 h-4 bg-naver-red text-white text-xs rounded-full flex items-center justify-center',
    userInfo: 'flex items-center gap-2',
    avatar: 'w-8 h-8 bg-naver-gray-300 rounded-full',
    userName: 'text-sm text-naver-gray-700',
  },

  // 사이드바
  sidebar: {
    container: 'naver-sidebar',
    section: 'p-4',
    createButton: 'naver-create-button',
    miniCalendar: {
      container: 'bg-naver-gray-50 rounded-lg p-3',
      header: 'flex items-center justify-between mb-3',
      title: 'text-sm font-semibold',
      grid: 'grid grid-cols-7 gap-1',
      day: 'text-center py-1 text-xs',
      date: 'text-center py-1 text-xs rounded cursor-pointer',
      dateToday: 'bg-naver-green text-white font-bold',
      dateSunday: 'text-naver-red',
      dateSaturday: 'text-naver-blue',
      dateOtherMonth: 'text-naver-gray-300',
    },
    calendarSection: 'px-4 py-2 border-t border-naver-gray-200',
    calendarToggle: 'w-full flex items-center justify-between py-2 text-sm',
    calendarList: 'ml-6 space-y-1 mt-2',
    calendarItem: 'flex items-center gap-2 py-1 cursor-pointer hover:bg-naver-gray-50 rounded px-2',
    checkbox: 'w-4 h-4',
    menuList: 'px-4 py-2 border-t border-naver-gray-200 mt-4',
    menuItem: 'naver-menu-item',
    todaySection: 'p-3 border-t border-naver-gray-200',
    todayHeader: 'flex items-center justify-between mb-2',
    todayTitle: 'text-sm font-medium',
    todayCount: 'text-xs text-naver-gray-500',
  },

  // 메인 캘린더
  calendar: {
    container: 'flex-1 bg-white',
    control: 'flex items-center justify-between px-6 py-4 border-b border-naver-gray-200',
    controlLeft: 'flex items-center gap-4',
    navigation: 'flex items-center gap-2',
    title: 'text-xl font-bold',
    todayButton: 'px-3 py-1.5 text-sm border border-naver-gray-300 rounded hover:bg-naver-gray-50',
    controlRight: 'flex items-center gap-2',
    viewButton: 'px-4 py-2 text-sm rounded hover:bg-naver-gray-100',
    viewButtonActive: 'bg-naver-gray-200',
    select: 'px-3 py-2 text-sm border border-naver-gray-300 rounded hover:bg-naver-gray-50',
    gridContainer: 'p-4',
    weekdayHeader: 'grid grid-cols-7 border-t border-l border-naver-gray-200',
    weekdayCell: 'border-r border-b border-naver-gray-200 py-3 text-center text-sm font-semibold',
    weekdaySunday: 'text-naver-red',
    weekdaySaturday: 'text-naver-blue',
    weekRow: 'grid grid-cols-7 border-l border-naver-gray-200',
    dateCell: 'naver-calendar-cell',
    dateCellOtherMonth: 'bg-naver-gray-50',
    dateNumber: 'text-calendar-date mb-1',
    dateSunday: 'text-naver-red',
    dateSaturday: 'text-naver-blue',
    dateOtherMonth: 'text-naver-gray-400',
    todayBadge: 'naver-today-badge',
  },

  // 일정
  schedule: {
    list: 'space-y-1',
    itemRed: 'naver-schedule-red',
    itemPurple: 'naver-schedule-purple',
    itemBlue: 'naver-schedule-blue',
    more: 'text-xs text-naver-gray-500 px-1.5',
  },

  // 공통 색상 클래스
  colors: {
    // 네이버 그린
    naverGreen: 'text-naver-green',
    bgNaverGreen: 'bg-naver-green',
    bgNaverGreen50: 'bg-naver-green-50',

    // 네이버 블루
    naverBlue: 'text-naver-blue',
    bgNaverBlue: 'bg-naver-blue',
    bgNaverBlue50: 'bg-naver-blue-50',

    // 네이버 레드
    naverRed: 'text-naver-red',
    bgNaverRed: 'bg-naver-red',
    bgNaverRed50: 'bg-naver-red-50',

    // 네이버 퍼플
    naverPurple: 'text-naver-purple',
    bgNaverPurple: 'bg-naver-purple',
    bgNaverPurple50: 'bg-naver-purple-50',

    // 네이버 그레이
    textGray700: 'text-naver-gray-700',
    textGray500: 'text-naver-gray-500',
    bgGray50: 'bg-naver-gray-50',
    bgGray100: 'bg-naver-gray-100',
    borderGray200: 'border-naver-gray-200',
  },

  // 유틸리티
  utils: {
    truncate: 'truncate',
    roundedFull: 'rounded-full',
    roundedLg: 'rounded-lg',
    roundedMd: 'rounded-md',
    transition: 'transition-colors',
    cursorPointer: 'cursor-pointer',
    flexCenter: 'flex items-center justify-center',
    flexBetween: 'flex items-center justify-between',
  },
} as const;

/**
 * 색상 타입별 일정 스타일 반환
 */
export const getScheduleStyle = (color: 'red' | 'purple' | 'blue' | string) => {
  switch (color) {
    case 'red':
      return naverStyles.schedule.itemRed;
    case 'purple':
      return naverStyles.schedule.itemPurple;
    case 'blue':
      return naverStyles.schedule.itemBlue;
    default:
      return naverStyles.schedule.itemBlue;
  }
};

/**
 * 날짜 스타일 반환 (요일별)
 */
export const getDateStyle = (
  dayOfWeek: number,
  isCurrentMonth: boolean,
  isToday: boolean
): string => {
  if (isToday) return '';

  const styles: string[] = [naverStyles.calendar.dateNumber];

  if (!isCurrentMonth) {
    styles.push(naverStyles.calendar.dateOtherMonth);
  } else {
    if (dayOfWeek === 0) {
      styles.push(naverStyles.calendar.dateSunday);
    } else if (dayOfWeek === 6) {
      styles.push(naverStyles.calendar.dateSaturday);
    }
  }

  return styles.join(' ');
};

/**
 * 미니 캘린더 날짜 스타일 반환
 */
export const getMiniCalendarDateStyle = (
  isCurrentMonth: boolean,
  isToday: boolean,
  isSunday: boolean,
  isSaturday: boolean
): string => {
  const styles: string[] = [naverStyles.sidebar.miniCalendar.date];

  if (isToday) {
    styles.push(naverStyles.sidebar.miniCalendar.dateToday);
  } else if (!isCurrentMonth) {
    styles.push(naverStyles.sidebar.miniCalendar.dateOtherMonth);
  } else {
    if (isSunday) {
      styles.push(naverStyles.sidebar.miniCalendar.dateSunday);
    } else if (isSaturday) {
      styles.push(naverStyles.sidebar.miniCalendar.dateSaturday);
    }
  }

  return styles.join(' ');
};

/**
 * 뷰 버튼 스타일 반환
 */
export const getViewButtonStyle = (isActive: boolean): string => {
  const styles: string[] = [naverStyles.calendar.viewButton];
  if (isActive) {
    styles.push(naverStyles.calendar.viewButtonActive);
  }
  return styles.join(' ');
};

/**
 * 요일 헤더 스타일 반환
 */
export const getWeekdayStyle = (dayIndex: number): string => {
  const styles: string[] = [naverStyles.calendar.weekdayCell];

  if (dayIndex === 0) {
    styles.push(naverStyles.calendar.weekdaySunday);
  } else if (dayIndex === 6) {
    styles.push(naverStyles.calendar.weekdaySaturday);
  }

  return styles.join(' ');
};
