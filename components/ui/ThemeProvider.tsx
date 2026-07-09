'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getSettings, saveSettings } from '@/lib/settings'

interface ThemeContextValue {
  dark: boolean
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue>({ dark: false, toggle: () => {} })

export function useTheme() {
  return useContext(ThemeContext)
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const settings = getSettings()
    setDark(settings.darkMode)
  }, [])

  // Apply / remove the 'dark' class on <html> whenever state changes
  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [dark])

  const toggle = useCallback(() => {
    setDark(prev => {
      const next = !prev
      const settings = getSettings()
      saveSettings({ ...settings, darkMode: next })
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}
