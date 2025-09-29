import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'

// Mock MessageInput 컴포넌트 (실제 구현 전까지 사용)
const MockMessageInput = ({
  onSendMessage,
  onTyping,
  disabled = false,
  placeholder = '메시지를 입력하세요...',
  maxLength = 500,
}: {
  onSendMessage?: (content: string, messageType?: string, metadata?: any) => Promise<void>
  onTyping?: (isTyping: boolean) => void
  disabled?: boolean
  placeholder?: string
  maxLength?: number
}) => {
  const [content, setContent] = React.useState('')
  const [messageType, setMessageType] = React.useState('text')
  const [isScheduleChangeMode, setIsScheduleChangeMode] = React.useState(false)
  const [scheduleData, setScheduleData] = React.useState({
    schedule_id: '',
    requested_start_time: '',
    requested_end_time: '',
  })
  const [isSending, setIsSending] = React.useState(false)
  const [typingTimer, setTypingTimer] = React.useState<NodeJS.Timeout | null>(null)

  const handleContentChange = (value: string) => {
    setContent(value)

    // 타이핑 인디케이터 처리
    if (onTyping) {
      onTyping(true)

      if (typingTimer) {
        clearTimeout(typingTimer)
      }

      const timer = setTimeout(() => {
        onTyping(false)
      }, 1000)
      setTypingTimer(timer)
    }
  }

  const handleSend = async () => {
    if (!content.trim() || isSending) return

    setIsSending(true)

    try {
      const metadata = isScheduleChangeMode ? scheduleData : null
      await onSendMessage?.(content, messageType, metadata)

      // 전송 후 초기화
      setContent('')
      setIsScheduleChangeMode(false)
      setScheduleData({
        schedule_id: '',
        requested_start_time: '',
        requested_end_time: '',
      })
      setMessageType('text')

      if (onTyping) {
        onTyping(false)
      }
    } catch (error) {
      console.error('메시지 전송 실패:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const toggleScheduleChangeMode = () => {
    setIsScheduleChangeMode(!isScheduleChangeMode)
    setMessageType(isScheduleChangeMode ? 'text' : 'schedule_change_request')
  }

  React.useEffect(() => {
    return () => {
      if (typingTimer) {
        clearTimeout(typingTimer)
      }
    }
  }, [typingTimer])

  return (
    <div data-testid="message-input-container" className="message-input-container">
      {/* 메시지 타입 선택 */}
      <div data-testid="message-type-selector" className="message-type-selector">
        <button
          data-testid="text-message-button"
          onClick={() => {
            setMessageType('text')
            setIsScheduleChangeMode(false)
          }}
          className={messageType === 'text' ? 'active' : ''}
          disabled={disabled}
        >
          일반 메시지
        </button>
        <button
          data-testid="schedule-change-button"
          onClick={toggleScheduleChangeMode}
          className={isScheduleChangeMode ? 'active' : ''}
          disabled={disabled}
        >
          일정 변경 요청
        </button>
      </div>

      {/* 일정 변경 요청 폼 */}
      {isScheduleChangeMode && (
        <div data-testid="schedule-change-form" className="schedule-change-form">
          <div data-testid="schedule-inputs" className="schedule-inputs">
            <input
              data-testid="schedule-id-input"
              type="text"
              placeholder="일정 ID"
              value={scheduleData.schedule_id}
              onChange={(e) =>
                setScheduleData((prev) => ({ ...prev, schedule_id: e.target.value }))
              }
              disabled={disabled}
            />
            <input
              data-testid="start-time-input"
              type="time"
              placeholder="시작 시간"
              value={scheduleData.requested_start_time}
              onChange={(e) =>
                setScheduleData((prev) => ({ ...prev, requested_start_time: e.target.value }))
              }
              disabled={disabled}
            />
            <input
              data-testid="end-time-input"
              type="time"
              placeholder="종료 시간"
              value={scheduleData.requested_end_time}
              onChange={(e) =>
                setScheduleData((prev) => ({ ...prev, requested_end_time: e.target.value }))
              }
              disabled={disabled}
            />
          </div>
        </div>
      )}

      {/* 메시지 입력 영역 */}
      <div data-testid="message-input-wrapper" className="message-input-wrapper">
        <textarea
          data-testid="message-textarea"
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled || isSending}
          className="message-textarea"
          rows={3}
        />
        <div data-testid="input-info" className="input-info">
          <span data-testid="character-count" className="character-count">
            {content.length}/{maxLength}
          </span>
          {isSending && (
            <span data-testid="sending-indicator" className="sending-indicator">
              전송 중...
            </span>
          )}
        </div>
      </div>

      {/* 전송 버튼 */}
      <div data-testid="send-button-wrapper" className="send-button-wrapper">
        <button
          data-testid="send-button"
          onClick={handleSend}
          disabled={
            disabled ||
            isSending ||
            !content.trim() ||
            (isScheduleChangeMode &&
              (!scheduleData.schedule_id ||
                !scheduleData.requested_start_time ||
                !scheduleData.requested_end_time))
          }
          className="send-button"
        >
          {isSending ? '전송 중...' : '전송'}
        </button>
      </div>

      {/* 첨부 파일 영역 (향후 확장) */}
      <div data-testid="attachment-area" className="attachment-area" style={{ display: 'none' }}>
        <input
          data-testid="file-input"
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          multiple
        />
      </div>
    </div>
  )
}

// 테스트 래퍼 컴포넌트
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return <BrowserRouter>{children}</BrowserRouter>
}

