'use client';

/**
 * GradientBackground Component
 *
 * Provides beautiful gradient backgrounds for the Avian FlightDeck app.
 *
 */

interface GradientBackgroundProps {
    children: React.ReactNode;
}

export default function GradientBackground({
    children,
}: GradientBackgroundProps) {
    return (
        <div className="min-h-screen w-full relative bg-white dark:bg-black">
            {/* Light mode variant */}
            <div
                className="absolute inset-0 z-0 block dark:hidden"
                style={{
                    background: 'radial-gradient(125% 100% at 50% 100%, #ffffff 40%, #2a737f 100%)',
                    backgroundSize: '100% 100%',
                }}
            />
            {/* Dark mode variant */}
            <div
                className="absolute inset-0 z-0 dark:block hidden"
                style={{
                    background: 'radial-gradient(125% 125% at 50% 100%, #000000 40%, #2a737f 100%)',
                    backgroundSize: '100% 100%',
                }}
            />
            <div className="relative z-10">{children}</div>
        </div>
    );

}
