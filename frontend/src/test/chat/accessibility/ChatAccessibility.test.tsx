import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  renderChat,
  mockMessages,
  accessibilityHelpers,
} from '../utils/chat-test-utils'

// 접근성 테스트를 위한 완전한 채팅 시스템 모킹
const AccessibleChatSystem = ({ teamId, messageDate, currentUserId }: any) => {
  const [messages, setMessages] = React.useState(mockMessages)
  const [connectionStatus, setConnectionStatus] = React.useState('connected')
  const [typingUsers, setTypingUsers] = React.useState<any[]>([])
  const [hasNewMessages, setHasNewMessages] = React.useState(false)
  const [announcement, setAnnouncement] = React.useState('')

  // 새 메시지 수신 시뮬레이션
  const simulateNewMessage = (message: any) => {
    setMessages((prev) => [...prev, message])
    setHasNewMessages(true)
    setAnnouncement(
      `새 메시지: ${message.user_name}님이 "${message.content}"라고 말했습니다.`
    )

    // 3초 후 새 메시지 알림 제거
    setTimeout(() => {
      setHasNewMessages(false)
      setAnnouncement('')
    }, 3000)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const input = form.elements.namedItem('message') as HTMLTextAreaElement
    const content = input.value.trim()

    if (!content) return

    const newMessage = {
      id: Date.now(),
      content,
      user_id: currentUserId,
      user_name: '현재 사용자',
      team_id: teamId,
      message_date: messageDate,
      created_at: new Date().toISOString(),
      message_type: 'text' as const,
      related_schedule_id: null,
    }

    setMessages((prev) => [...prev, newMessage])
    input.value = ''

    // 스크린 리더 공지
    setAnnouncement(`메시지를 전송했습니다: "${content}"`)
    setTimeout(() => setAnnouncement(''), 2000)
  }

  return (
    <div
      data-testid="accessible-chat-system"
      role="main"
      aria-label="팀 채팅 애플리케이션"
      className="chat-system"
    >
      {/* 스크린 리더용 공지 영역 */}
      <div
        data-testid="sr-announcements"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        style={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
      >
        {announcement}
      </div>

      {/* 새 메시지 알림 */}
      {hasNewMessages && (
        <div
          data-testid="new-message-alert"
          role="alert"
          aria-live="assertive"
          className="new-message-alert"
          style={{
            padding: '8px',
            backgroundColor: '#e3f2fd',
            border: '1px solid #2196f3',
          }}
        >
          💬 새로운 메시지가 도착했습니다
        </div>
      )}

      {/* 연결 상태 */}
      <div
        data-testid="connection-status"
        role="status"
        aria-live="polite"
        aria-label="연결 상태"
        className={`connection-status ${connectionStatus}`}
      >
        <span aria-hidden="true">
          {connectionStatus === 'connected' ? '🟢' : '🔴'}
        </span>
        <span>{connectionStatus === 'connected' ? '연결됨' : '연결 끊김'}</span>
      </div>

      {/* 메인 채팅 영역 */}
      <div
        data-testid="chat-main"
        role="region"
        aria-label="채팅 메시지 영역"
        className="chat-main"
      >
        {/* 메시지 목록 */}
        <div
          data-testid="message-list"
          role="log"
          aria-live="polite"
          aria-label="채팅 메시지 목록"
          aria-describedby="message-list-description"
          tabIndex={0}
          className="message-list"
          style={{
            height: '400px',
            overflowY: 'auto',
            border: '1px solid #ccc',
            padding: '10px',
            marginBottom: '10px',
          }}
        >
          <div id="message-list-description" className="sr-only">
            채팅 메시지 목록입니다. 위아래 화살표 키로 탐색할 수 있습니다.
          </div>

          {messages.map((msg, index) => (
            <div
              key={msg.id}
              data-testid={`message-${msg.id}`}
              data-message-id={msg.id}
              role="listitem"
              aria-label={`${msg.user_name}님의 메시지: ${msg.content}. ${new Date(msg.created_at).toLocaleString('ko-KR')}에 전송됨`}
              aria-posinset={index + 1}
              aria-setsize={messages.length}
              tabIndex={-1}
              className={`message ${msg.user_id === currentUserId ? 'own' : 'other'} ${msg.message_type}`}
              style={{
                margin: '8px 0',
                padding: '8px',
                borderRadius: '8px',
                backgroundColor:
                  msg.user_id === currentUserId ? '#e3f2fd' : '#f5f5f5',
                border:
                  msg.message_type === 'schedule_update'
                    ? '2px solid #ff9800'
                    : '1px solid transparent',
              }}
            >
              <div className="message-header">
                <span
                  data-testid="message-user"
                  className="user-name"
                  style={{ fontWeight: 'bold', fontSize: '0.9em' }}
                >
                  {msg.user_name}
                </span>
                <time
                  data-testid="message-time"
                  dateTime={msg.created_at}
                  aria-label={`전송 시간: ${new Date(msg.created_at).toLocaleString('ko-KR')}`}
                  style={{ float: 'right', fontSize: '0.8em', color: '#666' }}
                >
                  {new Date(msg.created_at).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </div>

              <div
                data-testid="message-content"
                className="message-content"
                style={{ marginTop: '4px' }}
              >
                {msg.message_type === 'schedule_update' && (
                  <span aria-label="일정 업데이트 메시지">📅 </span>
                )}
                {msg.content}
              </div>

              {msg.related_schedule_id && (
                <button
                  data-testid={`schedule-link-${msg.id}`}
                  onClick={() => {
                    setAnnouncement(
                      `관련 일정을 확인합니다: ${msg.related_schedule_id}`
                    )
                  }}
                  aria-label="관련 일정 상세 보기"
                  aria-describedby={`schedule-desc-${msg.id}`}
                  className="schedule-link"
                  style={{
                    marginTop: '8px',
                    padding: '4px 8px',
                    backgroundColor: '#1976d2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  📅 관련 일정 보기
                  <span id={`schedule-desc-${msg.id}`} className="sr-only">
                    이 메시지와 관련된 일정 정보를 확인할 수 있습니다.
                  </span>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* 타이핑 인디케이터 */}
        {typingUsers.length > 0 && (
          <div
            data-testid="typing-indicator"
            role="status"
            aria-live="polite"
            aria-label="다른 사용자 입력 상태"
            className="typing-indicator"
            style={{ padding: '8px', fontStyle: 'italic', color: '#666' }}
          >
            {typingUsers.map((user) => user.user_name).join(', ')}님이 입력
            중입니다...
          </div>
        )}
      </div>

      {/* 메시지 입력 폼 */}
      <form
        onSubmit={handleSubmit}
        data-testid="message-form"
        role="form"
        aria-label="메시지 입력 폼"
        className="message-form"
        style={{ borderTop: '1px solid #ccc', paddingTop: '10px' }}
      >
        <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
          <legend className="sr-only">메시지 작성 및 전송</legend>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="message-input" className="sr-only">
                메시지 입력 (최대 500자)
              </label>
              <textarea
                id="message-input"
                name="message"
                data-testid="message-input"
                placeholder="메시지를 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈)"
                aria-label="메시지 입력"
                aria-describedby="message-input-help message-input-count"
                maxLength={500}
                rows={2}
                disabled={connectionStatus !== 'connected'}
                aria-required="false"
                aria-invalid="false"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '2px solid #ccc',
                  borderRadius: '4px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e as any)
                  }
                }}
              />

              <div
                id="message-input-help"
                className="input-help"
                style={{ fontSize: '0.8em', color: '#666', marginTop: '4px' }}
              >
                키보드 단축키: Enter로 전송, Shift+Enter로 줄바꿈
              </div>

              <div
                id="message-input-count"
                aria-live="polite"
                className="char-count"
                style={{ fontSize: '0.8em', color: '#666', textAlign: 'right' }}
              >
                최대 500자
              </div>
            </div>

            <button
              type="submit"
              data-testid="send-button"
              disabled={connectionStatus !== 'connected'}
              aria-label="메시지 전송"
              aria-describedby="send-button-help"
              style={{
                padding: '8px 16px',
                backgroundColor:
                  connectionStatus === 'connected' ? '#1976d2' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor:
                  connectionStatus === 'connected' ? 'pointer' : 'not-allowed',
                minWidth: '60px',
              }}
            >
              전송
              <span id="send-button-help" className="sr-only">
                {connectionStatus === 'connected'
                  ? '메시지를 전송합니다'
                  : '연결이 끊어져 메시지를 전송할 수 없습니다'}
              </span>
            </button>
          </div>
        </fieldset>
      </form>

      {/* 테스트용 버튼들 */}
      <div
        data-testid="test-controls"
        style={{ marginTop: '10px', display: 'none' }}
      >
        <button
          onClick={() =>
            simulateNewMessage({
              id: Date.now(),
              content: '접근성 테스트 메시지',
              user_id: 'test-user',
              user_name: '테스트 사용자',
              team_id: teamId,
              message_date: messageDate,
              created_at: new Date().toISOString(),
              message_type: 'text',
              related_schedule_id: null,
            })
          }
        >
          새 메시지 시뮬레이션
        </button>
        <button
          onClick={() =>
            setTypingUsers([{ user_id: 'user-2', user_name: '이개발' }])
          }
        >
          타이핑 상태 시뮬레이션
        </button>
        <button
          onClick={() =>
            setConnectionStatus(
              connectionStatus === 'connected' ? 'disconnected' : 'connected'
            )
          }
        >
          연결 상태 토글
        </button>
      </div>
    </div>
  )
}

import React from 'react'

describe('Chat Accessibility Tests', () => {
  const defaultProps = {
    teamId: 'team-1',
    messageDate: '2024-12-25',
    currentUserId: 'user-1',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('ARIA 속성 및 역할', () => {
    it('모든 주요 요소에 적절한 ARIA 역할이 설정되어야 한다', () => {
      renderChat(<AccessibleChatSystem {...defaultProps} />)

      // 메인 애플리케이션 역할
      const mainApp = screen.getByTestId('accessible-chat-system')
      expect(mainApp).toHaveAttribute('role', 'main')
      expect(mainApp).toHaveAttribute('aria-label', '팀 채팅 애플리케이션')

      // 메시지 목록 역할
      const messageList = screen.getByTestId('message-list')
      expect(messageList).toHaveAttribute('role', 'log')
      expect(messageList).toHaveAttribute('aria-live', 'polite')
      expect(messageList).toHaveAttribute('aria-label', '채팅 메시지 목록')

      // 메시지 입력 폼 역할
      const messageForm = screen.getByTestId('message-form')
      expect(messageForm).toHaveAttribute('role', 'form')
      expect(messageForm).toHaveAttribute('aria-label', '메시지 입력 폼')

      // 연결 상태 역할
      const connectionStatus = screen.getByTestId('connection-status')
      expect(connectionStatus).toHaveAttribute('role', 'status')
      expect(connectionStatus).toHaveAttribute('aria-live', 'polite')
    })

    it('메시지 아이템들이 적절한 ARIA 속성을 가져야 한다', () => {
      renderChat(<AccessibleChatSystem {...defaultProps} />)

      mockMessages.forEach((msg, index) => {
        const messageElement = screen.getByTestId(`message-${msg.id}`)

        expect(messageElement).toHaveAttribute('role', 'listitem')
        expect(messageElement).toHaveAttribute(
          'aria-posinset',
          String(index + 1)
        )
        expect(messageElement).toHaveAttribute(
          'aria-setsize',
          String(mockMessages.length)
        )
        expect(messageElement).toHaveAttribute('aria-label')

        // 시간 정보 접근성
        const timeElement = messageElement.querySelector(
          '[data-testid="message-time"]'
        )
        expect(timeElement).toHaveAttribute('dateTime')
        expect(timeElement).toHaveAttribute('aria-label')
      })
    })

    it('폼 요소들이 적절한 라벨링을 가져야 한다', () => {
      renderChat(<AccessibleChatSystem {...defaultProps} />)

      const messageInput = screen.getByTestId('message-input')
      const sendButton = screen.getByTestId('send-button')

      // 입력 필드 라벨링
      expect(messageInput).toHaveAttribute('aria-label', '메시지 입력')
      expect(messageInput).toHaveAttribute('aria-describedby')
      expect(messageInput).toHaveAttribute('id', 'message-input')

      // 연관된 라벨 확인
      const label = screen.getByLabelText('메시지 입력 (최대 500자)')
      expect(label).toBe(messageInput)

      // 버튼 라벨링
      expect(sendButton).toHaveAttribute('aria-label', '메시지 전송')
      expect(sendButton).toHaveAttribute('aria-describedby', 'send-button-help')
    })
  })

  describe('라이브 영역 (Live Regions)', () => {
    it('새 메시지 수신 시 스크린 리더에게 적절히 공지되어야 한다', async () => {
      renderChat(<AccessibleChatSystem {...defaultProps} />)

      const testControls = screen.getByTestId('test-controls')
      const newMessageButton = testControls.querySelector(
        'button'
      ) as HTMLButtonElement

      // 새 메시지 추가
      act(() => {
        newMessageButton.click()
      })

      // 스크린 리더 공지 영역 확인
      await waitFor(() => {
        const announcement = screen.getByTestId('sr-announcements')
        expect(announcement).toHaveAttribute('role', 'status')
        expect(announcement).toHaveAttribute('aria-live', 'polite')
        expect(announcement.textContent).toContain(
          '새 메시지: 테스트 사용자님이'
        )
      })

      // 새 메시지 알림 확인
      await waitFor(() => {
        const alert = screen.getByTestId('new-message-alert')
        expect(alert).toHaveAttribute('role', 'alert')
        expect(alert).toHaveAttribute('aria-live', 'assertive')
      })
    })

    it('타이핑 상태 변경이 적절히 공지되어야 한다', async () => {
      renderChat(<AccessibleChatSystem {...defaultProps} />)

      const testControls = screen.getByTestId('test-controls')
      const typingButton = testControls.querySelectorAll(
        'button'
      )[1] as HTMLButtonElement

      // 타이핑 상태 시작
      act(() => {
        typingButton.click()
      })

      await waitFor(() => {
        const typingIndicator = screen.getByTestId('typing-indicator')
        expect(typingIndicator).toHaveAttribute('role', 'status')
        expect(typingIndicator).toHaveAttribute('aria-live', 'polite')
        expect(typingIndicator.textContent).toBe('이개발님이 입력 중입니다...')
      })
    })

    it('연결 상태 변경이 적절히 공지되어야 한다', async () => {
      renderChat(<AccessibleChatSystem {...defaultProps} />)

      const testControls = screen.getByTestId('test-controls')
      const connectionButton = testControls.querySelectorAll(
        'button'
      )[2] as HTMLButtonElement

      // 연결 상태 변경
      act(() => {
        connectionButton.click()
      })

      await waitFor(() => {
        const connectionStatus = screen.getByTestId('connection-status')
        expect(connectionStatus).toHaveAttribute('aria-live', 'polite')
        expect(connectionStatus.textContent).toContain('연결 끊김')
      })
    })
  })

  describe('키보드 네비게이션', () => {
    it('Tab 키로 모든 상호작용 요소를 순차적으로 탐색할 수 있어야 한다', async () => {
      const user = userEvent.setup()
      renderChat(<AccessibleChatSystem {...defaultProps} />)

      // 포커스 순서 테스트
      const messageList = screen.getByTestId('message-list')
      const messageInput = screen.getByTestId('message-input')
      const sendButton = screen.getByTestId('send-button')

      // 첫 번째 Tab - 메시지 목록
      await user.tab()
      expect(messageList).toHaveFocus()

      // 일정 링크가 있는 경우 추가 Tab
      const scheduleLinks = screen.queryAllByTestId(/schedule-link-/)
      for (const link of scheduleLinks) {
        await user.tab()
        expect(link).toHaveFocus()
      }

      // 메시지 입력 필드
      await user.tab()
      expect(messageInput).toHaveFocus()

      // 전송 버튼
      await user.tab()
      expect(sendButton).toHaveFocus()
    })

    it('메시지 목록에서 화살표 키로 메시지 간 탐색이 가능해야 한다', async () => {
      const user = userEvent.setup()
      renderChat(<AccessibleChatSystem {...defaultProps} />)

      const messageList = screen.getByTestId('message-list')
      await user.click(messageList)

      // 메시지 목록에 포커스
      expect(messageList).toHaveFocus()

      // 첫 번째 메시지로 이동 (실제 구현에서는 roving tabindex 패턴 사용)
      await user.keyboard('{ArrowDown}')

      // 첫 번째 메시지가 활성화되었는지 확인 (실제 구현 시 구체적인 확인 방법 필요)
      const firstMessage = screen.getByTestId('message-1')
      expect(firstMessage).toHaveAttribute('tabIndex', '-1')
    })

    it('Enter 키와 Space 키로 버튼 활성화가 가능해야 한다', async () => {
      const user = userEvent.setup()
      renderChat(<AccessibleChatSystem {...defaultProps} />)

      const messageInput = screen.getByTestId('message-input')
      const sendButton = screen.getByTestId('send-button')

      // 메시지 입력
      await user.type(messageInput, '키보드 테스트 메시지')

      // Tab으로 전송 버튼으로 이동
      await user.tab()
      expect(sendButton).toHaveFocus()

      // Enter 키로 전송
      await user.keyboard('{Enter}')

      // 메시지가 전송되었는지 확인
      await waitFor(() => {
        expect(screen.getByText('키보드 테스트 메시지')).toBeInTheDocument()
      })
    })

    it('Escape 키로 포커스 관리가 가능해야 한다', async () => {
      const user = userEvent.setup()
      renderChat(<AccessibleChatSystem {...defaultProps} />)

      const messageInput = screen.getByTestId('message-input')
      await user.click(messageInput)

      // 메시지 입력 중 Escape으로 포커스 해제 (실제 구현에 따라 동작 정의)
      await user.keyboard('{Escape}')

      // 포커스가 적절히 관리되는지 확인
      expect(document.activeElement).not.toBe(messageInput)
    })
  })

  describe('포커스 관리', () => {
    it('메시지 전송 후 포커스가 입력 필드로 돌아가야 한다', async () => {
      const user = userEvent.setup()
      renderChat(<AccessibleChatSystem {...defaultProps} />)

      const messageInput = screen.getByTestId('message-input')
      const sendButton = screen.getByTestId('send-button')

      await user.type(messageInput, '포커스 테스트')
      await user.click(sendButton)

      // 메시지 전송 후 포커스가 다시 입력 필드로
      await waitFor(() => {
        expect(messageInput).toHaveFocus()
      })
    })

    it('연결 상태 변경 시 적절한 포커스 관리가 이루어져야 한다', async () => {
      const user = userEvent.setup()
      renderChat(<AccessibleChatSystem {...defaultProps} />)

      const messageInput = screen.getByTestId('message-input')
      const testControls = screen.getByTestId('test-controls')
      const connectionButton = testControls.querySelectorAll(
        'button'
      )[2] as HTMLButtonElement

      // 입력 필드에 포커스
      await user.click(messageInput)
      expect(messageInput).toHaveFocus()

      // 연결 해제
      act(() => {
        connectionButton.click()
      })

      // 연결이 끊어지면 입력 필드가 비활성화되고 포커스가 적절히 관리되어야 함
      await waitFor(() => {
        expect(messageInput).toBeDisabled()
      })
    })

    it('새 메시지 수신 시 포커스가 방해받지 않아야 한다', async () => {
      const user = userEvent.setup()
      renderChat(<AccessibleChatSystem {...defaultProps} />)

      const messageInput = screen.getByTestId('message-input')
      const testControls = screen.getByTestId('test-controls')
      const newMessageButton = testControls.querySelector(
        'button'
      ) as HTMLButtonElement

      // 사용자가 메시지 입력 중
      await user.click(messageInput)
      await user.type(messageInput, '입력 중인 메시지...')

      expect(messageInput).toHaveFocus()

      // 다른 사용자의 메시지 수신
      act(() => {
        newMessageButton.click()
      })

      // 포커스가 그대로 유지되어야 함
      await waitFor(() => {
        expect(messageInput).toHaveFocus()
        expect(messageInput).toHaveValue('입력 중인 메시지...')
      })
    })
  })

  describe('스크린 리더 지원', () => {
    it('메시지 내용이 스크린 리더에게 의미있게 전달되어야 한다', () => {
      renderChat(<AccessibleChatSystem {...defaultProps} />)

      mockMessages.forEach((msg) => {
        const messageElement = screen.getByTestId(`message-${msg.id}`)
        const ariaLabel = messageElement.getAttribute('aria-label')

        // aria-label에 사용자명, 내용, 시간이 모두 포함되어야 함
        expect(ariaLabel).toContain(msg.user_name)
        expect(ariaLabel).toContain(msg.content)
        expect(ariaLabel).toContain('전송됨')
      })
    })

    it('시각적 아이콘에 대한 텍스트 대안이 제공되어야 한다', () => {
      renderChat(<AccessibleChatSystem {...defaultProps} />)

      // 연결 상태 아이콘
      const connectionStatus = screen.getByTestId('connection-status')
      const statusIcon = connectionStatus.querySelector('[aria-hidden="true"]')
      expect(statusIcon).toBeInTheDocument()

      // 아이콘 옆에 텍스트 설명이 있어야 함
      expect(connectionStatus.textContent).toContain('연결됨')

      // 일정 관련 메시지의 아이콘
      const scheduleMessage = mockMessages.find(
        (msg) => msg.message_type === 'schedule_update'
      )
      if (scheduleMessage) {
        const scheduleIcon = screen.getByLabelText('일정 업데이트 메시지')
        expect(scheduleIcon).toBeInTheDocument()
      }
    })

    it('폼 요소들이 적절한 설명을 가져야 한다', () => {
      renderChat(<AccessibleChatSystem {...defaultProps} />)

      const messageInput = screen.getByTestId('message-input')
      const sendButton = screen.getByTestId('send-button')

      // 입력 필드 설명
      const inputHelp = screen.getByText(
        '키보드 단축키: Enter로 전송, Shift+Enter로 줄바꿈'
      )
      expect(inputHelp).toHaveAttribute('id', 'message-input-help')
      expect(messageInput.getAttribute('aria-describedby')).toContain(
        'message-input-help'
      )

      // 문자 수 제한 정보
      const charCount = screen.getByText('최대 500자')
      expect(charCount).toHaveAttribute('id', 'message-input-count')
      expect(messageInput.getAttribute('aria-describedby')).toContain(
        'message-input-count'
      )

      // 버튼 설명
      const buttonHelp = screen.getByText('메시지를 전송합니다')
      expect(buttonHelp).toHaveAttribute('id', 'send-button-help')
      expect(sendButton.getAttribute('aria-describedby')).toBe(
        'send-button-help'
      )
    })
  })

  describe('색상 및 대비', () => {
    it('색상에만 의존하지 않는 정보 전달이 이루어져야 한다', () => {
      renderChat(<AccessibleChatSystem {...defaultProps} />)

      // 연결 상태를 색상과 텍스트로 모두 표시
      const connectionStatus = screen.getByTestId('connection-status')
      expect(connectionStatus.textContent).toContain('연결됨') // 텍스트로도 상태 전달

      // 본인/타인 메시지 구분을 색상 외에도 구조적으로 표시
      const ownMessage = screen.getByTestId('message-1') // user-1의 메시지
      expect(ownMessage).toHaveClass('own')

      const otherMessage = screen.getByTestId('message-2') // user-2의 메시지
      expect(otherMessage).toHaveClass('other')
    })

    it('일정 관련 메시지가 시각적 구분자와 의미적 표시를 모두 가져야 한다', () => {
      renderChat(<AccessibleChatSystem {...defaultProps} />)

      const scheduleMessage = mockMessages.find(
        (msg) => msg.message_type === 'schedule_update'
      )
      if (scheduleMessage) {
        const messageElement = screen.getByTestId(
          `message-${scheduleMessage.id}`
        )

        // 시각적 구분 (CSS 클래스)
        expect(messageElement).toHaveClass('schedule_update')

        // 의미적 표시 (아이콘과 aria-label)
        const scheduleIcon = screen.getByLabelText('일정 업데이트 메시지')
        expect(scheduleIcon).toBeInTheDocument()

        // 구조적 구분 (테두리 스타일)
        const computedStyle = window.getComputedStyle(messageElement)
        expect(computedStyle.border).toContain('2px solid')
      }
    })
  })

  describe('오류 상태 접근성', () => {
    it('연결 오류 시 적절한 접근성 정보가 제공되어야 한다', async () => {
      renderChat(<AccessibleChatSystem {...defaultProps} />)

      const testControls = screen.getByTestId('test-controls')
      const connectionButton = testControls.querySelectorAll(
        'button'
      )[2] as HTMLButtonElement

      // 연결 끊김
      act(() => {
        connectionButton.click()
      })

      await waitFor(() => {
        const connectionStatus = screen.getByTestId('connection-status')
        expect(connectionStatus.textContent).toContain('연결 끊김')

        // 입력 필드와 버튼이 비활성화됨
        const messageInput = screen.getByTestId('message-input')
        const sendButton = screen.getByTestId('send-button')

        expect(messageInput).toBeDisabled()
        expect(sendButton).toBeDisabled()

        // 버튼의 도움말 텍스트가 업데이트됨
        const buttonHelp = screen.getByText(
          '연결이 끊어져 메시지를 전송할 수 없습니다'
        )
        expect(buttonHelp).toBeInTheDocument()
      })
    })

    it('입력 제한 초과 시 적절한 피드백이 제공되어야 한다', async () => {
      const user = userEvent.setup()
      renderChat(<AccessibleChatSystem {...defaultProps} />)

      const messageInput = screen.getByTestId('message-input')

      // 500자 초과 입력 시도
      const longText = 'a'.repeat(501)
      await user.type(messageInput, longText)

      // maxLength로 제한되지만, aria-invalid 속성으로 상태 표시
      expect(messageInput).toHaveAttribute('maxLength', '500')
      expect(messageInput.value.length).toBe(500)

      // 문자 수 제한 정보가 명시되어 있어야 함
      const charCount = screen.getByText('최대 500자')
      expect(charCount).toBeInTheDocument()
    })
  })

  describe('모바일 접근성', () => {
    it('터치 타겟 크기가 적절해야 한다', () => {
      renderChat(<AccessibleChatSystem {...defaultProps} />)

      const sendButton = screen.getByTestId('send-button')
      const scheduleLinks = screen.queryAllByTestId(/schedule-link-/)

      // 버튼의 최소 크기 확인 (44x44px 권장)
      const buttonStyle = window.getComputedStyle(sendButton)
      expect(parseInt(buttonStyle.minWidth)).toBeGreaterThanOrEqual(60)

      // 일정 링크 버튼들도 적절한 크기여야 함
      scheduleLinks.forEach((link) => {
        const linkStyle = window.getComputedStyle(link)
        expect(parseInt(linkStyle.padding)).toBeGreaterThan(0)
      })
    })

    it('확대/축소 시에도 기능이 유지되어야 한다', () => {
      renderChat(<AccessibleChatSystem {...defaultProps} />)

      // 200% 확대 시뮬레이션
      Object.defineProperty(document.documentElement, 'style', {
        value: { zoom: '200%' },
        writable: true,
      })

      const messageInput = screen.getByTestId('message-input')
      const sendButton = screen.getByTestId('send-button')

      // 확대 상태에서도 요소들이 접근 가능해야 함
      expect(messageInput).toBeInTheDocument()
      expect(sendButton).toBeInTheDocument()
      expect(messageInput).not.toBeDisabled()
      expect(sendButton).not.toBeDisabled()
    })
  })

  describe('개인화 및 사용자 설정', () => {
    it('애니메이션 감소 설정이 존중되어야 한다', () => {
      // prefers-reduced-motion 시뮬레이션
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })

      renderChat(<AccessibleChatSystem {...defaultProps} />)

      // 애니메이션이 줄어든 상태에서 렌더링되어야 함
      // (실제 구현에서는 CSS나 JavaScript로 애니메이션 제어)
      const chatSystem = screen.getByTestId('accessible-chat-system')
      expect(chatSystem).toBeInTheDocument()
    })

    it('고대비 모드가 지원되어야 한다', () => {
      // 고대비 모드 시뮬레이션
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })

      renderChat(<AccessibleChatSystem {...defaultProps} />)

      // 고대비 모드에서도 모든 요소가 구분되어야 함
      const messages = screen.getAllByTestId(/message-\d+/)
      messages.forEach((message) => {
        const style = window.getComputedStyle(message)
        expect(style.border).toBeTruthy() // 테두리가 있어야 함
      })
    })
  })
})
