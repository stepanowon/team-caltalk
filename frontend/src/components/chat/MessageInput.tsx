import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Loader2 } from 'lucide-react'

interface MessageInputProps {
  onSendMessage: (content: string) => Promise<void>
  disabled?: boolean
  placeholder?: string
  className?: string
}

export default function MessageInput({
  onSendMessage,
  disabled = false,
  placeholder = "메시지를 입력하세요...",
  className
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 자동 높이 조절
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }, [message])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!message.trim() || isSending || disabled) {
      return
    }

    const messageToSend = message.trim()
    setMessage('')
    setIsSending(true)

    try {
      await onSendMessage(messageToSend)
    } catch (error) {
      // AbortError가 아닌 경우에만 메시지 복원 및 로깅
      if (error instanceof Error && error.name !== 'AbortError') {
        setMessage(messageToSend)
        console.error('Failed to send message:', error)
      }
    } finally {
      setIsSending(false)
      // 포커스 복원
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn('flex gap-3', className)}>
      <div className="flex-1">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSending}
          className={cn(
            'min-h-[44px] max-h-[120px] resize-none',
            'focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          )}
          rows={1}
        />
        <div className="mt-1 text-xs text-gray-500 flex justify-between">
          <span>Enter로 전송, Shift+Enter로 줄바꿈</span>
          <span className={cn(
            message.length > 450 ? 'text-red-500' : 'text-gray-400'
          )}>
            {message.length}/500
          </span>
        </div>
      </div>

      <Button
        type="submit"
        disabled={!message.trim() || isSending || disabled || message.length > 500}
        size="lg"
        className="h-auto px-4 py-3"
      >
        {isSending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </Button>
    </form>
  )
}