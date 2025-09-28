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
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* 헤더 섹션 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: '#1f2937',
          margin: 0
        }}>
          대시보드
        </h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            disabled={isLoading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
          >
            팀 생성
          </button>
          <button
            onClick={() => setIsJoinModalOpen(true)}
            disabled={isLoading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#047857'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#059669'}
          >
            팀 참여
          </button>
        </div>
      </div>

      {/* 성공 메시지 */}
      {successMessage && (
        <div style={{
          marginBottom: '1rem',
          padding: '1rem',
          backgroundColor: '#dcfce7',
          border: '1px solid #22c55e',
          borderRadius: '0.375rem',
          color: '#15803d'
        }}>
          {successMessage}
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div style={{
          marginBottom: '1rem',
          padding: '1rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #ef4444',
          borderRadius: '0.375rem',
          color: '#dc2626'
        }}>
          {error}
        </div>
      )}

      {/* 카드 그리드 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '1.5rem',
        marginTop: '1rem'
      }}>
        {/* 내 팀 카드 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb',
          minHeight: '300px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '1rem',
            gap: '0.5rem'
          }}>
            <span style={{ fontSize: '1.5rem' }}>👥</span>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#1f2937',
              margin: 0
            }}>
              내 팀
            </h2>
          </div>

          {isLoading ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              color: '#6b7280'
            }}>
              로딩 중...
            </div>
          ) : teams.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {teams.map((team) => (
                <div
                  key={team.id}
                  style={{
                    padding: '0.75rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    border: '1px solid #e5e7eb'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#f9fafb'}
                  onClick={() => {/* TODO: 팀 상세 페이지로 이동 */}}
                >
                  <h3 style={{
                    fontWeight: '500',
                    color: '#1f2937',
                    margin: '0 0 0.25rem 0'
                  }}>
                    {team.name}
                  </h3>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    margin: 0
                  }}>
                    {team.description}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              color: '#6b7280',
              textAlign: 'center'
            }}>
              <p style={{ margin: '0 0 1rem 0' }}>가입한 팀이 없습니다.</p>
              <p style={{ fontSize: '0.875rem', margin: 0 }}>
                팀을 생성하거나 초대 코드로 참여해보세요.
              </p>
            </div>
          )}
        </div>

        {/* 오늘 일정 카드 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb',
          minHeight: '300px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '1rem',
            gap: '0.5rem'
          }}>
            <span style={{ fontSize: '1.5rem' }}>📅</span>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#1f2937',
              margin: 0
            }}>
              오늘 일정
            </h2>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            color: '#6b7280',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 0.5rem 0' }}>오늘 예정된 일정을 확인하세요.</p>
            <p style={{ fontSize: '0.875rem', margin: 0 }}>
              팀에 참여하면 일정을 관리할 수 있습니다.
            </p>
          </div>
        </div>

        {/* 최근 메시지 카드 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb',
          minHeight: '300px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '1rem',
            gap: '0.5rem'
          }}>
            <span style={{ fontSize: '1.5rem' }}>💬</span>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#1f2937',
              margin: 0
            }}>
              최근 메시지
            </h2>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            color: '#6b7280',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 0.5rem 0' }}>팀 채팅의 최근 메시지를 확인하세요.</p>
            <p style={{ fontSize: '0.875rem', margin: 0 }}>
              팀에 참여하면 실시간 소통이 가능합니다.
            </p>
          </div>
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
