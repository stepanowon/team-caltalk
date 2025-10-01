export const formatDate = (date: string | Date): string => {
  const d = new Date(date)
  return d.toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export const formatDateTime = (date: string | Date): string => {
  const d = new Date(date)
  return d.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const formatTime = (date: string | Date): string => {
  const d = new Date(date)
  return d.toLocaleTimeString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 한국 시간대에서 현재 날짜/시간 문자열 가져오기
export const getKoreanDateString = (): string => {
  return new Date().toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\./g, '-').replace(/\s/g, '').replace(/-$/, '')
}

// 한국 시간대에서 현재 날짜 객체 가져오기 (ISO 형식으로)
export const getKoreanDateISO = (date?: string | Date): string => {
  const d = date ? new Date(date) : new Date()

  // 한국 시간대 기준으로 YYYY-MM-DD 형식 생성
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

// 한국 시간대에서 현재 날짜 객체 가져오기
export const getKoreanDate = (date?: string | Date): Date => {
  const d = date ? new Date(date) : new Date()

  // 한국 시간대(+9시간) 오프셋 적용
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000)
  const koreaTime = new Date(utc + (9 * 3600000)) // UTC + 9시간

  return koreaTime
}

export const isToday = (date: string | Date): boolean => {
  const today = getKoreanDate()
  const targetDate = getKoreanDate(date)
  return (
    today.getFullYear() === targetDate.getFullYear() &&
    today.getMonth() === targetDate.getMonth() &&
    today.getDate() === targetDate.getDate()
  )
}

export const isSameDay = (
  date1: string | Date,
  date2: string | Date
): boolean => {
  const d1 = getKoreanDate(date1)
  const d2 = getKoreanDate(date2)
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}
