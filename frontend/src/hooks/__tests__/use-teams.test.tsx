import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTeams } from '../use-teams'
import { useTeamStore } from '@/stores/team-store'
import { useAuthStore } from '@/stores/auth-store'
import { TeamService } from '@/services/team-service'

// TeamService 모킹
vi.mock('@/services/team-service', () => ({
  TeamService: {
    getTeams: vi.fn(),
    createTeam: vi.fn(),
    getTeam: vi.fn(),
    getTeamMembers: vi.fn(),
    joinTeam: vi.fn(),
    updateTeamMember: vi.fn(),
    removeTeamMember: vi.fn(),
    deleteTeam: vi.fn(),
  },
}))

// 테스트용 QueryClient 생성
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

// 래퍼 컴포넌트
const createWrapper = (queryClient = createTestQueryClient()) => {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useTeams', () => {
  beforeEach(() => {
    // 스토어 초기화
    useTeamStore.getState().clearTeams()
    useTeamStore.getState().clearCurrentTeam()
    useTeamStore.getState().clearMembers()
    useAuthStore.getState().clearAuth()
    vi.clearAllMocks()
  })

  describe('팀 목록 조회', () => {
    it('토큰이 있을 때 팀 목록을 조회해야 한다', async () => {
      const mockTeamsResponse = {
        success: true,
        data: {
          teams: [
            {
              id: 1,
              name: '개발팀',
              description: '개발 업무를 담당하는 팀',
              invite_code: 'DEV001',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            {
              id: 2,
              name: '마케팅팀',
              description: '마케팅 업무를 담당하는 팀',
              invite_code: 'MKT001',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          ],
        },
      }

      vi.mocked(TeamService.getTeams).mockResolvedValue(mockTeamsResponse)

      // 토큰 설정
      useAuthStore.getState().setToken('mock-jwt-token')

      const { result } = renderHook(() => useTeams(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.teams.isSuccess).toBe(true)
      })

      expect(result.current.teams.data?.teams).toHaveLength(2)
      expect(TeamService.getTeams).toHaveBeenCalledWith('mock-jwt-token')
    })

    it('토큰이 없으면 팀 목록을 조회하지 않아야 한다', () => {
      const { result } = renderHook(() => useTeams(), {
        wrapper: createWrapper(),
      })

      // 토큰이 없으므로 쿼리가 비활성화되어야 함
      expect(result.current.teams.isLoading).toBe(false)
      expect(TeamService.getTeams).not.toHaveBeenCalled()
    })

    it('팀 목록 조회 실패 시 에러를 처리해야 한다', async () => {
      const mockErrorResponse = {
        success: false,
        error: '팀 목록을 불러올 수 없습니다.',
      }

      vi.mocked(TeamService.getTeams).mockResolvedValue(mockErrorResponse)

      // 토큰 설정
      useAuthStore.getState().setToken('mock-jwt-token')

      const { result } = renderHook(() => useTeams(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.teams.isError).toBe(true)
      })
    })
  })

  describe('팀 생성', () => {
    it('팀을 성공적으로 생성하고 목록을 업데이트해야 한다', async () => {
      const mockCreateResponse = {
        success: true,
        data: {
          team: {
            id: 3,
            name: '새 팀',
            description: '새로 생성된 팀',
            invite_code: 'NEW001',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        },
      }

      vi.mocked(TeamService.createTeam).mockResolvedValue(mockCreateResponse)

      // 토큰 설정
      useAuthStore.getState().setToken('mock-jwt-token')

      const { result } = renderHook(() => useTeams(), {
        wrapper: createWrapper(),
      })

      const teamData = {
        name: '새 팀',
        description: '새로 생성된 팀',
      }

      await act(async () => {
        await result.current.createTeam.mutateAsync(teamData)
      })

      expect(result.current.createTeam.isSuccess).toBe(true)
      expect(TeamService.createTeam).toHaveBeenCalledWith(
        teamData,
        'mock-jwt-token'
      )
    })

    it('팀 생성 실패 시 에러를 처리해야 한다', async () => {
      const mockErrorResponse = {
        success: false,
        error: '이미 존재하는 팀명입니다.',
      }

      vi.mocked(TeamService.createTeam).mockResolvedValue(mockErrorResponse)

      // 토큰 설정
      useAuthStore.getState().setToken('mock-jwt-token')

      const { result } = renderHook(() => useTeams(), {
        wrapper: createWrapper(),
      })

      const teamData = {
        name: '개발팀', // 중복된 팀명
        description: '중복된 팀',
      }

      await act(async () => {
        try {
          await result.current.createTeam.mutateAsync(teamData)
        } catch (error) {
          expect(error).toBeDefined()
        }
      })

      expect(result.current.createTeam.isError).toBe(true)
    })

    it('토큰이 없으면 팀 생성이 실패해야 한다', async () => {
      const { result } = renderHook(() => useTeams(), {
        wrapper: createWrapper(),
      })

      const teamData = {
        name: '새 팀',
        description: '새로 생성된 팀',
      }

      await act(async () => {
        try {
          await result.current.createTeam.mutateAsync(teamData)
        } catch (error) {
          expect(error).toBeDefined()
        }
      })

      expect(TeamService.createTeam).not.toHaveBeenCalled()
    })
  })

  describe('팀 상세 조회', () => {
    it('팀 상세 정보를 조회해야 한다', async () => {
      const mockTeamResponse = {
        success: true,
        data: {
          team: {
            id: 1,
            name: '개발팀',
            description: '개발 업무를 담당하는 팀',
            invite_code: 'DEV001',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        },
      }

      vi.mocked(TeamService.getTeam).mockResolvedValue(mockTeamResponse)

      // 토큰 설정
      useAuthStore.getState().setToken('mock-jwt-token')

      const { result } = renderHook(() => useTeams(1), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.currentTeam.isSuccess).toBe(true)
      })

      expect(result.current.currentTeam.data?.team).toEqual(
        mockTeamResponse.data.team
      )
      expect(TeamService.getTeam).toHaveBeenCalledWith(1, 'mock-jwt-token')
    })

    it('존재하지 않는 팀 조회 시 에러를 처리해야 한다', async () => {
      const mockErrorResponse = {
        success: false,
        error: '팀을 찾을 수 없습니다.',
      }

      vi.mocked(TeamService.getTeam).mockResolvedValue(mockErrorResponse)

      // 토큰 설정
      useAuthStore.getState().setToken('mock-jwt-token')

      const { result } = renderHook(() => useTeams(999), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.currentTeam.isError).toBe(true)
      })
    })
  })

  describe('팀 멤버 조회', () => {
    it('팀 멤버 목록을 조회해야 한다', async () => {
      const mockMembersResponse = {
        success: true,
        data: {
          members: [
            {
              id: 1,
              team_id: 1,
              user_id: 1,
              role: 'leader' as const,
              joined_at: '2024-01-01T00:00:00Z',
              user: {
                id: 1,
                email: 'leader@example.com',
                name: '팀장',
                phone: '010-1111-1111',
              },
            },
            {
              id: 2,
              team_id: 1,
              user_id: 2,
              role: 'member' as const,
              joined_at: '2024-01-02T00:00:00Z',
              user: {
                id: 2,
                email: 'member@example.com',
                name: '팀원',
                phone: '010-2222-2222',
              },
            },
          ],
        },
      }

      vi.mocked(TeamService.getTeamMembers).mockResolvedValue(
        mockMembersResponse
      )

      // 토큰 설정
      useAuthStore.getState().setToken('mock-jwt-token')

      const { result } = renderHook(() => useTeams(1), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.teamMembers.isSuccess).toBe(true)
      })

      expect(result.current.teamMembers.data?.members).toHaveLength(2)
      expect(TeamService.getTeamMembers).toHaveBeenCalledWith(
        1,
        'mock-jwt-token'
      )
    })
  })

  describe('팀 참여', () => {
    it('초대 코드로 팀에 참여해야 한다', async () => {
      const mockJoinResponse = {
        success: true,
        data: {
          team: {
            id: 2,
            name: '마케팅팀',
            description: '마케팅 업무를 담당하는 팀',
            invite_code: 'MKT001',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          member: {
            id: 3,
            team_id: 2,
            user_id: 1,
            role: 'member' as const,
            joined_at: '2024-01-01T00:00:00Z',
            user: {
              id: 1,
              email: 'test@example.com',
              name: '테스트 사용자',
              phone: '010-1234-5678',
            },
          },
        },
      }

      vi.mocked(TeamService.joinTeam).mockResolvedValue(mockJoinResponse)

      // 토큰 설정
      useAuthStore.getState().setToken('mock-jwt-token')

      const { result } = renderHook(() => useTeams(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.joinTeam.mutateAsync('MKT001')
      })

      expect(result.current.joinTeam.isSuccess).toBe(true)
      expect(TeamService.joinTeam).toHaveBeenCalledWith(
        'MKT001',
        'mock-jwt-token'
      )
    })

    it('유효하지 않은 초대 코드로 참여 시 에러를 처리해야 한다', async () => {
      const mockErrorResponse = {
        success: false,
        error: '유효하지 않은 초대 코드입니다.',
      }

      vi.mocked(TeamService.joinTeam).mockResolvedValue(mockErrorResponse)

      // 토큰 설정
      useAuthStore.getState().setToken('mock-jwt-token')

      const { result } = renderHook(() => useTeams(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        try {
          await result.current.joinTeam.mutateAsync('INVALID')
        } catch (error) {
          expect(error).toBeDefined()
        }
      })

      expect(result.current.joinTeam.isError).toBe(true)
    })
  })

  describe('팀 멤버 관리', () => {
    it('팀 멤버 역할을 변경해야 한다', async () => {
      const mockUpdateResponse = {
        success: true,
        data: {
          member: {
            id: 2,
            team_id: 1,
            user_id: 2,
            role: 'leader' as const,
            joined_at: '2024-01-02T00:00:00Z',
            user: {
              id: 2,
              email: 'member@example.com',
              name: '팀원',
              phone: '010-2222-2222',
            },
          },
        },
      }

      vi.mocked(TeamService.updateTeamMember).mockResolvedValue(
        mockUpdateResponse
      )

      // 토큰 설정
      useAuthStore.getState().setToken('mock-jwt-token')

      const { result } = renderHook(() => useTeams(1), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.updateMemberRole.mutateAsync({
          memberId: 2,
          role: 'leader',
        })
      })

      expect(result.current.updateMemberRole.isSuccess).toBe(true)
      expect(TeamService.updateTeamMember).toHaveBeenCalledWith(
        1,
        2,
        { role: 'leader' },
        'mock-jwt-token'
      )
    })

    it('팀 멤버를 제거해야 한다', async () => {
      const mockRemoveResponse = {
        success: true,
        message: '팀 멤버가 제거되었습니다.',
      }

      vi.mocked(TeamService.removeTeamMember).mockResolvedValue(
        mockRemoveResponse
      )

      // 토큰 설정
      useAuthStore.getState().setToken('mock-jwt-token')

      const { result } = renderHook(() => useTeams(1), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.removeMember.mutateAsync(2)
      })

      expect(result.current.removeMember.isSuccess).toBe(true)
      expect(TeamService.removeTeamMember).toHaveBeenCalledWith(
        1,
        2,
        'mock-jwt-token'
      )
    })
  })

  describe('팀 삭제', () => {
    it('팀을 성공적으로 삭제해야 한다', async () => {
      const mockDeleteResponse = {
        success: true,
        message: '팀이 삭제되었습니다.',
      }

      vi.mocked(TeamService.deleteTeam).mockResolvedValue(mockDeleteResponse)

      // 토큰 설정
      useAuthStore.getState().setToken('mock-jwt-token')

      const { result } = renderHook(() => useTeams(1), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.deleteTeam.mutateAsync()
      })

      expect(result.current.deleteTeam.isSuccess).toBe(true)
      expect(TeamService.deleteTeam).toHaveBeenCalledWith(1, 'mock-jwt-token')
    })

    it('권한이 없는 사용자가 팀 삭제 시 에러를 처리해야 한다', async () => {
      const mockErrorResponse = {
        success: false,
        error: '팀장만 팀을 삭제할 수 있습니다.',
      }

      vi.mocked(TeamService.deleteTeam).mockResolvedValue(mockErrorResponse)

      // 토큰 설정
      useAuthStore.getState().setToken('mock-jwt-token')

      const { result } = renderHook(() => useTeams(1), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        try {
          await result.current.deleteTeam.mutateAsync()
        } catch (error) {
          expect(error).toBeDefined()
        }
      })

      expect(result.current.deleteTeam.isError).toBe(true)
    })
  })

  describe('캐시 무효화', () => {
    it('팀 생성 후 팀 목록 캐시를 무효화해야 한다', async () => {
      const mockCreateResponse = {
        success: true,
        data: {
          team: {
            id: 3,
            name: '새 팀',
            description: '새로 생성된 팀',
            invite_code: 'NEW001',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        },
      }

      vi.mocked(TeamService.createTeam).mockResolvedValue(mockCreateResponse)

      // 토큰 설정
      useAuthStore.getState().setToken('mock-jwt-token')

      const queryClient = createTestQueryClient()
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useTeams(), {
        wrapper: createWrapper(queryClient),
      })

      const teamData = {
        name: '새 팀',
        description: '새로 생성된 팀',
      }

      await act(async () => {
        await result.current.createTeam.mutateAsync(teamData)
      })

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['teams'],
      })
    })

    it('멤버 업데이트 후 관련 캐시를 무효화해야 한다', async () => {
      const mockUpdateResponse = {
        success: true,
        data: {
          member: {
            id: 2,
            team_id: 1,
            user_id: 2,
            role: 'leader' as const,
            joined_at: '2024-01-02T00:00:00Z',
            user: {
              id: 2,
              email: 'member@example.com',
              name: '팀원',
              phone: '010-2222-2222',
            },
          },
        },
      }

      vi.mocked(TeamService.updateTeamMember).mockResolvedValue(
        mockUpdateResponse
      )

      // 토큰 설정
      useAuthStore.getState().setToken('mock-jwt-token')

      const queryClient = createTestQueryClient()
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useTeams(1), {
        wrapper: createWrapper(queryClient),
      })

      await act(async () => {
        await result.current.updateMemberRole.mutateAsync({
          memberId: 2,
          role: 'leader',
        })
      })

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['team', 1, 'members'],
      })
    })
  })

  describe('로딩 상태 관리', () => {
    it('각 작업의 로딩 상태를 올바르게 관리해야 한다', async () => {
      const mockCreateResponse = {
        success: true,
        data: {
          team: {
            id: 3,
            name: '새 팀',
            description: '새로 생성된 팀',
            invite_code: 'NEW001',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        },
      }

      vi.mocked(TeamService.createTeam).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockCreateResponse), 100)
          )
      )

      // 토큰 설정
      useAuthStore.getState().setToken('mock-jwt-token')

      const { result } = renderHook(() => useTeams(), {
        wrapper: createWrapper(),
      })

      const teamData = {
        name: '새 팀',
        description: '새로 생성된 팀',
      }

      act(() => {
        result.current.createTeam.mutate(teamData)
      })

      // 로딩 상태 확인
      expect(result.current.createTeam.isPending).toBe(true)

      await waitFor(() => {
        expect(result.current.createTeam.isPending).toBe(false)
      })

      expect(result.current.createTeam.isSuccess).toBe(true)
    })
  })
})
