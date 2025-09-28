import { create } from 'zustand'

export interface Team {
  id: number
  name: string
  description: string
  invite_code: string
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: number
  team_id: number
  user_id: number
  role: 'leader' | 'member'
  joined_at: string
  user: {
    id: number
    email: string
    name: string
    phone: string
  }
}

interface TeamState {
  teams: Team[]
  currentTeam: Team | null
  teamMembers: TeamMember[]
  isLoading: boolean
  error: string | null

  // Team actions
  setTeams: (teams: Team[]) => void
  addTeam: (team: Team) => void
  updateTeam: (team: Team) => void
  removeTeam: (teamId: number) => void
  setCurrentTeam: (team: Team | null) => void
  clearTeams: () => void
  clearCurrentTeam: () => void

  // Member actions
  setTeamMembers: (members: TeamMember[]) => void
  addTeamMember: (member: TeamMember) => void
  updateTeamMember: (member: TeamMember) => void
  removeTeamMember: (memberId: number) => void
  clearMembers: () => void

  // Loading and error actions
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useTeamStore = create<TeamState>((set, get) => ({
  teams: [],
  currentTeam: null,
  teamMembers: [],
  isLoading: false,
  error: null,

  // Team actions
  setTeams: (teams) => set({ teams }),

  addTeam: (team) => set((state) => ({ teams: [...state.teams, team] })),

  updateTeam: (updatedTeam) =>
    set((state) => ({
      teams: state.teams.map((team) =>
        team.id === updatedTeam.id ? updatedTeam : team
      ),
    })),

  removeTeam: (teamId) =>
    set((state) => ({
      teams: state.teams.filter((team) => team.id !== teamId),
    })),

  setCurrentTeam: (team) => set({ currentTeam: team }),

  clearTeams: () => set({ teams: [] }),

  clearCurrentTeam: () => set({ currentTeam: null }),

  // Member actions
  setTeamMembers: (members) => set({ teamMembers: members }),

  addTeamMember: (member) =>
    set((state) => ({ teamMembers: [...state.teamMembers, member] })),

  updateTeamMember: (updatedMember) =>
    set((state) => ({
      teamMembers: state.teamMembers.map((member) =>
        member.id === updatedMember.id ? updatedMember : member
      ),
    })),

  removeTeamMember: (memberId) =>
    set((state) => ({
      teamMembers: state.teamMembers.filter((member) => member.id !== memberId),
    })),

  clearMembers: () => set({ teamMembers: [] }),

  // Loading and error actions
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}))