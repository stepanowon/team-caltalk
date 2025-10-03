import React, { useState } from 'react';

/**
 * Naver Calendar 스타일 화면 디자인
 * CSS Modules/Inline Styles 기반 React 컴포넌트
 */
const NaverCalendarStyle = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 9, 1)); // 2025년 10월
  const [view, setView] = useState('month'); // 'day', 'week', 'month', 'schedule'

  // 월 이름 변환
  const getMonthName = (date) => {
    return `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  // 이전 달로 이동
  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // 다음 달로 이동
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // 오늘로 이동
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // 캘린더 날짜 생성
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const firstDayOfWeek = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days = [];

    // 이전 달 날짜
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: prevMonthLastDay - i,
        isCurrentMonth: false,
        isPrevMonth: true,
        fullDate: new Date(year, month - 1, prevMonthLastDay - i)
      });
    }

    // 현재 달 날짜
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        date: i,
        isCurrentMonth: true,
        isPrevMonth: false,
        fullDate: new Date(year, month, i)
      });
    }

    // 다음 달 날짜 (7의 배수로 맞추기)
    const remainingDays = 42 - days.length; // 6주 표시
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: i,
        isCurrentMonth: false,
        isPrevMonth: false,
        fullDate: new Date(year, month + 1, i)
      });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  // 주별로 그룹화
  const weeks = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  // 샘플 일정 데이터
  const sampleSchedules = {
    '2025-10-03': [{ title: '개최경', color: 'red', time: '전일' }],
    '2025-10-05': [{ title: '추석 연휴', color: 'red' }],
    '2025-10-06': [{ title: '신묘의 생일', color: 'purple' }, { title: '추석', color: 'red' }],
    '2025-10-07': [{ title: '추석 연휴', color: 'red' }],
    '2025-10-08': [{ title: '대체공휴일(추석)', color: 'red' }],
    '2025-10-09': [{ title: '한글날', color: 'red' }],
    '2025-10-10': [{ title: '한글날', color: 'red' }]
  };

  const getScheduleForDate = (date) => {
    const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    return sampleSchedules[dateStr] || [];
  };

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isSunday = (date) => date.getDay() === 0;
  const isSaturday = (date) => date.getDay() === 6;
  const isHoliday = (date) => {
    const schedules = getScheduleForDate(date);
    return schedules.some(s => s.color === 'red');
  };

  // 아이콘 컴포넌트
  const ChevronLeft = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const ChevronRight = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M8 4L14 10L8 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const Bell = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M15 6.66667C15 5.34058 14.4732 4.06881 13.5355 3.13113C12.5979 2.19345 11.3261 1.66667 10 1.66667C8.67392 1.66667 7.40215 2.19345 6.46447 3.13113C5.52678 4.06881 5 5.34058 5 6.66667C5 12.5 2.5 14.1667 2.5 14.1667H17.5C17.5 14.1667 15 12.5 15 6.66667Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11.4417 17.5C11.2952 17.7526 11.0849 17.9622 10.8319 18.1079C10.5789 18.2537 10.292 18.3304 10 18.3304C9.70802 18.3304 9.42113 18.2537 9.16814 18.1079C8.91515 17.9622 8.70484 17.7526 8.55835 17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const Plus = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // 스타일 정의
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#ffffff'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      borderBottom: '1px solid #e5e7eb',
      backgroundColor: '#ffffff'
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    logoText: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#10b981'
    },
    brandText: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#1f2937'
    },
    headerCenter: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    iconButton: {
      padding: '8px',
      borderRadius: '6px',
      border: 'none',
      backgroundColor: 'transparent',
      cursor: 'pointer'
    },
    iconButtonHover: {
      backgroundColor: '#f3f4f6'
    },
    headerRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    bellContainer: {
      position: 'relative'
    },
    badge: {
      position: 'absolute',
      top: '-4px',
      right: '-4px',
      width: '16px',
      height: '16px',
      backgroundColor: '#ef4444',
      color: '#ffffff',
      fontSize: '10px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    userInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    avatar: {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      backgroundColor: '#d1d5db'
    },
    userName: {
      fontSize: '14px',
      color: '#374151'
    },
    mainContainer: {
      display: 'flex'
    },
    sidebar: {
      width: '256px',
      borderRight: '1px solid #e5e7eb',
      backgroundColor: '#ffffff',
      height: 'calc(100vh - 64px)',
      overflowY: 'auto'
    },
    sidebarSection: {
      padding: '16px'
    },
    createButton: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: '12px 16px',
      backgroundColor: '#3b82f6',
      color: '#ffffff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '500'
    },
    createButtonHover: {
      backgroundColor: '#2563eb'
    },
    miniCalendar: {
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      padding: '12px'
    },
    miniCalendarHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '12px'
    },
    miniCalendarTitle: {
      fontSize: '14px',
      fontWeight: '600'
    },
    miniCalendarGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: '4px'
    },
    miniCalendarDay: {
      textAlign: 'center',
      padding: '4px',
      fontSize: '12px'
    },
    miniCalendarDate: {
      textAlign: 'center',
      padding: '4px',
      fontSize: '12px',
      borderRadius: '4px',
      cursor: 'pointer'
    },
    calendarSection: {
      padding: '16px',
      paddingTop: '8px',
      borderTop: '1px solid #e5e7eb'
    },
    calendarToggle: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 0',
      fontSize: '14px',
      border: 'none',
      backgroundColor: 'transparent',
      cursor: 'pointer'
    },
    calendarList: {
      marginLeft: '24px',
      marginTop: '8px'
    },
    calendarItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '4px 8px',
      cursor: 'pointer',
      borderRadius: '4px'
    },
    checkbox: {
      width: '16px',
      height: '16px'
    },
    menuList: {
      padding: '16px',
      paddingTop: '8px',
      borderTop: '1px solid #e5e7eb',
      marginTop: '16px'
    },
    menuItem: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px',
      fontSize: '14px',
      border: 'none',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      borderRadius: '4px',
      textAlign: 'left'
    },
    todaySection: {
      padding: '12px 16px',
      borderTop: '1px solid #e5e7eb'
    },
    todayHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '8px'
    },
    todayTitle: {
      fontSize: '14px',
      fontWeight: '500'
    },
    todayCount: {
      fontSize: '12px',
      color: '#6b7280'
    },
    mainContent: {
      flex: 1,
      backgroundColor: '#ffffff'
    },
    calendarControl: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 24px',
      borderBottom: '1px solid #e5e7eb'
    },
    calendarControlLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    calendarNavigation: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    calendarTitle: {
      fontSize: '20px',
      fontWeight: 'bold'
    },
    todayButton: {
      padding: '6px 12px',
      fontSize: '14px',
      border: '1px solid #d1d5db',
      borderRadius: '4px',
      backgroundColor: '#ffffff',
      cursor: 'pointer'
    },
    calendarControlRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    viewButton: {
      padding: '8px 16px',
      fontSize: '14px',
      border: 'none',
      borderRadius: '4px',
      backgroundColor: 'transparent',
      cursor: 'pointer'
    },
    viewButtonActive: {
      backgroundColor: '#e5e7eb'
    },
    select: {
      padding: '8px 12px',
      fontSize: '14px',
      border: '1px solid #d1d5db',
      borderRadius: '4px',
      backgroundColor: '#ffffff',
      cursor: 'pointer'
    },
    calendarGridContainer: {
      padding: '16px'
    },
    weekdayHeader: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      borderTop: '1px solid #e5e7eb',
      borderLeft: '1px solid #e5e7eb'
    },
    weekdayCell: {
      borderRight: '1px solid #e5e7eb',
      borderBottom: '1px solid #e5e7eb',
      padding: '12px 0',
      textAlign: 'center',
      fontSize: '14px',
      fontWeight: '600'
    },
    weekRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      borderLeft: '1px solid #e5e7eb'
    },
    dateCell: {
      borderRight: '1px solid #e5e7eb',
      borderBottom: '1px solid #e5e7eb',
      minHeight: '120px',
      padding: '8px',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    dateCellHover: {
      backgroundColor: '#dbeafe'
    },
    dateNumber: {
      fontSize: '14px',
      marginBottom: '4px'
    },
    todayBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '24px',
      height: '24px',
      backgroundColor: '#10b981',
      color: '#ffffff',
      borderRadius: '50%',
      fontWeight: 'bold'
    },
    scheduleList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    },
    scheduleItem: {
      fontSize: '12px',
      padding: '2px 6px',
      borderRadius: '4px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    },
    scheduleMore: {
      fontSize: '12px',
      color: '#6b7280',
      paddingLeft: '6px'
    }
  };

  return (
    <div style={styles.container}>
      {/* 상단 헤더 */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>
            <div style={styles.logoText}>N</div>
            <span style={styles.brandText}>캘린더</span>
          </div>
        </div>

        <div style={styles.headerCenter}>
          <button style={styles.iconButton}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 3h18v18H3z" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
          <button style={styles.iconButton}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" fill="currentColor"/>
            </svg>
          </button>
          <button style={styles.iconButton}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="2" fill="currentColor"/>
            </svg>
          </button>
          <button style={styles.iconButton}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 12h18M12 3v18" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
          <button style={styles.iconButton}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
          <button style={styles.iconButton}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor"/>
            </svg>
          </button>
          <button style={styles.iconButton}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" fill="none"/>
            </svg>
          </button>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.bellContainer}>
            <Bell />
            <span style={styles.badge}>1</span>
          </div>
          <div style={styles.userInfo}>
            <img
              src="https://via.placeholder.com/32"
              alt="User"
              style={styles.avatar}
            />
            <span style={styles.userName}>Bmax L</span>
            <ChevronRight />
          </div>
          <button style={styles.iconButton}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="5" cy="12" r="2" fill="currentColor"/>
              <circle cx="12" cy="12" r="2" fill="currentColor"/>
              <circle cx="19" cy="12" r="2" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </header>

      <div style={styles.mainContainer}>
        {/* 좌측 사이드바 */}
        <aside style={styles.sidebar}>
          {/* 일정 쓰기 버튼 */}
          <div style={styles.sidebarSection}>
            <button style={styles.createButton}>
              <Plus />
              <span>일정 쓰기</span>
            </button>
          </div>

          {/* 미니 캘린더 */}
          <div style={{ ...styles.sidebarSection, paddingTop: 0 }}>
            <div style={styles.miniCalendar}>
              <div style={styles.miniCalendarHeader}>
                <button onClick={previousMonth} style={{ ...styles.iconButton, padding: '4px' }}>
                  <ChevronLeft />
                </button>
                <span style={styles.miniCalendarTitle}>{getMonthName(currentDate)}</span>
                <button onClick={nextMonth} style={{ ...styles.iconButton, padding: '4px' }}>
                  <ChevronRight />
                </button>
              </div>

              <div>
                <div style={styles.miniCalendarGrid}>
                  {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                    <div
                      key={i}
                      style={{
                        ...styles.miniCalendarDay,
                        color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : '#4b5563'
                      }}
                    >
                      {day}
                    </div>
                  ))}
                </div>
                <div style={styles.miniCalendarGrid}>
                  {calendarDays.slice(0, 35).map((day, index) => {
                    const isCurrentDay = isToday(day.fullDate);
                    const isSun = isSunday(day.fullDate);
                    const isSat = isSaturday(day.fullDate);
                    const holiday = isHoliday(day.fullDate);

                    let textColor = '#1f2937';
                    let bgColor = 'transparent';

                    if (!day.isCurrentMonth) {
                      textColor = '#d1d5db';
                    } else if (isCurrentDay) {
                      bgColor = '#10b981';
                      textColor = '#ffffff';
                    } else if (isSun || holiday) {
                      textColor = '#ef4444';
                    } else if (isSat) {
                      textColor = '#3b82f6';
                    }

                    return (
                      <div
                        key={index}
                        style={{
                          ...styles.miniCalendarDate,
                          color: textColor,
                          backgroundColor: bgColor,
                          fontWeight: isCurrentDay ? 'bold' : 'normal'
                        }}
                      >
                        {day.date}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 내 캘린더 */}
          <div style={styles.calendarSection}>
            <button style={styles.calendarToggle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>▼</span>
                <span style={{ fontWeight: '500' }}>내 캘린더</span>
              </div>
            </button>

            <div style={styles.calendarList}>
              <label style={styles.calendarItem}>
                <input type="checkbox" style={styles.checkbox} defaultChecked />
                <span style={{ fontSize: '14px' }}>[기본] 내 캘린더</span>
              </label>
              <label style={styles.calendarItem}>
                <input type="checkbox" style={styles.checkbox} defaultChecked />
                <span style={{ fontSize: '14px' }}>내 빨 일</span>
              </label>
            </div>
          </div>

          {/* 구독 캘린더 */}
          <div style={styles.calendarSection}>
            <button style={styles.calendarToggle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>▼</span>
                <span style={{ fontWeight: '500' }}>구독 캘린더</span>
              </div>
            </button>

            <div style={styles.calendarList}>
              <label style={styles.calendarItem}>
                <input type="checkbox" style={styles.checkbox} defaultChecked />
                <span style={{ fontSize: '14px' }}>구글 캘린더</span>
              </label>
            </div>
          </div>

          {/* 하단 메뉴 */}
          <div style={styles.menuList}>
            <button style={styles.menuItem}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1l-7 7h2v6h4V9h2v5h4V8h2L8 1z"/>
              </svg>
              <span>중요 일정 보기</span>
            </button>
            <button style={styles.menuItem}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 2h12v12H2z"/>
              </svg>
              <span>빈주 일정 보기</span>
            </button>
            <button style={styles.menuItem}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 2v12M2 8h12"/>
              </svg>
              <span>캘린더 일정 정리하기</span>
            </button>
            <button style={styles.menuItem}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="8" cy="8" r="6"/>
              </svg>
              <span>삭제한 일정 목록</span>
            </button>
          </div>

          {/* 오늘 할 일 */}
          <div style={styles.todaySection}>
            <div style={styles.todayHeader}>
              <span style={styles.todayTitle}>오늘 할 일</span>
              <button style={{ ...styles.todayCount, border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}>
                0건
              </button>
            </div>
          </div>
        </aside>

        {/* 메인 캘린더 영역 */}
        <main style={styles.mainContent}>
          {/* 캘린더 컨트롤 */}
          <div style={styles.calendarControl}>
            <div style={styles.calendarControlLeft}>
              <div style={styles.calendarNavigation}>
                <button onClick={previousMonth} style={{ ...styles.iconButton, padding: '8px' }}>
                  <ChevronLeft />
                </button>
                <h2 style={styles.calendarTitle}>{getMonthName(currentDate)}</h2>
                <button onClick={nextMonth} style={{ ...styles.iconButton, padding: '8px' }}>
                  <ChevronRight />
                </button>
              </div>
              <button onClick={goToToday} style={styles.todayButton}>
                오늘
              </button>
            </div>

            <div style={styles.calendarControlRight}>
              <button
                style={{
                  ...styles.viewButton,
                  ...(view === 'day' ? styles.viewButtonActive : {})
                }}
                onClick={() => setView('day')}
              >
                일간
              </button>
              <button
                style={{
                  ...styles.viewButton,
                  ...(view === 'week' ? styles.viewButtonActive : {})
                }}
                onClick={() => setView('week')}
              >
                주간
              </button>
              <button
                style={{
                  ...styles.viewButton,
                  ...(view === 'month' ? styles.viewButtonActive : {})
                }}
                onClick={() => setView('month')}
              >
                월간
              </button>
              <button
                style={{
                  ...styles.viewButton,
                  ...(view === 'schedule' ? styles.viewButtonActive : {})
                }}
                onClick={() => setView('schedule')}
              >
                목록
              </button>
              <select style={styles.select}>
                <option>평일</option>
                <option>전체</option>
              </select>
            </div>
          </div>

          {/* 캘린더 그리드 */}
          <div style={styles.calendarGridContainer}>
            {/* 요일 헤더 */}
            <div style={styles.weekdayHeader}>
              {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                <div
                  key={index}
                  style={{
                    ...styles.weekdayCell,
                    color: index === 0 ? '#ef4444' : index === 6 ? '#3b82f6' : '#374151'
                  }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} style={styles.weekRow}>
                {week.map((day, dayIndex) => {
                  const schedules = getScheduleForDate(day.fullDate);
                  const dayOfWeek = day.fullDate.getDay();
                  const isCurrentDay = isToday(day.fullDate);
                  const isSun = isSunday(day.fullDate);
                  const isSat = isSaturday(day.fullDate);
                  const holiday = isHoliday(day.fullDate);

                  let dateColor = '#1f2937';
                  if (!day.isCurrentMonth) {
                    dateColor = '#9ca3af';
                  } else if (isSun || holiday) {
                    dateColor = '#ef4444';
                  } else if (isSat) {
                    dateColor = '#3b82f6';
                  }

                  return (
                    <div
                      key={dayIndex}
                      style={{
                        ...styles.dateCell,
                        backgroundColor: !day.isCurrentMonth ? '#f9fafb' : '#ffffff'
                      }}
                    >
                      {isCurrentDay ? (
                        <div style={styles.todayBadge}>{day.date}</div>
                      ) : (
                        <div style={{ ...styles.dateNumber, color: dateColor }}>{day.date}</div>
                      )}

                      {/* 일정 표시 */}
                      <div style={styles.scheduleList}>
                        {schedules.slice(0, 3).map((schedule, idx) => {
                          let scheduleStyle = {
                            backgroundColor: '#dbeafe',
                            color: '#1e40af'
                          };

                          if (schedule.color === 'red') {
                            scheduleStyle = {
                              backgroundColor: '#fee2e2',
                              color: '#b91c1c'
                            };
                          } else if (schedule.color === 'purple') {
                            scheduleStyle = {
                              backgroundColor: '#ede9fe',
                              color: '#7c3aed'
                            };
                          }

                          return (
                            <div
                              key={idx}
                              style={{
                                ...styles.scheduleItem,
                                ...scheduleStyle
                              }}
                              title={schedule.title}
                            >
                              {schedule.time && <span style={{ marginRight: '4px' }}>({schedule.time})</span>}
                              {schedule.title}
                            </div>
                          );
                        })}
                        {schedules.length > 3 && (
                          <div style={styles.scheduleMore}>
                            +{schedules.length - 3}개 더보기
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default NaverCalendarStyle;
