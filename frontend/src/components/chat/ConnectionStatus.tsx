import React from 'react'
import { useChatStore } from '@/stores/chat-store'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Wifi, WifiOff, RotateCcw } from 'lucide-react'

interface ConnectionStatusProps {
  className?: string
}

export default function ConnectionStatus({ className }: ConnectionStatusProps) {
  const { connectionStatus, isLoading } = useChatStore()

  const getStatusConfig = () => {
    if (isLoading) {
      return {
        icon: RotateCcw,
        text: '연결 중...',
        variant: 'secondary' as const,
        className: 'text-blue-600 bg-blue-50'
      }
    }

    if (connectionStatus.isConnected) {
      return {
        icon: Wifi,
        text: '온라인',
        variant: 'secondary' as const,
        className: 'text-green-600 bg-green-50'
      }
    }

    if (connectionStatus.isReconnecting) {
      return {
        icon: RotateCcw,
        text: '재연결 중...',
        variant: 'secondary' as const,
        className: 'text-yellow-600 bg-yellow-50'
      }
    }

    return {
      icon: WifiOff,
      text: '오프라인',
      variant: 'destructive' as const,
      className: 'text-red-600 bg-red-50'
    }
  }

  const { icon: Icon, text, variant, className: statusClassName } = getStatusConfig()

  return (
    <Badge
      variant={variant}
      className={cn(
        'flex items-center gap-1.5 text-xs font-medium',
        statusClassName,
        className
      )}
    >
      <Icon className={cn(
        'w-3 h-3',
        (isLoading || connectionStatus.isReconnecting) && 'animate-spin'
      )} />
      {text}
    </Badge>
  )
}