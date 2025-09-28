import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTeamStore } from '../team-store'

describe('TeamStore', () => {
  beforeEach(() => {
    // 스토어 초기화
    useTeamStore.getState().clearTeams()
    useTeamStore.getState().clearCurrentTeam()
    useTeamStore.getState().clearMembers()
    vi.clearAllMocks()
  })

  describe('초기 상태', () => {
    it('초기 상태가 올바르게 설정되어야 한다', () => {
      const state = useTeamStore.getState()

      expect(state.teams).toEqual([])
      expect(state.currentTeam).toBeNull()
      expect(state.teamMembers).toEqual([])
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('setTeams', () => {
    it('팀 목록을 설정해야 한다', () => {
      const teams = [
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
      ]

      useTeamStore.getState().setTeams(teams)
      const state = useTeamStore.getState()

      expect(state.teams).toEqual(teams)
    })
  })

  describe('addTeam', () => {
    it('새 팀을 추가해야 한다', () => {
      const existingTeam = {
        id: 1,
        name: '개발팀',
        description: '개발 업무를 담당하는 팀',
        invite_code: 'DEV001',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const newTeam = {
        id: 2,
        name: '마케팅팀',
        description: '마케팅 업무를 담당하는 팀',
        invite_code: 'MKT001',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      useTeamStore.getState().setTeams([existingTeam])
      useTeamStore.getState().addTeam(newTeam)

      const state = useTeamStore.getState()
      expect(state.teams).toHaveLength(2)
      expect(state.teams).toContain(existingTeam)
      expect(state.teams).toContain(newTeam)
    })
  })

  describe('updateTeam', () => {
    it('기존 팀 정보를 업데이트해야 한다', () => {
      const originalTeam = {
        id: 1,
        name: '개발팀',
        description: '개발 업무를 담당하는 팀',
        invite_code: 'DEV001',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const updatedTeam = {
        ...originalTeam,
        name: '풀스택 개발팀',
        description: '프론트엔드와 백엔드 개발을 담당하는 팀',
      }

      useTeamStore.getState().setTeams([originalTeam])
      useTeamStore.getState().updateTeam(updatedTeam)

      const state = useTeamStore.getState()
      expect(state.teams).toHaveLength(1)
      expect(state.teams[0]).toEqual(updatedTeam)
    })

    it('존재하지 않는 팀 업데이트 시 아무 변화가 없어야 한다', () => {
      const existingTeam = {
        id: 1,
        name: '개발팀',
        description: '개발 업무를 담당하는 팀',
        invite_code: 'DEV001',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const nonExistentTeam = {
        id: 999,
        name: '존재하지 않는 팀',
        description: '',
        invite_code: 'NONE',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      useTeamStore.getState().setTeams([existingTeam])
      useTeamStore.getState().updateTeam(nonExistentTeam)

      const state = useTeamStore.getState()
      expect(state.teams).toHaveLength(1)
      expect(state.teams[0]).toEqual(existingTeam)
    })
  })

  describe('removeTeam', () => {
    it('팀을 제거해야 한다', () => {
      const team1 = {
        id: 1,
        name: '개발팀',
        description: '개발 업무를 담당하는 팀',
        invite_code: 'DEV001',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const team2 = {
        id: 2,
        name: '마케팅팀',
        description: '마케팅 업무를 담당하는 팀',
        invite_code: 'MKT001',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      useTeamStore.getState().setTeams([team1, team2])
      useTeamStore.getState().removeTeam(1)

      const state = useTeamStore.getState()
      expect(state.teams).toHaveLength(1)
      expect(state.teams[0]).toEqual(team2)
    })
  })

  describe('setCurrentTeam', () => {
    it('현재 팀을 설정해야 한다', () => {
      const team = {
        id: 1,
        name: '개발팀',
        description: '개발 업무를 담당하는 팀',
        invite_code: 'DEV001',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      useTeamStore.getState().setCurrentTeam(team)
      const state = useTeamStore.getState()

      expect(state.currentTeam).toEqual(team)
    })
  })

  describe('setTeamMembers', () => {
    it('팀 멤버 목록을 설정해야 한다', () => {
      const members = [
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
      ]

      useTeamStore.getState().setTeamMembers(members)
      const state = useTeamStore.getState()

      expect(state.teamMembers).toEqual(members)
    })
  })

  describe('addTeamMember', () => {
    it('새 팀 멤버를 추가해야 한다', () => {
      const existingMember = {
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
      }

      const newMember = {
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
      }

      useTeamStore.getState().setTeamMembers([existingMember])
      useTeamStore.getState().addTeamMember(newMember)

      const state = useTeamStore.getState()
      expect(state.teamMembers).toHaveLength(2)
      expect(state.teamMembers).toContain(existingMember)
      expect(state.teamMembers).toContain(newMember)
    })
  })

  describe('updateTeamMember', () => {
    it('팀 멤버 역할을 업데이트해야 한다', () => {
      const originalMember = {
        id: 1,
        team_id: 1,
        user_id: 1,
        role: 'member' as const,
        joined_at: '2024-01-01T00:00:00Z',
        user: {
          id: 1,
          email: 'member@example.com',
          name: '팀원',
          phone: '010-1111-1111',
        },
      }

      const updatedMember = {
        ...originalMember,
        role: 'leader' as const,
      }

      useTeamStore.getState().setTeamMembers([originalMember])
      useTeamStore.getState().updateTeamMember(updatedMember)

      const state = useTeamStore.getState()
      expect(state.teamMembers).toHaveLength(1)
      expect(state.teamMembers[0].role).toBe('leader')
    })
  })

  describe('removeTeamMember', () => {
    it('팀 멤버를 제거해야 한다', () => {
      const member1 = {
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
      }

      const member2 = {
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
      }

      useTeamStore.getState().setTeamMembers([member1, member2])
      useTeamStore.getState().removeTeamMember(2)

      const state = useTeamStore.getState()
      expect(state.teamMembers).toHaveLength(1)
      expect(state.teamMembers[0]).toEqual(member1)
    })
  })

  describe('로딩 및 에러 상태', () => {
    it('로딩 상태를 설정해야 한다', () => {
      useTeamStore.getState().setLoading(true)
      let state = useTeamStore.getState()
      expect(state.isLoading).toBe(true)

      useTeamStore.getState().setLoading(false)
      state = useTeamStore.getState()
      expect(state.isLoading).toBe(false)
    })

    it('에러 상태를 설정해야 한다', () => {
      const errorMessage = '팀 로드 실패'

      useTeamStore.getState().setError(errorMessage)
      const state = useTeamStore.getState()

      expect(state.error).toBe(errorMessage)
    })

    it('에러를 초기화해야 한다', () => {
      useTeamStore.getState().setError('에러')
      useTeamStore.getState().setError(null)
      const state = useTeamStore.getState()

      expect(state.error).toBeNull()
    })
  })

  describe('clear 메서드들', () => {
    it('clearTeams가 팀 목록을 초기화해야 한다', () => {
      const teams = [
        {
          id: 1,
          name: '개발팀',
          description: '개발 업무를 담당하는 팀',
          invite_code: 'DEV001',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]

      useTeamStore.getState().setTeams(teams)
      useTeamStore.getState().clearTeams()
      const state = useTeamStore.getState()

      expect(state.teams).toEqual([])
    })

    it('clearCurrentTeam이 현재 팀을 초기화해야 한다', () => {
      const team = {
        id: 1,
        name: '개발팀',
        description: '개발 업무를 담당하는 팀',
        invite_code: 'DEV001',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      useTeamStore.getState().setCurrentTeam(team)
      useTeamStore.getState().clearCurrentTeam()
      const state = useTeamStore.getState()

      expect(state.currentTeam).toBeNull()
    })

    it('clearMembers가 팀 멤버 목록을 초기화해야 한다', () => {
      const members = [
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
      ]

      useTeamStore.getState().setTeamMembers(members)
      useTeamStore.getState().clearMembers()
      const state = useTeamStore.getState()

      expect(state.teamMembers).toEqual([])
    })
  })
})
