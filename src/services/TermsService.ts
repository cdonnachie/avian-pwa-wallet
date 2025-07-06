import { StorageService } from './StorageService'
import { TermsAcceptance } from '../types/security'

export class TermsService {
    private static instance: TermsService | null = null
    private readonly CURRENT_VERSION = '1.0.0'
    private readonly STORAGE_KEY = 'terms_acceptance'

    static getInstance(): TermsService {
        if (!TermsService.instance) {
            TermsService.instance = new TermsService()
        }
        return TermsService.instance
    }

    async hasAcceptedCurrentTerms(): Promise<boolean> {
        try {
            const settings = await StorageService.getSettings()
            const termsData = settings?.[this.STORAGE_KEY] as TermsAcceptance

            if (!termsData) return false

            return termsData.accepted && termsData.version === this.CURRENT_VERSION
        } catch (error) {
            console.error('Failed to check terms acceptance:', error)
            return false
        }
    }

    async acceptTerms(): Promise<void> {
        try {
            const termsAcceptance: TermsAcceptance = {
                accepted: true,
                version: this.CURRENT_VERSION,
                timestamp: Date.now(),
                userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined
            }

            const settings = await StorageService.getSettings()
            await StorageService.setSettings({
                ...settings,
                [this.STORAGE_KEY]: termsAcceptance
            })

            console.log('Terms accepted for version:', this.CURRENT_VERSION)
        } catch (error) {
            console.error('Failed to accept terms:', error)
            throw error
        }
    }

    async getTermsAcceptance(): Promise<TermsAcceptance | null> {
        try {
            const settings = await StorageService.getSettings()
            return settings?.[this.STORAGE_KEY] as TermsAcceptance || null
        } catch (error) {
            console.error('Failed to get terms acceptance:', error)
            return null
        }
    }

    getCurrentVersion(): string {
        return this.CURRENT_VERSION
    }
}

export const termsService = TermsService.getInstance()