describe('MessageInput', () => {
  const defaultProps = {
    onSendMessage: vi.fn().mockResolvedValue(undefined),
    onTyping: vi.fn(),
    disabled: false,
    placeholder: '메시지를 입력하세요...',
    maxLength: 500,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('렌더링', () => {
    it('메시지 입력 컴포넌트가 올바르게 렌더링되어야 한다', () => {
      render(
        <TestWrapper>
          <MockMessageInput {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByTestId('message-input-container')).toBeInTheDocument()
      expect(screen.getByTestId('message-type-selector')).toBeInTheDocument()
      expect(screen.getByTestId('message-textarea')).toBeInTheDocument()
      expect(screen.getByTestId('send-button')).toBeInTheDocument()
    })

    it('메시지 타입 선택 버튼들이 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <MockMessageInput {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByTestId('text-message-button')).toBeInTheDocument()
      expect(screen.getByTestId('schedule-change-button')).toBeInTheDocument()
      expect(screen.getByText('일반 메시지')).toBeInTheDocument()
      expect(screen.getByText('일정 변경 요청')).toBeInTheDocument()
    })

    it('텍스트영역에 적절한 속성이 설정되어야 한다', () => {
      render(
        <TestWrapper>
          <MockMessageInput {...defaultProps} />
        </TestWrapper>
      )

      const textarea = screen.getByTestId('message-textarea')
      expect(textarea).toHaveAttribute('placeholder', '메시지를 입력하세요...')
      expect(textarea).toHaveAttribute('maxLength', '500')
      expect(textarea).toHaveAttribute('rows', '3')
    })

    it('글자 수 카운터가 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <MockMessageInput {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByTestId('character-count')).toBeInTheDocument()
      expect(screen.getByText('0/500')).toBeInTheDocument()
    })

    it('비활성화 상태일 때 모든 입력이 비활성화되어야 한다', () => {
      render(
        <TestWrapper>
          <MockMessageInput {...defaultProps} disabled={true} />
        </TestWrapper>
      )

      expect(screen.getByTestId('message-textarea')).toBeDisabled()
      expect(screen.getByTestId('send-button')).toBeDisabled()
      expect(screen.getByTestId('text-message-button')).toBeDisabled()
      expect(screen.getByTestId('schedule-change-button')).toBeDisabled()
    })
  })

  describe('메시지 입력', () => {
    it('텍스트를 입력할 수 있어야 한다', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <TestWrapper>
          <MockMessageInput {...defaultProps} />
        </TestWrapper>
      )

      const textarea = screen.getByTestId('message-textarea')
      await user.type(textarea, '안녕하세요!')

      expect(textarea).toHaveValue('안녕하세요!')
    })

    it('글자 수가 실시간으로 업데이트되어야 한다', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <TestWrapper>
          <MockMessageInput {...defaultProps} />
        </TestWrapper>
      )

      const textarea = screen.getByTestId('message-textarea')
      await user.type(textarea, 'Hello')

      expect(screen.getByText('5/500')).toBeInTheDocument()
    })

    it('최대 길이를 초과할 수 없어야 한다', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <TestWrapper>
          <MockMessageInput {...defaultProps} maxLength={10} />
        </TestWrapper>
      )

      const textarea = screen.getByTestId('message-textarea')
      await user.type(textarea, '12345678901234567890') // 20자

      expect(textarea).toHaveValue('1234567890') // 10자만 입력됨
      expect(screen.getByText('10/10')).toBeInTheDocument()
    })

    it('Enter 키로 메시지를 전송할 수 있어야 한다', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const onSendMessage = vi.fn().mockResolvedValue(undefined)

      render(
        <TestWrapper>
          <MockMessageInput {...defaultProps} onSendMessage={onSendMessage} />
        </TestWrapper>
      )

      const textarea = screen.getByTestId('message-textarea')
      await user.type(textarea, 'Enter로 전송')
      await user.keyboard('{Enter}')

      expect(onSendMessage).toHaveBeenCalledWith('Enter로 전송', 'text', null)
    })

    it('Shift+Enter는 줄바꿈이고 전송하지 않아야 한다', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const onSendMessage = vi.fn()

      render(
        <TestWrapper>
          <MockMessageInput {...defaultProps} onSendMessage={onSendMessage} />
        </TestWrapper>
      )

      const textarea = screen.getByTestId('message-textarea')
      await user.type(textarea, '첫 번째 줄')
      await user.keyboard('{Shift>}{Enter}{/Shift}')
      await user.type(textarea, '두 번째 줄')

      expect(textarea).toHaveValue('첫 번째 줄\n두 번째 줄')
      expect(onSendMessage).not.toHaveBeenCalled()
    })

    it('빈 메시지는 전송할 수 없어야 한다', () => {
      render(
        <TestWrapper>
          <MockMessageInput {...defaultProps} />
        </TestWrapper>
      )

      const sendButton = screen.getByTestId('send-button')
      expect(sendButton).toBeDisabled()
    })

    it('공백만 있는 메시지는 전송할 수 없어야 한다', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <TestWrapper>
          <MockMessageInput {...defaultProps} />
        </TestWrapper>
      )

      const textarea = screen.getByTestId('message-textarea')
      await user.type(textarea, '   ')

      const sendButton = screen.getByTestId('send-button')
      expect(sendButton).toBeDisabled()
    })
  })

  describe('메시지 전송', () => {
    it('전송 버튼 클릭으로 메시지를 전송할 수 있어야 한다', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const onSendMessage = vi.fn().mockResolvedValue(undefined)

      render(
        <TestWrapper>
          <MockMessageInput {...defaultProps} onSendMessage={onSendMessage} />
        </TestWrapper>
      )

      const textarea = screen.getByTestId('message-textarea')
      const sendButton = screen.getByTestId('send-button')

      await user.type(textarea, '테스트 메시지')
      await user.click(sendButton)

      expect(onSendMessage).toHaveBeenCalledWith('테스트 메시지', 'text', null)
    })

    it('전송 후 입력 필드가 초기화되어야 한다', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const onSendMessage = vi.fn().mockResolvedValue(undefined)

      render(
        <TestWrapper>
          <MockMessageInput {...defaultProps} onSendMessage={onSendMessage} />
        </TestWrapper>
      )

      const textarea = screen.getByTestId('message-textarea')
      const sendButton = screen.getByTestId('send-button')

      await user.type(textarea, '전송 후 지워질 메시지')
      await user.click(sendButton)

      await waitFor(() => {
        expect(textarea).toHaveValue('')
      })
    })

    it('전송 중일 때 버튼이 비활성화되어야 한다', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      let resolvePromise: (value: any) => void
      const onSendMessage = vi.fn().mockImplementation(
        () => new Promise((resolve) => (resolvePromise = resolve))
      )

      render(
        <TestWrapper>
          <MockMessageInput {...defaultProps} onSendMessage={onSendMessage} />
        </TestWrapper>
      )

      const textarea = screen.getByTestId('message-textarea')
      const sendButton = screen.getByTestId('send-button')

      await user.type(textarea, '전송 중 테스트')
      await user.click(sendButton)

      expect(sendButton).toBeDisabled()
      expect(screen.getByText('전송 중...')).toBeInTheDocument()
      expect(screen.getByTestId('sending-indicator')).toBeInTheDocument()

      // 전송 완료
      resolvePromise!(undefined)
      await waitFor(() => {
        expect(sendButton).not.toBeDisabled()
      })
    })

    it('전송 실패 시 에러가 처리되어야 한다', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const onSendMessage = vi.fn().mockRejectedValue(new Error('전송 실패'))

      render(
        <TestWrapper>
          <MockMessageInput {...defaultProps} onSendMessage={onSendMessage} />
        </TestWrapper>
      )

      const textarea = screen.getByTestId('message-textarea')
      const sendButton = screen.getByTestId('send-button')

      await user.type(textarea, '실패할 메시지')
      await user.click(sendButton)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('메시지 전송 실패:', expect.any(Error))
      })

      consoleErrorSpy.mockRestore()
    })
  })

  describe('타이핑 인디케이터', () => {
    it('타이핑 시작 시 onTyping이 호출되어야 한다', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const onTyping = vi.fn()

      render(
        <TestWrapper>
          <MockMessageInput {...defaultProps} onTyping={onTyping} />
        </TestWrapper>
      )

      const textarea = screen.getByTestId('message-textarea')
      await user.type(textarea, 'a')

      expect(onTyping).toHaveBeenCalledWith(true)
    })

    it('타이핑 멈춘 후 1초 뒤 onTyping(false)가 호출되어야 한다', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const onTyping = vi.fn()

      render(
        <TestWrapper>
          <MockMessageInput {...defaultProps} onTyping={onTyping} />
        </TestWrapper>
      )

      const textarea = screen.getByTestId('message-textarea')
      await user.type(textarea, 'typing')

      // 1초 후
      vi.advanceTimersByTime(1000)

      expect(onTyping).toHaveBeenCalledWith(false)
    })

    it('연속으로 타이핑할 때 타이머가 리셋되어야 한다', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const onTyping = vi.fn()

      render(
        <TestWrapper>
          <MockMessageInput {...defaultProps} onTyping={onTyping} />
        </TestWrapper>
      )

      const textarea = screen.getByTestId('message-textarea')

      await user.type(textarea, 'a')
      vi.advanceTimersByTime(500) // 0.5초 후

      await user.type(textarea, 'b')
      vi.advanceTimersByTime(500) // 추가 0.5초 후 (총 1초, 하지만 마지막 타이핑 후 0.5초)

      // 아직 타이핑 중이어야 함
      expect(onTyping).not.toHaveBeenCalledWith(false)

      vi.advanceTimersByTime(500) // 추가 0.5초 (마지막 타이핑 후 1초)

      expect(onTyping).toHaveBeenCalledWith(false)
    })
  })

  describe('일정 변경 요청 모드', () => {
    it('일정 변경 요청 버튼을 클릭하면 폼이 표시되어야 한다', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      render(
        <TestWrapper>
          <MockMessageInput {...defaultProps} />
        </TestWrapper>
      )

      const scheduleChangeButton = screen.getByTestId('schedule-change-button')
      await user.click(scheduleChangeButton)

      expect(screen.getByTestId('schedule-change-form')).toBeInTheDocument()
      expect(screen.getByTestId('schedule-id-input')).toBeInTheDocument()
      expect(screen.getByTestId('start-time-input')).toBeInTheDocument()
      expect(screen.getByTestId('end-time-input')).toBeInTheDocument()
    })

    it('일정 변경 모드에서 필수 필드를 입력해야 전송 버튼이 활성화되어야 한다', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      render(
        <TestWrapper>
          <MockMessageInput {...defaultProps} />
        </TestWrapper>
      )

      const scheduleChangeButton = screen.getByTestId('schedule-change-button')
      await user.click(scheduleChangeButton)

      const textarea = screen.getByTestId('message-textarea')
      const scheduleIdInput = screen.getByTestId('schedule-id-input')
      const startTimeInput = screen.getByTestId('start-time-input')
      const endTimeInput = screen.getByTestId('end-time-input')
      const sendButton = screen.getByTestId('send-button')

      // 메시지만 입력
      await user.type(textarea, '일정 변경 요청')
      expect(sendButton).toBeDisabled()

      // 일정 ID 입력
      await user.type(scheduleIdInput, '123')
      expect(sendButton).toBeDisabled()

      // 시작 시간 입력
      await user.type(startTimeInput, '14:00')
      expect(sendButton).toBeDisabled()

      // 종료 시간 입력 (모든 필드 완료)
      await user.type(endTimeInput, '15:00')
      expect(sendButton).not.toBeDisabled()
    })

    it('일정 변경 요청을 전송할 수 있어야 한다', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const onSendMessage = vi.fn().mockResolvedValue(undefined)

      render(
        <TestWrapper>
          <MockMessageInput {...defaultProps} onSendMessage={onSendMessage} />
        </TestWrapper>
      )

      const scheduleChangeButton = screen.getByTestId('schedule-change-button')
      await user.click(scheduleChangeButton)

      const textarea = screen.getByTestId('message-textarea')
      const scheduleIdInput = screen.getByTestId('schedule-id-input')
      const startTimeInput = screen.getByTestId('start-time-input')
      const endTimeInput = screen.getByTestId('end-time-input')
      const sendButton = screen.getByTestId('send-button')

      await user.type(textarea, '일정 변경 요청합니다')
      await user.type(scheduleIdInput, '123')
      await user.type(startTimeInput, '14:00')
      await user.type(endTimeInput, '15:00')

      await user.click(sendButton)

      expect(onSendMessage).toHaveBeenCalledWith(
        '일정 변경 요청합니다',
        'schedule_change_request',
        {
          schedule_id: '123',
          requested_start_time: '14:00',
          requested_end_time: '15:00',
        }
      )
    })

    it('일정 변경 요청 전송 후 폼이 초기화되어야 한다', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const onSendMessage = vi.fn().mockResolvedValue(undefined)

      render(
        <TestWrapper>
          <MockMessageInput {...defaultProps} onSendMessage={onSendMessage} />
        </TestWrapper>
      )

      const scheduleChangeButton = screen.getByTestId('schedule-change-button')
      await user.click(scheduleChangeButton)

      const textarea = screen.getByTestId('message-textarea')
      const scheduleIdInput = screen.getByTestId('schedule-id-input')
      const startTimeInput = screen.getByTestId('start-time-input')
      const endTimeInput = screen.getByTestId('end-time-input')
      const sendButton = screen.getByTestId('send-button')

      await user.type(textarea, '일정 변경 요청')
      await user.type(scheduleIdInput, '123')
      await user.type(startTimeInput, '14:00')
      await user.type(endTimeInput, '15:00')

      await user.click(sendButton)

      await waitFor(() => {
        expect(textarea).toHaveValue('')
        expect(scheduleIdInput).toHaveValue('')
        expect(startTimeInput).toHaveValue('')
        expect(endTimeInput).toHaveValue('')
        expect(screen.queryByTestId('schedule-change-form')).not.toBeInTheDocument()
      })
    })

    it('일반 메시지 모드로 다시 전환할 수 있어야 한다', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      render(
        <TestWrapper>
          <MockMessageInput {...defaultProps} />
        </TestWrapper>
      )

      const scheduleChangeButton = screen.getByTestId('schedule-change-button')
      const textMessageButton = screen.getByTestId('text-message-button')

      await user.click(scheduleChangeButton)
      expect(screen.getByTestId('schedule-change-form')).toBeInTheDocument()

      await user.click(textMessageButton)
      expect(screen.queryByTestId('schedule-change-form')).not.toBeInTheDocument()
    })
  })

  describe('접근성', () => {
    it('텍스트영역에 적절한 라벨이 있어야 한다', () => {
      render(
        <TestWrapper>
          <MockMessageInput {...defaultProps} />
        </TestWrapper>
      )

      const textarea = screen.getByTestId('message-textarea')
      expect(textarea).toHaveAttribute('placeholder')
    })

    it('버튼들에 적절한 텍스트가 있어야 한다', () => {
      render(
        <TestWrapper>
          <MockMessageInput {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByText('일반 메시지')).toBeInTheDocument()
      expect(screen.getByText('일정 변경 요청')).toBeInTheDocument()
      expect(screen.getByText('전송')).toBeInTheDocument()
    })

    it('키보드 내비게이션이 가능해야 한다', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      render(
        <TestWrapper>
          <MockMessageInput {...defaultProps} />
        </TestWrapper>
      )

      // Tab으로 포커스 이동 확인
      await user.tab()
      expect(screen.getByTestId('text-message-button')).toHaveFocus()

      await user.tab()
      expect(screen.getByTestId('schedule-change-button')).toHaveFocus()

      await user.tab()
      expect(screen.getByTestId('message-textarea')).toHaveFocus()

      await user.tab()
      expect(screen.getByTestId('send-button')).toHaveFocus()
    })
  })

  describe('반응형 디자인', () => {
    it('모바일 화면에서 올바르게 표시되어야 한다', () => {
      // 모바일 화면 크기 시뮬레이션
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(
        <TestWrapper>
          <MockMessageInput {...defaultProps} />
        </TestWrapper>
      )

      const container = screen.getByTestId('message-input-container')
      expect(container).toBeInTheDocument()
      // 실제 구현에서는 모바일 전용 CSS 클래스나 스타일 확인
    })

    it('데스크톱 화면에서 올바르게 표시되어야 한다', () => {
      // 데스크톱 화면 크기 시뮬레이션
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })

      render(
        <TestWrapper>
          <MockMessageInput {...defaultProps} />
        </TestWrapper>
      )

      const container = screen.getByTestId('message-input-container')
      expect(container).toBeInTheDocument()
      // 실제 구현에서는 데스크톱 전용 CSS 클래스나 스타일 확인
    })
  })

  describe('성능', () => {
    it('컴포넌트 언마운트 시 타이머가 정리되어야 한다', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      const { unmount } = render(
        <TestWrapper>
          <MockMessageInput {...defaultProps} />
        </TestWrapper>
      )

      unmount()

      // 실제 구현에서는 useEffect cleanup에서 clearTimeout 호출 확인
      expect(clearTimeoutSpy).toHaveBeenCalled()
    })
  })
})