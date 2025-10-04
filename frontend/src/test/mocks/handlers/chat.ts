import { http, HttpResponse } from 'msw'

const API_BASE_URL = 'http://localhost:3000/api'

// Mock 데이터
const mockMessages = [
  {
    id: 1,
    team_id: 1,
    user_id: 1,
    content: '오늘 회의 일정을 변경하고 싶습니다.',
    message_type: 'text',
    message_date: '2024-01-15',
    parent_message_id: null,
    metadata: null,
    created_at: '2024-01-15T09:00:00Z',
    updated_at: '2024-01-15T09:00:00Z',
    user: {
      id: 1,
      username: 'testuser',
      full_name: '테스트 사용자',
    },
  },
  {
    id: 2,
    team_id: 1,
    user_id: 2,
    content: '어떤 시간으로 변경하시겠어요?',
    message_type: 'text',
    message_date: '2024-01-15',
    parent_message_id: 1,
    metadata: null,
    created_at: '2024-01-15T09:05:00Z',
    updated_at: '2024-01-15T09:05:00Z',
    user: {
      id: 2,
      username: 'member',
      full_name: '팀원',
    },
  },
  {
    id: 3,
    team_id: 1,
    user_id: 1,
    content: '오후 3시로 변경 요청드립니다.',
    message_type: 'schedule_change_request',
    message_date: '2024-01-15',
    parent_message_id: 2,
    metadata: {
      schedule_id: 1,
      requested_time: '15:00',
      original_time: '14:00',
    },
    created_at: '2024-01-15T09:10:00Z',
    updated_at: '2024-01-15T09:10:00Z',
    user: {
      id: 1,
      username: 'testuser',
      full_name: '테스트 사용자',
    },
  },
]

const mockUsers = [
  { id: 1, username: 'testuser', full_name: '테스트 사용자' },
  { id: 2, username: 'member', full_name: '팀원' },
  { id: 3, username: 'leader', full_name: '팀장' },
]

let currentMessages = [...mockMessages]
let nextMessageId = 4

