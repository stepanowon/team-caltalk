import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Calendar, Plus, RefreshCw } from 'lucide-react'

interface CalendarHeaderProps {
  currentDate: Date
  onDateChange: (date: Date) => void
  onTodayClick: () => void
  onCreateSchedule?: () => void
  onRefresh?: () => void
  scheduleCount?: number
  loading?: boolean
  canCreateSchedule?: boolean
  className?: string
}

export function CalendarHeader({
  currentDate,
  onDateChange,
  onTodayClick,
  onCreateSchedule,
  onRefresh,
  scheduleCount = 0,
  loading = false,
  canCreateSchedule = false,
  className,
}: CalendarHeaderProps) {
  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
    })
  }

  const goToPreviousMonth = () => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() - 1)
    onDateChange(newDate)
  }

  const goToNextMonth = () => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + 1)
    onDateChange(newDate)
  }

  const isCurrentMonth = () => {
    const today = new Date()
    return (
      currentDate.getFullYear() === today.getFullYear() &&
      currentDate.getMonth() === today.getMonth()
    )
  }

  return (
    <div className={cn('flex items-center justify-between p-4 bg-white border-b', className)}>
      {/* Left section: Navigation */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPreviousMonth}
            disabled={loading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={goToNextMonth}
            disabled={loading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {formatMonthYear(currentDate)}
            </h2>
          </div>

          {!isCurrentMonth() && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onTodayClick}
              disabled={loading}
              className="text-blue-600 hover:text-blue-700"
            >
              오늘로
            </Button>
          )}
        </div>

        {scheduleCount > 0 && (
          <Badge variant="secondary" className="ml-2">
            {scheduleCount}개 일정
          </Badge>
        )}
      </div>

      {/* Right section: Actions */}
      <div className="flex items-center space-x-2">
        {onRefresh && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={loading}
            className={cn(loading && 'animate-spin')}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}

        {canCreateSchedule && onCreateSchedule && (
          <Button
            onClick={onCreateSchedule}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>일정 추가</span>
          </Button>
        )}
      </div>
    </div>
  )
}

export default CalendarHeader