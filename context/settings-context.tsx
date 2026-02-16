'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useTheme } from 'next-themes'

interface SettingsContextType {
    accordionMode: boolean
    setAccordionMode: (value: boolean) => void
    collapseOnClick: boolean
    setCollapseOnClick: (value: boolean) => void
    itemsPerPage: number
    setItemsPerPage: (value: number) => void
    theme: string | undefined
    setTheme: (theme: string) => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const { theme, setTheme } = useTheme()
    
    // State
    const [accordionMode, setAccordionModeState] = useState(true)
    const [collapseOnClick, setCollapseOnClickState] = useState(false)
    const [itemsPerPage, setItemsPerPageState] = useState(10)
    const [mounted, setMounted] = useState(false)

    // Load from LocalStorage
    useEffect(() => {
        const storedAccordion = localStorage.getItem('settings_accordion_mode')
        if (storedAccordion !== null) setAccordionModeState(storedAccordion === 'true')

        const storedCollapse = localStorage.getItem('settings_collapse_on_click')
        if (storedCollapse !== null) setCollapseOnClickState(storedCollapse === 'true')

        const storedItems = localStorage.getItem('settings_items_per_page')
        if (storedItems !== null) setItemsPerPageState(Number(storedItems))
        
        setMounted(true)
    }, [])

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

    if (!mounted) {
        return null // or a loader
    }

    return (
        <SettingsContext.Provider value={{
            accordionMode, setAccordionMode,
            collapseOnClick, setCollapseOnClick,
            itemsPerPage, setItemsPerPage,
            theme, setTheme
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