export const chatHandlers = [
  // 특정 날짜의 메시지 조회
  http.get(`${API_BASE_URL}/teams/:teamId/messages`, ({ params, request }) => {
    const { teamId } = params
    const url = new URL(request.url)
    const messageDate = url.searchParams.get('message_date')
    const lastMessageId = url.searchParams.get('last_message_id')

    let filteredMessages = currentMessages.filter(
      (msg) => msg.team_id === Number(teamId)
    )

    if (messageDate) {
      filteredMessages = filteredMessages.filter(
        (msg) => msg.message_date === messageDate
      )
    }

    if (lastMessageId) {
      filteredMessages = filteredMessages.filter(
        (msg) => msg.id > Number(lastMessageId)
      )
    }

    return HttpResponse.json({
      success: true,
      data: {
        messages: filteredMessages,
        has_more: false,
        total_count: filteredMessages.length,
      },
    })
  }),

  // Long Polling - 새 메시지 대기
  http.get(
    `${API_BASE_URL}/teams/:teamId/messages/poll`,
    ({ params, request }) => {
      const { teamId } = params
      const url = new URL(request.url)
      const lastMessageId = url.searchParams.get('last_message_id')
      const timeout = url.searchParams.get('timeout') || '30000'

      // 새 메시지가 있는지 확인
      const newMessages = currentMessages.filter(
        (msg) =>
          msg.team_id === Number(teamId) && msg.id > Number(lastMessageId || 0)
      )

      if (newMessages.length > 0) {
        return HttpResponse.json({
          success: true,
          data: {
            messages: newMessages,
            has_new_messages: true,
          },
        })
      }

      // 타임아웃 시뮬레이션 (실제로는 서버에서 처리)
      return HttpResponse.json({
        success: true,
        data: {
          messages: [],
          has_new_messages: false,
        },
      })
    }
  ),

  // 메시지 전송
  http.post(
    `${API_BASE_URL}/teams/:teamId/messages`,
    async ({ params, request }) => {
      const { teamId } = params
      const {
        content,
        message_type,
        message_date,
        parent_message_id,
        metadata,
      } = (await request.json()) as any

      const authorization = request.headers.get('Authorization')
      const token = authorization?.slice(7)

      // 토큰에서 사용자 정보 추출 (실제로는 JWT 디코딩)
      const userId = token === 'mock-jwt-token' ? 1 : 2
      const user = mockUsers.find((u) => u.id === userId) || mockUsers[0]

      const newMessage = {
        id: nextMessageId++,
        team_id: Number(teamId),
        user_id: userId,
        content,
        message_type: message_type || 'text',
        message_date: message_date || new Date().toISOString().split('T')[0],
        parent_message_id: parent_message_id || null,
        metadata: metadata || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user,
      }

      currentMessages.push(newMessage)

      return HttpResponse.json({
        success: true,
        data: { message: newMessage },
      })
    }
  ),

  // 메시지 삭제 (본인만 가능)
  http.delete(
    `${API_BASE_URL}/teams/:teamId/messages/:messageId`,
    ({ params, request }) => {
      const { teamId, messageId } = params
      const authorization = request.headers.get('Authorization')
      const token = authorization?.slice(7)
      const userId = token === 'mock-jwt-token' ? 1 : 2

      const messageIndex = currentMessages.findIndex(
        (msg) =>
          msg.id === Number(messageId) &&
          msg.team_id === Number(teamId) &&
          msg.user_id === userId
      )

      if (messageIndex === -1) {
        return HttpResponse.json(
          {
            success: false,
            error: '메시지를 찾을 수 없거나 권한이 없습니다.',
          },
          { status: 404 }
        )
      }

      currentMessages.splice(messageIndex, 1)

      return HttpResponse.json({
        success: true,
        message: '메시지가 삭제되었습니다.',
      })
    }
  ),

  // 메시지 수정 (본인만 가능)
  http.put(
    `${API_BASE_URL}/teams/:teamId/messages/:messageId`,
    async ({ params, request }) => {
      const { teamId, messageId } = params
      const { content } = (await request.json()) as any
      const authorization = request.headers.get('Authorization')
      const token = authorization?.slice(7)
      const userId = token === 'mock-jwt-token' ? 1 : 2

      const messageIndex = currentMessages.findIndex(
        (msg) =>
          msg.id === Number(messageId) &&
          msg.team_id === Number(teamId) &&
          msg.user_id === userId
      )

      if (messageIndex === -1) {
        return HttpResponse.json(
          {
            success: false,
            error: '메시지를 찾을 수 없거나 권한이 없습니다.',
          },
          { status: 404 }
        )
      }

      currentMessages[messageIndex] = {
        ...currentMessages[messageIndex],
        content,
        updated_at: new Date().toISOString(),
      }

      return HttpResponse.json({
        success: true,
        data: { message: currentMessages[messageIndex] },
      })
    }
  ),

  // 타이핑 인디케이터
  http.post(
    `${API_BASE_URL}/teams/:teamId/typing`,
    async ({ params, request }) => {
      const { teamId } = params
      const { is_typing } = (await request.json()) as any
      const authorization = request.headers.get('Authorization')
      const token = authorization?.slice(7)
      const userId = token === 'mock-jwt-token' ? 1 : 2

      return HttpResponse.json({
        success: true,
        data: {
          user_id: userId,
          is_typing,
          timestamp: new Date().toISOString(),
        },
      })
    }
  ),

  // 일정 변경 요청 (채팅을 통한)
  http.post(
    `${API_BASE_URL}/teams/:teamId/schedule-change-request`,
    async ({ params, request }) => {
      const { teamId } = params
      const {
        schedule_id,
        requested_start_time,
        requested_end_time,
        message_date,
      } = (await request.json()) as any
      const authorization = request.headers.get('Authorization')
      const token = authorization?.slice(7)
      const userId = token === 'mock-jwt-token' ? 1 : 2
      const user = mockUsers.find((u) => u.id === userId) || mockUsers[0]

      const changeRequestMessage = {
        id: nextMessageId++,
        team_id: Number(teamId),
        user_id: userId,
        content: `일정 변경을 요청합니다: ${requested_start_time} - ${requested_end_time}`,
        message_type: 'schedule_change_request',
        message_date: message_date || new Date().toISOString().split('T')[0],
        parent_message_id: null,
        metadata: {
          schedule_id,
          requested_start_time,
          requested_end_time,
          status: 'pending',
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user,
      }

      currentMessages.push(changeRequestMessage)

      return HttpResponse.json({
        success: true,
        data: { message: changeRequestMessage },
      })
    }
  ),

  // 메시지 검색
  http.get(
    `${API_BASE_URL}/teams/:teamId/messages/search`,
    ({ params, request }) => {
      const { teamId } = params
      const url = new URL(request.url)
      const query = url.searchParams.get('q')
      const limit = Number(url.searchParams.get('limit')) || 20

      if (!query) {
        return HttpResponse.json({
          success: true,
          data: { messages: [], total_count: 0 },
        })
      }

      const searchResults = currentMessages
        .filter(
          (msg) =>
            msg.team_id === Number(teamId) &&
            msg.content.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, limit)

      return HttpResponse.json({
        success: true,
        data: {
          messages: searchResults,
          total_count: searchResults.length,
          query,
        },
      })
    }
  ),
]

// 테스트용 유틸리티 함수들
export const chatTestUtils = {
  // 메시지 추가 (테스트용)
  addMockMessage: (message: any) => {
    currentMessages.push({ ...message, id: nextMessageId++ })
  },

  // 메시지 초기화 (테스트용)
  resetMessages: () => {
    currentMessages = [...mockMessages]
    nextMessageId = 4
  },

  // 현재 메시지 목록 조회 (테스트용)
  getCurrentMessages: () => [...currentMessages],

  // 특정 팀의 메시지만 조회 (테스트용)
  getTeamMessages: (teamId: number) =>
    currentMessages.filter((msg) => msg.team_id === teamId),
}
