import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChatService } from '@/services/chat-service'
import type {
  SendMessageRequest,
  ScheduleChangeRequest,
} from '@/services/chat-service'

// Query Keys
export const chatKeys = {
  all: ['chat'] as const,
  messages: (teamId: number, targetDate: string) =>
    ['chat', 'messages', teamId, targetDate] as const,
  scheduleRequests: (teamId: number) =>
    ['chat', 'schedule-requests', teamId] as const,
}

// 메시지 조회 hook
export function useMessages(
  teamId: number | null,
  targetDate: string,
  enabled = true
) {
  return useQuery({
    queryKey: chatKeys.messages(teamId || 0, targetDate),
    queryFn: () => {
      if (!teamId) throw new Error('Team ID is required')
      return ChatService.getMessages(teamId, targetDate)
    },
    enabled: enabled && !!teamId,
    refetchInterval: 30000, // 30초마다 자동 갱신
    staleTime: 0, // 항상 최신 데이터 유지
  })
}

// 메시지 전송 hook
export function useSendMessage(teamId: number | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: SendMessageRequest) => {
      if (!teamId) throw new Error('Team ID is required')
      return ChatService.sendMessage(teamId, data)
    },
    onSuccess: (_, variables) => {
      // 메시지 목록 무효화하여 재조회
      if (teamId) {
        queryClient.invalidateQueries({
          queryKey: chatKeys.messages(teamId, variables.targetDate),
        })
      }
    },
  })
}

// 일정 변경 요청 조회 hook
export function useScheduleRequests(teamId: number | null, enabled = true) {
  return useQuery({
    queryKey: chatKeys.scheduleRequests(teamId || 0),
    queryFn: () => {
      if (!teamId) throw new Error('Team ID is required')
      return ChatService.getScheduleRequests(teamId)
    },
    enabled: enabled && !!teamId,
    refetchInterval: 30000, // 30초마다 자동 갱신
  })
}

// 일정 변경 요청 전송 hook
export function useSendScheduleRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ScheduleChangeRequest) =>
      ChatService.sendScheduleRequest(data),
    onSuccess: (_, variables) => {
      // 일정 변경 요청 목록 무효화
      queryClient.invalidateQueries({
        queryKey: chatKeys.scheduleRequests(variables.teamId),
      })
      // 메시지 목록도 무효화
      queryClient.invalidateQueries({
        queryKey: chatKeys.messages(variables.teamId, variables.targetDate),
      })
    },
  })
}

// 일정 변경 요청 승인 hook
export function useApproveRequest(teamId: number | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (messageId: number) => ChatService.approveRequest(messageId),
    onSuccess: () => {
      // 일정 변경 요청 목록 재조회
      if (teamId) {
        queryClient.invalidateQueries({
          queryKey: chatKeys.scheduleRequests(teamId),
        })
      }
    },
  })
}

// 일정 변경 요청 거절 hook
export function useRejectRequest(teamId: number | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (messageId: number) => ChatService.rejectRequest(messageId),
    onSuccess: () => {
      // 일정 변경 요청 목록 재조회
      if (teamId) {
        queryClient.invalidateQueries({
          queryKey: chatKeys.scheduleRequests(teamId),
        })
      }
    },
  })
}

// 응답 확인 hook
export function useAcknowledgeResponse(
  teamId: number | null,
  targetDate: string
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (messageId: number) =>
      ChatService.acknowledgeResponse(messageId),
    onSuccess: () => {
      // 메시지 목록 재조회
      if (teamId) {
        queryClient.invalidateQueries({
          queryKey: chatKeys.messages(teamId, targetDate),
        })
      }
    },
  })
}
