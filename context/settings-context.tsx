'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import {
    DEFAULT_THEME_PALETTE,
    type ThemeMode,
    type ThemePaletteId,
} from '@/lib/theme-system'

interface SettingsContextType {
    accordionMode: boolean
    setAccordionMode: (value: boolean) => void
    collapseOnClick: boolean
    setCollapseOnClick: (value: boolean) => void
    itemsPerPage: number
    setItemsPerPage: (value: number) => void
    themeMode: ThemeMode
    setThemeMode: (theme: ThemeMode) => void
    themePalette: ThemePaletteId
    setThemePalette: (palette: ThemePaletteId) => void
    resolvedTheme: string | undefined
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const { theme, setTheme, resolvedTheme } = useTheme()
    
    // State
    const [accordionMode, setAccordionModeState] = useState(true)
    const [collapseOnClick, setCollapseOnClickState] = useState(false)
    const [itemsPerPage, setItemsPerPageState] = useState(10)
    const [themeMode, setThemeModeState] = useState<ThemeMode>('system')
    const [themePalette, setThemePaletteState] = useState<ThemePaletteId>(DEFAULT_THEME_PALETTE)
    const [mounted, setMounted] = useState(false)

    // Load from LocalStorage on mount to preserve per-browser preferences.
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        const storedAccordion = localStorage.getItem('settings_accordion_mode')
        if (storedAccordion !== null) setAccordionModeState(storedAccordion === 'true')

        const storedCollapse = localStorage.getItem('settings_collapse_on_click')
        if (storedCollapse !== null) setCollapseOnClickState(storedCollapse === 'true')

        const storedItems = localStorage.getItem('settings_items_per_page')
        if (storedItems !== null) setItemsPerPageState(Number(storedItems))

        const storedThemeMode = localStorage.getItem('settings_theme_mode') as ThemeMode | null
        if (storedThemeMode === 'light' || storedThemeMode === 'dark' || storedThemeMode === 'system') {
            setThemeModeState(storedThemeMode)
            setTheme(storedThemeMode)
        } else if (theme === 'light' || theme === 'dark' || theme === 'system') {
            setThemeModeState(theme)
        }

        const storedThemePalette = localStorage.getItem('settings_theme_palette') as ThemePaletteId | null
        if (storedThemePalette) {
            setThemePaletteState(storedThemePalette)
            document.documentElement.dataset.palette = storedThemePalette
        } else {
            document.documentElement.dataset.palette = DEFAULT_THEME_PALETTE
        }
        
        setMounted(true)
    }, [setTheme, theme])
    /* eslint-enable react-hooks/set-state-in-effect */

    useEffect(() => {
        if (!mounted) return
        document.documentElement.dataset.palette = themePalette
    }, [mounted, themePalette])

    // Save to LocalStorage
    const setAccordionMode = (value: boolean) => {
        setAccordionModeState(value)
        localStorage.setItem('settings_accordion_mode', String(value))
    }

    const setCollapseOnClick = (value: boolean) => {
        setCollapseOnClickState(value)
        localStorage.setItem('settings_collapse_on_click', String(value))
    }

    const setItemsPerPage = (value: number) => {
        setItemsPerPageState(value)
        localStorage.setItem('settings_items_per_page', String(value))
    }

    const handleThemeMode = (value: ThemeMode) => {
        setThemeModeState(value)
        localStorage.setItem('settings_theme_mode', value)
        setTheme(value)
    }

    const handleThemePalette = (value: ThemePaletteId) => {
        setThemePaletteState(value)
        localStorage.setItem('settings_theme_palette', value)
        document.documentElement.dataset.palette = value
    }

    if (!mounted) {
        return null // or a loader
    }

    return (
        <SettingsContext.Provider value={{
            accordionMode, setAccordionMode,
            collapseOnClick, setCollapseOnClick,
            itemsPerPage, setItemsPerPage,
            themeMode,
            setThemeMode: handleThemeMode,
            themePalette,
            setThemePalette: handleThemePalette,
            resolvedTheme,
        }}>
            {children}
        </SettingsContext.Provider>
    )
}

export function useSettings() {
    const context = useContext(SettingsContext)
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider')
    }
    return context
}
