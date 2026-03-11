import { useState, useLayoutEffect } from 'react'

interface UseThemeReturn {
  isDark: boolean
  toggleTheme: () => void
}

export function useTheme(): UseThemeReturn {
  const [isDark, setIsDark] = useState<boolean>(() =>
    document.documentElement.classList.contains('dark')
  )

  useLayoutEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggleTheme = () => {
    const currentlyDark = document.documentElement.classList.contains('dark')
    if (currentlyDark) {
      document.documentElement.classList.remove('dark')
      sessionStorage.setItem('theme', 'light')
      setIsDark(false)
    } else {
      document.documentElement.classList.add('dark')
      sessionStorage.setItem('theme', 'dark')
      setIsDark(true)
    }
  }

  return { isDark, toggleTheme }
}
