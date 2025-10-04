import { useQuery } from '@tanstack/react-query'
import { ActivityService } from '@/services/activity-service'

// Query Keys
export const activityKeys = {
  all: ['activities'] as const,
  list: (teamId?: number, limit?: number) =>
    ['activities', 'list', teamId, limit] as const,
}

// 활동 내역 조회 hook
export function useActivities(teamId?: number, limit = 5) {
  return useQuery({
    queryKey: activityKeys.list(teamId, limit),
    queryFn: () => ActivityService.getActivities({ teamId, limit }),
    staleTime: 30000, // 30초 동안 캐시 유지
    refetchInterval: 60000, // 1분마다 자동 갱신
  })
}
