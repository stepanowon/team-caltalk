import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './BigCalendar.css';

type View = 'month' | 'week' | 'day' | 'agenda';

const locales = {
  ko: ko,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

interface Participant {
  id: number;
  user_id: number;
  user_name?: string;
  status: 'pending' | 'accepted' | 'declined';
}

interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  tooltip?: string;
  resource?: {
    id: number;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    participants: Participant[];
    participant_count: number;
  };
}

interface TeamMember {
  user_id: number;
  user_name?: string;
  name?: string;
  role?: string;
}

interface BigCalendarProps {
  events: CalendarEvent[];
  onSelectEvent?: (event: CalendarEvent) => void;
  onSelectSlot?: (slotInfo: { start: Date; end: Date; slots: Date[] }) => void;
  onNavigate?: (date: Date) => void;
  onView?: (view: View) => void;
  defaultView?: View;
  views?: View[];
  teamMembers?: TeamMember[];
}

export default function BigCalendar({
  events,
  onSelectEvent,
  onSelectSlot,
  onNavigate,
  onView,
  defaultView = 'month',
  views = ['month', 'week', 'day'],
  teamMembers = [],
}: BigCalendarProps) {
  const messages = {
    allDay: '종일',
    previous: '이전',
    next: '다음',
    today: '오늘',
    month: '월',
    week: '주',
    day: '일',
    agenda: '일정',
    date: '날짜',
    time: '시간',
    event: '일정',
    noEventsInRange: '해당 기간에 일정이 없습니다.',
    showMore: (total: number) => `+${total} 더보기`,
  };

  const formats = {
    monthHeaderFormat: (date: Date) => format(date, 'yyyy년 M월', { locale: ko }),
    dayHeaderFormat: (date: Date) => format(date, 'M월 d일 (E)', { locale: ko }),
    dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
      `${format(start, 'M월 d일', { locale: ko })} - ${format(end, 'M월 d일', { locale: ko })}`,
    agendaHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
      `${format(start, 'yyyy-MM-dd', { locale: ko })} — ${format(end, 'yyyy-MM-dd', { locale: ko })}`,
    dayFormat: (date: Date) => format(date, 'E d', { locale: ko }),
    weekdayFormat: (date: Date) => format(date, 'EEE', { locale: ko }),
    timeGutterFormat: (date: Date) => format(date, 'HH:mm', { locale: ko }),
  };

  // 툴팁 생성 함수
  const getEventTooltip = (event: CalendarEvent) => {
    const participants = event.resource?.participants || [];
    if (participants.length === 0) {
      return event.title;
    }

    const participantNames = participants
      .map((p) => {
        const member = teamMembers.find((m) => m.user_id === p.user_id);
        return member?.user_name || member?.name || `사용자 ${p.user_id}`;
      })
      .join(', ');

    return `${event.title}\n참가자 (${participants.length}명): ${participantNames}`;
  };

  return (
    <div className="big-calendar-container">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        titleAccessor="title"
        tooltipAccessor={getEventTooltip}
        views={views}
        defaultView={defaultView}
        messages={messages}
        formats={formats}
        onSelectEvent={onSelectEvent}
        onSelectSlot={onSelectSlot}
        onNavigate={onNavigate}
        onView={onView}
        selectable
        popup
        style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}
        culture="ko"
      />
    </div>
  );
}
