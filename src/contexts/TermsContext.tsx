'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { termsService } from '@/services/TermsService'
import TermsModal from '@/components/TermsModal'

interface TermsContextType {
    hasAcceptedTerms: boolean
    showTermsModal: () => void
}

const TermsContext = createContext<TermsContextType | undefined>(undefined)

interface TermsProviderProps {
    children: ReactNode
}

export function TermsProvider({ children }: TermsProviderProps) {
    const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const checkTermsAcceptance = async () => {
            try {
                const accepted = await termsService.hasAcceptedCurrentTerms()
                setHasAcceptedTerms(accepted)

                if (!accepted) {
                    setShowModal(true)
                }
            } catch (error) {
                console.error('Failed to check terms acceptance:', error)
                // If we can't check, show the modal to be safe
                setShowModal(true)
            } finally {
                setIsLoading(false)
            }
        }

        checkTermsAcceptance()
    }, [])

    const handleAcceptTerms = async () => {
        try {
            await termsService.acceptTerms()
            setHasAcceptedTerms(true)
            setShowModal(false)
        } catch (error) {
            console.error('Failed to accept terms:', error)
            alert('Failed to save terms acceptance. Please try again.')
        }
    }

    const handleDeclineTerms = () => {
        // If user declines, they can't use the app
        alert('You must accept the terms to use Avian FlightDeck.')
        // Keep the modal open
    }

    const showTermsModal = () => {
        setShowModal(true)
    }

    // Show loading screen while checking terms
    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-avian-500 mx-auto mb-4"></div>
                    <p className="text-white">Loading Avian FlightDeck...</p>
                </div>
            </div>
        )
    }

    // Don't render the app until terms are accepted
    if (!hasAcceptedTerms) {
        return (
            <>
                <TermsModal
                    isOpen={showModal}
                    onAccept={handleAcceptTerms}
                    onDecline={handleDeclineTerms}
                />
                {/* Render a minimal fallback while terms modal is shown */}
                <div className="fixed inset-0 bg-gray-900"></div>
            </>
        )
    }

    return (
        <TermsContext.Provider value={{
            hasAcceptedTerms,
            showTermsModal
        }}>
            {children}
            <TermsModal
                isOpen={showModal}
                onAccept={handleAcceptTerms}
                onDecline={handleDeclineTerms}
            />
        </TermsContext.Provider>
    )
}

export function useTerms() {
    const context = useContext(TermsContext)
    if (context === undefined) {
        throw new Error('useTerms must be used within a TermsProvider')
    }
    return context
}
