import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useTeamStore } from '@/stores/team-store'
import { TeamService } from '@/services/team-service'
import type { CreateTeamData } from '@/services/team-service'

interface CreateTeamModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateTeamData) => void
  isLoading: boolean
}

const CreateTeamModal = ({ isOpen, onClose, onSubmit, isLoading }: CreateTeamModalProps) => {
  const [formData, setFormData] = useState({ name: '', description: '' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleClose = () => {
    setFormData({ name: '', description: '' })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md" role="dialog" aria-labelledby="create-team-title">
        <h2 id="create-team-title" className="text-xl font-semibold mb-4">팀 생성</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="teamName" className="block text-sm font-medium text-gray-700 mb-2">
              팀 이름
            </label>
            <input
              type="text"
              id="teamName"
              name="teamName"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              aria-label="팀 이름"
            />
          </div>
          <div className="mb-6">
            <label htmlFor="teamDescription" className="block text-sm font-medium text-gray-700 mb-2">
              팀 설명
            </label>
            <textarea
              id="teamDescription"
              name="teamDescription"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              aria-label="팀 설명"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              disabled={isLoading}
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={isLoading || !formData.name.trim()}
            >
              {isLoading ? '생성 중...' : '생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface JoinTeamModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (inviteCode: string) => void
  isLoading: boolean
}

const JoinTeamModal = ({ isOpen, onClose, onSubmit, isLoading }: JoinTeamModalProps) => {
  const [inviteCode, setInviteCode] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(inviteCode)
  }

  const handleClose = () => {
    setInviteCode('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md" role="dialog" aria-labelledby="join-team-title">
        <h2 id="join-team-title" className="text-xl font-semibold mb-4">팀 참여</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 mb-2">
              초대 코드
            </label>
            <input
              type="text"
              id="inviteCode"
              name="inviteCode"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="예: DEV001"
              required
              aria-label="초대 코드"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              disabled={isLoading}
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              disabled={isLoading || !inviteCode.trim()}
            >
              {isLoading ? '참여 중...' : '참여'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export const Dashboard = () => {
  const { token } = useAuthStore()
  const { teams, isLoading, error, setTeams, addTeam, setLoading, setError } = useTeamStore()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (token) {
      loadTeams()
    }
  }, [token])

  const loadTeams = async () => {
    if (!token) return

    setLoading(true)
    setError(null)

    try {
      const result = await TeamService.getTeams(token)
      if (result.success && result.data) {
        setTeams(result.data.teams)
      } else {
        setError(result.error || '팀 목록을 불러오는데 실패했습니다.')
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다.')
      console.error('Error loading teams:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTeam = async (data: CreateTeamData) => {
    if (!token) return

    setLoading(true)
    setError(null)

    try {
      const result = await TeamService.createTeam(data, token)
      if (result.success && result.data) {
        addTeam(result.data.team)
        setIsCreateModalOpen(false)
        setSuccessMessage('팀이 생성되었습니다.')
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        setError(result.error || '팀 생성에 실패했습니다.')
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다.')
      console.error('Error creating team:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinTeam = async (inviteCode: string) => {
    if (!token) return

    setLoading(true)
    setError(null)

    try {
      const result = await TeamService.joinTeam(inviteCode, token)
      if (result.success && result.data) {
        addTeam(result.data.team)
        setIsJoinModalOpen(false)
        setSuccessMessage('팀에 참여했습니다.')
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        setError(result.error || '팀 참여에 실패했습니다.')
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다.')
      console.error('Error joining team:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            disabled={isLoading}
          >
            팀 생성
          </button>
          <button
            onClick={() => setIsJoinModalOpen(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            disabled={isLoading}
          >
            팀 참여
          </button>
        </div>
      </div>

      {/* 성공 메시지 */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
          {successMessage}
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">내 팀</h2>
          {isLoading ? (
            <p className="text-gray-600">로딩 중...</p>
          ) : teams.length > 0 ? (
            <div className="space-y-2">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="p-3 bg-gray-50 rounded-md hover:bg-gray-100 cursor-pointer"
                  onClick={() => {/* TODO: 팀 상세 페이지로 이동 */}}
                >
                  <h3 className="font-medium">{team.name}</h3>
                  <p className="text-sm text-gray-600">{team.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">가입한 팀이 없습니다.</p>
          )}
        </div>
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">오늘 일정</h2>
          <p className="text-gray-600">오늘 예정된 일정을 확인하세요.</p>
        </div>
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">최근 메시지</h2>
          <p className="text-gray-600">팀 채팅의 최근 메시지를 확인하세요.</p>
        </div>
      </div>

      {/* 모달들 */}
      <CreateTeamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTeam}
        isLoading={isLoading}
      />

      <JoinTeamModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onSubmit={handleJoinTeam}
        isLoading={isLoading}
      />
    </div>
  )
}
