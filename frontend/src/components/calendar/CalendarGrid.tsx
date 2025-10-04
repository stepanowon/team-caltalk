import React, { useMemo } from 'react'
import { cn } from '@/lib/utils'
import ScheduleCard from './ScheduleCard'

interface Schedule {
  id: number
  title: string
  description?: string
  start_time: string
  end_time: string
  participants: Array<{
    id: number
    user_id: number
    status: 'pending' | 'accepted' | 'declined'
  }>
  participant_count: number
}

interface CalendarGridProps {
  currentDate: Date
  schedules: Schedule[]
  onDateClick?: (date: Date) => void
  onScheduleClick?: (schedule: Schedule) => void
  onScheduleEdit?: (schedule: Schedule) => void
  onScheduleDelete?: (scheduleId: number) => void
  canEditSchedules?: boolean
  className?: string
}

export function CalendarGrid({
  currentDate,
  schedules,
  onDateClick,
  onScheduleClick,
  onScheduleEdit,
  onScheduleDelete,
  canEditSchedules = false,
  className,
}: CalendarGridProps) {
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']

  // Calculate calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    // First day of the month
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // Start from the Sunday of the week containing the first day
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    // End at the Saturday of the week containing the last day
    const endDate = new Date(lastDay)
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()))

    const days = []
    const current = new Date(startDate)

    while (current <= endDate) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }

    return days
  }, [currentDate])

  // Group schedules by date
  const schedulesByDate = useMemo(() => {
    const grouped: { [key: string]: Schedule[] } = {}

    schedules.forEach((schedule) => {
      const startDate = new Date(schedule.start_time)
      const endDate = new Date(schedule.end_time)

      // Reset time to start of day for accurate date comparison
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(0, 0, 0, 0)

      // Add schedule to all dates it spans
      const current = new Date(startDate)
      while (current <= endDate) {
        const dateKey = current.toDateString()

        if (!grouped[dateKey]) {
          grouped[dateKey] = []
        }
        grouped[dateKey].push(schedule)

        current.setDate(current.getDate() + 1)
      }
    })

    // Sort schedules by start time for each date
    Object.keys(grouped).forEach((dateKey) => {
      grouped[dateKey].sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      )
    })

    return grouped
  }, [schedules])

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth()
  }

  const isWeekend = (date: Date) => {
    const day = date.getDay()
    return day === 0 || day === 6
  }

  const handleDateClick = (date: Date) => {
    onDateClick?.(date)
  }

  const getDateSchedules = (date: Date) => {
    const dateKey = date.toDateString()
    return schedulesByDate[dateKey] || []
  }

  return (
    <div className={cn('bg-white rounded-lg border', className)}>
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b">
        {dayNames.map((day, index) => (
          <div
            key={day}
            className={cn(
              'p-4 text-center font-medium border-r last:border-r-0',
              isWeekend(new Date(2024, 0, index)) && 'text-red-500'
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((date, index) => {
          const daySchedules = getDateSchedules(date)
          const isCurrentMonthDate = isCurrentMonth(date)
          const isTodayDate = isToday(date)
          const isWeekendDate = isWeekend(date)

          return (
            <div
              key={date.toISOString()}
              className={cn(
                'min-h-[120px] p-2 border-r border-b last:border-r-0 cursor-pointer hover:bg-gray-50 transition-colors',
                !isCurrentMonthDate && 'bg-gray-50 text-gray-400',
                isTodayDate && 'bg-blue-50 border-blue-200'
              )}
              onClick={() => handleDateClick(date)}
            >
              {/* Date number */}
              <div className="flex justify-between items-center mb-2">
                <span
                  className={cn(
                    'text-sm font-medium',
                    isTodayDate &&
                      'bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs',
                    isWeekendDate && !isTodayDate && 'text-red-500',
                    !isCurrentMonthDate && 'text-gray-400'
                  )}
                >
                  {date.getDate()}
                </span>

                {daySchedules.length > 0 && (
                  <span className="text-xs text-gray-500 bg-gray-200 rounded-full px-2 py-0.5">
                    {daySchedules.length}
                  </span>
                )}
              </div>

              {/* Schedules */}
              <div className="space-y-1">
                {daySchedules.slice(0, 3).map((schedule) => (
                  <ScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    variant="mini"
                    onClick={onScheduleClick}
                    onEdit={onScheduleEdit}
                    onDelete={onScheduleDelete}
                    canEdit={canEditSchedules}
                    className="w-full"
                  />
                ))}

                {daySchedules.length > 3 && (
                  <div className="text-xs text-gray-500 text-center py-1">
                    +{daySchedules.length - 3}개 더
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CalendarGrid
