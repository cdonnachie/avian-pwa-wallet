'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'

type Theme = 'light' | 'dark' | 'system'

export default function ThemeSwitcher() {
    const [theme, setTheme] = useState<Theme>('system')
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        // Get saved theme from localStorage or default to system
        const savedTheme = localStorage.getItem('theme') as Theme || 'system'
        setTheme(savedTheme)
        applyTheme(savedTheme)
    }, [])

    const applyTheme = (newTheme: Theme) => {
        const root = window.document.documentElement

        // Remove existing theme classes
        root.classList.remove('light', 'dark', 'system')

        // Add the new theme class
        root.classList.add(newTheme)

        if (newTheme === 'system') {
            // Use system preference
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
            root.classList.add(systemPrefersDark ? 'dark' : 'light')
        }

        // Save to localStorage
        localStorage.setItem('theme', newTheme)
    }

    const handleThemeChange = (newTheme: Theme) => {
        setTheme(newTheme)
        applyTheme(newTheme)
        setIsOpen(false)
    }

    const getThemeIcon = (themeType: Theme) => {
        switch (themeType) {
            case 'light':
                return <Sun className="w-4 h-4" />
            case 'dark':
                return <Moon className="w-4 h-4" />
            case 'system':
                return <Monitor className="w-4 h-4" />
        }
    }

    const getThemeLabel = (themeType: Theme) => {
        switch (themeType) {
            case 'light':
                return 'Light'
            case 'dark':
                return 'Dark'
            case 'system':
                return 'System'
        }
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center p-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-avian-orange focus:border-transparent"
                aria-label="Theme switcher"
                title={`Current theme: ${getThemeLabel(theme)}`}
            >
                {getThemeIcon(theme)}
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20">
                        <div className="py-1">
                            {(['light', 'dark', 'system'] as Theme[]).map((themeOption) => (
                                <button
                                    key={themeOption}
                                    onClick={() => handleThemeChange(themeOption)}
                                    className={`w-full text-left px-4 py-2 text-sm flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${theme === themeOption
                                        ? 'bg-avian-50 dark:bg-avian-900/20 text-avian-900 dark:text-avian-200'
                                        : 'text-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    {getThemeIcon(themeOption)}
                                    <span>{getThemeLabel(themeOption)}</span>
                                    {theme === themeOption && (
                                        <svg className="w-4 h-4 ml-auto text-avian-600 dark:text-avian-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
