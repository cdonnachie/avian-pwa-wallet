'use client'

/**
 * GradientBackground Component
 * 
 * Provides beautiful gradient backgrounds for the Avian FlightDeck app.
 * 
 * Variants:
 * - 'auto': Light gradient in light mode, dark gradient in dark mode (recommended)
 * - 'light': Always light gradient (blue/white)
 * - 'dark': Always dark gradient (gray/blue)
 * - 'avian-light': Avian-branded light gradient (avian colors)
 * - 'avian-dark': Avian-branded dark gradient (avian colors)
 * 
 * Usage:
 * <GradientBackground variant="auto">
 *   <YourContent />
 * </GradientBackground>
 */

interface GradientBackgroundProps {
    children: React.ReactNode
    className?: string
    variant?: 'light' | 'dark' | 'auto' | 'avian-light' | 'avian-dark'
}

export default function GradientBackground({
    children,
    className = '',
    variant = 'auto'
}: GradientBackgroundProps) {
    const getGradientClasses = () => {
        switch (variant) {
            case 'light':
                return 'bg-gradient-to-br from-blue-50 via-white to-blue-100'
            case 'dark':
                return 'bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900'
            case 'avian-light':
                return 'bg-gradient-to-br from-avian-50 via-white to-avian-100'
            case 'avian-dark':
                return 'bg-gradient-to-br from-gray-900 via-avian-800 to-blue-900'
            case 'auto':
            default:
                // Auto variant - light gradient in light mode, dark gradient in dark mode
                return 'bg-gradient-to-br from-avian-50 via-white to-sky-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900'
        }
    }

    return (
        <div className={`min-h-screen ${getGradientClasses()} ${className}`}>
            {children}
        </div>
    )
}
