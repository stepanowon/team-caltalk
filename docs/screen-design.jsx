import React, { useState } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, Menu, Bell, User, Plus } from 'lucide-react';

/**
 * Naver Calendar 스타일 화면 디자인
 * Tailwind CSS 기반 React 컴포넌트
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

  return (
    <div className="min-h-screen bg-white">
      {/* 상단 헤더 */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-green-600">N</div>
            <span className="text-lg font-semibold text-gray-800">캘린더</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-md">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 3h18v18H3z" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-md">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" fill="currentColor"/>
            </svg>
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-md">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="2" fill="currentColor"/>
            </svg>
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-md">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 12h18M12 3v18" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-md">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-md">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor"/>
            </svg>
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-md">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" fill="none"/>
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="w-5 h-5 text-gray-700" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              1
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <img
                src="https://via.placeholder.com/32"
                alt="User"
                className="w-8 h-8 rounded-full"
              />
            </div>
            <span className="text-sm text-gray-700">Bmax L</span>
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-md">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="5" cy="12" r="2" fill="currentColor"/>
              <circle cx="12" cy="12" r="2" fill="currentColor"/>
              <circle cx="19" cy="12" r="2" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </header>

      <div className="flex">
        {/* 좌측 사이드바 */}
        <aside className="w-64 border-r border-gray-200 bg-white h-[calc(100vh-64px)] overflow-y-auto">
          {/* 일정 쓰기 버튼 */}
          <div className="p-4">
            <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              <Plus className="w-5 h-5" />
              <span className="font-medium">일정 쓰기</span>
            </button>
          </div>

          {/* 미니 캘린더 */}
          <div className="px-4 pb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-3">
                <button onClick={previousMonth} className="p-1 hover:bg-gray-200 rounded">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-semibold">{getMonthName(currentDate)}</span>
                <button onClick={nextMonth} className="p-1 hover:bg-gray-200 rounded">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs">
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                    <div key={i} className={`text-center py-1 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-600'}`}>
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.slice(0, 35).map((day, index) => (
                    <div
                      key={index}
                      className={`
                        text-center py-1 rounded cursor-pointer
                        ${!day.isCurrentMonth ? 'text-gray-300' : ''}
                        ${isToday(day.fullDate) ? 'bg-green-500 text-white font-bold' : ''}
                        ${isSunday(day.fullDate) && day.isCurrentMonth && !isToday(day.fullDate) ? 'text-red-500' : ''}
                        ${isSaturday(day.fullDate) && day.isCurrentMonth && !isToday(day.fullDate) ? 'text-blue-500' : ''}
                        ${isHoliday(day.fullDate) && day.isCurrentMonth && !isToday(day.fullDate) ? 'text-red-500' : ''}
                        ${!isToday(day.fullDate) && day.isCurrentMonth && !isSunday(day.fullDate) && !isSaturday(day.fullDate) && !isHoliday(day.fullDate) ? 'hover:bg-gray-200' : ''}
                      `}
                    >
                      {day.date}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 가족별 캘린더 */}
          <div className="px-4 py-2 border-t border-gray-200">
            <button className="w-full flex items-center justify-between py-2 text-sm hover:bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                <span className="text-gray-700">▼</span>
                <span className="font-medium">내 캘린더</span>
              </div>
            </button>

            <div className="ml-6 space-y-1 mt-2">
              <label className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-2">
                <input type="checkbox" className="w-4 h-4 accent-blue-500" defaultChecked />
                <span className="text-sm">[기본] 내 캘린더</span>
              </label>
              <label className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-2">
                <input type="checkbox" className="w-4 h-4 accent-red-500" defaultChecked />
                <span className="text-sm">내 빨 일</span>
              </label>
            </div>
          </div>

          {/* 구독 캘린더 */}
          <div className="px-4 py-2 border-t border-gray-200">
            <button className="w-full flex items-center justify-between py-2 text-sm hover:bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                <span className="text-gray-700">▼</span>
                <span className="font-medium">구독 캘린더</span>
              </div>
            </button>

            <div className="ml-6 space-y-1 mt-2">
              <label className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-2">
                <input type="checkbox" className="w-4 h-4 accent-orange-500" defaultChecked />
                <span className="text-sm">구글 캘린더</span>
              </label>
            </div>
          </div>

          {/* 하단 메뉴 */}
          <div className="px-4 py-2 border-t border-gray-200 mt-4">
            <button className="w-full flex items-center gap-2 py-2 text-sm hover:bg-gray-50 rounded px-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1l-7 7h2v6h4V9h2v5h4V8h2L8 1z"/>
              </svg>
              <span>중요 일정 보기</span>
            </button>
            <button className="w-full flex items-center gap-2 py-2 text-sm hover:bg-gray-50 rounded px-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 2h12v12H2z"/>
              </svg>
              <span>빈주 일정 보기</span>
            </button>
            <button className="w-full flex items-center gap-2 py-2 text-sm hover:bg-gray-50 rounded px-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 2v12M2 8h12"/>
              </svg>
              <span>캘린더 일정 정리하기</span>
            </button>
            <button className="w-full flex items-center gap-2 py-2 text-sm hover:bg-gray-50 rounded px-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="8" cy="8" r="6"/>
              </svg>
              <span>삭제한 일정 목록</span>
            </button>
          </div>

          {/* 오늘 할 일 */}
          <div className="px-4 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">오늘 할 일</span>
              <button className="text-xs text-gray-500 hover:text-gray-700">0건</button>
            </div>
          </div>
        </aside>

        {/* 메인 캘린더 영역 */}
        <main className="flex-1 bg-white">
          {/* 캘린더 컨트롤 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button onClick={previousMonth} className="p-2 hover:bg-gray-100 rounded">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-bold">{getMonthName(currentDate)}</h2>
                <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                오늘
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                className={`px-4 py-2 text-sm rounded ${view === 'day' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                onClick={() => setView('day')}
              >
                일간
              </button>
              <button
                className={`px-4 py-2 text-sm rounded ${view === 'week' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                onClick={() => setView('week')}
              >
                주간
              </button>
              <button
                className={`px-4 py-2 text-sm rounded ${view === 'month' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                onClick={() => setView('month')}
              >
                월간
              </button>
              <button
                className={`px-4 py-2 text-sm rounded ${view === 'schedule' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                onClick={() => setView('schedule')}
              >
                목록
              </button>
              <select className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">
                <option>평일</option>
                <option>전체</option>
              </select>
            </div>
          </div>

          {/* 캘린더 그리드 */}
          <div className="p-4">
            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 border-t border-l border-gray-200">
              {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                <div
                  key={index}
                  className={`
                    border-r border-b border-gray-200 py-3 text-center text-sm font-semibold
                    ${index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-700'}
                  `}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 border-l border-gray-200">
                {week.map((day, dayIndex) => {
                  const schedules = getScheduleForDate(day.fullDate);
                  const dayOfWeek = day.fullDate.getDay();

                  return (
                    <div
                      key={dayIndex}
                      className={`
                        border-r border-b border-gray-200 min-h-[120px] p-2
                        ${!day.isCurrentMonth ? 'bg-gray-50' : 'bg-white'}
                        hover:bg-blue-50 cursor-pointer transition-colors
                      `}
                    >
                      <div className={`
                        text-sm mb-1
                        ${!day.isCurrentMonth ? 'text-gray-400' : ''}
                        ${isToday(day.fullDate) ? 'inline-flex items-center justify-center w-6 h-6 bg-green-500 text-white rounded-full font-bold' : ''}
                        ${dayOfWeek === 0 && day.isCurrentMonth && !isToday(day.fullDate) ? 'text-red-500' : ''}
                        ${dayOfWeek === 6 && day.isCurrentMonth && !isToday(day.fullDate) ? 'text-blue-500' : ''}
                        ${isHoliday(day.fullDate) && day.isCurrentMonth && !isToday(day.fullDate) ? 'text-red-500' : ''}
                      `}>
                        {day.date}
                      </div>

                      {/* 일정 표시 */}
                      <div className="space-y-1">
                        {schedules.slice(0, 3).map((schedule, idx) => (
                          <div
                            key={idx}
                            className={`
                              text-xs px-1.5 py-0.5 rounded truncate
                              ${schedule.color === 'red' ? 'bg-red-100 text-red-700' :
                                schedule.color === 'purple' ? 'bg-purple-100 text-purple-700' :
                                'bg-blue-100 text-blue-700'}
                            `}
                            title={schedule.title}
                          >
                            {schedule.time && <span className="mr-1">({schedule.time})</span>}
                            {schedule.title}
                          </div>
                        ))}
                        {schedules.length > 3 && (
                          <div className="text-xs text-gray-500 px-1.5">
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
