import { create } from 'zustand'

type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

// 시스템 테마 감지 또는 localStorage에서 저장된 테마 로드
const getInitialTheme = (): Theme => {
  // localStorage에 저장된 테마 확인
  const savedTheme = localStorage.getItem('theme') as Theme | null
  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme
  }

  // 시스템 설정 확인
  if (
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark'
  }

  return 'light'
}

// HTML에 dark 클래스 적용/제거
const applyTheme = (theme: Theme) => {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  localStorage.setItem('theme', theme)
}

export const useThemeStore = create<ThemeState>((set) => {
  // 초기 테마 적용
  const initialTheme = getInitialTheme()
  applyTheme(initialTheme)

  return {
    theme: initialTheme,

    toggleTheme: () =>
      set((state) => {
        const newTheme = state.theme === 'light' ? 'dark' : 'light'
        applyTheme(newTheme)
        return { theme: newTheme }
      }),

    setTheme: (theme: Theme) => {
      applyTheme(theme)
      set({ theme })
    },
  }
})
